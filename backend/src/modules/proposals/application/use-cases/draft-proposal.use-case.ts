import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, ProposalStatus } from '@prisma/client';
import { sanitizePromptInput } from '@/common/utils/prompt-sanitizer.util';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { OrgContextService } from '@/modules/ai/domain/services/org-context.service';
import { AiCreditsService } from '@/modules/billing/domain/services/ai-credits.service';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { ProposalRepository } from '../../infrastructure/repositories/proposal.repository';
import { cleanItems, cleanScope, computeTotals, ProposalItem } from '../../domain/services/proposal-math';
import { ManageProposalsUseCase } from './manage-proposals.use-case';

export interface ProposalDraft {
  title: string;
  intro: string;
  scope: string[];
  items: ProposalItem[];
  terms: string;
  validDays: number;
}

/** The AI's JSON (often wrapped in prose or ```json) → a usable draft, or null. */
export function parseDraft(text: string): ProposalDraft | null {
  const match = text?.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return null;
  }
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const draft: ProposalDraft = {
    title: str(raw.title, 300),
    intro: str(raw.intro, 2000),
    scope: cleanScope(raw.scope),
    items: cleanItems(raw.items),
    terms: str(raw.terms, 2000),
    validDays: Math.min(Math.max(Math.round(Number(raw.validDays)) || 14, 1), 90),
  };
  // Needs at least something to bill or describe
  return draft.items.length || draft.scope.length ? draft : null;
}

const SYSTEM_PROMPT = `You write project proposals (quotes) that a small business sends to a client on WhatsApp.
Return ONLY valid JSON:
{"title": "...", "intro": "...", "scope": ["..."], "items": [{"name": "...", "description": "...", "quantity": 1, "unitPrice": 0}], "terms": "...", "validDays": 14}
Rules:
- Use only what the chat, the deal and the business's product list say. Never invent requirements.
- Prices: take them from the chat or the product list. If a price isn't known, use 0 (the business fills it in). Never guess a price.
- intro: 2-3 friendly sentences to the client by first name, restating what they need.
- scope: 3-8 short bullet points of what's included; add "Not included: …" as the last bullet if the chat mentions exclusions.
- items: billable lines; unitPrice is a plain number in the deal's currency, no symbols.
- terms: payment schedule, timeline and revisions if discussed, else a short sensible default (e.g. 50% advance, balance on delivery).
- Write in the language the client uses in the chat.`;

/** "Write with AI": fills a proposal from the chat, the deal and the product list. */
@Injectable()
export class DraftProposalUseCase {
  private readonly logger = new Logger(DraftProposalUseCase.name);

  constructor(
    private readonly repo: ProposalRepository,
    private readonly manage: ManageProposalsUseCase,
    private readonly messages: MessageRepository,
    private readonly ai: AiProviderService,
    private readonly orgContext: OrgContextService,
    private readonly aiCredits: AiCreditsService,
  ) {}

  async execute(orgId: string, id: string) {
    const proposal = await this.manage.find(orgId, id);
    if (proposal.status === ProposalStatus.ACCEPTED) throw new BadRequestException('This proposal was accepted and can no longer be changed');
    await this.aiCredits.assertCanAfford(orgId, 'proposal_draft');

    const [chat, catalog, profile] = await Promise.all([
      this.messages.findRecentByContactPhone(orgId, proposal.contact.phoneNumber, 60),
      this.repo.catalog(orgId),
      this.orgContext.getContext(orgId),
    ]);
    const transcript = chat
      .reverse()
      .filter((m) => m.body)
      .slice(-40)
      .map((m) => `${m.direction === 'INBOUND' ? 'Client' : 'Business'}: ${sanitizePromptInput(m.body ?? '', 600)}`)
      .join('\n');
    const products = catalog
      .map((p) => `- ${p.name}${p.price != null ? `: ${Number(p.price)} ${p.currency ?? proposal.currency}` : ''}${p.description ? ` (${p.description.slice(0, 120)})` : ''}`)
      .join('\n');

    const userPrompt = [
      profile ? `About the business:\n${profile}` : '',
      `Client: ${proposal.contact.name || 'the client'}`,
      `Currency: ${proposal.currency}`,
      proposal.deal ? `Deal: ${proposal.deal.title}` : '',
      `Current proposal title: ${proposal.title}`,
      products ? `Product / service price list:\n${products}` : 'Product / service price list: (none)',
      transcript ? `Chat with the client (oldest first):\n${transcript}` : 'Chat with the client: (no messages yet)',
    ]
      .filter(Boolean)
      .join('\n\n');

    const { text } = await this.ai.complete({ systemPrompt: SYSTEM_PROMPT, userPrompt, maxTokens: 1500 });
    if (!text.trim()) throw new ServiceUnavailableException('AI is not available right now. Try again in a minute.');
    const draft = parseDraft(text);
    if (!draft) {
      this.logger.warn(`Proposal draft: AI reply unusable for proposal ${id}`);
      throw new ServiceUnavailableException("AI couldn't write this one. Add some details in the chat or fill it in yourself.");
    }

    // Keep the current items when the AI found nothing billable
    const items = draft.items.length ? draft.items : cleanItems(proposal.items);
    const totals = computeTotals(items, Number(proposal.taxPercent), Number(proposal.discount));
    await this.repo.update(id, {
      title: draft.title || proposal.title,
      intro: draft.intro || proposal.intro,
      scope: draft.scope.length ? draft.scope : (proposal.scope as Prisma.InputJsonValue),
      items: items as unknown as Prisma.InputJsonValue,
      terms: draft.terms || proposal.terms,
      validUntil: new Date(Date.now() + draft.validDays * 86_400_000),
      discount: totals.discount,
      subtotal: totals.subtotal,
      total: totals.total,
    });
    await this.aiCredits.charge(orgId, 'proposal_draft');
    return this.manage.get(orgId, id);
  }
}
