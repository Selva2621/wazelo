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

  async updateStatus(
    id: string,
    status: CampaignRecipientStatus,
    extra?: { messageId?: string; failedReason?: string; processedAt?: Date },
  ): Promise<void> {
    await this.prisma.campaignRecipient.update({
      where: { id },
      data: {
        status,
        ...(extra?.messageId && { messageId: extra.messageId }),
        ...(extra?.failedReason && { failedReason: extra.failedReason }),
        ...(extra?.processedAt && { processedAt: extra.processedAt }),
      },
    });
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
    options: {
      take?: number;
      skip?: number;
      status?: CampaignRecipientStatus;
    } = {},
  ): Promise<{ recipients: CampaignRecipient[]; total: number }> {
    const where: Prisma.CampaignRecipientWhereInput = {
      campaignId,
      ...(options.status && { status: options.status }),
    };

    const [recipients, total] = await Promise.all([
      this.prisma.campaignRecipient.findMany({
        where,
        take: options.take ?? 50,
        skip: options.skip ?? 0,
        orderBy: { createdAt: 'asc' },
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
