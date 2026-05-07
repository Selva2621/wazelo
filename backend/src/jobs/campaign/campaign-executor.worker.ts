import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { CampaignRepository } from '@/modules/campaigns/infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '@/modules/campaigns/infrastructure/repositories/campaign-recipient.repository';
import { AudienceResolverService } from '@/modules/campaigns/domain/services/audience-resolver.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import {
  QUEUE_NAMES,
  EVENT_NAMES,
  CAMPAIGN_CONFIG,
} from '@/common/constants';
import {
  AuditAction,
  CampaignStatus,
  CampaignAudienceType,
} from '@prisma/client';

interface CampaignExecuteJobData {
  campaignId: string;
  orgId: string;
  sessionId: string;
  scheduled?: boolean;
  resumed?: boolean;
}

@Injectable()
export class CampaignExecutorWorker implements OnModuleInit {
  private readonly logger = new Logger(CampaignExecutorWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly campaignRepo: CampaignRepository,
    private readonly recipientRepo: CampaignRecipientRepository,
    private readonly audienceResolver: AudienceResolverService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<CampaignExecuteJobData>(
      QUEUE_NAMES.CAMPAIGN_EXECUTE,
      async (job) => this.handle(job.data, job.id),
    );
    this.logger.log('CampaignExecutorWorker subscribed');
  }

  private async handle(data: CampaignExecuteJobData, jobId: string): Promise<void> {
    const { campaignId, orgId, sessionId } = data;

    // 1. Load campaign and verify status
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      this.logger.warn(`Campaign ${campaignId} not found, skipping job ${jobId}`);
      return;
    }

    // For scheduled campaigns, transition SCHEDULED → RUNNING first
    if (data.scheduled && campaign.status === CampaignStatus.SCHEDULED) {
      const transitioned = await this.campaignRepo.transitionStatus(
        campaignId,
        CampaignStatus.SCHEDULED,
        CampaignStatus.RUNNING,
        { startedAt: new Date() },
      );

      if (transitioned) {
        await this.campaignRepo.recordEvent({
          campaignId,
          orgId,
          previousStatus: CampaignStatus.SCHEDULED,
          newStatus: CampaignStatus.RUNNING,
          metadata: { triggeredBy: 'delayed-job' },
        });
      } else {
        // Already transitioned (by scheduler worker) — continue execution
        this.logger.log(`Campaign ${campaignId} already transitioned from SCHEDULED, continuing execution`);
      }
    }

    // Must be RUNNING to proceed
    const currentCampaign = await this.campaignRepo.findById(campaignId);
    if (!currentCampaign || currentCampaign.status !== CampaignStatus.RUNNING) {
      this.logger.log(`Campaign ${campaignId} is not RUNNING (${currentCampaign?.status}), skipping`);
      return;
    }

