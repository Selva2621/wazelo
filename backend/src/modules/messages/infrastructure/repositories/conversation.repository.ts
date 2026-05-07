import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ConversationStatus, Prisma } from '@prisma/client';
import { MessageEncryptionService } from '../../domain/services/message-encryption.service';

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
   * Find or create a conversation for a given org + session + contactPhone.
   * Uses upsert to handle race conditions when two messages arrive
   * simultaneously for the same contact.
   */
  async findOrCreate(input: {
    orgId: string;
    sessionId: string;
    contactPhone: string;
    contactId?: string;
  }) {
    const conv = await this.prisma.conversation.upsert({
      where: {
        unique_conversation_per_contact_session: {
          orgId: input.orgId,
          sessionId: input.sessionId,
          contactPhone: input.contactPhone,
        },
      },
      create: {
        orgId: input.orgId,
        sessionId: input.sessionId,
        contactPhone: input.contactPhone,
        contactId: input.contactId || null,
        status: ConversationStatus.OPEN,
      },
      update: {}, // No-op on conflict — just return existing
    });
    return this.decryptConversation(conv);
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
      ...(options.contactPhone && { contactPhone: options.contactPhone }),
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
   * Find conversation by org + session + contact phone.
   */
  async findByContact(orgId: string, sessionId: string, contactPhone: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: {
        unique_conversation_per_contact_session: {
          orgId,
          sessionId,
          contactPhone,
        },
      },
    });
    return conv ? this.decryptConversation(conv) : null;
  }
}
