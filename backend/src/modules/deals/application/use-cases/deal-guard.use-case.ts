import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import { DealStatus, MessageDirection, MessageStatus, MessageType } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { WhatsAppApiService } from '@/infrastructure/external/whatsapp/whatsapp-api.service';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { ConversationRepository } from '@/modules/messages/infrastructure/repositories/conversation.repository';
import { EVENT_NAMES } from '@/common/constants';
import {
  ChatMessage,
  GhostRadar,
  TrustCard,
  evaluateGhostRadar,
  evaluateTrust,
} from '../../domain/services/deal-guard.policy';

/** The two answers on a scope-approval poll. Their text is hashed into votes — don't change it. */
export const SCOPE_POLL_OPTIONS = ['✅ Approve', '✏️ Need changes'] as const;
const SCOPE_POLL_QUESTION = 'Do you approve the scope above?';

export type ScopeStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'CHANGES_REQUESTED';

export interface DealGuard {
  dealId: string;
  ghost: GhostRadar;
  trust: TrustCard;
  scope: {
    summary: string | null;
    status: ScopeStatus | null;
    sentAt: string | null;
    respondedAt: string | null;
  };
}

/**
 * Deal Guard for one deal:
 *  - ghost radar + trust card, computed from the chat and deal history
 *  - scope lock: draft a scope, send it with a WhatsApp approval poll, record the vote
 */
