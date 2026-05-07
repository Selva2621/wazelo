import { Injectable } from '@nestjs/common';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';

export interface GenerateTemplateResult {
  name: string;
  body: string;
}

@Injectable()
export class GenerateTemplateUseCase {
  constructor(private readonly aiProvider: AiProviderService) {}

  async execute(params: {
    prompt: string;
    category?: string;
    language?: string;
  }): Promise<GenerateTemplateResult> {
    const { prompt, category, language } = params;

    const langLabel = language === 'hi' ? 'Hindi' : language === 'ta' ? 'Tamil' : language === 'es' ? 'Spanish' : language === 'ar' ? 'Arabic' : 'English';

    const result = await this.aiProvider.complete({
      systemPrompt: `You are a WhatsApp Business messaging expert. Generate professional, concise WhatsApp message templates. Return ONLY valid JSON in this exact format: {"name": "snake_case_name_max_5_words", "body": "message body text"}. The name must be lowercase snake_case. The body should use {{variable}} placeholders where personalisation is needed (e.g. {{name}}, {{phone}}). Keep body under 1024 characters. No markdown, no extra text, just the JSON object.`,
      userPrompt: `Create a ${category || 'UTILITY'} WhatsApp template in ${langLabel} for: ${prompt}`,
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
