import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { sanitizePromptInput } from '@/common/utils/prompt-sanitizer.util';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { OrgContextService } from '@/modules/ai/domain/services/org-context.service';
import { languageStyleRule, templateLanguageName } from '@/shared/constants/languages';

export interface GeneratedEmail {
  subject: string;
  body: string;
}

const INSTRUCTIONS = [
  'You write marketing and customer emails for the business described above, as the business.',
  'Write a subject line and a plain-text message (no HTML, no Markdown, no signature placeholders).',
  'Put a blank line between paragraphs. Keep it short, warm and clear.',
  'You may use the fields {{name}} (the contact\'s name) and {{company}} (their company) where they fit naturally.',
  'Never invent prices, discounts, dates, links or other facts the request or the business details do not give.',
  'Return ONLY valid JSON: {"subject": "...", "body": "..."}',
].join(' ');

/**
 * Email templates: draft a subject + message from a short request ("Diwali offer 20% off").
 * The member reviews and saves it. Credits are charged on the route, only when this succeeds.
 */
@Injectable()
export class GenerateEmailTemplateUseCase {
  private readonly logger = new Logger(GenerateEmailTemplateUseCase.name);

  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
  ) {}

  async execute(orgId: string, prompt: string, language?: string): Promise<GeneratedEmail> {
    // Customers read the email: only customer-safe business details
    const profile = await this.orgContext.getContext(orgId, { forCustomers: true });
    const instructions = `${INSTRUCTIONS} ${languageRule(language)}`;
    const result = await this.aiProvider.complete({
      systemPrompt: profile ? `${profile}\n\n---\n\n${instructions}` : instructions,
      userPrompt: `What the email should say: ${sanitizePromptInput(prompt, 500)}`,
      // Tamil, Hindi, Arabic… take several times more tokens than English for the same email
      maxTokens: !language || language === 'en' ? 700 : 1600,
    });
    const parsed = parseGeneratedEmail(result.text);
    if (!parsed) {
      this.logger.warn(`Email template generate: unreadable AI output for org ${orgId}`);
      // Throwing means the credit isn't charged
      throw new ServiceUnavailableException("Couldn't write the email right now. Try again.");
    }
    return parsed;
  }
}

/** Which language to write in. Fields like {{name}} stay exactly as written, in English. */
export function languageRule(language?: string): string {
  const name = templateLanguageName(language);
  if (name === 'English') return 'Write in English.';
  // Same everyday-spoken style as WhatsApp templates, for both the subject and the message
  return `${languageStyleRule(language)} This applies to both the subject and the message; {{company}} also stays as written.`;
}

/** The model's JSON (often wrapped in ```json or a sentence) → subject + body, or null when unreadable */
export function parseGeneratedEmail(text: string): GeneratedEmail | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const raw = JSON.parse(match ? match[0] : text) as Record<string, unknown>;
    const subject = typeof raw.subject === 'string' ? raw.subject.trim() : '';
    const body = typeof raw.body === 'string' ? raw.body.trim() : '';
    if (!subject || !body) return null;
    return { subject: subject.slice(0, 255), body: body.slice(0, 20000) };
  } catch {
    return null;
  }
}
