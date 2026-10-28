import { Injectable } from '@nestjs/common';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { OrgContextService } from '@/modules/ai/domain/services/org-context.service';

export interface GenerateTemplateResult {
  name: string;
  body: string;
}

const SYSTEM_PROMPT = `You are a WhatsApp Business messaging expert. Generate professional, concise WhatsApp message templates. Return ONLY valid JSON in this exact format: {"name": "snake_case_name_max_5_words", "body": "message body text"}. The name must be lowercase snake_case. The body should use {{variable}} placeholders where personalisation is needed (e.g. {{name}}, {{phone}}). Keep body under 1024 characters. No markdown, no extra text, just the JSON object.`;

@Injectable()
export class GenerateTemplateUseCase {
  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
  ) {}

  async execute(params: {
    orgId: string;
    prompt: string;
    category?: string;
    language?: string;
  }): Promise<GenerateTemplateResult> {
    const { orgId, prompt, category, language } = params;

    const langLabel = language === 'hi' ? 'Hindi' : language === 'ta' ? 'Tamil' : language === 'es' ? 'Spanish' : language === 'ar' ? 'Arabic' : 'English';

    // The business (Settings → AI Memory) and what its website/documents say about this message
    const [ctx, knowledge] = await Promise.all([
      this.orgContext.getContext(orgId),
      this.orgContext.getRelevantKnowledge(orgId, prompt),
    ]);
    const result = await this.aiProvider.complete({
      systemPrompt: ctx ? `${ctx}\n\n---\n\n${SYSTEM_PROMPT}` : SYSTEM_PROMPT,
      userPrompt: [knowledge, `Create a ${category || 'UTILITY'} WhatsApp template in ${langLabel} for: ${prompt}`]
        .filter(Boolean)
        .join('\n\n'),
      maxTokens: 512,
    });

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.name === 'string' && typeof parsed.body === 'string') {
          return {
            name: parsed.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            body: parsed.body,
          };
        }
      }
    } catch {
      // fallback below
    }

    return {
      name: 'generated_template',
      body: result.text.trim() || 'Hello {{name}}, thank you for reaching out. How can we help you today?',
    };
  }
}
