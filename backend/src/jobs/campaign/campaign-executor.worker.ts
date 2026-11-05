import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { CampaignRepository } from '@/modules/campaigns/infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '@/modules/campaigns/infrastructure/repositories/campaign-recipient.repository';
import { AudienceResolverService } from '@/modules/campaigns/domain/services/audience-resolver.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { KillSwitchService } from '@/modules/billing/domain/services/kill-switch.service';
import { pauseCampaignForKillSwitch } from './kill-switch-pause';
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
  /** Null for email campaigns */
  sessionId: string | null;
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
    private readonly killSwitches: KillSwitchService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<CampaignExecuteJobData>(
      QUEUE_NAMES.CAMPAIGN_EXECUTE,
      async (job) => this.handle(job.data, job.id),
    );
    this.logger.log('CampaignExecutorWorker subscribed');
  }

  private async handle(data: CampaignExecuteJobData, jobId: string): Promise<void> {
    const { campaignId, orgId } = data;

    // 1. Load campaign and verify status
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      this.logger.warn(`Campaign ${campaignId} not found, skipping job ${jobId}`);
      return;
    }

    // Platform kill switch: a SCHEDULED campaign stays SCHEDULED (the scheduler
    // safety net starts it once the switch is off); a RUNNING one is paused with
    // its PENDING recipients intact, so a normal resume continues it.
    if (await this.killSwitches.isDisabled('campaigns')) {
      if (campaign.status === CampaignStatus.RUNNING) {
        await pauseCampaignForKillSwitch(this.campaignRepo, campaignId, orgId, this.eventEmitter);
        this.logger.warn(`Campaigns switched off platform-wide — paused campaign ${campaignId} (job ${jobId})`);
      } else {
        this.logger.warn(`Campaigns switched off platform-wide — not starting campaign ${campaignId} (${campaign.status}, job ${jobId})`);
      }
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
      // Resolve the audience once, then start every pending batch independently.
      const hasPending = await this.recipientRepo.hasPendingRecipients(campaignId);
      const hasQueued = await this.recipientRepo.hasQueuedRecipients(campaignId);

      if (!hasPending && !hasQueued) {
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

      await this.dispatchPendingBatches(campaignId, orgId);

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
    const audienceFilters = filters ? {
      contactIds: filters.contactIds as string[] | undefined,
      leadStatuses: filters.leadStatuses as string[] | undefined,
      tagIds: filters.tagIds as string[] | undefined,
      ownerIds: filters.ownerIds as string[] | undefined,
      sources: filters.sources as string[] | undefined,
    } : undefined;
    const isEmail = campaign.channel === 'EMAIL';
    const resolved = isEmail
      ? await this.audienceResolver.resolveEmailAudience(orgId, campaign.audienceType as CampaignAudienceType, audienceFilters)
      : await this.audienceResolver.resolveAudience(orgId, campaign.audienceType as CampaignAudienceType, audienceFilters);

    if (resolved.total === 0) {
      throw new Error(
        isEmail
          ? 'None of the selected contacts has an email address (or they all unsubscribed from email)'
          : 'No eligible recipients found for this campaign',
      );
    }

    const contacts = resolved.contacts;
    const total = resolved.total;

    if (total > CAMPAIGN_CONFIG.MAX_RECIPIENTS) {
      throw new Error(
        `Campaign exceeds maximum recipients limit (${total} > ${CAMPAIGN_CONFIG.MAX_RECIPIENTS})`,
      );
    }

    // Keep DB writes bounded while preserving the configured send batch number.
    const insertBatchSize = CAMPAIGN_CONFIG.BATCH_SIZE;
    const metadata = campaign.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata)
      ? campaign.metadata as Record<string, unknown>
      : {};
    const rawAssignments = metadata.batchSessionAssignments;
    const hasExplicitAssignments = Array.isArray(rawAssignments) && rawAssignments.length > 0;
    const assignmentByBatch = new Map<number, string>();
    if (hasExplicitAssignments) {
      for (const assignment of rawAssignments) {
        if (
          assignment &&
          typeof assignment === 'object' &&
          'batchNumber' in assignment &&
          'sessionId' in assignment &&
          typeof assignment.batchNumber === 'number' &&
          typeof assignment.sessionId === 'string'
        ) {
          assignmentByBatch.set(assignment.batchNumber, assignment.sessionId);
        }
      }
    }
    if (!isEmail && hasExplicitAssignments) {
      const batchCount = Math.ceil(total / CAMPAIGN_CONFIG.BATCH_SIZE);
      for (let batchNumber = 1; batchNumber <= batchCount; batchNumber++) {
        if (!assignmentByBatch.has(batchNumber)) {
          throw new Error(`No WhatsApp session is assigned to campaign batch ${batchNumber}`);
        }
      }
    }

    for (let i = 0; i < contacts.length; i += insertBatchSize) {
      const batch = contacts.slice(i, i + insertBatchSize);
      await this.recipientRepo.bulkCreate(
        batch.map((contact, idx) => {
          const batchNumber = Math.floor((i + idx) / CAMPAIGN_CONFIG.BATCH_SIZE) + 1;
          const assignedSessionId = isEmail
            ? null
            : hasExplicitAssignments
              ? assignmentByBatch.get(batchNumber) ?? null
              : typeof campaign.sessionId === 'string'
                ? campaign.sessionId
                : null;
          if (!isEmail && !assignedSessionId) {
            throw new Error(`No WhatsApp session is assigned to campaign batch ${batchNumber}`);
          }
          return {
            campaignId,
            orgId,
            contactId: contact.id,
            contactPhone: contact.phoneNumber,
            batchNumber,
            sessionId: assignedSessionId,
          };
        }),
      );
    }

    // Update total recipients
    await this.campaignRepo.updateTotalRecipients(campaignId, total);

    this.logger.log(
      `Campaign ${campaignId}: resolved ${total} recipients`,
    );
  }

  private async dispatchPendingBatches(campaignId: string, orgId: string): Promise<void> {
    const pendingBatchNumbers = await this.recipientRepo.getPendingBatchNumbers(campaignId);
    await Promise.all(pendingBatchNumbers.map((batchNumber) =>
      this.queueService.publishOnce(
        QUEUE_NAMES.CAMPAIGN_BATCH,
        { campaignId, orgId, batchNumber },
        `campaign-batch-${campaignId}-${batchNumber}`,
      ),
    ));
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
