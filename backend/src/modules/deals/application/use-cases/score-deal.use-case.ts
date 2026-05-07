import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { OrgContextService } from '@/modules/ai/domain/services/org-context.service';

export interface DealScoreResult {
  dealId: string;
  score: number;
  reason: string;
  scoredAt: string;
}

@Injectable()
export class ScoreDealUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
  ) {}

  async execute(dealId: string, orgId: string): Promise<DealScoreResult> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, orgId, deletedAt: null },
    });

    if (!deal) throw new NotFoundException('Deal not found');

    // Fetch related records separately — Deal has no auto-includes
    const [contact, stage, product] = await Promise.all([
      this.prisma.contact.findUnique({
        where: { id: deal.contactId },
        select: { name: true, phoneNumber: true },
      }),
      this.prisma.pipelineStage.findUnique({
        where: { id: deal.stageId },
        select: { name: true },
      }),
      deal.productId
        ? this.prisma.product.findUnique({
            where: { id: deal.productId },
            select: { name: true, price: true, currency: true },
          })
        : null,
    ]);

    // Get latest conversation for this contact
    const conversation = await this.prisma.conversation.findFirst({
      where: { orgId, contactId: deal.contactId },
      orderBy: { updatedAt: 'desc' },
    });

    const messages = conversation
      ? await this.prisma.message.findMany({
          where: { conversationId: conversation.id, orgId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { body: true, direction: true },
        })
      : [];

    const messagesText = messages.length
      ? messages
          .slice()
          .reverse()
          .map((m) => `[${m.direction === 'INBOUND' ? 'Customer' : 'Agent'}]: ${m.body ?? ''}`)
          .join('\n')
      : 'No conversation history available.';

    const contactName = contact?.name || contact?.phoneNumber || 'Unknown';
    const ctx = await this.orgContext.getContext(orgId);

    const systemPrompt = [
      ctx ? `${ctx}\n\n---\n\n` : '',
      'You are a sales deal scoring expert. Score the deal from 0 to 100 based on the conversation and deal context.',
      '0 = very unlikely to close, 100 = very likely to close.',
      '\nReturn ONLY this JSON (no extra text):',
      '{"score": <0-100>, "reason": "<one sentence explanation>"}',
    ]
      .filter(Boolean)
      .join('');

    const userPrompt = [
      `Deal: "${deal.title}"`,
      stage ? `Stage: ${stage.name}` : '',
      product ? `Product: ${product.name} (${product.currency ?? 'INR'} ${product.price ?? 'N/A'})` : '',
      deal.value ? `Value: ${deal.currency} ${deal.value}` : '',
      `Contact: ${contactName}`,
      `\nLatest conversation:\n${messagesText}`,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await this.aiProvider.complete({
      systemPrompt,
      userPrompt,
      maxTokens: 200,
    });

    let score = 50;
    let reason = '';

    try {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (typeof parsed.score === 'number') score = Math.min(100, Math.max(0, Math.round(parsed.score)));
        if (typeof parsed.reason === 'string') reason = parsed.reason;
      }
    } catch {
      reason = result.text.trim().slice(0, 500);
    }

    const now = new Date();

    await this.prisma.deal.update({
      where: { id: dealId },
      data: { aiScore: score, aiScoreReason: reason, aiScoredAt: now },
    });

    return { dealId, score, reason, scoredAt: now.toISOString() };
  }
}
