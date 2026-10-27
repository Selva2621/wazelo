import { BadRequestException, Injectable } from '@nestjs/common';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { checkReply } from '@/modules/ai/domain/services/reply-guard';
import { sanitizePromptInput, UNTRUSTED_DATA_RULE, wrapUntrusted } from '@/common/utils/prompt-sanitizer.util';

const SYSTEM_PROMPT = [
  'You rewrite WhatsApp message templates for a freelancer so they fit the service they offer.',
  'Keep the same purpose, length (2-4 sentences) and friendly tone. Keep every {{placeholder}} exactly as written, and add no new ones.',
  'Do not add links, phone numbers, emails or prices that are not in the original.',
  UNTRUSTED_DATA_RULE,
  'Return ONLY the rewritten message text, nothing else.',
].join('\n');

/**
 * "Rewrite for my service" on the Templates page: the org's own AI call (charged to
 * its credits), returned for the user to review. Nothing is saved or shared here.
 */
@Injectable()
export class RewriteTemplateUseCase {
  constructor(private readonly aiProvider: AiProviderService) {}

  async execute(params: { body: string; service: string }): Promise<{ body: string }> {
    const original = sanitizePromptInput(params.body, 1024);
    const service = sanitizePromptInput(params.service, 120);
    if (!original || !service) throw new BadRequestException('Add a message and your service first');

    const result = await this.aiProvider.complete({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `Service: ${wrapUntrusted('customer_question', service)}\n\nTemplate to rewrite:\n${wrapUntrusted('passages', original)}`,
      maxTokens: 400,
    });
    const body = (result.text ?? '').trim().replace(/^["']|["']$/g, '').trim();
    if (!body) throw new BadRequestException("Couldn't rewrite it right now. Please try again.");

    // Same placeholders as before, and no links or numbers the original didn't have
    const placeholders = (t: string) => [...t.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
    const sameFields = placeholders(body) === placeholders(original);
    const safe = checkReply({ reply: body, ownInstructions: SYSTEM_PROMPT, trustedText: original }).ok;
    if (!sameFields || !safe) throw new BadRequestException("The rewrite didn't keep your message safe to send. Please try again.");
    return { body };
  }
}
