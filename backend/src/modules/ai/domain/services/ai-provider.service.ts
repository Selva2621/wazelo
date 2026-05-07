import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface AiCompletionResponse {
  text: string;
}

/**
 * Base URLs for providers that use the OpenAI-compatible chat completions format.
 * All use: POST {baseUrl}/chat/completions with Authorization: Bearer
 */
const OPENAI_COMPATIBLE_URLS: Record<string, string> = {
  openai:      'https://api.openai.com/v1',
  groq:        'https://api.groq.com/openai/v1',
  mistral:     'https://api.mistral.ai/v1',
  together:    'https://api.together.xyz/v1',
  openrouter:  'https://openrouter.ai/api/v1',
  cerebras:    'https://api.cerebras.ai/v1',
};

/**
 * Supported AI providers:
 *
 * OpenAI-compatible (same format, different base URL):
 *   openai, groq, mistral, together, openrouter, cerebras, huggingface
 *
 * Custom format:
 *   anthropic, gemini, cohere
 */
@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly apiKey: string;
  private readonly provider: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get('AI_API_KEY', '');
    this.provider = this.config.get('AI_PROVIDER', 'groq');
    this.model = this.config.get('AI_MODEL', 'llama-3.3-70b-versatile');
  }

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    if (!this.apiKey) {
      this.logger.warn('AI_API_KEY not configured, returning fallback');
      return { text: '' };
    }

    try {
      // Custom-format providers
      if (this.provider === 'anthropic') return this.completeAnthropic(req);
      if (this.provider === 'gemini') return this.completeGemini(req);
      if (this.provider === 'cohere') return this.completeCohere(req);
      if (this.provider === 'huggingface') return this.completeHuggingFace(req);

      // OpenAI-compatible providers (openai, groq, mistral, together, openrouter, cerebras)
      const baseUrl = OPENAI_COMPATIBLE_URLS[this.provider];
      if (baseUrl) {
        return this.completeOpenAICompatible(baseUrl, req);
      }

      // Unknown provider — try as OpenAI-compatible with custom base URL
      this.logger.warn(`Unknown AI provider '${this.provider}', trying as OpenAI-compatible`);
      return this.completeOpenAICompatible(`https://api.${this.provider}.com/v1`, req);
    } catch (error) {
      this.logger.error(`AI completion failed (${this.provider}): ${error.message}`, error.stack);
      return { text: '' };
    }
  }

  // ── OpenAI-Compatible (shared by 6+ providers) ──

  private async completeOpenAICompatible(
    baseUrl: string,
    req: AiCompletionRequest,
  ): Promise<AiCompletionResponse> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens || 1024,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(`${this.provider} API non-OK: ${response.status}`, { body: body.slice(0, 200) });
      throw new Error(`${this.provider} API error: ${response.status}`);
    }

    const data = await response.json();
    return { text: data.choices?.[0]?.message?.content || '' };
  }

  // ── Anthropic (custom format) ──

  private async completeAnthropic(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens || 1024,
        system: req.systemPrompt,
        messages: [{ role: 'user', content: req.userPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { text: data.content?.[0]?.text || '' };
  }

  // ── Google Gemini (custom format) ──

  private async completeGemini(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const model = this.model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: req.systemPrompt }],
        },
        contents: [
          { role: 'user', parts: [{ text: req.userPrompt }] },
        ],
        generationConfig: {
          maxOutputTokens: req.maxTokens || 1024,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' };
  }

  // ── Cohere (custom format) ──

  private async completeCohere(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model || 'command-r',
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
        max_tokens: req.maxTokens || 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { text: data.message?.content?.[0]?.text || '' };
  }

  // ── HuggingFace Inference API ──

  private async completeHuggingFace(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const model = this.model || 'meta-llama/Llama-3.1-8B-Instruct';
    const url = `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: req.maxTokens || 1024,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { text: data.choices?.[0]?.message?.content || '' };
  }
}
