import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as PgBoss from 'pg-boss';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/infrastructure/database/prisma.service';

/** A failed (or expired) pg-boss job, from the live table or the archive. */
export interface FailedJobRow {
  id: string;
  name: string;
  state: 'failed' | 'expired';
  data: unknown;
  output: unknown;
  retryCount: number;
  createdOn: Date;
  failedOn: Date | null;
}

/** Per-queue job counts read from pg-boss's own tables. */
export interface QueueJobStats {
  /** created + retry: waiting to be picked up */
  waiting: number;
  active: number;
  /** finished in the window (live table + archive) */
  completed: number;
  /** failed or expired in the window */
  failed: number;
}

export interface PublishOptions extends PgBoss.SendOptions {
  priority?: number;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private boss: PgBoss;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    this.boss = new PgBoss({
      connectionString: databaseUrl,
      retryLimit: 3,
      retryDelay: 5,
      retryBackoff: true,
      expireInHours: 24,
      archiveCompletedAfterSeconds: 3600,
      deleteAfterDays: 7,
      monitorStateIntervalSeconds: 30,
    });
  }

  async onModuleInit(): Promise<void> {
    this.boss.on('error', (error) => {
      this.logger.error('pg-boss error', error);
    });
    await this.boss.start();
    this.logger.log('Queue service started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.boss.stop({ graceful: true, timeout: 10000 });
    this.logger.log('Queue service stopped');
  }

  /**
   * Publish a job to a queue.
   * Supports singletonKey for idempotency and priority for ordering.
   */
  async publish<T extends object>(
    queueName: string,
    data: T,
    options?: PublishOptions,
  ): Promise<string | null> {
    return this.boss.send(queueName, data, options ?? {});
  }

  /**
   * Publish with a singleton key to prevent duplicate jobs.
   * If a job with the same singletonKey is already active/pending, this is a no-op.
   */
  async publishOnce<T extends object>(
    queueName: string,
    data: T,
    singletonKey: string,
    options?: PublishOptions,
  ): Promise<string | null> {
    return this.boss.send(queueName, data, {
      ...options,
      singletonKey,
    });
  }

  /**
   * Publish a delayed job (for retry with backoff).
   */
  async publishDelayed<T extends object>(
    queueName: string,
    data: T,
    delaySeconds: number,
    options?: PublishOptions,
  ): Promise<string | null> {
    return this.boss.send(queueName, data, {
      ...options,
      startAfter: delaySeconds,
    });
  }

  /**
   * Subscribe a worker to a queue. One job at a time by default.
   */
  async subscribe<T extends object>(
    queueName: string,
    handler: (job: PgBoss.Job<T>) => Promise<void>,
    options?: PgBoss.WorkOptions,
  ): Promise<string> {
    return this.boss.work<T>(queueName, options ?? {}, async (job) => {
      try {
        await handler(job);
      } catch (error) {
        this.logger.error(
          `Job ${job.id} in queue ${queueName} failed`,
          error instanceof Error ? error.stack : String(error),
        );
        throw error;
      }
    });
  }

  /**
   * Subscribe with concurrency control and batch size.
   * Useful for session-ordered processing (teamSize=1 per queue partition).
   */
  async subscribeConcurrent<T extends object>(
    queueName: string,
    handler: (job: PgBoss.Job<T>) => Promise<void>,
    teamSize: number,
  ): Promise<string> {
    return this.boss.work<T>(
      queueName,
      { teamSize, teamConcurrency: teamSize },
      async (job) => {
        try {
          await handler(job);
        } catch (error) {
          this.logger.error(
            `Job ${job.id} in queue ${queueName} failed`,
            error instanceof Error ? error.stack : String(error),
          );
          throw error;
        }
      },
    );
  }

  /**
   * Complete a job manually (for custom ack patterns).
   */
  async complete(jobId: string, data?: object): Promise<void> {
    await this.boss.complete(jobId, data);
  }

  /**
   * Fail a job manually.
   */
  async fail(jobId: string, data?: object): Promise<void> {
    await this.boss.fail(jobId, data);
  }

  /**
   * Get queue size for monitoring.
   */
  async getQueueSize(queueName: string): Promise<number> {
    return this.boss.getQueueSize(queueName);
  }

  /**
   * Job counts per queue. Waiting/active come from the live table; completed/failed
   * cover the last `windowHours` across the live table and the archive (pg-boss moves
   * finished jobs there after an hour). Queues with no jobs are absent from the result.
   */
  async getJobStats(queueNames: string[], windowHours = 24): Promise<Record<string, QueueJobStats>> {
    const since = new Date(Date.now() - windowHours * 3_600_000);
    const rows = await this.prisma.$queryRaw<{ name: string; state: string; n: number }[]>`
      SELECT name, state::text AS state, COUNT(*)::int AS n
      FROM (
        SELECT name, state, completedon FROM pgboss.job WHERE name = ANY(${queueNames})
        UNION ALL
        SELECT name, state, completedon FROM pgboss.archive
        WHERE name = ANY(${queueNames}) AND completedon >= ${since}
      ) j
      WHERE state IN ('created', 'retry', 'active')
         OR (state IN ('completed', 'failed', 'expired') AND completedon >= ${since})
      GROUP BY name, state
    `;
    const stats: Record<string, QueueJobStats> = {};
    for (const { name, state, n } of rows) {
      const s = (stats[name] ??= { waiting: 0, active: 0, completed: 0, failed: 0 });
      if (state === 'created' || state === 'retry') s.waiting += n;
      else if (state === 'active') s.active += n;
      else if (state === 'completed') s.completed += n;
      else s.failed += n;
    }
    return stats;
  }

  /**
   * Failed/expired jobs, newest first, from the live table and the archive (pg-boss
   * deletes archived jobs after `deleteAfterDays`). `queue` narrows to one queue name.
   */
  async listFailedJobs(opts: { queue?: string; skip: number; take: number }): Promise<{ jobs: FailedJobRow[]; total: number }> {
    const queue = opts.queue ?? null;
    const [jobs, totals] = await Promise.all([
      this.prisma.$queryRaw<FailedJobRow[]>`
        SELECT id::text AS id, name, state::text AS state, data, output, retrycount AS "retryCount",
               createdon AS "createdOn", completedon AS "failedOn"
        FROM (
          SELECT id, name, state, data, output, retrycount, createdon, completedon FROM pgboss.job
          WHERE state IN ('failed', 'expired') AND (${queue}::text IS NULL OR name = ${queue})
          UNION ALL
          SELECT id, name, state, data, output, retrycount, createdon, completedon FROM pgboss.archive
          WHERE state IN ('failed', 'expired') AND (${queue}::text IS NULL OR name = ${queue})
        ) j
        ORDER BY completedon DESC NULLS LAST
        OFFSET ${opts.skip} LIMIT ${opts.take}`,
      this.prisma.$queryRaw<{ n: number }[]>`
        SELECT (
          (SELECT COUNT(*) FROM pgboss.job WHERE state IN ('failed', 'expired') AND (${queue}::text IS NULL OR name = ${queue}))
          + (SELECT COUNT(*) FROM pgboss.archive WHERE state IN ('failed', 'expired') AND (${queue}::text IS NULL OR name = ${queue}))
        )::int AS n`,
    ]);
    return { jobs, total: totals[0]?.n ?? 0 };
  }

  /** One failed/expired job by id, from either table; null if absent or not failed. */
  async findFailedJob(id: string): Promise<FailedJobRow | null> {
    const rows = await this.prisma.$queryRaw<FailedJobRow[]>`
      SELECT id::text AS id, name, state::text AS state, data, output, retrycount AS "retryCount",
             createdon AS "createdOn", completedon AS "failedOn"
      FROM (
        SELECT id, name, state, data, output, retrycount, createdon, completedon FROM pgboss.job WHERE id = ${id}::uuid
        UNION ALL
        SELECT id, name, state, data, output, retrycount, createdon, completedon FROM pgboss.archive WHERE id = ${id}::uuid
      ) j
      WHERE state IN ('failed', 'expired')
      LIMIT 1`;
    return rows[0] ?? null;
  }

  /**
   * Cancel a specific job by ID.
   */
  async cancel(jobId: string): Promise<void> {
    await this.boss.cancel(jobId);
  }

  /**
   * Expose the pg-boss instance for advanced operations.
   */
  getBoss(): PgBoss {
    return this.boss;
  }
}
