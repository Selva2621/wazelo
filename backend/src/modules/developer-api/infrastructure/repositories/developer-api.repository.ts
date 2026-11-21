import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  ConversationStatus,
  DealStatus,
  LeadStatus,
  MessageDirection,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';

const DEAL_SELECT = {
  id: true,
  title: true,
  value: true,
  currency: true,
  status: true,
  expectedClose: true,
  closedAt: true,
  nextFollowUpAt: true,
  assignedToId: true,
  createdAt: true,
  updatedAt: true,
  pipeline: { select: { id: true, name: true } },
  stage: { select: { id: true, name: true } },
  contact: { select: { id: true, name: true, phoneNumber: true } },
} satisfies Prisma.DealSelect;

/** Decimal → number so JSON clients get a plain value. */
function toDealDto<T extends { value: Prisma.Decimal | null }>(deal: T) {
  return { ...deal, value: deal.value === null ? null : Number(deal.value) };
}

@Injectable()
export class DeveloperApiRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: MessageEncryptionService,
  ) {}

  /** Bodies and media URLs may be encrypted at rest; return them readable. */
  private decrypt<T extends { body: string | null; mediaUrl: string | null }>(msg: T): T {
    return {
      ...msg,
      body: this.enc.decryptIfEncrypted(msg.body),
      mediaUrl: this.enc.decryptIfEncrypted(msg.mediaUrl),
    };
  }

  /**
   * List messages for an org with cursor-based pagination.
   */
  async listMessages(
    orgId: string,
    options: {
      limit: number;
      cursor?: string;
      direction?: string;
      status?: string;
    },
  ) {
    const where: Prisma.MessageWhereInput = {
      orgId,
      deletedAt: null,
    };

    if (options.direction) {
      where.direction = options.direction as MessageDirection;
    }
    if (options.status) {
      where.status = options.status as MessageStatus;
    }

    const messages = await this.prisma.message.findMany({
      where,
      take: options.limit + 1, // Fetch one extra to check for next page
      ...(options.cursor && {
        cursor: { id: options.cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        direction: true,
        type: true,
        body: true,
        mediaUrl: true,
        status: true,
        contactPhone: true,
        whatsappMessageId: true,
        idempotencyKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasMore = messages.length > options.limit;
    const data = (hasMore ? messages.slice(0, options.limit) : messages).map((m) => this.decrypt(m));
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return { data, nextCursor, hasMore };
  }

  /**
   * Get a single message by ID and org.
   */
  async getMessageById(id: string, orgId: string) {
    const message = await this.prisma.message.findFirst({
      where: { id, orgId, deletedAt: null },
      select: {
        id: true,
        direction: true,
        type: true,
        body: true,
        mediaUrl: true,
        status: true,
        contactPhone: true,
        whatsappMessageId: true,
        idempotencyKey: true,
        createdAt: true,
        updatedAt: true,
        events: {
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return message ? this.decrypt(message) : null;
  }

  /**
   * List contacts for an org. `search` matches name, phone or email;
   * `phone` is an exact (already normalized) phone number.
   */
  async listContacts(
    orgId: string,
    limit: number,
    cursor?: string,
    filters: { search?: string; phone?: string; leadStatus?: LeadStatus } = {},
  ) {
    const where: Prisma.ContactWhereInput = { orgId, deletedAt: null };
    if (filters.phone) where.phoneNumber = filters.phone;
    if (filters.leadStatus) where.leadStatus = filters.leadStatus;
    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q.replace(/[\s()-]/g, '') } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const contacts = await this.prisma.contact.findMany({
      where,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
        leadStatus: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasMore = contacts.length > limit;
    const data = hasMore ? contacts.slice(0, limit) : contacts;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return { data, nextCursor, hasMore };
  }

  /**
   * Create a contact via developer API.
   */
  async createContact(data: {
    orgId: string;
    name: string;
    phoneNumber: string;
    email?: string;
    metadata?: Record<string, unknown>;
  }) {
    // Check for existing contact with same phone in org
    const existing = await this.prisma.contact.findFirst({
      where: { orgId: data.orgId, phoneNumber: data.phoneNumber, deletedAt: null },
    });

    if (existing) {
      return { contact: existing, created: false };
    }

    // Find first admin user in org as default owner
    const owner = await this.prisma.user.findFirst({
      where: { orgId: data.orgId, role: 'ADMIN', deletedAt: null },
      select: { id: true },
    });

    const contact = await this.prisma.contact.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        phoneNumber: data.phoneNumber,
        email: data.email,
        source: 'API',
        ownerId: owner!.id,
        metadata: data.metadata ? (data.metadata as any) : undefined,
      },
    });

    return { contact, created: true };
  }

  /**
   * Get a single contact by ID and org.
   */
  async getContactById(id: string, orgId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, orgId, deletedAt: null },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
        leadStatus: true,
        leadScore: true,
        source: true,
        metadata: true,
        optedOut: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
        contactTags: {
          where: { tag: { deletedAt: null } },
          select: { tag: { select: { id: true, name: true, color: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!contact) return null;
    const { contactTags, ...rest } = contact;
    return { ...rest, tags: contactTags.map((ct) => ct.tag) };
  }

  /** Notes on a contact, newest first. */
  async listContactNotes(contactId: string, orgId: string, limit: number) {
    return this.prisma.contactNote.findMany({
      where: { contactId, orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, content: true, authorId: true, createdAt: true },
    });
  }

  /** All tags in the org. */
  async listTags(orgId: string) {
    return this.prisma.tag.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    });
  }

  // ── Conversations ──

  async listConversations(
    orgId: string,
    options: { limit: number; cursor?: string; status?: ConversationStatus; contactPhone?: string; contactId?: string },
  ) {
    const where: Prisma.ConversationWhereInput = { orgId, deletedAt: null };
    if (options.status) where.status = options.status;
    if (options.contactPhone) where.contactPhone = options.contactPhone;
    if (options.contactId) where.contactId = options.contactId;

    const rows = await this.prisma.conversation.findMany({
      where,
      take: options.limit + 1,
      ...(options.cursor && { cursor: { id: options.cursor }, skip: 1 }),
      orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
      select: {
        id: true,
        contactId: true,
        contactPhone: true,
        channelType: true,
        status: true,
        lastMessageAt: true,
        lastMessageBody: true,
        unreadCount: true,
        assignedToId: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > options.limit;
    const data = (hasMore ? rows.slice(0, options.limit) : rows).map((c) => ({
      ...c,
      lastMessageBody: this.enc.decryptIfEncrypted(c.lastMessageBody),
    }));
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;
    return { data, nextCursor, hasMore };
  }

  async getConversation(id: string, orgId: string) {
    return this.prisma.conversation.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
  }

  /** Messages in one conversation, newest first. */
  async listConversationMessages(conversationId: string, orgId: string, limit: number, cursor?: string) {
    const rows = await this.prisma.message.findMany({
      where: { conversationId, orgId, deletedAt: null },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        direction: true,
        type: true,
        body: true,
        mediaUrl: true,
        status: true,
        contactPhone: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > limit;
    const data = (hasMore ? rows.slice(0, limit) : rows).map((m) => this.decrypt(m));
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;
    return { data, nextCursor, hasMore };
  }

  // ── Pipelines & deals ──

  async listPipelines(orgId: string) {
    return this.prisma.pipeline.findMany({
      where: { orgId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        isDefault: true,
        stages: {
          orderBy: { order: 'asc' },
          select: { id: true, name: true, order: true, isWonStage: true, isLostStage: true },
        },
      },
    });
  }

  async listDeals(
    orgId: string,
    options: {
      limit: number;
      cursor?: string;
      contactId?: string;
      pipelineId?: string;
      stageId?: string;
      status?: DealStatus;
    },
  ) {
    const where: Prisma.DealWhereInput = { orgId, deletedAt: null };
    if (options.contactId) where.contactId = options.contactId;
    if (options.pipelineId) where.pipelineId = options.pipelineId;
    if (options.stageId) where.stageId = options.stageId;
    if (options.status) where.status = options.status;

    const rows = await this.prisma.deal.findMany({
      where,
      take: options.limit + 1,
      ...(options.cursor && { cursor: { id: options.cursor }, skip: 1 }),
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: DEAL_SELECT,
    });

    const hasMore = rows.length > options.limit;
    const data = (hasMore ? rows.slice(0, options.limit) : rows).map(toDealDto);
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;
    return { data, nextCursor, hasMore };
  }

  async getDeal(id: string, orgId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { ...DEAL_SELECT, notes: true, followUpNote: true },
    });
    return deal ? toDealDto(deal) : null;
  }

  /**
   * Update a contact by ID and org.
   */
  async updateContact(
    id: string,
    orgId: string,
    data: { name?: string; email?: string; metadata?: Record<string, unknown> },
  ) {
    return this.prisma.contact.updateMany({
      where: { id, orgId, deletedAt: null },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.metadata && { metadata: data.metadata as any }),
      },
    });
  }

  /**
   * Get active WhatsApp sessions for an org.
   */
  async getActiveSessions(orgId: string) {
    return this.prisma.whatsAppSession.findMany({
      where: { orgId, deletedAt: null },
      select: {
        id: true,
        phoneNumber: true,
        status: true,
        lastActiveAt: true,
        lastHeartbeatAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get first connected session for org (for sending messages).
   */
  async getFirstConnectedSession(orgId: string) {
    return this.prisma.whatsAppSession.findFirst({
      where: { orgId, status: 'CONNECTED', deletedAt: null },
      select: { id: true, phoneNumber: true, userId: true },
    });
  }

  /**
   * Create or update a custom text template for an org.
   */
  async createTemplate(data: {
    orgId: string;
    name: string;
    body: string;
    language?: string;
    category?: string;
  }) {
    return this.prisma.messageTemplate.upsert({
      where: {
        unique_template_per_org: {
          orgId: data.orgId,
          name: data.name,
          language: data.language ?? 'en',
          deletedAt: null as any,
        },
      },
      create: {
        orgId: data.orgId,
        name: data.name,
        language: data.language ?? 'en',
        category: data.category ?? 'CUSTOM',
        status: 'APPROVED',
        components: [{ type: 'BODY', text: data.body }],
      },
      update: {
        components: [{ type: 'BODY', text: data.body }],
        category: data.category ?? 'CUSTOM',
        status: 'APPROVED',
      },
      select: { id: true, name: true, language: true, category: true, status: true, components: true, createdAt: true },
    });
  }

  /**
   * List approved message templates for an org.
   */
  async listTemplates(orgId: string) {
    return this.prisma.messageTemplate.findMany({
      where: { orgId, deletedAt: null, status: 'APPROVED' },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        language: true,
        category: true,
        status: true,
        components: true,
      },
    });
  }

  /**
   * Get connected session for a specific user in an org.
   */
  async getSessionByUserAndOrg(orgId: string, userId: string) {
    return this.prisma.whatsAppSession.findFirst({
      where: { orgId, userId, status: 'CONNECTED', deletedAt: null },
      select: { id: true, phoneNumber: true, userId: true },
    });
  }

  /**
   * Get dashboard stats for the developer portal.
   */
  async getDashboardStats(orgId: string) {
    const [totalMessages, totalContacts, activeSessions, activeApiKeys] = await Promise.all([
      this.prisma.message.count({ where: { orgId, deletedAt: null } }),
      this.prisma.contact.count({ where: { orgId, deletedAt: null } }),
      this.prisma.whatsAppSession.count({ where: { orgId, status: 'CONNECTED', deletedAt: null } }),
      this.prisma.apiKey.count({ where: { orgId, isActive: true } }),
    ]);

    return { totalMessages, totalContacts, activeSessions, activeApiKeys };
  }

  /** Record one Developer API request for the API Logs view. */
  async logApiRequest(data: {
    orgId: string;
    apiKeyId: string;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    ipAddress?: string;
    errorMessage?: string;
  }) {
    await this.prisma.apiRequestLog.create({
      data: {
        ...data,
        path: data.path.slice(0, 255),
        ipAddress: data.ipAddress?.slice(0, 45),
        errorMessage: data.errorMessage?.slice(0, 500),
      },
    });
  }

  async deleteApiRequestLogsBefore(cutoff: Date): Promise<number> {
    const result = await this.prisma.apiRequestLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  }

  /**
   * Get Developer API request logs with cursor-based pagination, newest first.
   * Includes the key's name so the UI can show which key made the call.
   */
  async getApiLogs(orgId: string, limit: number, cursor?: string) {
    const rows = await this.prisma.apiRequestLog.findMany({
      where: { orgId },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const keyIds = [...new Set(rows.map((r) => r.apiKeyId))];
    const keys = keyIds.length
      ? await this.prisma.apiKey.findMany({
          where: { orgId, id: { in: keyIds } },
          select: { id: true, name: true, keyPrefix: true },
        })
      : [];
    const keyById = new Map(keys.map((k) => [k.id, k]));
    const logs = rows.map((r) => ({
      id: r.id,
      method: r.method,
      path: r.path,
      statusCode: r.statusCode,
      durationMs: r.durationMs,
      errorMessage: r.errorMessage,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt,
      apiKeyName: keyById.get(r.apiKeyId)?.name ?? null,
      apiKeyPrefix: keyById.get(r.apiKeyId)?.keyPrefix ?? null,
    }));

    const hasMore = logs.length > limit;
    const data = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return { data, nextCursor, hasMore };
  }

}
