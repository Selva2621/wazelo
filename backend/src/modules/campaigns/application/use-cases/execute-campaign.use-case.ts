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
import { readBatchPlanMetadata } from '../../domain/services/batch-plan';
import { AuditAction, CampaignStatus, UsageMetricType } from '@prisma/client';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';
import { isLocalMediaMissing, MEDIA_MISSING_REASON } from '@/infrastructure/storage/local-media';

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

    // 3. Verify session is connected (email campaigns send from the workspace's mailbox instead)
    if (campaign.channel !== 'EMAIL') {
      // Batches are dealt over the connected numbers of the pool, so one is enough
      const { pool } = readBatchPlanMetadata(campaign.metadata, campaign.sessionId);
      const connectedSessions = await this.sessionRepo.findConnectedByIdsAndOrg(pool, orgId);
      if (connectedSessions.length === 0) {
        throw new BadRequestException(
          'Connect at least one of this campaign\'s WhatsApp numbers before starting it',
        );
      }
    }

    // Uploaded media can be wiped by a server restart; every send would fail
    if (isLocalMediaMissing(campaign.mediaUrl)) {
      throw new BadRequestException(MEDIA_MISSING_REASON);
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
