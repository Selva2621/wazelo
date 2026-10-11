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
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';
import { AuditAction, CampaignStatus, WhatsAppSessionStatus } from '@prisma/client';

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

    // If the campaign's WhatsApp number was logged out or banned, continue on a connected one
    const sessionId = await this.resolveSendingSession(campaign.sessionId, orgId, userId);
    if (sessionId !== campaign.sessionId) {
      await this.campaignRepo.moveToSession(campaignId, sessionId);
      this.logger.log(`Campaign ${campaignId} moved from session ${campaign.sessionId} to ${sessionId}`);
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
