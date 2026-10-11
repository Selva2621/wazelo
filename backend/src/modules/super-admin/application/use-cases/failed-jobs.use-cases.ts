import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PlatformAuditAction } from '@prisma/client';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES } from '@/common/constants';
import { PlatformAuditRepository } from '../../infrastructure/repositories/platform-audit.repository';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';
import { jobErrorSummary, redactJobData } from '../../domain/services/job-redaction';

const KNOWN_QUEUES = new Set<string>(Object.values(QUEUE_NAMES));

/** Failed/expired background jobs, newest first, with payloads made safe to display. */
@Injectable()
export class ListFailedJobsUseCase {
  constructor(
    private readonly queue: QueueService,
    private readonly auditRepo: PlatformAuditRepository,
  ) {}

  async execute(input: { page?: number; limit?: number; queue?: string }) {
    const page = Math.max(input.page ?? 1, 1);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const { jobs, total } = await this.queue.listFailedJobs({
      queue: input.queue || undefined,
      skip: (page - 1) * limit,
      take: limit,
    });
    const retried = await this.auditRepo.targetIdsWithAction(
      PlatformAuditAction.JOB_RETRIED,
      jobs.map((j) => j.id),
    );
    return {
      jobs: jobs.map((j) => ({
        id: j.id,
        queue: j.name,
        state: j.state,
        attempts: j.retryCount + 1,
        createdAt: j.createdOn,
        failedAt: j.failedOn,
        error: jobErrorSummary(j.output),
        data: redactJobData(j.data),
        retried: retried.has(j.id),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

/**
 * Re-queues a failed job's original payload as a NEW job (pg-boss can't revive archived
 * ones). Each failed job can be retried once, so a double click can't enqueue it twice;
 * the retry is audited with both job ids.
 */
@Injectable()
export class RetryFailedJobUseCase {
  constructor(
    private readonly queue: QueueService,
    private readonly auditRepo: PlatformAuditRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(jobId: string, actor: AuditActor, meta: RequestMeta) {
    const job = await this.queue.findFailedJob(jobId);
    if (!job) throw new NotFoundException('Failed job not found — it may have been cleaned up');
    if (!KNOWN_QUEUES.has(job.name)) {
      throw new BadRequestException(`Jobs from "${job.name}" can't be retried from here`);
    }
    const already = await this.auditRepo.targetIdsWithAction(PlatformAuditAction.JOB_RETRIED, [jobId]);
    if (already.has(jobId)) throw new BadRequestException('This job was already retried');

    const newJobId = await this.queue.publish(job.name, (job.data ?? {}) as object);
    await this.audit.record({
      action: PlatformAuditAction.JOB_RETRIED,
      actor,
      targetType: 'Job',
      targetId: jobId,
      metadata: { queue: job.name, newJobId, error: jobErrorSummary(job.output, 300) },
      meta,
    });
    return { jobId, newJobId, queue: job.name };
  }
}
