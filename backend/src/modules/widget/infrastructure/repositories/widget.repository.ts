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

  async addMessage(
    sessionId: string,
    orgId: string,
    sender: 'visitor' | 'agent',
    body: string,
  ): Promise<WidgetMessage> {
    return this.prisma.widgetMessage.create({
      data: { sessionId, orgId, sender, body },
    });
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
