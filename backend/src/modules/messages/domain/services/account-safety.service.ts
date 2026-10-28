import { Injectable } from '@nestjs/common';
import {
  CampaignRecipientStatus,
  CampaignStatus,
  MessageDirection,
  MessageStatus,
  SequenceRecipientStatus,
  SequenceStatus,
} from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { SEND_SAFETY_CONFIG } from '@/common/constants';
import {
  BulkSendDecision,
  HealthVerdict,
  decideBulkSend,
  evaluateDeliveryHealth,
  isWithinSendWindow,
  localDayStart,
  warmupTier,
} from './send-safety.policy';

const TZ_CACHE_MS = 10 * 60 * 1000;
/** How often a message of a paused sequence re-checks whether it may go out */
const SEQUENCE_PAUSE_RECHECK_MS = 15 * 60 * 1000;
/** Rolling window for the per-contact limit on business-started messages */
const CONTACT_BUDGET_WINDOW_MS = 24 * 60 * 60 * 1000;

export type BulkRelevance =
  | { action: 'send' }
  | { action: 'hold'; reason: string; retryAt: Date }
  | { action: 'drop'; reason: string; recipientStatus: CampaignRecipientStatus };

export interface SendHealth {
  sessionId: string;
  warmup: { stage: number; linkedDays: number; coldCap: number; bulkCap: number };
  today: { bulkSent: number; coldSent: number };
  delivery: { sampled: number; delivered: number; rate: number | null };
  optOuts24h: number;
  withinSendingHours: boolean;
  sendingHours: { start: number; end: number; timeZone: string };
  paused: { until: string; reason: string | null } | null;
  /** ok | warning (close to a cap or weak delivery) | paused */
  risk: 'ok' | 'warning' | 'paused';
}

/**
 * Feeds the pure send-safety policy with real counts for one WhatsApp number:
 * warm-up caps, sending hours, delivery health and auto-pause.
 */
@Injectable()
export class AccountSafetyService {
  private readonly tzCache = new Map<string, { timeZone: string; at: number }>();

  constructor(private readonly prisma: PrismaService) {}

