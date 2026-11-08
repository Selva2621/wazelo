import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '../../infrastructure/repositories/campaign-recipient.repository';
import { CampaignStateMachineService } from '../../domain/services/campaign-state-machine.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';
import { readBatchPlanMetadata } from '../../domain/services/batch-plan';
import { AuditAction, CampaignStatus, UsageMetricType, WhatsAppSessionStatus } from '@prisma/client';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';

@Injectable()
export class ResumeCampaignUseCase {
  private readonly logger = new Logger(ResumeCampaignUseCase.name);

  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly recipientRepo: CampaignRecipientRepository,
    private readonly stateMachine: CampaignStateMachineService,
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly messageRepo: MessageRepository,
    private readonly usageTracking: UsageTrackingService,
  ) {}

  async execute(
    campaignId: string,
    orgId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const campaign = await this.campaignRepo.findByIdAndOrg(campaignId, orgId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    this.stateMachine.assertTransition(campaign.status, CampaignStatus.RUNNING);

    // The plan's message limit is the campaign volume limit: resuming with none
    // left would only pause again on the first message.
    const usage = await this.usageTracking.checkUsage(orgId, UsageMetricType.MESSAGES_SENT);
    if (!usage.allowed && usage.limitValue > 0) {
      throw new BadRequestException(
        `Your plan's monthly message limit is used up (${usage.currentValue}/${usage.limitValue}). Upgrade your plan or wait for the next billing period, then resume.`,
      );
    }

    // If the campaign's WhatsApp number was logged out or banned, continue on a connected one
    // (email campaigns send from the workspace's mailbox: no number)
    let sessionId: string | null = null;
    if (campaign.channel !== 'EMAIL') {
      sessionId = await this.moveBatchesOffDeadNumbers(campaign, orgId, userId);
    }

    // Reset SKIPPED recipients back to PENDING for re-processing
    const resetCount = await this.recipientRepo.resetSkippedToPending(campaignId);

    const updated = await this.campaignRepo.transitionStatus(
      campaignId,
      CampaignStatus.PAUSED,
      CampaignStatus.RUNNING,
    );

    if (!updated) {
      throw new BadRequestException(
        'Campaign status has already changed (concurrent modification)',
      );
    }

    if (campaign.channel !== 'EMAIL') {
      await this.requeueHeldCampaignMessages(campaignId, orgId, sessionId);
    }

    // Re-publish execution job to process remaining recipients
    await this.queueService.publishOnce(
      QUEUE_NAMES.CAMPAIGN_EXECUTE,
      {
        campaignId,
        orgId,
        sessionId,
        resumed: true,
      },
      `campaign-resume-${campaignId}-${Date.now()}`,
    );

    await this.campaignRepo.recordEvent({
      campaignId,
      orgId,
      previousStatus: CampaignStatus.PAUSED,
      newStatus: CampaignStatus.RUNNING,
      triggeredById: userId,
      metadata: { resetRecipients: resetCount },
    });

    this.eventEmitter.emit(EVENT_NAMES.CAMPAIGN_RESUMED, {
      campaignId,
      orgId,
      resumedById: userId,
    });

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CAMPAIGN_RESUMED,
      targetType: 'Campaign',
      targetId: campaignId,
      metadata: { resetRecipients: resetCount },
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `Campaign ${campaignId} resumed by user ${userId} (${resetCount} recipients reset)`,
    );

    return updated;
  }

  private async requeueHeldCampaignMessages(
    campaignId: string,
    orgId: string,
    fallbackSessionId: string | null,
  ): Promise<void> {
    const queuedMessages = await this.recipientRepo.findQueuedMessages(campaignId);
    for (const queued of queuedMessages) {
      const sessionId = queued.sessionId ?? fallbackSessionId;
      if (!sessionId) {
        this.logger.warn(`Cannot re-queue held campaign message ${queued.messageId}: no WhatsApp session assigned`);
        continue;
      }

      if (!(await this.messageRepo.clearQueuedRetryAt(queued.messageId))) continue;

      await this.queueService.publishOnce(
        QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
        { messageId: queued.messageId, sessionId, orgId },
        `campaign-resume-message-${queued.messageId}-${Date.now()}`,
      );
    }
  }

  /**
   * Numbers that dropped (logged out, banned, unlinked) keep their unfinished
   * batches stuck. Move each such batch's PENDING recipients to a connected
   * number from the campaign's pool, round-robin; if none of the pool is
   * connected, fall back to the resuming user's / any connected org number.
   * Returns the campaign's (possibly new) primary number.
   */
  private async moveBatchesOffDeadNumbers(
    campaign: { id: string; sessionId: string | null; metadata: unknown },
    orgId: string,
    userId: string,
  ): Promise<string> {
    const { pool } = readBatchPlanMetadata(campaign.metadata, campaign.sessionId);
    const inUse = await this.recipientRepo.findUnfinishedSessionIds(campaign.id);
    const considered = [...new Set([...pool, ...inUse])];

    const connectedIds = new Set(
      (await this.sessionRepo.findConnectedByIdsAndOrg(considered, orgId)).map((s) => s.id),
    );
    let targets = pool.filter((id) => connectedIds.has(id));
    if (targets.length === 0) targets = [...connectedIds];
    if (targets.length === 0) {
      targets = [await this.resolveSendingSession(campaign.sessionId ?? '', orgId, userId)];
    }

    const deadIds = considered.filter((id) => !connectedIds.has(id) && !targets.includes(id));
    const stranded = await this.recipientRepo.findPendingBatchesOnSessions(campaign.id, deadIds);
    for (const [index, batchNumber] of stranded.entries()) {
      await this.recipientRepo.reassignBatchSession(campaign.id, batchNumber, targets[index % targets.length]);
    }

    const primary = campaign.sessionId && connectedIds.has(campaign.sessionId)
      ? campaign.sessionId
      : targets[0];
    if (primary !== campaign.sessionId) {
      await this.campaignRepo.moveToSession(campaign.id, primary);
    }
    if (stranded.length > 0) {
      this.logger.log(
        `Campaign ${campaign.id}: moved ${stranded.length} batch(es) off disconnected numbers onto ${targets.length} connected number(s)`,
      );
    }
    return primary;
  }

  /**
   * The campaign's own number if it's still connected; otherwise the resuming
   * user's connected number, then any connected number in the org.
   */
  private async resolveSendingSession(
    currentSessionId: string,
    orgId: string,
    userId: string,
  ): Promise<string> {
    const current = await this.sessionRepo.findByIdAndOrg(currentSessionId, orgId);
    // Only move off a number that is actually gone — not one briefly reconnecting
    if (current && current.status !== WhatsAppSessionStatus.DISCONNECTED) return current.id;

    const own = await this.sessionRepo.findActiveByUserId(userId, orgId);
    if (own?.status === WhatsAppSessionStatus.CONNECTED) return own.id;

    const any = await this.sessionRepo.findAnyActiveByOrgId(orgId);
    if (any) return any.id;

    throw new BadRequestException(
      'The WhatsApp number for this campaign is disconnected. Link a WhatsApp number, then resume.',
    );
  }
}
