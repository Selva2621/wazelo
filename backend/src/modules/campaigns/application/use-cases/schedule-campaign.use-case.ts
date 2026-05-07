import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { CampaignStateMachineService } from '../../domain/services/campaign-state-machine.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';
import { AuditAction, CampaignStatus } from '@prisma/client';

@Injectable()
export class ScheduleCampaignUseCase {
  private readonly logger = new Logger(ScheduleCampaignUseCase.name);

  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly stateMachine: CampaignStateMachineService,
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    campaignId: string,
    orgId: string,
    userId: string,
    scheduledAt: string,
    timezone: string,
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Load campaign
    const campaign = await this.campaignRepo.findByIdAndOrg(campaignId, orgId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // 2. Verify valid transition
    this.stateMachine.assertTransition(campaign.status, CampaignStatus.SCHEDULED);

    // 3. Validate scheduledAt is in the future
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Invalid scheduledAt date');
    }
    // Allow 60s buffer to account for create → schedule roundtrip
    const bufferMs = 60_000;
    if (scheduledDate.getTime() <= Date.now() - bufferMs) {
      throw new BadRequestException('scheduledAt must be in the future');
    }

    // 4. Transition → SCHEDULED
    const updated = await this.campaignRepo.transitionStatus(
      campaignId,
      campaign.status,
      CampaignStatus.SCHEDULED,
      {
        scheduledAt: scheduledDate,
        timezone: timezone || 'UTC',
      },
    );

    if (!updated) {
      throw new BadRequestException(
        'Campaign status has already changed (concurrent modification)',
      );
    }

    // 5. Publish delayed job — pg-boss will fire at the scheduled time
    const delaySeconds = Math.max(
      0,
      Math.floor((scheduledDate.getTime() - Date.now()) / 1000),
    );

    await this.queueService.publishDelayed(
      QUEUE_NAMES.CAMPAIGN_EXECUTE,
      {
        campaignId,
        orgId,
        sessionId: campaign.sessionId,
        scheduled: true,
      },
      delaySeconds,
      { singletonKey: `campaign-scheduled-${campaignId}` },
    );

    // 6. Record event
    await this.campaignRepo.recordEvent({
      campaignId,
      orgId,
      previousStatus: campaign.status,
      newStatus: CampaignStatus.SCHEDULED,
      triggeredById: userId,
      metadata: { scheduledAt, timezone },
    });

    // 7. Emit event
    this.eventEmitter.emit(EVENT_NAMES.CAMPAIGN_SCHEDULED, {
      campaignId,
      orgId,
      scheduledAt,
      timezone,
    });

    // 8. Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CAMPAIGN_SCHEDULED,
      targetType: 'Campaign',
      targetId: campaignId,
      metadata: { scheduledAt, timezone, delaySeconds },
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `Campaign ${campaignId} scheduled for ${scheduledAt} (${timezone}) by user ${userId}`,
    );

    return updated;
  }
}
