import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ProposalStatus } from '@prisma/client';
import { sanitizePromptInput } from '@/common/utils/prompt-sanitizer.util';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { AiCreditsService } from '@/modules/billing/domain/services/ai-credits.service';
import { ManageProposalsUseCase } from './manage-proposals.use-case';

export type ImprovableSection = 'intro' | 'scope' | 'terms';

const GUIDE: Record<ImprovableSection, string> = {
  intro: 'the intro: 2-4 warm, professional sentences to the client.',
  scope: "the list of what's included: one point per line, short and concrete, at most 10 lines, no bullet symbols or numbering.",
  terms: 'the terms: short, clear sentences on payment, timeline and revisions.',
};

/** The model's text → plain section text (no quotes, fences, or bullet marks on scope lines). */
export function cleanImproved(text: string, section: ImprovableSection): string {
  let out = (text ?? '')
    .trim()
    .replace(/^```[a-z]*\n?|```$/gi, '')
    .replace(/^(here('|’)s|sure)[^\n]*:\s*\n/i, '')
    .trim()
    .replace(/^"([\s\S]*)"$/, '$1')
    .trim();
  if (section === 'scope') {
    out = out
      .split('\n')
      .map((l) => l.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 10)
      .join('\n');
  }
  return out.slice(0, 4000);
}

/** "Improve" on one section: rewrites the text as given (not saved; the editor saves it). */
@Injectable()
export class ImproveProposalUseCase {
  constructor(
    private readonly manage: ManageProposalsUseCase,
    private readonly ai: AiProviderService,
    private readonly aiCredits: AiCreditsService,
  ) {}

  async execute(orgId: string, id: string, section: ImprovableSection, text: string) {
    const proposal = await this.manage.find(orgId, id);
    if (proposal.status === ProposalStatus.ACCEPTED) throw new BadRequestException('This proposal was accepted and can no longer be changed');
    const input = sanitizePromptInput(text ?? '', 4000).trim();
    if (input.length < 10) throw new BadRequestException('Write a little first, then improve it');
    await this.aiCredits.assertCanAfford(orgId, 'proposal_improve');

    const { text: reply } = await this.ai.complete({
      systemPrompt: [
        'You polish one section of a business proposal sent to a client.',
        `Rewrite ${GUIDE[section]}`,
        'Keep every fact, price, number, date and promise exactly as given. Never add new ones.',
        'Make it clearer, friendlier and more professional. Same language as the text (Tamil, Tanglish, English…).',
        'Return ONLY the rewritten text. No quotes, no headings, no explanation.',
      ].join('\n'),
      userPrompt: `Proposal: ${sanitizePromptInput(proposal.title, 300)}\nClient: ${proposal.contact.name || 'the client'}\n\nText:\n${input}`,
      maxTokens: 800,
    });
    const improved = cleanImproved(reply, section);
    if (!improved) throw new ServiceUnavailableException('AI is not available right now. Try again in a minute.');
    await this.aiCredits.charge(orgId, 'proposal_improve');
    return { text: improved };
  }
}
