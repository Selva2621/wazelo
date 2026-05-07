import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  ScheduledMessage,
  ScheduledMessageStatus,
  MessageType,
  Prisma,
} from '@prisma/client';

export interface CreateScheduledMessageInput {
  orgId: string;
  sessionId: string;
  contactPhone: string;
  messageType: MessageType;
  messageBody?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  scheduledAt: Date;
  timezone: string;
  createdById: string;
  idempotencyKey?: string;
  metadata?: Prisma.InputJsonValue;
  productId?: string;
}

export interface ListScheduledMessagesOptions {
  orgId: string;
  status?: ScheduledMessageStatus;
  limit: number;
  offset: number;
}

@Injectable()
export class SchedulerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateScheduledMessageInput): Promise<ScheduledMessage> {
    return this.prisma.scheduledMessage.create({
      data: {
        orgId: input.orgId,
        sessionId: input.sessionId,
        contactPhone: input.contactPhone,
        messageType: input.messageType,
        messageBody: input.messageBody,
        mediaUrl: input.mediaUrl,
        mediaMimeType: input.mediaMimeType,
        scheduledAt: input.scheduledAt,
        timezone: input.timezone,
        createdById: input.createdById,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata || Prisma.DbNull,
        productId: input.productId ?? null,
      },
    });
  }

  async findByIdAndOrg(
    id: string,
    orgId: string,
  ): Promise<ScheduledMessage | null> {
    return this.prisma.scheduledMessage.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async list(
    options: ListScheduledMessagesOptions,
  ): Promise<{ data: ScheduledMessage[]; total: number }> {
    const where: Prisma.ScheduledMessageWhereInput = {
      orgId: options.orgId,
      deletedAt: null,
      ...(options.status && { status: options.status }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.scheduledMessage.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.scheduledMessage.count({ where }),
    ]);

    return { data, total };
  }

  async updatePending(
    id: string,
    orgId: string,
    data: Prisma.ScheduledMessageUpdateManyMutationInput,
  ): Promise<ScheduledMessage | null> {
    const result = await this.prisma.scheduledMessage.updateMany({
      where: {
        id,
        orgId,
        status: ScheduledMessageStatus.PENDING,
        deletedAt: null,
      },
      data,
    });

    if (result.count === 0) return null;
    return this.findByIdAndOrg(id, orgId);
  }

  async transitionStatus(
    id: string,
    expectedStatus: ScheduledMessageStatus,
    newStatus: ScheduledMessageStatus,
    extra?: Record<string, unknown>,
  ): Promise<ScheduledMessage | null> {
    const result = await this.prisma.scheduledMessage.updateMany({
      where: { id, status: expectedStatus, deletedAt: null },
      data: { status: newStatus, ...extra },
    });

    if (result.count === 0) return null;
    return this.prisma.scheduledMessage.findUnique({ where: { id } });
  }

  async cancelPending(id: string, orgId: string): Promise<ScheduledMessage | null> {
    return this.transitionStatus(
      id,
      ScheduledMessageStatus.PENDING,
      ScheduledMessageStatus.CANCELLED,
    );
  }

  async findDueMessages(limit: number = 50): Promise<ScheduledMessage[]> {
    return this.prisma.scheduledMessage.findMany({
      where: {
        status: ScheduledMessageStatus.PENDING,
        scheduledAt: { lte: new Date() },
        deletedAt: null,
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });
  }

  async updatePgBossJobId(
    id: string,
    jobId: string,
  ): Promise<void> {
    await this.prisma.scheduledMessage.update({
      where: { id },
      data: { pgBossJobId: jobId },
    });
  }

  async incrementRetryCount(
    id: string,
    failedReason: string,
  ): Promise<ScheduledMessage> {
    return this.prisma.scheduledMessage.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
        failedReason,
      },
    });
  }

  async softDelete(id: string, orgId: string): Promise<void> {
    await this.prisma.scheduledMessage.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