  /** Should this bulk message go out now? */
  async checkBulkSend(orgId: string, sessionId: string, contactPhone: string, now = new Date()): Promise<BulkSendDecision> {
    const session = await this.prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
      select: { linkedAt: true, createdAt: true, sendingPausedUntil: true, sendingPausedReason: true },
    });
    if (!session) return { allowed: true };

    const timeZone = await this.orgTimeZone(orgId);
    const dayStart = localDayStart(now, timeZone);
    const [bulkSentToday, coldSentToday, recipientIsCold] = await Promise.all([
      this.countBulkSentSince(sessionId, dayStart),
      this.countColdBulkSentSince(sessionId, dayStart),
      this.isCold(orgId, contactPhone),
    ]);

    const decision = decideBulkSend({
      now,
      timeZone,
      linkedAt: session.linkedAt ?? session.createdAt,
      pausedUntil: session.sendingPausedUntil,
      pausedReason: session.sendingPausedReason,
      bulkSentToday,
      coldSentToday,
      recipientIsCold,
    });

    if (decision.allowed) {
      // One person, many features: campaigns, sequences and automations together
      // may only start this many conversations with a contact per rolling 24h
      const contactHold = await this.contactBudgetHold(orgId, contactPhone, now);
      if (contactHold) return contactHold;
    }

    // Spread the restart so held messages don't all fire at the same minute
    if (!decision.allowed && decision.retryAt.getTime() > now.getTime() + 60_000) {
      const jitter = Math.round(Math.random() * SEND_SAFETY_CONFIG.BULK_RESUME_JITTER_MS);
      return { ...decision, retryAt: new Date(decision.retryAt.getTime() + jitter) };
    }
    return decision;
  }

  /**
   * Held when the contact already got the daily number of business-started messages
   * (campaign, sequence, automation) in the last 24h; retried once the oldest one ages out.
   */
  private async contactBudgetHold(
    orgId: string,
    contactPhone: string,
    now: Date,
  ): Promise<BulkSendDecision | null> {
    const digits = contactPhone.replace(/^\+/, '');
    const recent = await this.prisma.message.findMany({
      where: {
        orgId,
        direction: MessageDirection.OUTBOUND,
        deletedAt: null,
        priority: { lt: 0 },
        contactPhone: { in: [digits, `+${digits}`] },
        sentAt: { gte: new Date(now.getTime() - CONTACT_BUDGET_WINDOW_MS) },
      },
      select: { sentAt: true },
      orderBy: { sentAt: 'asc' },
      take: SEND_SAFETY_CONFIG.MAX_BULK_PER_CONTACT_PER_DAY,
    });
    if (recent.length < SEND_SAFETY_CONFIG.MAX_BULK_PER_CONTACT_PER_DAY) return null;
    const oldest = recent[0].sentAt!;
    return {
      allowed: false,
      reason: `Contact already got ${SEND_SAFETY_CONFIG.MAX_BULK_PER_CONTACT_PER_DAY} messages from campaigns, sequences or automations today`,
      retryAt: new Date(oldest.getTime() + CONTACT_BUDGET_WINDOW_MS + 60_000),
    };
  }

  /**
   * Delivery health over bulk messages sent between 24h and 1h ago, plus opt-outs.
   * After the user resumes early, only data since the resume counts — otherwise
   * the same bad sample would re-pause the number at the next check.
   */
  async evaluateHealth(orgId: string, sessionId: string, now = new Date()): Promise<HealthVerdict & { sampled: number; delivered: number; optOuts: number }> {
    const session = await this.prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
      select: { healthResetAt: true },
    });
    const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
    const from = new Date(Math.max(dayAgo, session?.healthResetAt?.getTime() ?? 0));
    const to = new Date(now.getTime() - SEND_SAFETY_CONFIG.HEALTH_DELIVERY_GRACE_MS);

    const bulkInWindow = {
      sessionId,
      direction: MessageDirection.OUTBOUND,
      deletedAt: null,
      priority: { lt: 0 },
      sentAt: { gte: from, lt: to },
    };
    const [sampled, delivered, optOuts] = await Promise.all([
      this.prisma.message.count({ where: bulkInWindow }),
      this.prisma.message.count({
        where: {
          ...bulkInWindow,
          OR: [
            { deliveredAt: { not: null } },
            { status: { in: [MessageStatus.DELIVERED, MessageStatus.READ] } },
          ],
        },
      }),
      this.prisma.contact.count({ where: { orgId, optedOut: true, optedOutAt: { gte: from } } }),
    ]);

    const verdict = evaluateDeliveryHealth({ bulkSent: sampled, bulkDelivered: delivered, optOuts });
    return { ...verdict, sampled, delivered, optOuts };
  }

  /**
   * Is a queued bulk message still wanted? Paced and held messages can wait
   * hours, so the campaign/sequence may have been paused or cancelled, or the
   * contact may have opted out, since it was queued.
   */
  async checkBulkRelevance(
    orgId: string,
    message: { contactPhone: string; metadata: unknown },
    now = new Date(),
  ): Promise<BulkRelevance> {
    const digits = message.contactPhone.replace(/^\+/, '');
    const optedOut = await this.prisma.contact.findFirst({
      where: { orgId, deletedAt: null, optedOut: true, phoneNumber: { in: [digits, `+${digits}`] } },
      select: { id: true },
    });
    if (optedOut) return { action: 'drop', reason: 'Contact opted out', recipientStatus: CampaignRecipientStatus.SKIPPED };

    const metadata = (message.metadata ?? {}) as { campaignId?: string; sequenceId?: string };

    if (metadata.campaignId) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: metadata.campaignId },
        select: { status: true },
      });
      if (campaign?.status === CampaignStatus.CANCELLED) {
        return { action: 'drop', reason: 'Campaign cancelled', recipientStatus: CampaignRecipientStatus.SKIPPED };
      }
      if (campaign?.status === CampaignStatus.PAUSED) {
        // Back to PENDING: resuming the campaign creates and sends it again
        return { action: 'drop', reason: 'Campaign paused', recipientStatus: CampaignRecipientStatus.PENDING };
      }
    }

    if (metadata.sequenceId) {
      const sequence = await this.prisma.campaignSequence.findUnique({
        where: { id: metadata.sequenceId },
        select: { status: true },
      });
      if (sequence?.status === SequenceStatus.CANCELLED) {
        return { action: 'drop', reason: 'Sequence cancelled', recipientStatus: CampaignRecipientStatus.SKIPPED };
      }
      if (sequence?.status === SequenceStatus.PAUSED) {
        return { action: 'hold', reason: 'Sequence paused', retryAt: new Date(now.getTime() + SEQUENCE_PAUSE_RECHECK_MS) };
      }
      // The contact replied (or was removed) after this step was queued: don't send it
      const recipient = await this.prisma.sequenceRecipient.findFirst({
        where: { sequenceId: metadata.sequenceId, contactPhone: { in: [digits, `+${digits}`] } },
        select: { status: true },
      });
      if (recipient?.status === SequenceRecipientStatus.EXITED) {
        return { action: 'drop', reason: 'Contact left the sequence', recipientStatus: CampaignRecipientStatus.SKIPPED };
      }
    }

    return { action: 'send' };
  }

  /**
   * Take a queued bulk message out of the pipeline. Its campaign recipient goes
   * to `recipientStatus`; PENDING also frees the idempotency key so a resumed
   * campaign can create the message again.
   */
  async dropBulkMessage(
    messageId: string,
    reason: string,
    recipientStatus: CampaignRecipientStatus,
  ): Promise<void> {
    const release = recipientStatus === CampaignRecipientStatus.PENDING;
    await this.prisma.$transaction([
      this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: MessageStatus.FAILED,
          failedReason: reason,
          processingAt: null,
          nextRetryAt: null,
          ...(release && { idempotencyKey: null }),
        },
      }),
      this.prisma.campaignRecipient.updateMany({
        where: { messageId, status: CampaignRecipientStatus.QUEUED },
        data: release
          ? { status: CampaignRecipientStatus.PENDING, messageId: null }
          : { status: recipientStatus, failedReason: reason, processedAt: new Date() },
      }),
      // A sequence step's record shows why it never went out
      this.prisma.sequenceRecipientStep.updateMany({
        where: { messageId, status: CampaignRecipientStatus.QUEUED },
        data: { status: CampaignRecipientStatus.SKIPPED, failedReason: reason, processedAt: new Date() },
      }),
    ]);
  }

  async pauseBulkSending(sessionId: string, reason: string, now = new Date()): Promise<Date> {
    const until = new Date(now.getTime() + SEND_SAFETY_CONFIG.HEALTH_PAUSE_MS);
    await this.prisma.whatsAppSession.update({
      where: { id: sessionId },
      data: { sendingPausedUntil: until, sendingPausedReason: reason.slice(0, 300) },
    });
    return until;
  }

  async resumeBulkSending(sessionId: string, now = new Date()): Promise<void> {
    await this.prisma.whatsAppSession.update({
      where: { id: sessionId },
      data: { sendingPausedUntil: null, sendingPausedReason: null, healthResetAt: now },
    });
  }

  /** Snapshot for the account health meter. */
  async getHealth(orgId: string, sessionId: string, now = new Date()): Promise<SendHealth | null> {
    const session = await this.prisma.whatsAppSession.findFirst({
      where: { id: sessionId, orgId, deletedAt: null },
      select: { id: true, linkedAt: true, createdAt: true, sendingPausedUntil: true, sendingPausedReason: true },
    });
    if (!session) return null;

    const timeZone = await this.orgTimeZone(orgId);
    const linkedAt = session.linkedAt ?? session.createdAt;
    const tier = warmupTier(linkedAt, now);
    const dayStart = localDayStart(now, timeZone);

    const [bulkSent, coldSent, health] = await Promise.all([
      this.countBulkSentSince(sessionId, dayStart),
      this.countColdBulkSentSince(sessionId, dayStart),
      this.evaluateHealth(orgId, sessionId, now),
    ]);

    const paused =
      session.sendingPausedUntil && session.sendingPausedUntil > now
        ? { until: session.sendingPausedUntil.toISOString(), reason: session.sendingPausedReason }
        : null;

    const nearCap = bulkSent >= tier.bulkCap * 0.8 || coldSent >= tier.coldCap * 0.8;
    const weakDelivery =
      health.sampled >= SEND_SAFETY_CONFIG.HEALTH_MIN_SAMPLE &&
      health.deliveryRate !== null &&
      health.deliveryRate < 0.8;

    return {
      sessionId: session.id,
      warmup: {
        stage: tier.stage,
        linkedDays: Math.floor((now.getTime() - linkedAt.getTime()) / (24 * 60 * 60 * 1000)),
        coldCap: tier.coldCap,
        bulkCap: tier.bulkCap,
      },
      today: { bulkSent, coldSent },
      delivery: { sampled: health.sampled, delivered: health.delivered, rate: health.deliveryRate },
      optOuts24h: health.optOuts,
      withinSendingHours: isWithinSendWindow(now, timeZone),
      sendingHours: {
        start: SEND_SAFETY_CONFIG.BULK_SEND_START_HOUR,
        end: SEND_SAFETY_CONFIG.BULK_SEND_END_HOUR,
        timeZone,
      },
      paused,
      risk: paused ? 'paused' : nearCap || weakDelivery || !health.healthy ? 'warning' : 'ok',
    };
  }

  private countBulkSentSince(sessionId: string, since: Date): Promise<number> {
    return this.prisma.message.count({
      where: {
        sessionId,
        direction: MessageDirection.OUTBOUND,
        deletedAt: null,
        priority: { lt: 0 },
        sentAt: { gte: since },
      },
    });
  }

  /** Bulk messages sent since `since` to people who have never messaged the org. */
  private async countColdBulkSentSince(sessionId: string, since: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM messages m
      WHERE m.session_id = ${sessionId}::uuid
        AND m.direction = 'OUTBOUND'
        AND m.deleted_at IS NULL
        AND m.priority < 0
        AND m.sent_at >= ${since}
        AND NOT EXISTS (
          SELECT 1 FROM messages i
          WHERE i.org_id = m.org_id
            AND i.direction = 'INBOUND'
            AND i.deleted_at IS NULL
            AND i.contact_phone IN (
              m.contact_phone,
              ltrim(m.contact_phone, '+'),
              '+' || ltrim(m.contact_phone, '+')
            )
        )`;
    return rows[0]?.count ?? 0;
  }

  private async isCold(orgId: string, contactPhone: string): Promise<boolean> {
    const digits = contactPhone.replace(/^\+/, '');
    const inbound = await this.prisma.message.findFirst({
      where: {
        orgId,
        direction: MessageDirection.INBOUND,
        deletedAt: null,
        contactPhone: { in: [digits, `+${digits}`] },
      },
      select: { id: true },
    });
    return !inbound;
  }

  private async orgTimeZone(orgId: string): Promise<string> {
    const hit = this.tzCache.get(orgId);
    if (hit && Date.now() - hit.at < TZ_CACHE_MS) return hit.timeZone;

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { timezone: true },
    });
    const timeZone = org?.timezone || 'UTC';
    this.tzCache.set(orgId, { timeZone, at: Date.now() });
    return timeZone;
  }
}
