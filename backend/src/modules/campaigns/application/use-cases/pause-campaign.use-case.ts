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
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction, CampaignStatus } from '@prisma/client';

@Injectable()
export class PauseCampaignUseCase {
  private readonly logger = new Logger(PauseCampaignUseCase.name);

  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly recipientRepo: CampaignRecipientRepository,
    private readonly stateMachine: CampaignStateMachineService,
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

    this.stateMachine.assertTransition(campaign.status, CampaignStatus.PAUSED);

    const updated = await this.campaignRepo.transitionStatus(
      campaignId,
      CampaignStatus.RUNNING,
      CampaignStatus.PAUSED,
    );

    if (!updated) {
      throw new BadRequestException(
        'Campaign status has already changed (concurrent modification)',
      );
    }

    // Mark remaining PENDING recipients as SKIPPED
    const skippedCount = await this.recipientRepo.markPendingAsSkipped(campaignId);

    await this.campaignRepo.recordEvent({
      campaignId,
      orgId,
      previousStatus: CampaignStatus.RUNNING,
      newStatus: CampaignStatus.PAUSED,
      triggeredById: userId,
      metadata: { skippedRecipients: skippedCount },
    });

    this.eventEmitter.emit(EVENT_NAMES.CAMPAIGN_PAUSED, {
      campaignId,
      orgId,
      pausedById: userId,
    });

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CAMPAIGN_PAUSED,
      targetType: 'Campaign',
      targetId: campaignId,
      metadata: { skippedRecipients: skippedCount },
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `Campaign ${campaignId} paused by user ${userId} (${skippedCount} recipients skipped)`,
    );

    return updated;
  }
}
