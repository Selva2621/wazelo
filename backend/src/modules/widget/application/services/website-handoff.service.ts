import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction, BotSettings, NotificationPriority } from '@prisma/client';
import { QUEUE_NAMES } from '@/common/constants';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { NotificationDispatchService } from '@/modules/notifications/domain/services/notification-dispatch.service';
import { isOpen } from '@/modules/chatbot/domain/services/bot-hours';
import { inWorkspaceVoice } from '@/shared/utils/workspace-voice';
import { WidgetRepository } from '../../infrastructure/repositories/widget.repository';
import { WebsiteChatRepository } from '../../infrastructure/repositories/website-chat.repository';
import {
  AUTO,
  CHAT_EVENT,
  CHAT_STATE,
  CONSENT_THANKS,
  FOLLOW_UP_MESSAGE,
  IDLE_MINUTES,
  pickNextMember,
  type ChatActor,
  type ChatEventType,
  type EndReason,
  type HandoffTrigger,
} from '../../domain/services/website-chat';
import { WidgetLeadsService } from './widget-leads.service';

export interface OfferTimeoutJob {
  offerId: string;
}
export interface IdleCheckJob {
  orgId: string;
  sessionId: string;
}
export interface WaitTimeoutJob {
  orgId: string;
  sessionId: string;
  /** The request this check belongs to: a later request has its own check */
  requestedAt: string;
}

/** What the visitor's widget shows after a handover step */
export interface HandoffOutcome {
  /** The message posted in the chat (already saved; also returned so the widget shows it at once) */
  message: { id: string; body: string; createdAt: Date } | null;
  state: string;
  /** Show the "leave your WhatsApp / email" card */
  offerFollowUp: boolean;
}

/** Socket events the team's inbox listens to */
export const WEBSITE_CHAT_SOCKET = {
  UPDATED: 'website-chat:updated',
  OFFER: 'website-chat:offer',
  OFFER_CLOSED: 'website-chat:offer-closed',
} as const;

/**
 * A website visitor asks for a real person: the team is alerted, a member accepts
 * (or is assigned), and the chat continues with them. Every step is written to the
 * chat's timeline; a step that fails is logged there too, never swallowed.
 */
@Injectable()
export class WebsiteHandoffService {
  private readonly logger = new Logger(WebsiteHandoffService.name);

  constructor(
    private readonly chats: WebsiteChatRepository,
    private readonly widgets: WidgetRepository,
    private readonly notifications: NotificationDispatchService,
    private readonly gateway: AppWebSocketGateway,
    private readonly queue: QueueService,
    private readonly audit: AuditService,
    private readonly leads: WidgetLeadsService,
  ) {}

  // ── Timeline ────────────────────────────────────────────────────────────────

