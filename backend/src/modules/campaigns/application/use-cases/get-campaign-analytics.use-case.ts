import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus, WhatsAppSessionStatus } from '@prisma/client';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '../../infrastructure/repositories/campaign-recipient.repository';
import { WHATSAPP_CONFIG } from '@/common/constants';

@Injectable()
export class GetCampaignAnalyticsUseCase {
  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly recipientRepo: CampaignRecipientRepository,
  ) {}

  async execute(campaignId: string, orgId: string) {
    const campaign = await this.campaignRepo.findByIdAndOrg(campaignId, orgId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const [recipientCounts, batches, statusEvents] = await Promise.all([
      this.recipientRepo.countByStatus(campaignId),
      this.recipientRepo.getBatchProgress(campaignId),
      this.campaignRepo.findStatusEvents(campaignId),
    ]);
    const now = new Date();
    const elapsedMs = this.calculateElapsedMs(campaign, statusEvents, now);
    const batchProgress = batches.map((batch) => {
      const issues: string[] = [];
      if (!batch.sessionId) {
        issues.push('No WhatsApp session is assigned to this batch');
      } else if (!batch.sessionStatus) {
        issues.push('WhatsApp session is unavailable');
      } else if (batch.sessionStatus !== WhatsAppSessionStatus.CONNECTED) {
        issues.push(`WhatsApp session is ${batch.sessionStatus.toLowerCase()}`);
      } else if (
        !batch.lastHeartbeatAt ||
        now.getTime() - batch.lastHeartbeatAt.getTime() > WHATSAPP_CONFIG.DISCONNECT_DETECTION_TIMEOUT_MS
      ) {
        issues.push('WhatsApp session heartbeat is stale');
      }

      if (batch.sendingPausedUntil && batch.sendingPausedUntil > now) {
        issues.push(
          batch.sendingPausedReason
            ? `Bulk sending paused: ${batch.sendingPausedReason}`
            : `Bulk sending paused until ${batch.sendingPausedUntil.toISOString()}`,
        );
      }
      for (const failure of batch.failureReasons) {
        issues.push(`${failure.count} failed: ${failure.reason}`);
      }

      return { ...batch, issues };
    });

    const totalProcessed =
      recipientCounts.sent +
      recipientCounts.delivered +
      recipientCounts.failed +
      recipientCounts.skipped;

    const deliveryRate =
      campaign.totalRecipients > 0
        ? ((recipientCounts.delivered / campaign.totalRecipients) * 100).toFixed(2)
        : '0.00';

    const failureRate =
      campaign.totalRecipients > 0
        ? ((recipientCounts.failed / campaign.totalRecipients) * 100).toFixed(2)
        : '0.00';

    // A read message was delivered even when WhatsApp skipped the delivered receipt
    const delivered = Math.max(campaign.deliveredCount, campaign.readCount);
    const readRate =
      delivered > 0 ? ((campaign.readCount / delivered) * 100).toFixed(2) : '0.00';

    return {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
      timing: {
        elapsedMs,
        asOf: now.toISOString(),
      },
      batches: batchProgress,
      metrics: {
        totalRecipients: campaign.totalRecipients,
        sent: campaign.sentCount,
        delivered,
        failed: campaign.failedCount,
        read: campaign.readCount,
        skipped: recipientCounts.skipped,
        pending: recipientCounts.pending,
        queued: recipientCounts.queued,
      },
      rates: {
        deliveryRate: parseFloat(deliveryRate),
        failureRate: parseFloat(failureRate),
        readRate: parseFloat(readRate),
      },
      progress: {
        processed: totalProcessed,
        remaining: recipientCounts.pending + recipientCounts.queued,
        percentComplete:
          campaign.totalRecipients > 0
            ? parseFloat(
                ((totalProcessed / campaign.totalRecipients) * 100).toFixed(2),
              )
            : 0,
      },
    };
  }

  private calculateElapsedMs(
    campaign: { status: CampaignStatus; startedAt: Date | null; completedAt?: Date | null; updatedAt?: Date },
    events: { newStatus: CampaignStatus; createdAt: Date }[],
    now: Date,
  ): number {
    let activeSince: Date | null = null;
    let elapsedMs = 0;
    let sawRunningEvent = false;

    for (const event of events) {
      if (event.newStatus === CampaignStatus.RUNNING) {
        if (!activeSince) {
          activeSince = !sawRunningEvent && campaign.startedAt
            ? campaign.startedAt
            : event.createdAt;
          sawRunningEvent = true;
        }
      } else if (activeSince) {
        elapsedMs += Math.max(0, event.createdAt.getTime() - activeSince.getTime());
        activeSince = null;
      }
    }

    if (!sawRunningEvent && campaign.startedAt) {
      activeSince = campaign.startedAt;
    }
    if (activeSince) {
      const end = campaign.status === CampaignStatus.RUNNING
        ? now
        : campaign.completedAt ?? campaign.updatedAt ?? now;
      elapsedMs += Math.max(0, end.getTime() - activeSince.getTime());
    }

    return elapsedMs;
  }
}
