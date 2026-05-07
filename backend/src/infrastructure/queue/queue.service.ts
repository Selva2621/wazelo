import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as PgBoss from 'pg-boss';
import { ConfigService } from '@nestjs/config';

export interface PublishOptions extends PgBoss.SendOptions {
  priority?: number;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private boss: PgBoss;

  constructor(private readonly configService: ConfigService) {
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
