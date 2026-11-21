import { Injectable } from '@nestjs/common';
import { AiReplyOutcome } from '@prisma/client';
import { AiReplyLogRepository } from '@/modules/ai/infrastructure/repositories/ai-reply-log.repository';
import { AiCreditsService } from '@/modules/billing/domain/services/ai-credits.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';

const DAY = 24 * 60 * 60 * 1000;

export interface BotInsights {
  days: number;
  /** Every automatic decision the bot made */
  total: number;
  answered: number;
  notFound: number;
  handedOff: number;
  blocked: number;
  limited: number;
  noCredits: number;
  failed: number;
  /** answered ÷ times the bot tried (null when it didn't try) */
  answerRate: number | null;
  tokens: number;
  credits: number;
  /** Replies the safety checks stopped, newest first */
  suspicious: {
    id: string;
    channel: string;
    outcome: 'BLOCKED' | 'LIMITED';
    reason: string | null;
    conversationId: string | null;
    /** WhatsApp chats: the contact's number, to open the chat in the inbox */
    contactPhone: string | null;
    /** Times this chat hit the checks in the period */
    repeats: number;
    at: Date;
  }[];
}

/**
 * The Chatbot page's health strip and Suspicious messages card, from the AI reply
 * trail (ai_reply_logs). Org-scoped; no message text involved.
 */
@Injectable()
export class GetBotInsightsUseCase {
  constructor(
    private readonly logs: AiReplyLogRepository,
    private readonly aiCredits: AiCreditsService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(orgId: string, days = 7): Promise<BotInsights> {
    const since = new Date(Date.now() - days * DAY);
    const [counts, charged, suspicious, repeats, chatCost, widgetCost] = await Promise.all([
      this.logs.countsByOutcome(orgId, since),
      this.logs.chargedByChannel(orgId, since),
      this.logs.listSuspicious(orgId, since, 20),
      this.logs.suspiciousByConversation(orgId, since),
      this.aiCredits.costOf('chatbot_reply'),
      this.aiCredits.costOf('widget_reply'),
    ]);

    const conversationIds = [...new Set(suspicious.map((s) => s.conversationId).filter((id): id is string => !!id))];
    const phones = new Map(
      conversationIds.length
        ? (
            await this.prisma.conversation.findMany({
              where: { orgId, id: { in: conversationIds } },
              select: { id: true, contactPhone: true },
            })
          ).map((c) => [c.id, c.contactPhone])
        : [],
    );

    const n = (o: AiReplyOutcome) => counts.find((c) => c.outcome === o)?.count ?? 0;
    const answered = n(AiReplyOutcome.ANSWERED);
    const tried = answered + n(AiReplyOutcome.NOT_FOUND) + n(AiReplyOutcome.HANDED_OFF) + n(AiReplyOutcome.BLOCKED) + n(AiReplyOutcome.FAILED);

    return {
      days,
      total: counts.reduce((sum, c) => sum + c.count, 0),
      answered,
      notFound: n(AiReplyOutcome.NOT_FOUND),
      handedOff: n(AiReplyOutcome.HANDED_OFF),
      blocked: n(AiReplyOutcome.BLOCKED),
      limited: n(AiReplyOutcome.LIMITED),
      noCredits: n(AiReplyOutcome.NO_CREDITS),
      failed: n(AiReplyOutcome.FAILED),
      answerRate: tried ? answered / tried : null,
      tokens: counts.reduce((sum, c) => sum + c.tokens, 0),
      credits: (charged.WHATSAPP ?? 0) * chatCost + (charged.WIDGET ?? 0) * widgetCost,
      suspicious: suspicious.map((s) => ({
        id: s.id,
        channel: s.channel,
        outcome: s.outcome as 'BLOCKED' | 'LIMITED',
        reason: s.reason,
        conversationId: s.conversationId,
        contactPhone: (s.conversationId && phones.get(s.conversationId)) || null,
        repeats: (s.conversationId && repeats.get(s.conversationId)) || 1,
        at: s.createdAt,
      })),
    };
  }
}
