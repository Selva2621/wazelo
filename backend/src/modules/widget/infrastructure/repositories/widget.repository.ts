import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { WidgetConfig, WidgetSession, WidgetMessage } from '@prisma/client';

// ─── Input interfaces ─────────────────────────────────────────────────────────

export interface UpsertWidgetConfigInput {
  enabled?: boolean;
  position?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  placeholder?: string;
  companyName?: string | null;
  avatarUrl?: string | null;
  whatsappNumber?: string | null;
  preChatFormEnabled?: boolean;
  aiAssistantEnabled?: boolean;
  aiSystemPrompt?: string | null;
}

export interface FindOrCreateSessionInput {
  orgId: string;
  visitorId: string;
  pageUrl?: string;
  userAgent?: string;
}

export interface UpdateSessionVisitorInput {
  visitorName?: string;
  visitorPhone?: string;
  visitorEmail?: string;
}

/** Who wrote a website-chat message: the visitor, a person on the team, or the AI assistant */
export type WidgetSender = 'visitor' | 'agent' | 'bot';

// ─── Output types ─────────────────────────────────────────────────────────────

export type WidgetConfigWithOrg = WidgetConfig & {
  orgName: string;
  orgSlug: string;
};

export type SessionWithMessages = WidgetSession & {
  messages: WidgetMessage[];
};

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class WidgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Config ──────────────────────────────────────────────────────────────────

  async findConfigByOrgId(orgId: string): Promise<WidgetConfig | null> {
    return this.prisma.widgetConfig.findUnique({ where: { orgId } });
  }

  async findConfigByOrgSlug(slug: string): Promise<WidgetConfigWithOrg | null> {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true },
    });
    if (!org) return null;

    const config = await this.prisma.widgetConfig.findUnique({
      where: { orgId: org.id },
    });

    return config
      ? { ...config, orgName: org.name, orgSlug: org.slug }
      : null;
  }

  async upsertConfig(
    orgId: string,
    data: UpsertWidgetConfigInput,
  ): Promise<WidgetConfig> {
    return this.prisma.widgetConfig.upsert({
      where: { orgId },
      create: { orgId, ...data },
      update: data,
    });
  }

  // ── Sessions ─────────────────────────────────────────────────────────────────

  /**
   * Find existing session for this visitor in this org, or create a new one.
   * Uses upsert on the unique (orgId, visitorId) constraint.
   */
  async findOrCreateSession(
    input: FindOrCreateSessionInput,
  ): Promise<WidgetSession> {
    const { orgId, visitorId, pageUrl, userAgent } = input;
    return this.prisma.widgetSession.upsert({
      where: { unique_visitor_per_org: { orgId, visitorId } },
      create: { orgId, visitorId, pageUrl, userAgent },
      update: { pageUrl, updatedAt: new Date() },
    });
  }

  /**
   * Update visitor identity fields on an existing session (idempotent —
   * only sets fields that are not yet populated).
   */
  async updateSessionVisitor(
    sessionId: string,
    orgId: string,
    input: UpdateSessionVisitorInput,
  ): Promise<WidgetSession> {
    const session = await this.prisma.widgetSession.findFirst({
      where: { id: sessionId, orgId },
    });

    // Only overwrite fields that haven't been set yet
    const update: UpdateSessionVisitorInput = {};
    if (!session?.visitorName && input.visitorName)
      update.visitorName = input.visitorName;
    if (!session?.visitorPhone && input.visitorPhone)
      update.visitorPhone = input.visitorPhone;
    if (!session?.visitorEmail && input.visitorEmail)
      update.visitorEmail = input.visitorEmail;

    return this.prisma.widgetSession.update({
      where: { id: sessionId },
      data: update,
    });
  }

  // ── Messages ─────────────────────────────────────────────────────────────────

  /** sender: "visitor", "agent" (a person on the team) or "bot" (the AI assistant) */
  async addMessage(
    sessionId: string,
    orgId: string,
    sender: WidgetSender,
    body: string,
  ): Promise<WidgetMessage> {
    return this.prisma.widgetMessage.create({
      data: { sessionId, orgId, sender, body },
    });
  }

  // ── Website chats for the team (inbox → Website) ──────────────────────────────

  /** Chats with at least one message, most recent activity first, each with its last message. */
  async listChats(orgId: string, status: 'open' | 'closed', take: number, skip: number) {
    const where = { orgId, status, messages: { some: {} } };
    const [rows, total] = await Promise.all([
      this.prisma.widgetSession.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take,
        skip,
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
      this.prisma.widgetSession.count({ where }),
    ]);
    return { rows, total };
  }

  findSessionByVisitor(orgId: string, visitorId: string) {
    return this.prisma.widgetSession.findUnique({ where: { unique_visitor_per_org: { orgId, visitorId } } });
  }

  findSession(sessionId: string, orgId: string) {
    return this.prisma.widgetSession.findFirst({ where: { id: sessionId, orgId } });
  }

  async setStatus(sessionId: string, orgId: string, status: 'open' | 'closed'): Promise<void> {
    await this.prisma.widgetSession.updateMany({ where: { id: sessionId, orgId }, data: { status } });
  }

  /** Marks activity so the chat moves to the top of the team's list. */
  async touch(sessionId: string): Promise<void> {
    await this.prisma.widgetSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
  }

  /** Replies (team or AI) the visitor hasn't seen yet: newer than `after`, oldest first. */
  findRepliesAfter(sessionId: string, after: Date) {
    return this.prisma.widgetMessage.findMany({
      where: { sessionId, sender: { not: 'visitor' }, createdAt: { gt: after } },
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: { id: true, sender: true, body: true, createdAt: true },
    });
  }

  /** Has a person on the team written in this chat since `since`? Then the AI stays quiet. */
  async teamRepliedSince(sessionId: string, since: Date): Promise<boolean> {
    const n = await this.prisma.widgetMessage.count({
      where: { sessionId, sender: 'agent', createdAt: { gt: since } },
    });
    return n > 0;
  }

  /** How long the AI steps back after a person replies (the org's bot setting, default 12h). */
  async botPauseHours(orgId: string): Promise<number> {
    const s = await this.prisma.botSettings.findUnique({ where: { orgId }, select: { pauseHours: true } });
    return s?.pauseHours ?? 12;
  }

  async findSessionMessages(
    sessionId: string,
    orgId: string,
  ): Promise<WidgetMessage[]> {
    return this.prisma.widgetMessage.findMany({
      where: { sessionId, orgId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Org lookup ────────────────────────────────────────────────────────────────

  async findOrgIdBySlug(slug: string): Promise<string | null> {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    return org?.id ?? null;
  }

  async findOrgSlugById(orgId: string): Promise<string | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { slug: true },
    });
    return org?.slug ?? null;
  }
}
