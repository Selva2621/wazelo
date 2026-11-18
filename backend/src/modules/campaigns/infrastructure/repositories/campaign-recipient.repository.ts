import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  CampaignRecipient,
  CampaignRecipientStatus,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import type { BatchWorkSummary } from '../../domain/services/batch-plan';
import { CONNECTION_FAILURE_PATTERNS } from '@/shared/utils/connection-failure';

export interface CreateRecipientInput {
  campaignId: string;
  orgId: string;
  contactId: string;
  contactPhone: string;
  batchNumber: number;
  sessionId?: string | null;
}

export interface RecipientStatusCounts {
  pending: number;
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  skipped: number;
}

export interface CampaignBatchProgress {
  batchNumber: number;
  sessionId: string | null;
  sessionPhoneNumber: string | null;
  sessionStatus: string | null;
  lastHeartbeatAt: Date | null;
  sendingPausedUntil: Date | null;
  sendingPausedReason: string | null;
  counts: RecipientStatusCounts;
  failureReasons: { reason: string; count: number }[];
}

@Injectable()
export class CampaignRecipientRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bulk insert recipients using createMany with skipDuplicates
   * for idempotent resume support.
   */
  async bulkCreate(recipients: CreateRecipientInput[]): Promise<number> {
    const result = await this.prisma.campaignRecipient.createMany({
      data: recipients.map((r) => ({
        campaignId: r.campaignId,
        orgId: r.orgId,
        contactId: r.contactId,
        contactPhone: r.contactPhone,
        batchNumber: r.batchNumber,
        sessionId: r.sessionId ?? null,
        status: CampaignRecipientStatus.PENDING,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async findByMessageId(messageId: string): Promise<CampaignRecipient | null> {
    return this.prisma.campaignRecipient.findUnique({
      where: { messageId },
    });
  }

  /** Is this campaign message FAILED for good (not QUEUED for a retry)? */
  async isMessageFinallyFailed(messageId: string): Promise<boolean> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { status: true },
    });
    return message?.status === MessageStatus.FAILED;
  }

  /** Email campaigns: the recipient an email belongs to */
  async findByEmailMessageId(emailMessageId: string): Promise<CampaignRecipient | null> {
    return this.prisma.campaignRecipient.findUnique({ where: { emailMessageId } });
  }

  async findPendingByBatch(
    campaignId: string,
    batchNumber: number,
  ): Promise<CampaignRecipient[]> {
    return this.prisma.campaignRecipient.findMany({
      where: {
        campaignId,
        batchNumber,
        status: CampaignRecipientStatus.PENDING,
      },
    });
  }

  /**
   * Atomically claims the next recipient only when no other recipient in its
   * batch is queued. Other batches can progress independently.
   */
  async claimNextPending(campaignId: string, batchNumber: number): Promise<CampaignRecipient | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS acquired FROM (SELECT pg_advisory_xact_lock(hashtext(${campaignId}), ${batchNumber}::integer)) AS batch_lock`;

      const inFlight = await tx.campaignRecipient.findFirst({
        where: { campaignId, batchNumber, status: CampaignRecipientStatus.QUEUED },
        select: { id: true },
      });
      if (inFlight) return null;

      const recipient = await tx.campaignRecipient.findFirst({
        where: { campaignId, batchNumber, status: CampaignRecipientStatus.PENDING },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      if (!recipient) return null;

      const claimedAt = new Date();
      const claimed = await tx.campaignRecipient.updateMany({
        where: { id: recipient.id, status: CampaignRecipientStatus.PENDING },
        data: { status: CampaignRecipientStatus.QUEUED, claimedAt },
      });
      return claimed.count === 1
        ? { ...recipient, status: CampaignRecipientStatus.QUEUED, claimedAt }
        : null;
    });
  }

  async hasQueuedRecipients(campaignId: string, batchNumber?: number): Promise<boolean> {
    const recipient = await this.prisma.campaignRecipient.findFirst({
      where: {
        campaignId,
        status: CampaignRecipientStatus.QUEUED,
        ...(batchNumber !== undefined && { batchNumber }),
      },
      select: { id: true },
    });
    return recipient !== null;
  }

  async findQueuedMessages(campaignId: string): Promise<Array<{ messageId: string; sessionId: string | null }>> {
    const recipients = await this.prisma.campaignRecipient.findMany({
      where: {
        campaignId,
        status: CampaignRecipientStatus.QUEUED,
        messageId: { not: null },
      },
      select: { messageId: true, sessionId: true },
    });
    return recipients.flatMap((recipient) =>
      recipient.messageId ? [{ messageId: recipient.messageId, sessionId: recipient.sessionId }] : [],
    );
  }

  async getPendingBatchNumbers(campaignId: string): Promise<number[]> {
    const batches = await this.prisma.campaignRecipient.groupBy({
      by: ['batchNumber'],
      where: { campaignId, status: CampaignRecipientStatus.PENDING },
      orderBy: { batchNumber: 'asc' },
    });
    return batches.map((batch) => batch.batchNumber);
  }

  /** Unfinished work per batch (PENDING / QUEUED counts and the batch's session). */
  async getBatchWorkSummary(campaignId: string): Promise<BatchWorkSummary[]> {
    const groups = await this.prisma.campaignRecipient.groupBy({
      by: ['batchNumber', 'sessionId', 'status'],
      where: {
        campaignId,
        status: { in: [CampaignRecipientStatus.PENDING, CampaignRecipientStatus.QUEUED] },
      },
      _count: { id: true },
    });

    const byBatch = new Map<number, BatchWorkSummary>();
    for (const group of groups) {
      let summary = byBatch.get(group.batchNumber);
      if (!summary) {
        summary = { batchNumber: group.batchNumber, sessionId: group.sessionId, pending: 0, queued: 0 };
        byBatch.set(group.batchNumber, summary);
      }
      if (group.status === CampaignRecipientStatus.PENDING) {
        summary.pending += group._count.id;
        // The batch belongs to the number its waiting recipients will send from
        summary.sessionId = group.sessionId;
      } else {
        summary.queued += group._count.id;
      }
    }
    return [...byBatch.values()].sort((a, b) => a.batchNumber - b.batchNumber);
  }

  /**
   * QUEUED recipients claimed before `claimedBefore` (or claimed by an older
   * build that did not record the time), with their message's current status.
   */
  async findStaleQueued(campaignId: string, claimedBefore: Date, take = 200) {
    return this.prisma.campaignRecipient.findMany({
      where: {
        campaignId,
        status: CampaignRecipientStatus.QUEUED,
        OR: [{ claimedAt: null }, { claimedAt: { lt: claimedBefore } }],
      },
      select: {
        id: true,
        campaignId: true,
        contactId: true,
        batchNumber: true,
        messageId: true,
        emailMessageId: true,
        message: { select: { status: true, failedReason: true } },
      },
      take,
    });
  }

  /** Put a stuck QUEUED recipient back in line (a fresh claim re-checks its message). */
  async requeueStuck(id: string): Promise<boolean> {
    const result = await this.prisma.campaignRecipient.updateMany({
      where: { id, status: CampaignRecipientStatus.QUEUED },
      data: { status: CampaignRecipientStatus.PENDING, claimedAt: null },
    });
    return result.count === 1;
  }

  /** Move unfinished (PENDING) recipients of the given batches to another number. */
  async reassignBatchSession(campaignId: string, batchNumber: number, sessionId: string): Promise<number> {
    const result = await this.prisma.campaignRecipient.updateMany({
      where: { campaignId, batchNumber, status: CampaignRecipientStatus.PENDING },
      data: { sessionId },
    });
    return result.count;
  }

  /** Batches that still have PENDING recipients on one of these numbers. */
  async findPendingBatchesOnSessions(campaignId: string, sessionIds: string[]): Promise<number[]> {
    if (sessionIds.length === 0) return [];
    const groups = await this.prisma.campaignRecipient.groupBy({
      by: ['batchNumber'],
      where: { campaignId, status: CampaignRecipientStatus.PENDING, sessionId: { in: sessionIds } },
      orderBy: { batchNumber: 'asc' },
    });
    return groups.map((g) => g.batchNumber);
  }

  /** Distinct numbers a campaign's unfinished recipients send from. */
  async findUnfinishedSessionIds(campaignId: string): Promise<string[]> {
    const groups = await this.prisma.campaignRecipient.groupBy({
      by: ['sessionId'],
      where: {
        campaignId,
        status: { in: [CampaignRecipientStatus.PENDING, CampaignRecipientStatus.QUEUED] },
        sessionId: { not: null },
      },
    });
    return groups.flatMap((g) => (g.sessionId ? [g.sessionId] : []));
  }

  async reassignPendingSession(
    campaignId: string,
    previousSessionId: string,
    nextSessionId: string,
  ): Promise<number> {
    const result = await this.prisma.campaignRecipient.updateMany({
      where: {
        campaignId,
        sessionId: previousSessionId,
        status: CampaignRecipientStatus.PENDING,
      },
      data: { sessionId: nextSessionId },
    });
    return result.count;
  }

  async updateStatusIfCurrent(
    id: string,
    currentStatus: CampaignRecipientStatus,
    status: CampaignRecipientStatus,
    extra?: { failedReason?: string; processedAt?: Date },
  ): Promise<boolean> {
    const result = await this.prisma.campaignRecipient.updateMany({
      where: { id, status: currentStatus },
      data: {
        status,
        ...(extra?.failedReason && { failedReason: extra.failedReason }),
        ...(extra?.processedAt && { processedAt: extra.processedAt }),
      },
    });
    return result.count === 1;
  }

  async updateStatus(
    id: string,
    status: CampaignRecipientStatus,
    extra?: { messageId?: string; emailMessageId?: string; failedReason?: string; processedAt?: Date },
  ): Promise<void> {
    await this.prisma.campaignRecipient.update({
      where: { id },
      data: {
        status,
        ...(extra?.messageId && { messageId: extra.messageId }),
        ...(extra?.emailMessageId && { emailMessageId: extra.emailMessageId }),
        ...(extra?.failedReason && { failedReason: extra.failedReason }),
        ...(extra?.processedAt && { processedAt: extra.processedAt }),
      },
    });
  }

  async markFailedIfActive(id: string, reason: string): Promise<boolean> {
    const result = await this.prisma.campaignRecipient.updateMany({
      where: {
        id,
        status: { in: [CampaignRecipientStatus.PENDING, CampaignRecipientStatus.QUEUED] },
      },
      data: {
        status: CampaignRecipientStatus.FAILED,
        failedReason: reason,
        processedAt: new Date(),
      },
    });
    return result.count > 0;
  }

  /**
   * Mark all PENDING recipients as SKIPPED (for pause/cancel).
   */
  async markPendingAsSkipped(campaignId: string): Promise<number> {
    const result = await this.prisma.campaignRecipient.updateMany({
      where: {
        campaignId,
        status: CampaignRecipientStatus.PENDING,
      },
      data: {
        status: CampaignRecipientStatus.SKIPPED,
        failedReason: 'Campaign paused or cancelled',
      },
    });
    return result.count;
  }

  /**
   * Recipients whose message is waiting on a sending limit / sending hours: still
   * QUEUED with a re-check scheduled more than a minute out. (Normal pacing gaps
   * are under a minute.) They are not lost — the send worker picks them up then.
   */
  async countHeld(campaignId: string, now = new Date()): Promise<{ total: number; nextAttemptAt: Date | null }> {
    const where = {
      campaignId,
      status: CampaignRecipientStatus.QUEUED,
      message: { is: { status: MessageStatus.QUEUED, nextRetryAt: { gt: new Date(now.getTime() + 60_000) } } },
    };
    const [total, next] = await Promise.all([
      this.prisma.campaignRecipient.count({ where }),
      this.prisma.campaignRecipient.findFirst({
        where,
        select: { message: { select: { nextRetryAt: true } } },
        orderBy: { message: { nextRetryAt: 'asc' } },
      }),
    ]);
    return { total, nextAttemptAt: next?.message?.nextRetryAt ?? null };
  }

  async countByStatus(campaignId: string): Promise<RecipientStatusCounts> {
    const counts = await this.prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { id: true },
    });

    const result: RecipientStatusCounts = {
      pending: 0,
      queued: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      skipped: 0,
    };

    for (const c of counts) {
      const key = c.status.toLowerCase() as keyof RecipientStatusCounts;
      result[key] = c._count.id;
    }

    return result;
  }

  async getBatchProgress(campaignId: string): Promise<CampaignBatchProgress[]> {
    const [groups, failureGroups] = await Promise.all([
      this.prisma.campaignRecipient.groupBy({
        by: ['batchNumber', 'sessionId', 'status'],
        where: { campaignId },
        _count: { id: true },
        orderBy: [{ batchNumber: 'asc' }, { sessionId: 'asc' }],
      }),
      this.prisma.campaignRecipient.groupBy({
        by: ['batchNumber', 'sessionId', 'failedReason'],
        where: {
          campaignId,
          status: CampaignRecipientStatus.FAILED,
          failedReason: { not: null },
        },
        _count: { id: true },
      }),
    ]);

    const sessionIds = [...new Set(groups.flatMap((group) => group.sessionId ? [group.sessionId] : []))];
    const sessions = sessionIds.length > 0
      ? await this.prisma.whatsAppSession.findMany({
          where: { id: { in: sessionIds } },
          select: {
            id: true,
            phoneNumber: true,
            status: true,
            lastHeartbeatAt: true,
            sendingPausedUntil: true,
            sendingPausedReason: true,
          },
        })
      : [];
    const sessionsById = new Map(sessions.map((session) => [session.id, session]));
    const progress = new Map<string, CampaignBatchProgress>();

    for (const group of groups) {
      const key = `${group.batchNumber}:${group.sessionId ?? ''}`;
      let batch = progress.get(key);
      if (!batch) {
        const session = group.sessionId ? sessionsById.get(group.sessionId) : undefined;
        batch = {
          batchNumber: group.batchNumber,
          sessionId: group.sessionId,
          sessionPhoneNumber: session?.phoneNumber ?? null,
          sessionStatus: session?.status ?? null,
          lastHeartbeatAt: session?.lastHeartbeatAt ?? null,
          sendingPausedUntil: session?.sendingPausedUntil ?? null,
          sendingPausedReason: session?.sendingPausedReason ?? null,
          counts: { pending: 0, queued: 0, sent: 0, delivered: 0, failed: 0, skipped: 0 },
          failureReasons: [],
        };
        progress.set(key, batch);
      }

      const status = group.status.toLowerCase() as keyof RecipientStatusCounts;
      batch.counts[status] = group._count.id;
    }

    for (const group of failureGroups) {
      if (!group.failedReason) continue;
      const batch = progress.get(`${group.batchNumber}:${group.sessionId ?? ''}`);
      batch?.failureReasons.push({ reason: group.failedReason, count: group._count.id });
    }

    return [...progress.values()];
  }

  async countByStatusForCampaigns(
    campaignIds: string[],
  ): Promise<Map<string, RecipientStatusCounts>> {
    const result = new Map<string, RecipientStatusCounts>();
    if (campaignIds.length === 0) return result;

    for (const campaignId of campaignIds) {
      result.set(campaignId, {
        pending: 0,
        queued: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        skipped: 0,
      });
    }

    const counts = await this.prisma.campaignRecipient.groupBy({
      by: ['campaignId', 'status'],
      where: { campaignId: { in: campaignIds } },
      _count: { id: true },
    });

    for (const count of counts) {
      const campaignCounts = result.get(count.campaignId);
      if (!campaignCounts) continue;
      const key = count.status.toLowerCase() as keyof RecipientStatusCounts;
      campaignCounts[key] = count._count.id;
    }

    return result;
  }

  async countByCampaign(campaignId: string): Promise<number> {
    return this.prisma.campaignRecipient.count({
      where: { campaignId },
    });
  }

  async getMaxBatchNumber(campaignId: string): Promise<number> {
    const result = await this.prisma.campaignRecipient.aggregate({
      where: { campaignId },
      _max: { batchNumber: true },
    });
    return result._max.batchNumber ?? 0;
  }

  async hasPendingRecipients(campaignId: string): Promise<boolean> {
    const count = await this.prisma.campaignRecipient.count({
      where: {
        campaignId,
        status: CampaignRecipientStatus.PENDING,
      },
      take: 1,
    });
    return count > 0;
  }

  async findByCampaignPaginated(
    campaignId: string,
    orgId: string,
    options: {
      take?: number;
      skip?: number;
      status?: CampaignRecipientStatus;
    } = {},
  ): Promise<{ recipients: CampaignRecipient[]; total: number }> {
    const where: Prisma.CampaignRecipientWhereInput = {
      campaignId,
      orgId,
      ...(options.status && { status: options.status }),
    };

    const [recipients, total] = await Promise.all([
      this.prisma.campaignRecipient.findMany({
        where,
        take: options.take ?? 50,
        skip: options.skip ?? 0,
        orderBy: { createdAt: 'asc' },
        // The recipients table shows who each row is
        include: {
          contact: { select: { id: true, name: true } },
          session: { select: { id: true, phoneNumber: true } },
        },
      }),
      this.prisma.campaignRecipient.count({ where }),
    ]);

    return { recipients, total };
  }

  /**
   * Reset SKIPPED recipients back to PENDING for resume.
   * Only resets those that were skipped due to pause (not invalid contacts).
   */
  /**
   * Recipients that FAILED only because the WhatsApp connection was down (server
   * restart, socket dropped) go back to PENDING so a resume sends them. Their
   * old messages never reached WhatsApp, so their idempotency keys are freed
   * for a fresh message. Anything WhatsApp accepted is never reset.
   */
  async resetConnectionFailuresToPending(campaignId: string): Promise<number> {
    const resettable = await this.findConnectionFailures(campaignId);
    if (resettable.length === 0) return 0;

    const recipientIds = resettable.map((r) => r.id);
    const messageIds = resettable.map((r) => r.messageId).filter((id): id is string => !!id);

    return this.prisma.$transaction(async (tx) => {
      if (messageIds.length > 0) {
        await tx.message.updateMany({
          where: { id: { in: messageIds }, status: MessageStatus.FAILED, whatsappMessageId: null },
          data: { idempotencyKey: null },
        });
      }
      const result = await tx.campaignRecipient.updateMany({
        where: { id: { in: recipientIds }, status: CampaignRecipientStatus.FAILED },
        data: {
          status: CampaignRecipientStatus.PENDING,
          messageId: null,
          failedReason: null,
          processedAt: null,
          claimedAt: null,
        },
      });
      return result.count;
    });
  }

  /** How many FAILED recipients a retry would send again (see resetConnectionFailuresToPending). */
  async countConnectionFailures(campaignId: string): Promise<number> {
    return (await this.findConnectionFailures(campaignId)).length;
  }

  private async findConnectionFailures(campaignId: string) {
    const failed = await this.prisma.campaignRecipient.findMany({
      where: {
        campaignId,
        status: CampaignRecipientStatus.FAILED,
        OR: CONNECTION_FAILURE_PATTERNS.map((pattern) => ({
          failedReason: { contains: pattern, mode: Prisma.QueryMode.insensitive },
        })),
      },
      select: { id: true, messageId: true, message: { select: { whatsappMessageId: true } } },
    });
    // Never resend something WhatsApp accepted
    return failed.filter((r) => !r.message?.whatsappMessageId);
  }

  async resetSkippedToPending(campaignId: string): Promise<number> {
    const result = await this.prisma.campaignRecipient.updateMany({
      where: {
        campaignId,
        status: CampaignRecipientStatus.SKIPPED,
        failedReason: 'Campaign paused or cancelled',
      },
      data: {
        status: CampaignRecipientStatus.PENDING,
        failedReason: null,
      },
    });
    return result.count;
  }
}
