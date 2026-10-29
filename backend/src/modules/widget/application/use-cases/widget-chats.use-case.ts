import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WidgetRepository } from '../../infrastructure/repositories/widget.repository';

export interface WebsiteChatSummary {
  id: string;
  visitorName: string | null;
  visitorPhone: string | null;
  visitorEmail: string | null;
  pageUrl: string | null;
  status: string;
  lastMessage: { body: string; sender: string; createdAt: Date } | null;
  /** The visitor wrote last: someone should reply */
  waiting: boolean;
  updatedAt: Date;
}

const MAX_REPLY = 4096;

/**
 * Website chats for the team (Inbox → Website): read them, reply, close them.
 * A reply is stored for the visitor's widget, which picks it up within seconds;
 * while a person is replying, the AI assistant stays quiet in that chat.
 */
@Injectable()
export class WidgetChatsUseCase {
  constructor(private readonly repo: WidgetRepository) {}

  async list(orgId: string, status: 'open' | 'closed' = 'open', page = 1, limit = 30) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const { rows, total } = await this.repo.listChats(orgId, status, take, skip);
    const data: WebsiteChatSummary[] = rows.map((s) => {
      const last = s.messages[0] ?? null;
      return {
        id: s.id,
        visitorName: s.visitorName,
        visitorPhone: s.visitorPhone,
        visitorEmail: s.visitorEmail,
        pageUrl: s.pageUrl,
        status: s.status,
        lastMessage: last ? { body: last.body, sender: last.sender, createdAt: last.createdAt } : null,
        waiting: last?.sender === 'visitor',
        updatedAt: s.updatedAt,
      };
    });
    return { data, total, page: Math.max(page, 1), limit: take };
  }

  async messages(orgId: string, sessionId: string) {
    const session = await this.repo.findSession(sessionId, orgId);
    if (!session) throw new NotFoundException('Chat not found');
    const messages = await this.repo.findSessionMessages(sessionId, orgId);
    return {
      chat: {
        id: session.id,
        visitorName: session.visitorName,
        visitorPhone: session.visitorPhone,
        visitorEmail: session.visitorEmail,
        pageUrl: session.pageUrl,
        status: session.status,
      },
      messages: messages.map((m) => ({ id: m.id, sender: m.sender, body: m.body, createdAt: m.createdAt })),
    };
  }

  async reply(orgId: string, sessionId: string, body: string) {
    const text = (body ?? '').trim();
    if (!text) throw new BadRequestException('Write a reply first');
    if (text.length > MAX_REPLY) throw new BadRequestException(`Keep the reply under ${MAX_REPLY} characters`);
    const session = await this.repo.findSession(sessionId, orgId);
    if (!session) throw new NotFoundException('Chat not found');

    const message = await this.repo.addMessage(sessionId, orgId, 'agent', text);
    await this.repo.touch(sessionId);
    // Replying reopens a closed chat, like any inbox
    if (session.status !== 'open') await this.repo.setStatus(sessionId, orgId, 'open');
    return { id: message.id, sender: message.sender, body: message.body, createdAt: message.createdAt };
  }

  async setStatus(orgId: string, sessionId: string, status: 'open' | 'closed') {
    const session = await this.repo.findSession(sessionId, orgId);
    if (!session) throw new NotFoundException('Chat not found');
    await this.repo.setStatus(sessionId, orgId, status);
    return { id: sessionId, status };
  }
}