  /** Writes one timeline step. Never throws: a failed write goes to the server log with every detail. */
  async record(orgId: string, sessionId: string, type: ChatEventType, actor: ChatActor, data?: Record<string, unknown>) {
    try {
      await this.chats.addEvent(orgId, sessionId, type, actor, data);
      this.logger.log(`website-chat ${type} org=${orgId} session=${sessionId}${data ? ` ${JSON.stringify(data)}` : ''}`);
    } catch (err) {
      this.logger.error(
        `Couldn't write website-chat event ${type} org=${orgId} session=${sessionId} data=${JSON.stringify(data ?? {})}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /** Something didn't work: it goes on the timeline as FAILED, with what was being done */
  async recordFailure(orgId: string, sessionId: string, step: string, err: unknown) {
    this.logger.error(`website-chat step ${step} failed org=${orgId} session=${sessionId}: ${(err as Error).message}`, (err as Error).stack);
    await this.record(orgId, sessionId, CHAT_EVENT.FAILED, { type: 'system' }, { step, error: (err as Error).message?.slice(0, 300) });
  }

  // ── Visitor asks for a person ───────────────────────────────────────────────

  async request(orgId: string, sessionId: string, trigger: HandoffTrigger): Promise<HandoffOutcome> {
    const started = await this.chats.startWaiting(sessionId, orgId, trigger);
    if (!started) {
      // Already waiting or with a person: nothing new to do (the visitor just sees the chat as it is)
      const session = await this.chats.findSession(sessionId, orgId);
      return { message: null, state: session?.state ?? CHAT_STATE.AI, offerFollowUp: false };
    }
    await this.record(orgId, sessionId, CHAT_EVENT.HANDOFF_REQUESTED, { type: 'visitor' }, { trigger });

    const [settings, timezone, members] = await Promise.all([
      this.chats.settings(orgId),
      this.chats.timezone(orgId),
      this.chats.teamMembers(orgId),
    ]);
    const open = isOpen(settings, timezone);
    const online = members.filter((m) => this.gateway.isUserOnline(m.id)).map((m) => m.id);
    const session = await this.chats.findSession(sessionId, orgId);
    const who = session?.visitorName?.trim() || 'A website visitor';

    // Closed, or nobody online: everyone is told (they see it when they're back) and the
    // visitor can leave a WhatsApp number / email; the chat stays in the queue
    if (!open || online.length === 0) {
      await this.record(orgId, sessionId, CHAT_EVENT.NO_ONE_AVAILABLE, { type: 'system' }, {
        reason: !open ? 'AFTER_HOURS' : 'NO_ONE_ONLINE',
        members: members.length,
      });
      await this.notify(orgId, sessionId, members.map((m) => m.id), 'NORMAL', `${who} wants to talk to a person`, 'waiting');
      const afterHours = !open ? await this.say(orgId, sessionId, settings.afterHoursMessage) : null;
      return this.followUp(orgId, sessionId, !open ? 'AFTER_HOURS' : 'NO_ONE_ONLINE', afterHours);
    }

    const message = await this.say(orgId, sessionId, settings.handoffMessage);
    if (settings.handoffMode === AUTO) {
      await this.offerNext(orgId, sessionId, settings);
    } else {
      await this.offerToAll(orgId, sessionId, online, who);
    }
    await this.scheduleWaitCheck(orgId, sessionId, settings, session?.handoffRequestedAt ?? new Date());
    this.emitUpdated(orgId, sessionId);
    return { message, state: CHAT_STATE.WAITING, offerFollowUp: false };
  }

  /** Manual mode: everyone online gets the chat at once; the first to accept takes it */
  private async offerToAll(orgId: string, sessionId: string, userIds: string[], who: string) {
    for (const userId of userIds) {
      try {
        await this.chats.createOffer(orgId, sessionId, userId, null);
        this.gateway.emitToUser(userId, WEBSITE_CHAT_SOCKET.OFFER, { sessionId });
      } catch (err) {
        await this.recordFailure(orgId, sessionId, `offer:${userId}`, err);
      }
    }
    await this.record(orgId, sessionId, CHAT_EVENT.OFFERED, { type: 'system' }, { mode: 'MANUAL', userIds });
    await this.notify(orgId, sessionId, userIds, 'HIGH', `${who} wants to talk to a person`, 'offer');
  }

  /**
   * Auto-assign: offer the chat to the next online member (fewest chats first) for
   * acceptTimeoutSec. When everyone was asked, all online members are alerted and
   * the first to accept takes it.
   */
  async offerNext(orgId: string, sessionId: string, settings?: BotSettings) {
    const s = settings ?? (await this.chats.settings(orgId));
    const session = await this.chats.findSession(sessionId, orgId);
    if (!session || session.state !== CHAT_STATE.WAITING) return;
    const who = session.visitorName?.trim() || 'A website visitor';

    const members = await this.chats.teamMembers(orgId);
    const online = members.filter((m) => this.gateway.isUserOnline(m.id)).map((m) => m.id);
    const asked = await this.chats.offeredUserIds(sessionId, session.handoffRequestedAt);
    const next = pickNextMember(await this.chats.candidates(orgId, online), asked);

    if (!next) {
      // Everyone online was asked (or nobody is online any more): anyone can take it now
      await this.record(orgId, sessionId, CHAT_EVENT.TEAM_NOTIFIED, { type: 'system' }, { mode: 'AUTO_FALLBACK', userIds: online });
      if (online.length) await this.offerToAll(orgId, sessionId, online, who);
      else await this.noOneTook(orgId, sessionId, 'TIMEOUT');
      return;
    }

    const expiresAt = new Date(Date.now() + s.acceptTimeoutSec * 1000);
    try {
      const offer = await this.chats.createOffer(orgId, sessionId, next, expiresAt);
      await this.record(orgId, sessionId, CHAT_EVENT.OFFERED, { type: 'system' }, { mode: 'AUTO', userId: next, expiresAt });
      this.gateway.emitToUser(next, WEBSITE_CHAT_SOCKET.OFFER, { sessionId, expiresAt });
      await this.notify(orgId, sessionId, [next], 'HIGH', `${who} wants to talk to a person`, `offer:${offer.id}`);
      await this.queue.publishDelayed<OfferTimeoutJob>(QUEUE_NAMES.WIDGET_OFFER_TIMEOUT, { offerId: offer.id }, s.acceptTimeoutSec);
    } catch (err) {
      await this.recordFailure(orgId, sessionId, `auto-offer:${next}`, err);
    }
  }

  // ── Team member answers ─────────────────────────────────────────────────────

  /**
   * Takes the chat. Only one member can: the state moves only from AI/WAITING.
   * `how`: ACCEPT (the button) or REPLIED (they wrote in a chat nobody had taken).
   */
  async accept(orgId: string, sessionId: string, userId: string, how: 'ACCEPT' | 'REPLIED' = 'ACCEPT') {
    const member = await this.chats.member(userId, orgId);
    if (!member) throw new ForbiddenException('Only members of this workspace can take website chats');

    const took = await this.chats.takeChat(sessionId, orgId, userId);
    if (!took) {
      const session = await this.chats.findSession(sessionId, orgId);
      if (!session) throw new NotFoundException('Chat not found');
      if (session.state === CHAT_STATE.PERSON && session.assignedToId === userId) return this.view(session);
      if (session.state === CHAT_STATE.ENDED) throw new ConflictException('This chat has ended');
      const holder = session.assignedToId ? await this.chats.member(session.assignedToId, orgId) : null;
      throw new ConflictException(holder ? `${holder.firstName} already took this chat` : 'Someone already took this chat');
    }

    const own = await this.chats.findOpenOffer(sessionId, userId);
    if (own) await this.chats.closeOffer(own.id, 'ACCEPTED');
    const withdrawn = await this.chats.cancelOpenOffers(sessionId, userId);
    for (const other of withdrawn) this.gateway.emitToUser(other, WEBSITE_CHAT_SOCKET.OFFER_CLOSED, { sessionId, takenBy: member.firstName });

    await this.record(orgId, sessionId, CHAT_EVENT.ACCEPTED, { type: 'user', id: userId }, { how, viaOffer: !!own, withdrawnFrom: withdrawn });
    void this.audit.log({
      orgId,
      userId,
      action: AuditAction.WIDGET_CHAT_ACCEPTED,
      targetType: 'WidgetSession',
      targetId: sessionId,
      metadata: { how },
    });
    await this.say(orgId, sessionId, `${member.firstName} joined the chat`, 'system');
    this.emitUpdated(orgId, sessionId);
    const session = await this.chats.findSession(sessionId, orgId);
    return this.view(session!);
  }

  async decline(orgId: string, sessionId: string, userId: string) {
    const session = await this.chats.findSession(sessionId, orgId);
    if (!session) throw new NotFoundException('Chat not found');
    const offer = await this.chats.findOpenOffer(sessionId, userId);
    if (offer) await this.chats.closeOffer(offer.id, 'DECLINED');
    await this.record(orgId, sessionId, CHAT_EVENT.DECLINED, { type: 'user', id: userId }, { hadOffer: !!offer });
    void this.audit.log({ orgId, userId, action: AuditAction.WIDGET_CHAT_DECLINED, targetType: 'WidgetSession', targetId: sessionId });

    if (session.state === CHAT_STATE.WAITING) {
      const settings = await this.chats.settings(orgId);
      if (settings.handoffMode === AUTO) await this.offerNext(orgId, sessionId, settings);
      else if ((await this.chats.countOpenOffers(sessionId)) === 0) await this.noOneTook(orgId, sessionId, 'ALL_DECLINED');
    }
    this.emitUpdated(orgId, sessionId);
    return { ok: true };
  }

  /** Back to the AI assistant (the member is done, or took it by mistake) */
  async release(orgId: string, sessionId: string, userId: string) {
    const moved = await this.chats.backToAi(sessionId, orgId);
    if (!moved) throw new ConflictException('This chat is not with a person');
    await this.chats.cancelOpenOffers(sessionId);
    await this.record(orgId, sessionId, CHAT_EVENT.RELEASED_TO_AI, { type: 'user', id: userId });
    await this.say(orgId, sessionId, "You're chatting with our AI assistant again.", 'system');
    this.emitUpdated(orgId, sessionId);
    return this.view((await this.chats.findSession(sessionId, orgId))!);
  }

  async end(orgId: string, sessionId: string, actor: ChatActor, reason: EndReason, note?: string) {
    const ended = await this.chats.end(sessionId, orgId, reason);
    if (!ended) return { ended: false };
    const withdrawn = await this.chats.cancelOpenOffers(sessionId);
    for (const other of withdrawn) this.gateway.emitToUser(other, WEBSITE_CHAT_SOCKET.OFFER_CLOSED, { sessionId });
    await this.record(orgId, sessionId, CHAT_EVENT.ENDED, actor, { reason, ...(note ? { note } : {}) });
    if (actor.type === 'user') {
      void this.audit.log({
        orgId,
        userId: actor.id,
        action: AuditAction.WIDGET_CHAT_ENDED,
        targetType: 'WidgetSession',
        targetId: sessionId,
        metadata: { reason },
      });
    }
    await this.say(orgId, sessionId, 'Chat ended', 'system');
    await this.releaseWelcome(orgId, sessionId);
    this.emitUpdated(orgId, sessionId);
    return { ended: true };
  }

  /**
   * Nobody can take the chat now. The visitor agreed to be contacted: they're told
   * we'll reach them on WhatsApp and the chat ends (their welcome goes out). Not yet:
   * the widget offers a one-tap "Yes, contact me"; the chat stays in the queue.
   */
  private async followUp(
    orgId: string,
    sessionId: string,
    reason: string,
    /** Already said (the after-hours message): no second message */
    said: HandoffOutcome['message'] = null,
  ): Promise<HandoffOutcome> {
    const session = await this.chats.findSession(sessionId, orgId);
    if (session?.consentAt) {
      const message = await this.say(orgId, sessionId, CONSENT_THANKS);
      await this.end(orgId, sessionId, { type: 'system' }, 'UNAVAILABLE', reason);
      return { message, state: CHAT_STATE.ENDED, offerFollowUp: false };
    }
    const message = said ?? (await this.say(orgId, sessionId, FOLLOW_UP_MESSAGE));
    await this.record(orgId, sessionId, CHAT_EVENT.FOLLOW_UP_OFFERED, { type: 'system' }, { reason });
    this.emitUpdated(orgId, sessionId);
    return { message, state: CHAT_STATE.WAITING, offerFollowUp: true };
  }

  /** The chat ended: a new contact's welcome ("contact created" automations) goes out now, once. */
  private async releaseWelcome(orgId: string, sessionId: string) {
    try {
      if (!(await this.chats.claimWelcome(sessionId, orgId))) return;
      const session = await this.chats.findSession(sessionId, orgId);
      const sent = session?.contactId ? await this.leads.releaseWelcome(orgId, session.contactId) : false;
      await this.record(orgId, sessionId, CHAT_EVENT.WELCOME_TRIGGERED, { type: 'system' }, {
        contactId: session?.contactId ?? null,
        ran: sent,
        ...(sent ? {} : { why: 'contact missing or opted out' }),
      });
    } catch (err) {
      await this.recordFailure(orgId, sessionId, 'release-welcome', err);
    }
  }

  // ── Idle chats ──────────────────────────────────────────────────────────────

  /** After each message: check back in IDLE_MINUTES (one check queued per chat at a time) */
  async scheduleIdleCheck(orgId: string, sessionId: string) {
    try {
      await this.queue.publishOnce<IdleCheckJob>(QUEUE_NAMES.WIDGET_IDLE_CHECK, { orgId, sessionId }, `widget-idle:${sessionId}`, {
        startAfter: IDLE_MINUTES * 60,
      });
    } catch (err) {
      await this.recordFailure(orgId, sessionId, 'schedule-idle-check', err);
    }
  }

  /** No message for IDLE_MINUTES: the chat ends. Still active: check again when it could be idle. */
  async onIdleCheck(job: IdleCheckJob) {
    const session = await this.chats.findSession(job.sessionId, job.orgId);
    if (!session || session.state === CHAT_STATE.ENDED) return;
    const idleMs = Date.now() - session.updatedAt.getTime();
    const limitMs = IDLE_MINUTES * 60_000;
    if (idleMs >= limitMs) {
      await this.end(job.orgId, job.sessionId, { type: 'system' }, 'IDLE');
      return;
    }
    await this.queue.publishDelayed<IdleCheckJob>(QUEUE_NAMES.WIDGET_IDLE_CHECK, job, Math.ceil((limitMs - idleMs) / 1000) + 5);
  }

  // ── Timers (queue workers) ──────────────────────────────────────────────────

  /** An auto-assign offer ran out: it's marked expired and the next member is asked. */
  async onOfferTimeout(job: OfferTimeoutJob) {
    const offer = await this.chats.findOffer(job.offerId);
    if (!offer) return;
    const expired = await this.chats.closeOffer(offer.id, 'EXPIRED');
    if (!expired) return; // answered in time
    await this.record(offer.orgId, offer.sessionId, CHAT_EVENT.OFFER_EXPIRED, { type: 'system' }, { userId: offer.userId });
    this.gateway.emitToUser(offer.userId, WEBSITE_CHAT_SOCKET.OFFER_CLOSED, { sessionId: offer.sessionId, expired: true });
    await this.offerNext(offer.orgId, offer.sessionId);
  }

  /** Nobody took the chat in time: the visitor is offered a WhatsApp / email follow-up. */
  async onWaitTimeout(job: WaitTimeoutJob) {
    const session = await this.chats.findSession(job.sessionId, job.orgId);
    if (!session || session.state !== CHAT_STATE.WAITING) return;
    if (session.handoffRequestedAt?.toISOString() !== job.requestedAt) return; // a newer request has its own check
    await this.noOneTook(job.orgId, job.sessionId, 'TIMEOUT');
  }

  private async noOneTook(orgId: string, sessionId: string, reason: 'TIMEOUT' | 'ALL_DECLINED') {
    await this.record(orgId, sessionId, CHAT_EVENT.NO_ONE_AVAILABLE, { type: 'system' }, { reason });
    // Without consent the chat stays in the queue: anyone can still accept it
    await this.followUp(orgId, sessionId, reason);
  }

  private async scheduleWaitCheck(orgId: string, sessionId: string, settings: BotSettings, requestedAt: Date) {
    try {
      await this.queue.publishDelayed<WaitTimeoutJob>(
        QUEUE_NAMES.WIDGET_WAIT_TIMEOUT,
        { orgId, sessionId, requestedAt: requestedAt.toISOString() },
        Math.max(1, settings.waitTimeoutMin) * 60,
      );
    } catch (err) {
      await this.recordFailure(orgId, sessionId, 'schedule-wait-check', err);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Posts a message the visitor sees ("bot" = from the assistant, "system" = a notice like "Priya joined") */
  async say(orgId: string, sessionId: string, body: string, sender: 'bot' | 'system' = 'bot') {
    try {
      // Freelancers are one person: team-worded fixed lines ("our team…") read as "I"
      const text = inWorkspaceVoice(body, await this.chats.workspaceKind(orgId));
      const m = await this.widgets.addMessage(sessionId, orgId, sender, text);
      await this.widgets.touch(sessionId);
      return { id: m.id, body: m.body, createdAt: m.createdAt };
    } catch (err) {
      await this.recordFailure(orgId, sessionId, 'post-message', err);
      return null;
    }
  }

  /** One alert per member per step; each one is logged, and a failed one is recorded (not dropped silently) */
  private async notify(orgId: string, sessionId: string, userIds: string[], priority: NotificationPriority, title: string, step: string) {
    const delivered: string[] = [];
    for (const userId of userIds) {
      try {
        await this.notifications.dispatch({
          orgId,
          userId,
          type: 'WEBSITE_HANDOFF',
          priority,
          title,
          body: 'Open Inbox → Website to take the chat.',
          data: { widgetSessionId: sessionId, link: `/inbox?channel=website&chat=${sessionId}` },
          groupKey: `website-handoff:${sessionId}`,
          idempotencyKey: `website-handoff:${sessionId}:${step}:${userId}`,
        });
        delivered.push(userId);
      } catch (err) {
        await this.recordFailure(orgId, sessionId, `notify:${userId}`, err);
      }
    }
    await this.record(orgId, sessionId, CHAT_EVENT.TEAM_NOTIFIED, { type: 'system' }, { step, userIds: delivered, priority });
  }

  /** New activity in a chat (visitor wrote, AI answered): open inboxes refresh it */
  activity(orgId: string, sessionId: string) {
    this.emitUpdated(orgId, sessionId);
  }

  private emitUpdated(orgId: string, sessionId: string) {
    this.gateway.emitToOrg(orgId, WEBSITE_CHAT_SOCKET.UPDATED, { sessionId });
  }

  private view(s: { id: string; state: string; assignedToId: string | null; acceptedAt: Date | null }) {
    return { id: s.id, state: s.state, assignedToId: s.assignedToId, acceptedAt: s.acceptedAt };
  }
}
