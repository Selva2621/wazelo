import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  CampaignRecipient,
  CampaignRecipientStatus,
  Prisma,
} from '@prisma/client';

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
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${campaignId}), ${batchNumber})`;

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

      const claimed = await tx.campaignRecipient.updateMany({
        where: { id: recipient.id, status: CampaignRecipientStatus.PENDING },
        data: { status: CampaignRecipientStatus.QUEUED },
      });
      return claimed.count === 1
        ? { ...recipient, status: CampaignRecipientStatus.QUEUED }
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

  async getPendingBatchNumbers(campaignId: string): Promise<number[]> {
    const batches = await this.prisma.campaignRecipient.groupBy({
      by: ['batchNumber'],
      where: { campaignId, status: CampaignRecipientStatus.PENDING },
      orderBy: { batchNumber: 'asc' },
    });
    return batches.map((batch) => batch.batchNumber);
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
