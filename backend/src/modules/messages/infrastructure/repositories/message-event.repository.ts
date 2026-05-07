import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { MessageStatus, Prisma } from '@prisma/client';

@Injectable()
export class MessageEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a message lifecycle event.
   * Every status transition is logged for auditability and debugging.
   */
  async record(input: {
    messageId: string;
    orgId: string;
    status: MessageStatus;
    error?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.messageEvent.create({
      data: {
        messageId: input.messageId,
        orgId: input.orgId,
        status: input.status,
        error: input.error || null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  }

  /**
   * Get the full event history for a message.
   * Used for debugging delivery issues.
   */
  async findByMessageId(messageId: string) {
    return this.prisma.messageEvent.findMany({
      where: { messageId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get recent events for an org (for monitoring dashboard).
   */
  async findRecentByOrg(orgId: string, limit: number = 50) {
    return this.prisma.messageEvent.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
