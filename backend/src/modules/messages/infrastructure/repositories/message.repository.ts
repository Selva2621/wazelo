import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  MessageDirection,
  MessageStatus,
  MessageType,
  Prisma,
} from '@prisma/client';
import { MessageEncryptionService } from '../../domain/services/message-encryption.service';

export interface CreateMessageInput {
  orgId: string;
  sessionId: string;
  conversationId?: string;
  direction: MessageDirection;
  type: MessageType;
  contactPhone: string;
  contactName?: string;
  body?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaSize?: number;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  priority?: number;
  maxRetries?: number;
}

@Injectable()
export class MessageRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: MessageEncryptionService,
  ) {}

  private decryptMessage<T extends { body?: string | null; mediaUrl?: string | null }>(msg: T): T {
    return {
      ...msg,
      body: this.enc.decryptIfEncrypted(msg.body),
      mediaUrl: this.enc.decryptIfEncrypted(msg.mediaUrl),
    };
  }

  async create(input: CreateMessageInput) {
    const msg = await this.prisma.message.create({
      data: {
        orgId: input.orgId,
        sessionId: input.sessionId,
        conversationId: input.conversationId || null,
        direction: input.direction,
        type: input.type,
        status:
          input.direction === MessageDirection.OUTBOUND
            ? MessageStatus.QUEUED
            : MessageStatus.DELIVERED,
        contactPhone: input.contactPhone,
        contactName: input.contactName || null,
        body: this.enc.encryptIfPresent(input.body ?? null),
        mediaUrl: this.enc.encryptIfPresent(input.mediaUrl ?? null),
        mediaMimeType: input.mediaMimeType || null,
        mediaSize: input.mediaSize || null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        idempotencyKey: input.idempotencyKey || null,
        priority: input.priority ?? 0,
        maxRetries: input.maxRetries ?? 3,
      },
    });
    return this.decryptMessage(msg);
  }

  async findById(id: string) {
    const msg = await this.prisma.message.findFirst({
      where: { id, deletedAt: null },
    });
    return msg ? this.decryptMessage(msg) : null;
  }

  async findByIdAndOrg(id: string, orgId: string) {
    const msg = await this.prisma.message.findFirst({
      where: { id, orgId, deletedAt: null },
    });
    return msg ? this.decryptMessage(msg) : null;
  }

  async findByIdempotencyKey(key: string) {
    const msg = await this.prisma.message.findUnique({
      where: { idempotencyKey: key },
    });
    return msg ? this.decryptMessage(msg) : null;
  }

  async findByWhatsAppMessageId(whatsappMessageId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { whatsappMessageId },
    });
    return msg ? this.decryptMessage(msg) : null;
  }

  /**
   * Atomically transition message status.
   * Uses optimistic concurrency control: only updates if current status matches expected.
   * Returns null if the status was already changed (duplicate/concurrent processing).
   */
  async transitionStatus(
    id: string,
    expectedStatus: MessageStatus,
    newStatus: MessageStatus,
  ) {
    const result = await this.prisma.message.updateMany({
      where: { id, status: expectedStatus, deletedAt: null },
      data: {
        status: newStatus,
        ...(newStatus === MessageStatus.PROCESSING && { processingAt: new Date() }),
        ...(newStatus === MessageStatus.SENT && { sentAt: new Date() }),
        ...(newStatus === MessageStatus.DELIVERED && { deliveredAt: new Date() }),
        ...(newStatus === MessageStatus.READ && { readAt: new Date() }),
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id);
  }

  async updateStatus(id: string, status: MessageStatus, extra?: Record<string, unknown>) {
    const data: Record<string, unknown> = { status };

    if (status === MessageStatus.PROCESSING) data.processingAt = new Date();
    if (status === MessageStatus.SENT) data.sentAt = new Date();
    if (status === MessageStatus.DELIVERED) data.deliveredAt = new Date();
    if (status === MessageStatus.READ) data.readAt = new Date();
    if (extra) Object.assign(data, extra);

    return this.prisma.message.update({ where: { id }, data });
  }

  async markFailed(id: string, reason: string) {
    return this.prisma.message.update({
      where: { id },
      data: {
        status: MessageStatus.FAILED,
        failedReason: reason,
        retryCount: { increment: 1 },
        processingAt: null,
      },
    });
  }

  /**
   * Mark message for retry with exponential backoff.
   * Resets status to QUEUED with a nextRetryAt timestamp.
   */
  async markForRetry(id: string, reason: string, nextRetryAt: Date) {
    return this.prisma.message.update({
      where: { id },
      data: {
        status: MessageStatus.QUEUED,
        retryCount: { increment: 1 },
        failedReason: reason,
        nextRetryAt,
        processingAt: null,
      },
    });
  }

  async setWhatsAppMessageId(id: string, whatsappMessageId: string) {
    return this.prisma.message.update({
      where: { id },
      data: { whatsappMessageId, status: MessageStatus.SENT, sentAt: new Date() },
    });
  }

  async setConversationId(id: string, conversationId: string) {
    return this.prisma.message.update({
      where: { id },
      data: { conversationId },
    });
  }

  /**
   * Find messages for a conversation, ordered by creation time (newest first).
   * Supports cursor-based pagination via `before` timestamp.
   */
  async findByConversation(
    conversationId: string,
    orgId: string,
    options: { page: number; limit: number; before?: Date },
  ) {
    const where: Prisma.MessageWhereInput = {
      conversationId,
      orgId,
      deletedAt: null,
      ...(options.before && { createdAt: { lt: options.before } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    return { data: data.map((m) => this.decryptMessage(m)), total, page: options.page, limit: options.limit };
  }

  async findBySessionPaginated(
    sessionId: string,
    orgId: string,
    options: { page: number; limit: number },
  ) {
    const where = { sessionId, orgId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    return { data: data.map((m) => this.decryptMessage(m)), total, page: options.page, limit: options.limit };
  }

  async findByContactPaginated(
    orgId: string,
    contactPhone: string,
    options: { page: number; limit: number },
  ) {
    const where = { orgId, contactPhone, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    return { data: data.map((m) => this.decryptMessage(m)), total, page: options.page, limit: options.limit };
  }

  /**
   * Find messages stuck in PROCESSING beyond the threshold.
   * These are from crashed workers that need recovery.
   */
  async findStaleProcessingMessages(thresholdMs: number) {
    const threshold = new Date(Date.now() - thresholdMs);
    const data = await this.prisma.message.findMany({
      where: {
        deletedAt: null,
        status: MessageStatus.PROCESSING,
        direction: MessageDirection.OUTBOUND,
        processingAt: { lt: threshold },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    return data.map((m) => this.decryptMessage(m));
  }

  /**
   * Find messages stuck in QUEUED beyond the threshold.
   * These may have lost their pg-boss job reference.
   */
  async findStaleQueuedMessages(thresholdMs: number) {
    const threshold = new Date(Date.now() - thresholdMs);
    const data = await this.prisma.message.findMany({
      where: {
        deletedAt: null,
        status: MessageStatus.QUEUED,
        direction: MessageDirection.OUTBOUND,
        createdAt: { lt: threshold },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lt: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    return data.map((m) => this.decryptMessage(m));
  }

  async findRetryableMessages(maxRetries: number) {
    const data = await this.prisma.message.findMany({
      where: {
        deletedAt: null,
        status: MessageStatus.FAILED,
        direction: MessageDirection.OUTBOUND,
        retryCount: { lt: maxRetries },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    return data.map((m) => this.decryptMessage(m));
  }

  /**
   * Count recent outbound messages for a session within a time window.
   * Used for per-session rate limiting.
   */
  async countRecentBySession(sessionId: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return this.prisma.message.count({
      where: {
        sessionId,
        direction: MessageDirection.OUTBOUND,
        deletedAt: null,
        createdAt: { gte: since },
      },
    });
  }

  /**
   * Count recent outbound messages for an org within a time window.
   * Used for org-level rate limiting.
   */
  async countRecentByOrg(orgId: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return this.prisma.message.count({
      where: {
        orgId,
        direction: MessageDirection.OUTBOUND,
        deletedAt: null,
        createdAt: { gte: since },
      },
    });
  }
}