    try {
      // 2. Check if recipients already exist (resume scenario)
      const hasPending = await this.recipientRepo.hasPendingRecipients(campaignId);

      if (!hasPending) {
        // Check if any recipients exist at all (completed batches from previous run)
        const existingCount = await this.recipientRepo.countByCampaign(campaignId);

        if (existingCount === 0) {
          // Fresh execution: resolve audience
          await this.resolveAndCreateRecipients(campaignId, orgId, currentCampaign);
        } else {
          // All recipients processed already — mark complete
          this.logger.log(`Campaign ${campaignId}: all ${existingCount} recipients already processed`);
          await this.completeCampaign(campaignId, orgId);
          return;
        }
      }

      // 3. Dispatch batch jobs for PENDING recipients
      await this.dispatchBatches(campaignId, orgId, sessionId);

    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Campaign ${campaignId} execution failed: ${reason}`);

      await this.campaignRepo.transitionStatus(
        campaignId,
        CampaignStatus.RUNNING,
        CampaignStatus.FAILED,
        { completedAt: new Date() },
      );

      await this.campaignRepo.recordEvent({
        campaignId,
        orgId,
        previousStatus: CampaignStatus.RUNNING,
        newStatus: CampaignStatus.FAILED,
        metadata: { reason },
      });

      this.eventEmitter.emit(EVENT_NAMES.CAMPAIGN_FAILED, {
        campaignId,
        orgId,
        reason,
      });

      await this.auditService.log({
        orgId,
        action: AuditAction.CAMPAIGN_FAILED,
        targetType: 'Campaign',
        targetId: campaignId,
        metadata: { reason },
      });
    }
  }

  private async resolveAndCreateRecipients(
    campaignId: string,
    orgId: string,
    campaign: Record<string, any>,
  ): Promise<void> {
    // Resolve audience
    const filters = campaign.audienceFilters as Record<string, unknown> | null;
    const { contacts, total } = await this.audienceResolver.resolveAudience(
      orgId,
      campaign.audienceType as CampaignAudienceType,
      filters ? {
        leadStatuses: filters.leadStatuses as string[] | undefined,
        tagIds: filters.tagIds as string[] | undefined,
        ownerIds: filters.ownerIds as string[] | undefined,
        sources: filters.sources as string[] | undefined,
      } : undefined,
    );

    if (total === 0) {
      throw new Error('No eligible recipients found for this campaign');
    }

    if (total > CAMPAIGN_CONFIG.MAX_RECIPIENTS) {
      throw new Error(
        `Campaign exceeds maximum recipients limit (${total} > ${CAMPAIGN_CONFIG.MAX_RECIPIENTS})`,
      );
    }

    // Bulk insert recipients in batches of 1000
    const insertBatchSize = 1000;
    for (let i = 0; i < contacts.length; i += insertBatchSize) {
      const batch = contacts.slice(i, i + insertBatchSize);
      await this.recipientRepo.bulkCreate(
        batch.map((contact, idx) => ({
          campaignId,
          orgId,
          contactId: contact.id,
          contactPhone: contact.phoneNumber,
          batchNumber: Math.floor((i + idx) / CAMPAIGN_CONFIG.BATCH_SIZE) + 1,
        })),
      );
    }

    // Update total recipients
    await this.campaignRepo.updateTotalRecipients(campaignId, total);

    this.logger.log(
      `Campaign ${campaignId}: resolved ${total} recipients`,
    );
  }

  private async dispatchBatches(
    campaignId: string,
    orgId: string,
    sessionId: string,
  ): Promise<void> {
    const maxBatch = await this.recipientRepo.getMaxBatchNumber(campaignId);

    // Find batches that still have PENDING recipients
    const pendingBatches: number[] = [];
    for (let batch = 1; batch <= maxBatch; batch++) {
      const recipients = await this.recipientRepo.findPendingByBatch(campaignId, batch);
      if (recipients.length > 0) {
        pendingBatches.push(batch);
      }
    }

    this.logger.log(
      `Campaign ${campaignId}: dispatching ${pendingBatches.length} batch jobs`,
    );

    for (let i = 0; i < pendingBatches.length; i++) {
      const batchNumber = pendingBatches[i];
      const delaySeconds = i * CAMPAIGN_CONFIG.BATCH_DELAY_SECONDS;

      if (delaySeconds > 0) {
        await this.queueService.publishDelayed(
          QUEUE_NAMES.CAMPAIGN_BATCH,
          { campaignId, batchNumber, orgId, sessionId },
          delaySeconds,
          { singletonKey: `campaign-batch-${campaignId}-${batchNumber}` },
        );
      } else {
        await this.queueService.publishOnce(
          QUEUE_NAMES.CAMPAIGN_BATCH,
          { campaignId, batchNumber, orgId, sessionId },
          `campaign-batch-${campaignId}-${batchNumber}`,
        );
      }
    }
  }

  private async completeCampaign(campaignId: string, orgId: string): Promise<void> {
    await this.campaignRepo.transitionStatus(
      campaignId,
      CampaignStatus.RUNNING,
      CampaignStatus.COMPLETED,
      { completedAt: new Date() },
    );

    await this.campaignRepo.recordEvent({
      campaignId,
      orgId,
      previousStatus: CampaignStatus.RUNNING,
      newStatus: CampaignStatus.COMPLETED,
    });

    const campaign = await this.campaignRepo.findById(campaignId);
    if (campaign) {
      this.eventEmitter.emit(EVENT_NAMES.CAMPAIGN_COMPLETED, {
        campaignId,
        orgId,
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
      });
    }
  }
}
