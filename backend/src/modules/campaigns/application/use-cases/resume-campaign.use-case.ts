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
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';
import { AuditAction, CampaignStatus } from '@prisma/client';

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
        sessionId: campaign.sessionId,
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
}