@Injectable()
export class DealGuardUseCase implements OnModuleInit {
  private readonly logger = new Logger(DealGuardUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageRepo: MessageRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly whatsappApi: WhatsAppApiService,
    private readonly connectionManager: BaileysConnectionManager,
    private readonly aiProvider: AiProviderService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Lets the WhatsApp layer decrypt votes on our scope polls. */
  onModuleInit(): void {
    this.connectionManager.registerPollLookup(async (pollMessageId) => {
      const deal = await this.prisma.deal.findUnique({
        where: { scopePollMessageId: pollMessageId },
        select: { scopePollSecret: true },
      });
      return deal?.scopePollSecret
        ? { secretBase64: deal.scopePollSecret, options: [...SCOPE_POLL_OPTIONS] }
        : null;
    });
  }

  async getGuard(orgId: string, dealId: string, now = new Date()): Promise<DealGuard> {
    const deal = await this.findDeal(orgId, dealId);
    const messages = await this.chatMessages(orgId, deal.contact.phoneNumber);

    const otherDeals = await this.prisma.deal.groupBy({
      by: ['status'],
      where: { orgId, contactId: deal.contactId, deletedAt: null, id: { not: deal.id } },
      _count: { _all: true },
    });
    const count = (status: DealStatus) => otherDeals.find((d) => d.status === status)?._count._all ?? 0;

    return {
      dealId: deal.id,
      ghost: evaluateGhostRadar({
        messages,
        stageName: deal.stage.name,
        contactName: deal.contact.name,
        now,
      }),
      trust: evaluateTrust({
        messages,
        history: { won: count(DealStatus.WON), lost: count(DealStatus.LOST), open: count(DealStatus.OPEN) },
      }),
      scope: {
        summary: deal.scopeSummary,
        status: deal.scopeStatus as ScopeStatus | null,
        sentAt: deal.scopeSentAt?.toISOString() ?? null,
        respondedAt: deal.scopeRespondedAt?.toISOString() ?? null,
      },
    };
  }

  /**
   * Draft a scope from the chat with AI; falls back to a fill-in template.
   * `onAiUsed` is called when the AI produced the draft (for usage metering).
   */
  async draftScope(orgId: string, dealId: string, onAiUsed?: () => Promise<unknown>): Promise<DealGuard> {
    const deal = await this.findDeal(orgId, dealId);
    const messages = await this.chatMessages(orgId, deal.contact.phoneNumber);

    const transcript = messages
      .slice(-40)
      .filter((m) => m.body)
      .map((m) => `${m.direction === 'INBOUND' ? 'Client' : 'Me'}: ${m.body}`)
      .join('\n');

    let summary = '';
    if (transcript) {
      try {
        const result = await this.aiProvider.complete({
          systemPrompt: [
            'You write short project scope summaries for freelancers to send to clients on WhatsApp.',
            'Use only facts from the chat. Write in the language the client uses.',
            'Format exactly as these lines (omit a line if the chat has no info for it):',
            'Project: …',
            'Deliverables: … (comma-separated)',
            'Not included: …',
            'Timeline: …',
            'Price: …',
            'Revisions: …',
            'Keep it under 600 characters. No greeting, no sign-off.',
          ].join('\n'),
          userPrompt: `Deal: ${deal.title}\n\nChat:\n${transcript}`,
          maxTokens: 300,
        });
        summary = result.text.trim();
        if (summary && onAiUsed) await onAiUsed().catch(() => undefined);
      } catch (error) {
        this.logger.warn(`Scope draft AI call failed for deal ${dealId}: ${error}`);
      }
    }

    if (!summary) {
      const price = deal.value != null ? `₹${Number(deal.value).toLocaleString('en-IN')}` : '…';
      summary = [
        `Project: ${deal.title}`,
        'Deliverables: …',
        'Not included: …',
        'Timeline: …',
        `Price: ${price}`,
        'Revisions: …',
      ].join('\n');
    }

    await this.prisma.deal.update({
      where: { id: deal.id },
      data: { scopeSummary: summary, scopeStatus: 'DRAFT' },
    });
    return this.getGuard(orgId, dealId);
  }

  async saveScope(orgId: string, dealId: string, summary: string): Promise<DealGuard> {
    const deal = await this.findDeal(orgId, dealId);
    await this.prisma.deal.update({
      where: { id: deal.id },
      // Editing a sent scope means it has to be approved again
      data: { scopeSummary: summary.trim(), scopeStatus: 'DRAFT', scopeRespondedAt: null },
    });
    return this.getGuard(orgId, dealId);
  }

  /** Send the scope as a message, followed by an Approve / Need changes poll. */
  async sendScope(orgId: string, userId: string, dealId: string): Promise<DealGuard> {
    const deal = await this.findDeal(orgId, dealId);
    if (!deal.scopeSummary?.trim()) throw new BadRequestException('Write the scope first');
    if (deal.scopeSummary.includes('…')) {
      throw new BadRequestException('Fill in the "…" parts of the scope before sending');
    }

    const session =
      (await this.prisma.whatsAppSession.findFirst({
        where: { orgId, userId, deletedAt: null, status: 'CONNECTED' },
        orderBy: { lastActiveAt: 'desc' },
      })) ??
      (await this.prisma.whatsAppSession.findFirst({
        where: { orgId, deletedAt: null, status: 'CONNECTED' },
        orderBy: { lastActiveAt: 'desc' },
      }));
    if (!session || !this.whatsappApi.isSessionConnected(session.id)) {
      throw new BadRequestException('Connect WhatsApp first');
    }

    const phone = deal.contact.phoneNumber;
    const scopeText = `📋 *Scope — ${deal.title}*\n\n${deal.scopeSummary.trim()}`;
    const secret = randomBytes(32);

    const textResult = await this.whatsappApi.sendTextMessage(session.id, phone, scopeText);
    const pollResult = await this.whatsappApi.sendPoll(session.id, phone, {
      name: SCOPE_POLL_QUESTION,
      options: [...SCOPE_POLL_OPTIONS],
      messageSecret: secret,
    });

    await this.prisma.deal.update({
      where: { id: deal.id },
      data: {
        scopeStatus: 'SENT',
        scopeSentAt: new Date(),
        scopeRespondedAt: null,
        scopePollMessageId: pollResult.whatsappMessageId,
        scopePollSecret: secret.toString('base64'),
      },
    });

    // Keep both in the CRM chat history
    const conversation = await this.conversationRepo.findOrCreate({ orgId, sessionId: session.id, contactPhone: phone });
    for (const [body, sent] of [
      [scopeText, textResult],
      [`📊 ${SCOPE_POLL_QUESTION}\n${SCOPE_POLL_OPTIONS.join(' / ')}`, pollResult],
    ] as const) {
      const message = await this.messageRepo.create({
        orgId,
        sessionId: session.id,
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        contactPhone: phone,
        body,
        metadata: { dealId: deal.id, scopeLock: true },
      });
      await this.messageRepo.setWhatsAppMessageId(message.id, sent.whatsappMessageId);
    }
    await this.conversationRepo.updateLastMessage(conversation.id, `📊 ${SCOPE_POLL_QUESTION}`, false);

    return this.getGuard(orgId, dealId);
  }

  /** Record the client's vote on a scope poll. */
  async recordVote(pollMessageId: string, selectedOptions: string[], votedAt: Date): Promise<void> {
    const deal = await this.prisma.deal.findUnique({
      where: { scopePollMessageId: pollMessageId },
      select: { id: true, orgId: true, title: true, pipelineId: true, assignedToId: true, contact: { select: { id: true, name: true, phoneNumber: true, ownerId: true } } },
    });
    if (!deal) return;

    // An empty vote means the client un-voted — back to waiting
    const status: ScopeStatus = selectedOptions.includes(SCOPE_POLL_OPTIONS[0])
      ? 'APPROVED'
      : selectedOptions.includes(SCOPE_POLL_OPTIONS[1])
        ? 'CHANGES_REQUESTED'
        : 'SENT';

    await this.prisma.deal.update({
      where: { id: deal.id },
      data: { scopeStatus: status, scopeRespondedAt: status === 'SENT' ? null : votedAt },
    });

    if (status !== 'SENT') {
      this.eventEmitter.emit(EVENT_NAMES.DEAL_SCOPE_RESPONDED, {
        dealId: deal.id,
        orgId: deal.orgId,
        pipelineId: deal.pipelineId,
        title: deal.title,
        contactId: deal.contact.id,
        contactName: deal.contact.name ?? deal.contact.phoneNumber,
        approved: status === 'APPROVED',
        userId: deal.assignedToId ?? deal.contact.ownerId ?? null,
      });
    }
    this.logger.log(`Scope poll on deal ${deal.id}: ${status}`);
  }

  private async findDeal(orgId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, orgId, deletedAt: null },
      include: {
        stage: { select: { name: true } },
        contact: { select: { id: true, name: true, phoneNumber: true } },
      },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  private async chatMessages(orgId: string, contactPhone: string): Promise<ChatMessage[]> {
    const rows = await this.messageRepo.findRecentByContactPhone(orgId, contactPhone);
    return rows.reverse().map((m) => ({
      direction: m.direction as ChatMessage['direction'],
      body: m.body ?? null,
      status: m.status as MessageStatus,
      createdAt: m.createdAt,
      sentAt: m.sentAt ?? null,
      readAt: m.readAt ?? null,
    }));
  }
}
