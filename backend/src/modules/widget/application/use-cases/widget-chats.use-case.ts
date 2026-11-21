import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { WidgetRepository } from '../../infrastructure/repositories/widget.repository';
import { WebsiteChatRepository } from '../../infrastructure/repositories/website-chat.repository';
import { WebsiteHandoffService } from '../services/website-handoff.service';
import { CHAT_STATE } from '../../domain/services/website-chat';

export interface WebsiteChatSummary {
  id: string;
  visitorName: string | null;
  visitorPhone: string | null;
  visitorEmail: string | null;
  pageUrl: string | null;
  status: string;
  /** AI | WAITING | PERSON | ENDED */
  state: string;
  assignedTo: { id: string; name: string } | null;
  /** When the visitor asked for a person (WAITING) */
  handoffRequestedAt: Date | null;
  /** This member has an open offer to take the chat */
  offeredToMe: boolean;
  leadDecision: string | null;
  consentChannel: string | null;
  lastMessage: { body: string; sender: string; createdAt: Date } | null;
  /** The visitor wrote last: someone should reply */
  waiting: boolean;
  updatedAt: Date;
}

const MAX_REPLY = 4096;

/**
 * Website chats for the team (Inbox → Website): read them, take them, reply, close
 * them. Replying in a chat nobody has taken takes it, so the AI steps back and the
 * reply is recorded under the member who wrote it.
 */
@Injectable()
export class WidgetChatsUseCase {
  constructor(
    private readonly repo: WidgetRepository,
    private readonly chats: WebsiteChatRepository,
    private readonly handoff: WebsiteHandoffService,
  ) {}

  async list(orgId: string, status: 'open' | 'closed' = 'open', page = 1, limit = 30, userId?: string) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const { rows, total } = await this.repo.listChats(orgId, status, take, skip);

    const assignees = [...new Set(rows.map((s) => s.assignedToId).filter((id): id is string => !!id))];
    const people = await Promise.all(assignees.map((id) => this.chats.member(id, orgId)));
    const names = new Map(people.filter(Boolean).map((p) => [p!.id, `${p!.firstName} ${p!.lastName}`.trim()]));
    const myOffers = userId
      ? new Set(
          (
            await Promise.all(
              rows.filter((s) => s.state === CHAT_STATE.WAITING).map(async (s) => ((await this.chats.findOpenOffer(s.id, userId)) ? s.id : null)),
            )
          ).filter(Boolean) as string[],
        )
      : new Set<string>();

    const data: WebsiteChatSummary[] = rows.map((s) => {
      const last = s.messages[0] ?? null;
      return {
        id: s.id,
        visitorName: s.visitorName,
        visitorPhone: s.visitorPhone,
        visitorEmail: s.visitorEmail,
        pageUrl: s.pageUrl,
        status: s.status,
        state: s.state,
        assignedTo: s.assignedToId ? { id: s.assignedToId, name: names.get(s.assignedToId) ?? 'Team member' } : null,
        handoffRequestedAt: s.handoffRequestedAt,
        offeredToMe: myOffers.has(s.id),
        leadDecision: s.leadDecision,
        consentChannel: s.consentChannel,
        lastMessage: last ? { body: last.body, sender: last.sender, createdAt: last.createdAt } : null,
        waiting: last?.sender === 'visitor',
        updatedAt: s.updatedAt,
      };
    });
    // Visitors waiting for a person come first, oldest request first
    data.sort((a, b) => {
      const wa = a.state === CHAT_STATE.WAITING ? 0 : 1;
      const wb = b.state === CHAT_STATE.WAITING ? 0 : 1;
      if (wa !== wb) return wa - wb;
      if (wa === 0) return (a.handoffRequestedAt?.getTime() ?? 0) - (b.handoffRequestedAt?.getTime() ?? 0);
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
    return { data, total, page: Math.max(page, 1), limit: take };
  }

  async messages(orgId: string, sessionId: string) {
    const session = await this.repo.findSession(sessionId, orgId);
    if (!session) throw new NotFoundException('Chat not found');
    const messages = await this.repo.findSessionMessages(sessionId, orgId);
    const writers = [...new Set(messages.map((m) => m.senderUserId).filter((id): id is string => !!id))];
    const people = await Promise.all([...writers, ...(session.assignedToId ? [session.assignedToId] : [])].map((id) => this.chats.member(id, orgId)));
    const names = new Map(people.filter(Boolean).map((p) => [p!.id, `${p!.firstName} ${p!.lastName}`.trim()]));
    return {
      chat: {
        id: session.id,
        visitorName: session.visitorName,
        visitorPhone: session.visitorPhone,
        visitorEmail: session.visitorEmail,
        pageUrl: session.pageUrl,
        status: session.status,
        state: session.state,
        assignedTo: session.assignedToId ? { id: session.assignedToId, name: names.get(session.assignedToId) ?? 'Team member' } : null,
        handoffRequestedAt: session.handoffRequestedAt,
        handoffReason: session.handoffReason,
        consentChannel: session.consentChannel,
        consentAt: session.consentAt,
        contactId: session.contactId,
        leadDecision: session.leadDecision,
        endedAt: session.endedAt,
        endReason: session.endReason,
      },
      messages: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        body: m.body,
        createdAt: m.createdAt,
        senderName: m.senderUserId ? names.get(m.senderUserId) ?? null : null,
      })),
    };
  }

  async reply(orgId: string, sessionId: string, body: string, userId: string) {
    const text = (body ?? '').trim();
    if (!text) throw new BadRequestException('Write a reply first');
    if (text.length > MAX_REPLY) throw new BadRequestException(`Keep the reply under ${MAX_REPLY} characters`);
    const session = await this.repo.findSession(sessionId, orgId);
    if (!session) throw new NotFoundException('Chat not found');

    if (session.state === CHAT_STATE.PERSON && session.assignedToId && session.assignedToId !== userId) {
      const holder = await this.chats.member(session.assignedToId, orgId);
      throw new ConflictException(`${holder?.firstName ?? 'Someone'} is handling this chat`);
    }
    // Replying in a chat with the AI (or waiting) takes it
    if (session.state === CHAT_STATE.AI || session.state === CHAT_STATE.WAITING) {
      await this.handoff.accept(orgId, sessionId, userId, 'REPLIED');
    } else if (session.state === CHAT_STATE.ENDED) {
      // Replying reopens an ended chat, like any inbox; the member has it
      await this.chats.reopen(sessionId, orgId);
      await this.handoff.accept(orgId, sessionId, userId, 'REPLIED');
    }

    const message = await this.repo.addMessage(sessionId, orgId, 'agent', text, userId);
    await this.repo.touch(sessionId);
    if (session.status !== 'open') await this.repo.setStatus(sessionId, orgId, 'open');
    this.handoff.activity(orgId, sessionId);
    return { id: message.id, sender: message.sender, body: message.body, createdAt: message.createdAt };
  }

  /** Close = end the conversation (visitor sees "Chat ended"); reopen = open it again */
  async setStatus(orgId: string, sessionId: string, status: 'open' | 'closed', userId: string) {
    const session = await this.repo.findSession(sessionId, orgId);
    if (!session) throw new NotFoundException('Chat not found');
    if (status === 'closed') await this.handoff.end(orgId, sessionId, { type: 'user', id: userId }, 'MEMBER');
    else await this.repo.setStatus(sessionId, orgId, 'open');
    return { id: sessionId, status };
  }
}
