import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { QueueService } from "@/infrastructure/queue/queue.service";
import { CampaignRepository } from "@/modules/campaigns/infrastructure/repositories/campaign.repository";
import { CampaignRecipientRepository } from "@/modules/campaigns/infrastructure/repositories/campaign-recipient.repository";
import {
  AudienceResolverService,
  type AudienceFilters,
} from "@/modules/campaigns/domain/services/audience-resolver.service";
import { AuditService } from "@/modules/audit/domain/services/audit.service";
import { KillSwitchService } from "@/modules/billing/domain/services/kill-switch.service";
import { pauseCampaignForKillSwitch } from "./kill-switch-pause";
import { WhatsAppSessionRepository } from "@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository";
import { CampaignBatchDispatcher } from "@/modules/campaigns/application/services/campaign-batch-dispatcher.service";
import {
  batchCountFor,
  planBatchSessions,
  readBatchPlanMetadata,
} from "@/modules/campaigns/domain/services/batch-plan";
import { QUEUE_NAMES, EVENT_NAMES, CAMPAIGN_CONFIG } from "@/common/constants";
import {
  AuditAction,
  CampaignStatus,
  CampaignAudienceType,
} from "@prisma/client";

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
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly batchDispatcher: CampaignBatchDispatcher,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<CampaignExecuteJobData>(
      QUEUE_NAMES.CAMPAIGN_EXECUTE,
      async (job) => this.handle(job.data, job.id),
    );

    this.logger.log("CampaignExecutorWorker subscribed");
  }

  private async handle(
    data: CampaignExecuteJobData,
    jobId: string,
  ): Promise<void> {
    const { campaignId, orgId } = data;

    // 1. Load campaign and verify status
    const campaign = await this.campaignRepo.findById(campaignId);

    if (!campaign) {
      this.logger.warn(
        `Campaign ${campaignId} not found, skipping job ${jobId}`,
      );
      return;
    }

    // Platform kill switch
    if (await this.killSwitches.isDisabled("campaigns")) {
      if (campaign.status === CampaignStatus.RUNNING) {
        await pauseCampaignForKillSwitch(
          this.campaignRepo,
          campaignId,
          orgId,
          this.eventEmitter,
        );

        this.logger.warn(
          `Campaigns switched off platform-wide — paused campaign ${campaignId} (job ${jobId})`,
        );
      } else {
        this.logger.warn(
          `Campaigns switched off platform-wide — not starting campaign ${campaignId} (${campaign.status}, job ${jobId})`,
        );
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
          metadata: { triggeredBy: "delayed-job" },
        });
      } else {
        this.logger.log(
          `Campaign ${campaignId} already transitioned from SCHEDULED, continuing execution`,
        );
      }
    }

    // Must be RUNNING to proceed
    const currentCampaign = await this.campaignRepo.findById(campaignId);

    if (!currentCampaign || currentCampaign.status !== CampaignStatus.RUNNING) {
      this.logger.log(
        `Campaign ${campaignId} is not RUNNING (${currentCampaign?.status}), skipping`,
      );
      return;
    }

    try {
      // Resolve the audience once, then start every pending batch independently.
      const hasPending =
        await this.recipientRepo.hasPendingRecipients(campaignId);
      const hasQueued =
        await this.recipientRepo.hasQueuedRecipients(campaignId);

      if (!hasPending && !hasQueued) {
        // Check if any recipients exist at all (completed batches from previous run)
        const existingCount =
          await this.recipientRepo.countByCampaign(campaignId);

        if (existingCount === 0) {
          // Fresh execution: resolve audience
          await this.resolveAndCreateRecipients(
            campaignId,
            orgId,
            currentCampaign,
          );
        } else {
          // All recipients processed already
          this.logger.log(
            `Campaign ${campaignId}: all ${existingCount} recipients already processed`,
          );

          await this.completeCampaign(campaignId, orgId);
          return;
        }
      }

      await this.dispatchPendingBatches(
        campaignId,
        orgId,
        currentCampaign.channel ?? null,
      );
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
        targetType: "Campaign",
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
    // Pass every stored filter through, exactly as the audience preview does.
    // (Picking fields by hand dropped saved groups, products, teams, scrape runs…
    // so a "send to group X" campaign went to everyone matching the other filters.)
    const filters = campaign.audienceFilters;
    const audienceFilters =
      filters && typeof filters === "object" && !Array.isArray(filters)
        ? (filters as AudienceFilters)
        : undefined;
    const isEmail = campaign.channel === "EMAIL";
    const resolved = isEmail
      ? await this.audienceResolver.resolveEmailAudience(
          orgId,
          campaign.audienceType as CampaignAudienceType,
          audienceFilters,
        )
      : await this.audienceResolver.resolveAudience(
          orgId,
          campaign.audienceType as CampaignAudienceType,
          audienceFilters,
        );

    if (resolved.total === 0) {
      throw new Error(
        isEmail
          ? "None of the selected contacts has an email address (or they all unsubscribed from email)"
          : "No eligible recipients found for this campaign",
      );
    }

    // Include all resolved contacts.
    // No filtering based on whether the contact messaged first.
    const contacts = resolved.contacts;
    const total = contacts.length;

    if (total === 0) {
      throw new Error("No eligible recipients found for this campaign");
    }

    if (total > CAMPAIGN_CONFIG.MAX_RECIPIENTS) {
      throw new Error(
        `Campaign exceeds maximum recipients limit (${total} > ${CAMPAIGN_CONFIG.MAX_RECIPIENTS})`,
      );
    }

    // Batches are planned now (not at creation), so a scheduled campaign whose
    // audience grew still gets a number for every batch: overrides first, the
    // rest dealt round-robin over the selected numbers that are connected.
    const insertBatchSize = CAMPAIGN_CONFIG.BATCH_SIZE;
    const batchCount = batchCountFor(total, CAMPAIGN_CONFIG.BATCH_SIZE);
    let sessionByBatch = new Map<number, string>();
    if (!isEmail) {
      const { pool, overrides } = readBatchPlanMetadata(
        campaign.metadata,
        typeof campaign.sessionId === "string" ? campaign.sessionId : null,
      );
      const connected = new Set(
        (await this.sessionRepo.findConnectedByIdsAndOrg(pool, orgId)).map(
          (s) => s.id,
        ),
      );
      // Prefer connected numbers; if none is connected right now keep the plan
      // (the send worker holds messages until the number is back).
      const usablePool = pool.filter((id) => connected.has(id));
      sessionByBatch = planBatchSessions(
        batchCount,
        usablePool.length > 0 ? usablePool : pool,
        overrides,
      );
      if (sessionByBatch.size === 0) {
        throw new Error("No WhatsApp number is selected for this campaign");
      }
    }

    for (let i = 0; i < contacts.length; i += insertBatchSize) {
      const batch = contacts.slice(i, i + insertBatchSize);

      await this.recipientRepo.bulkCreate(
        batch.map((contact, idx) => {
          const batchNumber =
            Math.floor((i + idx) / CAMPAIGN_CONFIG.BATCH_SIZE) + 1;
          const assignedSessionId = isEmail
            ? null
            : (sessionByBatch.get(batchNumber) ?? null);
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

    this.logger.log(`Campaign ${campaignId}: resolved ${total} recipients`);
  }

  private async dispatchPendingBatches(
    campaignId: string,
    orgId: string,
    channel: string | null,
  ): Promise<void> {
    // Resumed campaigns may have recipients stuck QUEUED from before the pause
    await this.batchDispatcher.repairStuckRecipients(campaignId, orgId);
    await this.batchDispatcher.dispatch(campaignId, orgId, channel);
  }

  private async completeCampaign(
    campaignId: string,
    orgId: string,
  ): Promise<void> {
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
