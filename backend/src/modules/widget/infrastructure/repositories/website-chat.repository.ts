import { Injectable } from '@nestjs/common';
import { BotSettings, Prisma, WidgetSession } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { CHAT_STATE, type Candidate, type ChatActor, type ChatEventType } from '../../domain/services/website-chat';
import { workspaceKind, type WorkspaceKind } from '@/shared/utils/workspace-voice';

/**
 * Website chat state, offers to team members and the chat timeline. State moves are
 * conditional updates (only from the expected state), so two people or two jobs
 * acting at once can never both win.
 */
@Injectable()
export class WebsiteChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Timeline ────────────────────────────────────────────────────────────────

  addEvent(orgId: string, sessionId: string, type: ChatEventType, actor: ChatActor, data?: Record<string, unknown>) {
    return this.prisma.widgetChatEvent.create({
      data: {
        orgId,
        sessionId,
        type,
        actorType: actor.type,
        actorId: actor.type === 'user' ? actor.id : null,
        data: (data ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  timeline(sessionId: string, orgId: string) {
    return this.prisma.widgetChatEvent.findMany({
      where: { sessionId, orgId },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: { id: true, type: true, actorType: true, actorId: true, data: true, createdAt: true },
    });
  }

  // ── Session state ───────────────────────────────────────────────────────────

  findSession(sessionId: string, orgId: string): Promise<WidgetSession | null> {
    return this.prisma.widgetSession.findFirst({ where: { id: sessionId, orgId } });
  }

  /** AI → WAITING. False when the chat isn't with the AI (already waiting, with a person, or ended). */
  async startWaiting(sessionId: string, orgId: string, reason: string): Promise<boolean> {
    const r = await this.prisma.widgetSession.updateMany({
      where: { id: sessionId, orgId, state: CHAT_STATE.AI },
      data: { state: CHAT_STATE.WAITING, handoffRequestedAt: new Date(), handoffReason: reason, assignedToId: null },
    });
    return r.count === 1;
  }

  /** AI / WAITING → PERSON for this member. False when someone else already has it (or it ended). */
  async takeChat(sessionId: string, orgId: string, userId: string): Promise<boolean> {
    const r = await this.prisma.widgetSession.updateMany({
      where: { id: sessionId, orgId, state: { in: [CHAT_STATE.AI, CHAT_STATE.WAITING] } },
      data: { state: CHAT_STATE.PERSON, assignedToId: userId, acceptedAt: new Date(), status: 'open', botMissStreak: 0 },
    });
    return r.count === 1;
  }

  /** PERSON / WAITING → AI (a member hands the chat back). */
  async backToAi(sessionId: string, orgId: string): Promise<boolean> {
    const r = await this.prisma.widgetSession.updateMany({
      where: { id: sessionId, orgId, state: { in: [CHAT_STATE.PERSON, CHAT_STATE.WAITING] } },
      data: { state: CHAT_STATE.AI, assignedToId: null, botMissStreak: 0 },
    });
    return r.count === 1;
  }

  /** Any open state → ENDED. False when it had already ended. */
  async end(sessionId: string, orgId: string, reason: string): Promise<boolean> {
    const r = await this.prisma.widgetSession.updateMany({
      where: { id: sessionId, orgId, state: { not: CHAT_STATE.ENDED } },
      data: { state: CHAT_STATE.ENDED, endedAt: new Date(), endReason: reason, status: 'closed' },
    });
    return r.count === 1;
  }

  /** The visitor writes again after the chat ended: it starts over with the AI. */
  async reopen(sessionId: string, orgId: string): Promise<boolean> {
    const r = await this.prisma.widgetSession.updateMany({
      where: { id: sessionId, orgId, state: CHAT_STATE.ENDED },
      data: {
        state: CHAT_STATE.AI,
        status: 'open',
        assignedToId: null,
        handoffRequestedAt: null,
        handoffReason: null,
        acceptedAt: null,
        endedAt: null,
        endReason: null,
        botMissStreak: 0,
      },
    });
    return r.count === 1;
  }

  /** Counts an unanswered question; returns the streak. */
  async addMiss(sessionId: string): Promise<number> {
    const s = await this.prisma.widgetSession.update({
      where: { id: sessionId },
      data: { botMissStreak: { increment: 1 } },
      select: { botMissStreak: true },
    });
    return s.botMissStreak;
  }

  async clearMisses(sessionId: string): Promise<void> {
    await this.prisma.widgetSession.updateMany({ where: { id: sessionId, botMissStreak: { gt: 0 } }, data: { botMissStreak: 0 } });
  }

  /** Name, mobile and email from the form before the chat */
  saveDetails(sessionId: string, orgId: string, data: { name: string; phone: string; email: string; pageUrl?: string }) {
    return this.prisma.widgetSession.updateMany({
      where: { id: sessionId, orgId },
      data: {
        visitorName: data.name,
        visitorPhone: data.phone,
        visitorEmail: data.email,
        ...(data.pageUrl ? { pageUrl: data.pageUrl } : {}),
      },
    });
  }

  /** The visitor agreed to be contacted. False when they already had (nothing new). */
  async saveConsent(sessionId: string, orgId: string, channel: string): Promise<boolean> {
    const r = await this.prisma.widgetSession.updateMany({
      where: { id: sessionId, orgId, consentAt: null },
      data: { consentChannel: channel, consentAt: new Date() },
    });
    return r.count === 1;
  }

  /** `welcomePending`: a new contact whose welcome waits until the chat ends */
  linkContact(sessionId: string, orgId: string, contactId: string, welcomePending = false) {
    return this.prisma.widgetSession.updateMany({
      where: { id: sessionId, orgId },
      data: { contactId, ...(welcomePending ? { welcomePending: true } : {}) },
    });
  }

  /** The chat ended: takes the pending welcome, once. False when there is none (or it already went). */
  async claimWelcome(sessionId: string, orgId: string): Promise<boolean> {
    const r = await this.prisma.widgetSession.updateMany({
      where: { id: sessionId, orgId, welcomePending: true },
      data: { welcomePending: false, welcomeAt: new Date() },
    });
    return r.count === 1;
  }

  /** LEAD / NOT_LEAD, once per chat. False when it was already decided. */
  async decideLead(sessionId: string, orgId: string, decision: 'LEAD' | 'NOT_LEAD'): Promise<boolean> {
    const r = await this.prisma.widgetSession.updateMany({
      where: { id: sessionId, orgId, leadDecision: null },
      data: { leadDecision: decision },
    });
    return r.count === 1;
  }

  // ── Offers to team members ──────────────────────────────────────────────────

  createOffer(orgId: string, sessionId: string, userId: string, expiresAt: Date | null) {
    return this.prisma.widgetHandoffOffer.create({ data: { orgId, sessionId, userId, expiresAt } });
  }

  findOffer(offerId: string) {
    return this.prisma.widgetHandoffOffer.findUnique({ where: { id: offerId } });
  }

  findOpenOffer(sessionId: string, userId: string) {
    return this.prisma.widgetHandoffOffer.findFirst({ where: { sessionId, userId, status: 'OFFERED' } });
  }

  /** Members this chat was offered to so far (any answer) */
  async offeredUserIds(sessionId: string, since: Date | null): Promise<Set<string>> {
    const rows = await this.prisma.widgetHandoffOffer.findMany({
      where: { sessionId, ...(since ? { offeredAt: { gte: since } } : {}) },
      select: { userId: true },
    });
    return new Set(rows.map((r) => r.userId));
  }

  countOpenOffers(sessionId: string): Promise<number> {
    return this.prisma.widgetHandoffOffer.count({ where: { sessionId, status: 'OFFERED' } });
  }

  /** OFFERED → status. False when the offer was already answered. */
  async closeOffer(offerId: string, status: 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED'): Promise<boolean> {
    const r = await this.prisma.widgetHandoffOffer.updateMany({
      where: { id: offerId, status: 'OFFERED' },
      data: { status, respondedAt: new Date() },
    });
    return r.count === 1;
  }

  /** Someone took the chat (or it ended): every other open offer is withdrawn. Returns who had one. */
  async cancelOpenOffers(sessionId: string, exceptUserId?: string): Promise<string[]> {
    const open = await this.prisma.widgetHandoffOffer.findMany({
      where: { sessionId, status: 'OFFERED', ...(exceptUserId ? { userId: { not: exceptUserId } } : {}) },
      select: { id: true, userId: true },
    });
    if (open.length) {
      await this.prisma.widgetHandoffOffer.updateMany({
        where: { id: { in: open.map((o) => o.id) }, status: 'OFFERED' },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });
    }
    return open.map((o) => o.userId);
  }

  // ── Team ────────────────────────────────────────────────────────────────────

  /** Everyone who can answer chats: active members of the org */
  teamMembers(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
  }

  member(userId: string, orgId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, orgId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
  }

  /** Load per member, for auto-assign */
  async candidates(orgId: string, userIds: string[]): Promise<Candidate[]> {
    if (!userIds.length) return [];
    const [open, last] = await Promise.all([
      this.prisma.widgetSession.groupBy({
        by: ['assignedToId'],
        where: { orgId, state: CHAT_STATE.PERSON, assignedToId: { in: userIds } },
        _count: { _all: true },
      }),
      this.prisma.widgetSession.groupBy({
        by: ['assignedToId'],
        where: { orgId, assignedToId: { in: userIds }, acceptedAt: { not: null } },
        _max: { acceptedAt: true },
      }),
    ]);
    const openBy = new Map(open.map((r) => [r.assignedToId, r._count._all]));
    const lastBy = new Map(last.map((r) => [r.assignedToId, r._max.acceptedAt]));
    return userIds.map((userId) => ({
      userId,
      openChats: openBy.get(userId) ?? 0,
      lastAcceptedAt: lastBy.get(userId) ?? null,
    }));
  }

  // ── Settings ────────────────────────────────────────────────────────────────

  settings(orgId: string): Promise<BotSettings> {
    return this.prisma.botSettings.upsert({ where: { orgId }, create: { orgId }, update: {} });
  }

  async timezone(orgId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { timezone: true } });
    return org?.timezone || 'UTC';
  }

  /** The name visitors know the business by: the widget's company name, else the org name */
  /** Freelancer (one person, "I") or a team ("we"): decides how fixed lines read */
  async workspaceKind(orgId: string): Promise<WorkspaceKind> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { orgType: true } });
    return workspaceKind(org?.orgType);
  }

  async businessName(orgId: string): Promise<string> {
    const [config, org] = await Promise.all([
      this.prisma.widgetConfig.findUnique({ where: { orgId }, select: { companyName: true } }),
      this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
    ]);
    return config?.companyName || org?.name || 'us';
  }

  /** The workspace's first admin: owner of contacts created from the website */
  firstAdmin(orgId: string) {
    return this.prisma.user.findFirst({
      where: { orgId, role: 'ADMIN', deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
  }
}
