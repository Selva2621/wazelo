import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { ProcessLeadAdUseCase } from '@/modules/lead-ads/application/use-cases/process-lead-ad.use-case';
import { LeadAdRepository } from '@/modules/lead-ads/infrastructure/repositories/lead-ad.repository';
import { QUEUE_NAMES, LEAD_ADS_CONFIG } from '@/common/constants';

interface ProcessLeadAdJobData {
  leadAdEntryId: string;
  orgId: string;
  leadgenId: string;
}

@Injectable()
export class ProcessLeadAdWorker implements OnModuleInit {
  private readonly logger = new Logger(ProcessLeadAdWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly processUseCase: ProcessLeadAdUseCase,
    private readonly leadAdRepo: LeadAdRepository,
  ) {}

  async onModuleInit() {
    await this.queueService.subscribeConcurrent<ProcessLeadAdJobData>(
      QUEUE_NAMES.PROCESS_LEAD_AD,
      async (job) => this.handle(job.data, job.id),
      LEAD_ADS_CONFIG.WORKER_CONCURRENCY,
    );

    this.logger.log('ProcessLeadAdWorker subscribed');
  }

  private async handle(
    data: ProcessLeadAdJobData,
    jobId: string,
  ): Promise<void> {
    const { leadAdEntryId, leadgenId } = data;

    try {
      await this.processUseCase.execute(leadAdEntryId);
    } catch (error: any) {
      // Check if we should retry
      const entry = await this.leadAdRepo.findById(leadAdEntryId);
      if (!entry) return;

      if (entry.retryCount < LEAD_ADS_CONFIG.MAX_RETRY_COUNT) {
        const delay =
          LEAD_ADS_CONFIG.RETRY_BASE_DELAY_SECONDS *
          Math.pow(2, entry.retryCount);

        this.logger.warn(
          `Lead ${leadgenId} failed, retry ${entry.retryCount}/${LEAD_ADS_CONFIG.MAX_RETRY_COUNT} in ${delay}s: ${error.message}`,
        );

        // Re-queue with delay
        await this.leadAdRepo.update(leadAdEntryId, {
          status: 'PENDING',
        });

        await this.queueService.publishDelayed(
          QUEUE_NAMES.PROCESS_LEAD_AD,
          data,
          delay,
          { singletonKey: `lead-${leadgenId}` },
        );
      } else {
        this.logger.error(
          `Lead ${leadgenId} permanently failed after ${entry.retryCount} retries: ${error.message}`,
        );
      }
    }
  }
}
