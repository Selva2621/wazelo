import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { OrgContextService } from '@/modules/ai/domain/services/org-context.service';

export interface GeneratedSequenceStep {
  name: string;
  /** Minutes to wait after the previous step (0 for the first message). */
  delayMinutes: number;
  messageBody: string;
}

export interface GeneratedSequence {
  name: string;
  description: string;
  steps: GeneratedSequenceStep[];
}

export type RewriteStyle = 'shorter' | 'friendlier' | 'formal';

export const REWRITE_STYLES: RewriteStyle[] = ['shorter', 'friendlier', 'formal'];

export const MIN_STEPS = 2;
export const MAX_STEPS = 6;

const MIN_DELAY = 60; // 1 hour
const MAX_DELAY = 30 * 24 * 60; // 30 days
const MAX_BODY = 1000;

/** Variables the sequence sender fills in (jobs/sequence/sequence-step.worker.ts). */
const ALLOWED_VARIABLE = /^\{\{\s*contact\.(name|phone|email)\s*\}\}$/;

const VARIABLE_RULES = `- You may personalise with these variables only: {{contact.name}}, {{contact.phone}}, {{contact.email}}. Never invent other {{...}} variables.
- Never leave fill-in blanks like [your name] or [link] — write complete, ready-to-send text.`;

const GENERATE_PROMPT = `You write WhatsApp follow-up sequences for a CRM. A sequence is a first message plus timed follow-ups sent to a contact until they reply.

Write a sequence for the user's goal.

Rules:
- Each message is a natural, friendly WhatsApp message, 1–4 short sentences, under 600 characters. No subject lines, no hashtags.
- Each follow-up must add something new (a reminder of value, a question, a small offer, a polite last check-in) — never just "following up".
- The last message is a polite close-out that makes it easy to say no.
${VARIABLE_RULES}
- delayMinutes is the wait AFTER the previous message: the first step is 0; follow-ups are usually 1440 (1 day) to 4320 (3 days); never more than 43200.
- Step names are 1–3 words (e.g. "Intro", "Value nudge", "Last check-in").
- Write in the same language as the user's goal.

Return ONLY this JSON (no markdown, no extra text):
{
  "name": "short sequence name (max 60 chars)",
  "description": "one sentence on what it does",
  "steps": [{ "name": "string", "delayMinutes": 0, "messageBody": "string" }]
}`;

const REWRITE_GUIDE: Record<RewriteStyle, string> = {
  shorter: 'Make it noticeably shorter and punchier (aim for half the length) while keeping the meaning and any call to action.',
  friendlier: 'Make it warmer and more casual, like a friendly person texting — still professional.',
  formal: 'Make it more polite and professional, like a formal business message — still concise.',
};

const REWRITE_PROMPT = `You rewrite a single WhatsApp message from a follow-up sequence in a CRM.
Keep the same language, intent and any {{...}} variables that are already in it.
${VARIABLE_RULES}
Return ONLY the rewritten message text — no quotes, no explanation.`;

@Injectable()
export class GenerateSequenceUseCase {
  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
  ) {}

  /** A full draft sequence (name, description, steps) from a plain-language goal. */
  async generate(orgId: string, prompt: string, stepCount: number): Promise<GeneratedSequence> {
    const count = clamp(Math.round(stepCount), MIN_STEPS, MAX_STEPS);
    const result = await this.aiProvider.complete({
      systemPrompt: await this.withOrgContext(orgId, GENERATE_PROMPT),
      userPrompt: `Goal: "${prompt}"\nWrite exactly ${count} messages.`,
      maxTokens: 1600,
    });

    try {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as Partial<GeneratedSequence>;
        const steps = (Array.isArray(parsed.steps) ? parsed.steps : [])
          .map((s, i) => cleanStep(s, i))
          .filter((s): s is GeneratedSequenceStep => s !== null)
          .slice(0, count);
        if (steps.length >= MIN_STEPS) {
          return {
            name: cleanText(parsed.name, 60) || 'AI sequence',
            description: cleanText(parsed.description, 200) || prompt.slice(0, 200),
            steps,
          };
        }
      }
    } catch {
      // fall through to the error below
    }
    throw new UnprocessableEntityException(
      'The AI could not draft a sequence from that description. Try describing the goal in more detail.',
    );
  }

  /** One message rewritten in the chosen style. */
  async rewriteStep(orgId: string, message: string, style: RewriteStyle, goal?: string): Promise<{ messageBody: string }> {
    const result = await this.aiProvider.complete({
      systemPrompt: await this.withOrgContext(orgId, REWRITE_PROMPT),
      userPrompt: [
        goal ? `The sequence's goal: "${goal}"` : null,
        `Style: ${REWRITE_GUIDE[style]}`,
        `Message to rewrite:\n${message}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
      maxTokens: 500,
    });

    const text = stripVariables(result.text.trim().replace(/^["'`]+|["'`]+$/g, '')).slice(0, MAX_BODY).trim();
    if (!text) throw new UnprocessableEntityException('The AI returned an empty message. Please try again.');
    return { messageBody: text };
  }

  private async withOrgContext(orgId: string, prompt: string): Promise<string> {
    const ctx = await this.orgContext.getContext(orgId);
    return ctx ? `${ctx}\n\n---\n\n${prompt}` : prompt;
  }
}

function clamp(n: number, min: number, max: number) {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** Drop any {{variable}} the sender can't fill, so messages never go out with raw braces. */
function stripVariables(text: string): string {
  return text.replace(/\{\{[^}]*\}\}/g, (v) => (ALLOWED_VARIABLE.test(v) ? v : '')).replace(/ {2,}/g, ' ');
}

function cleanStep(step: unknown, index: number): GeneratedSequenceStep | null {
  if (!step || typeof step !== 'object') return null;
  const s = step as Record<string, unknown>;
  const body = stripVariables(cleanText(s.messageBody, MAX_BODY)).trim();
  if (!body) return null;
  const delay = Number(s.delayMinutes);
  return {
    name: cleanText(s.name, 40) || `Step ${index + 1}`,
    // First message goes out straight away; follow-ups wait 1 hour to 30 days
    delayMinutes: index === 0 ? 0 : clamp(Number.isFinite(delay) ? Math.round(delay) : 1440, MIN_DELAY, MAX_DELAY),
    messageBody: body,
  };
}
