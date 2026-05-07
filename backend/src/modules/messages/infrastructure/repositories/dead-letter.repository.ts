import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { MessageType, Prisma } from '@prisma/client';

export interface CreateDeadLetterInput {
  orgId: string;
  originalMessageId: string;
  sessionId?: string;
  contactPhone: string;
  type: MessageType;
  body?: string;
  mediaUrl?: string;
  failedReason: string;
  retryCount: number;
  lastJobId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class DeadLetterRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Move a permanently failed message to the dead-letter table.
   */
  async create(input: CreateDeadLetterInput) {
    return this.prisma.deadLetterMessage.create({
      data: {
        orgId: input.orgId,
        originalMessageId: input.originalMessageId,
        sessionId: input.sessionId,
        contactPhone: input.contactPhone,
        type: input.type,
        body: input.body || null,
        mediaUrl: input.mediaUrl || null,
        failedReason: input.failedReason,
        retryCount: input.retryCount,
        lastJobId: input.lastJobId || null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  }

  /**
   * List dead-letter messages for an org (for admin review).
   */
  async findByOrgPaginated(
    orgId: string,
    options: { page: number; limit: number; reprocessed?: boolean },
  ) {
    const where: Prisma.DeadLetterMessageWhereInput = {
      orgId,
      ...(options.reprocessed === true && { reprocessedAt: { not: null } }),
      ...(options.reprocessed === false && { reprocessedAt: null }),
    };

    const [data, total] = await Promise.all([
      this.prisma.deadLetterMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.prisma.deadLetterMessage.count({ where }),
    ]);

    return { data, total, page: options.page, limit: options.limit };
  }

  async findById(id: string) {
    return this.prisma.deadLetterMessage.findUnique({
      where: { id },
    });
  }

  /**
   * Mark a dead-letter message as reprocessed (after manual retry).
   */
  async markReprocessed(id: string) {
    return this.prisma.deadLetterMessage.update({
      where: { id },
      data: { reprocessedAt: new Date() },
    });
  }

  /**
   * Count unprocessed dead-letter messages for monitoring alerts.
   */
  async countUnprocessed(orgId: string): Promise<number> {
    return this.prisma.deadLetterMessage.count({
      where: { orgId, reprocessedAt: null },
    });
  }
}
