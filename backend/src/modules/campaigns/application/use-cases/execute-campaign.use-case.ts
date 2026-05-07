import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { CampaignStateMachineService } from '../../domain/services/campaign-state-machine.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';
import { AuditAction, CampaignStatus, UsageMetricType } from '@prisma/client';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';

@Injectable()
export class ExecuteCampaignUseCase {
  private readonly logger = new Logger(ExecuteCampaignUseCase.name);

  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly stateMachine: CampaignStateMachineService,
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly usageTracking: UsageTrackingService,
  ) {}

  async execute(
    campaignId: string,
    orgId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Load campaign
    const campaign = await this.campaignRepo.findByIdAndOrg(campaignId, orgId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // 2. Verify valid transition
    this.stateMachine.assertTransition(campaign.status, CampaignStatus.RUNNING);

    // 3. Verify session is connected
    const session = await this.sessionRepo.findByIdAndOrg(campaign.sessionId, orgId);
    if (!session || session.status !== 'CONNECTED') {
      throw new BadRequestException(
        'WhatsApp session is not connected. Connect via QR first.',
      );
    }

    // 4. If scheduled in the future, don't execute now
    if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
      throw new BadRequestException(
        'Campaign is scheduled for a future time. Use the schedule endpoint instead.',
      );
    }

    // 5. Atomically transition → RUNNING
    const updated = await this.campaignRepo.transitionStatus(
      campaignId,
      campaign.status,
      CampaignStatus.RUNNING,
      { startedAt: new Date() },
    );

    if (!updated) {
      throw new BadRequestException(
        'Campaign status has already changed (concurrent modification)',
      );
    }

    // 6. Record event
    await this.campaignRepo.recordEvent({
      campaignId,
      orgId,
      previousStatus: campaign.status,
      newStatus: CampaignStatus.RUNNING,
      triggeredById: userId,
    });

    // 7. Publish execution job to queue
    await this.queueService.publishOnce(
      QUEUE_NAMES.CAMPAIGN_EXECUTE,
      {
        campaignId,
        orgId,
        sessionId: campaign.sessionId,
      },
      `campaign-exec-${campaignId}`,
    );

    // 8. Emit event
    this.eventEmitter.emit(EVENT_NAMES.CAMPAIGN_STARTED, {
      campaignId,
      orgId,
      totalRecipients: 0, // Will be updated by executor worker
    });

    // 9. Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CAMPAIGN_STARTED,
      targetType: 'Campaign',
      targetId: campaignId,
      metadata: { sessionId: campaign.sessionId },
      ipAddress,
      userAgent,
    });

    // Increment campaign execution usage counter
    await this.usageTracking.incrementUsage(orgId, UsageMetricType.CAMPAIGN_EXECUTIONS, 1);

    this.logger.log(`Campaign ${campaignId} execution started by user ${userId}`);

    return updated;
  }
}
