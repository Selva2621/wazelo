import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ConversationStatus, Prisma } from '@prisma/client';
import { MessageEncryptionService } from '../../domain/services/message-encryption.service';

function normalizeContactPhone(contactPhone: string): string {
  const digits = contactPhone.replace(/\D/g, '');
  return digits ? `+${digits}` : contactPhone.trim();
}

@Injectable()
export class ConversationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: MessageEncryptionService,
  ) {}

  private decryptConversation<T extends { lastMessageBody?: string | null }>(conv: T): T {
    return {
      ...conv,
      lastMessageBody: this.enc.decryptIfEncrypted(conv.lastMessageBody),
    };
  }

  /**
   * Find or create the single conversation for an org + contactPhone.
   * Recover from concurrent creates and legacy WhatsApp rows without a session.
   */
  async findOrCreate(input: {
    orgId: string;
    sessionId: string;
    contactPhone: string;
    contactId?: string;
  }) {
    const contactPhone = normalizeContactPhone(input.contactPhone);
    const where = {
      orgId: input.orgId,
      contactPhone,
      sessionId: { not: null },
    };
    const existing = await this.prisma.conversation.findFirst({ where });
    if (existing) {
      const conv = await this.prisma.conversation.update({
        where: { id: existing.id },
        data: {
          sessionId: input.sessionId,
          deletedAt: null,
          ...(input.contactId && { contactId: input.contactId }),
        },
      });
      return this.decryptConversation(conv);
    }

    try {
      const conv = await this.prisma.conversation.create({
        data: {
          orgId: input.orgId,
          sessionId: input.sessionId,
          contactPhone,
          contactId: input.contactId || null,
          status: ConversationStatus.OPEN,
        },
      });
      return this.decryptConversation(conv);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      const conflictingConversation = await this.prisma.conversation.findFirst({
        where: {
          orgId: input.orgId,
          contactPhone,
          OR: [
            { sessionId: { not: null } },
            { channelType: 'WHATSAPP' },
            { channelType: null, channelId: null },
          ],
        },
      });
      if (!conflictingConversation) throw error;

      const conv = await this.prisma.conversation.update({
        where: { id: conflictingConversation.id },
        data: {
          sessionId: input.sessionId,
          deletedAt: null,
          ...(input.contactId && { contactId: input.contactId }),
        },
      });
      return this.decryptConversation(conv);
    }
  }

  async findById(id: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, deletedAt: null },
    });
    return conv ? this.decryptConversation(conv) : null;
  }

  async findByIdAndOrg(id: string, orgId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, orgId, deletedAt: null },
    });
    return conv ? this.decryptConversation(conv) : null;
  }

  /**
   * Update conversation's last message metadata.
   * Truncates the plaintext to 500 chars BEFORE encrypting, then stores ciphertext.
   * Called after each message (inbound or outbound) is processed.
   */
  async updateLastMessage(
    id: string,
    body: string | null,
    isInbound: boolean,
  ) {
    const truncated = body ? body.substring(0, 500) : null;
    return this.prisma.conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        lastMessageBody: this.enc.encryptIfPresent(truncated),
        ...(isInbound && { unreadCount: { increment: 1 } }),
      },
    });
  }

  /**
   * Mark conversation as read (reset unread count).
   */
  async markRead(id: string) {
    return this.prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
  }

  async updateStatus(id: string, status: ConversationStatus) {
    return this.prisma.conversation.update({
      where: { id },
      data: { status },
    });
  }

  async assignTo(id: string, assignedToId: string | null) {
    return this.prisma.conversation.update({
      where: { id },
      data: { assignedToId },
    });
  }

  async softDelete(id: string) {
    return this.prisma.conversation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * List conversations for an org, sorted by most recent message.
   * Supports filtering by status and assigned user.
   */
  async findByOrgPaginated(
    orgId: string,
    options: {
      page: number;
      limit: number;
      status?: ConversationStatus;
      assignedToId?: string;
      sessionId?: string;
      sessionIds?: string[];
      contactPhone?: string;
    },
  ) {
    const where: Prisma.ConversationWhereInput = {
      orgId,
      deletedAt: null,
      ...(options.status && { status: options.status }),
      ...(options.assignedToId && { assignedToId: options.assignedToId }),
      ...(options.sessionId && { sessionId: options.sessionId }),
      ...(options.sessionIds && { sessionId: { in: options.sessionIds } }),
      ...(options.contactPhone && { contactPhone: normalizeContactPhone(options.contactPhone) }),
    };

    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return { data: data.map((c) => this.decryptConversation(c)), total, page: options.page, limit: options.limit };
  }

  /**
   * Find conversation by org + contact phone, regardless of WhatsApp session.
   */
  async findByContact(orgId: string, contactPhone: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: {
        orgId,
        sessionId: { not: null },
        contactPhone: normalizeContactPhone(contactPhone),
      },
    });
    return conv ? this.decryptConversation(conv) : null;
  }
}
