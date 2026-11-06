import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus, WhatsAppSessionStatus } from '@prisma/client';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '../../infrastructure/repositories/campaign-recipient.repository';
import {
  campaignSendWindow,
  readSendAnyTime,
} from '@/modules/messages/domain/services/account-safety.service';
import type { CampaignBatchProgress } from '../../infrastructure/repositories/campaign-recipient.repository';

export type BatchState = 'done' | 'sending' | 'waiting' | 'blocked' | 'paused' | 'stopped';

export interface BatchSummary extends Omit<CampaignBatchProgress, 'failureReasons'> {
  state: BatchState;
  /** One short, actionable problem for an unfinished batch (null when fine) */
  issue: string | null;
  /** Most common failure reasons, biggest first (max 3) */
  topFailures: { reason: string; count: number }[];
  /** Kept for older clients: issue + failures as lines */
  issues: string[];
}

const MAX_FAILURE_REASONS = 3;

/**
 * One row per batch for the campaign page.
 * - Rows split by session (after a failover) are merged under the session that
 *   still has work, so a batch never shows twice.
 * - Number problems are reported only for batches that still have work while
 *   the campaign is running or paused: a finished batch is never "disconnected".
 */
export function summarizeBatches(
  rows: CampaignBatchProgress[],
  campaignStatus: CampaignStatus,
  now: Date,
): BatchSummary[] {
  const merged = new Map<number, CampaignBatchProgress>();
  for (const row of rows) {
    const existing = merged.get(row.batchNumber);
    if (!existing) {
      merged.set(row.batchNumber, { ...row, counts: { ...row.counts }, failureReasons: [...row.failureReasons] });
      continue;
    }
    const rowHasWork = row.counts.pending + row.counts.queued > 0;
    for (const key of Object.keys(existing.counts) as (keyof typeof existing.counts)[]) {
      existing.counts[key] += row.counts[key];
    }
    existing.failureReasons.push(...row.failureReasons);
    if (rowHasWork) {
      Object.assign(existing, {
        sessionId: row.sessionId,
        sessionPhoneNumber: row.sessionPhoneNumber,
        sessionStatus: row.sessionStatus,
        lastHeartbeatAt: row.lastHeartbeatAt,
        sendingPausedUntil: row.sendingPausedUntil,
        sendingPausedReason: row.sendingPausedReason,
      });
    }
  }

  const live = campaignStatus === CampaignStatus.RUNNING || campaignStatus === CampaignStatus.PAUSED;
  const sorted = [...merged.values()].sort((a, b) => a.batchNumber - b.batchNumber);
  const activeSessionSeen = new Set<string>();

  return sorted.map(({ failureReasons, ...batch }) => {
    const unfinished = batch.counts.pending + batch.counts.queued > 0;
    let issue: string | null = null;

    if (unfinished && live) {
      if (!batch.sessionId || !batch.sessionStatus) {
        issue = 'No WhatsApp number for this batch';
      } else if (batch.sessionStatus !== WhatsAppSessionStatus.CONNECTED) {
        issue = `Number ${batch.sessionStatus.toLowerCase()}`;
      // Session status is the source of truth (same as the header health chip);
      // the heartbeat timestamp lags after restarts and caused false alarms.
      } else if (batch.sendingPausedUntil && batch.sendingPausedUntil > now) {
        issue = batch.sendingPausedReason
          ? `Sending paused: ${batch.sendingPausedReason}`
          : 'Sending paused for this number';
      }
    }

    // Per number, the lowest unfinished batch is the one sending; later ones wait
    const sessionKey = batch.sessionId ?? '';
    let state: BatchState;
    if (!unfinished) state = 'done';
    else if (issue) state = 'blocked';
    // Nothing sends while the campaign is paused or after it ended
    else if (campaignStatus === CampaignStatus.PAUSED) state = 'paused';
    else if (!live) state = 'stopped';
    else if (batch.counts.queued > 0 || !activeSessionSeen.has(sessionKey)) state = 'sending';
    else state = 'waiting';
    if (unfinished) activeSessionSeen.add(sessionKey);

    const byReason = new Map<string, number>();
    for (const f of failureReasons) byReason.set(f.reason, (byReason.get(f.reason) ?? 0) + f.count);
    const topFailures = [...byReason.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_FAILURE_REASONS);

    return {
      ...batch,
      state,
      issue,
      topFailures,
      issues: [
        ...(issue ? [issue] : []),
        ...topFailures.map((f) => `${f.count} failed: ${f.reason}`),
      ],
    };
  });
}

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
    const batchProgress = summarizeBatches(batches, campaign.status, now);

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
      // Local hours (campaign time zone) WhatsApp campaign messages may go out
      sendWindow: campaign.channel === 'EMAIL'
        ? null
        : { ...campaignSendWindow(readSendAnyTime(campaign.metadata)), timeZone: campaign.timezone },
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
