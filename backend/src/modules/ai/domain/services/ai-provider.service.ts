import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KillSwitchService } from '@/modules/billing/domain/services/kill-switch.service';
import { PlatformSettingsService } from '@/modules/platform-settings/domain/services/platform-settings.service';
import { markAiAnswered } from '@/common/context/ai-usage.context';

export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface AiCompletionResponse {
  text: string;
  /** Model that answered (for the AI reply trail) */
  model?: string;
  /** Prompt + completion tokens, when the provider reports them */
  tokens?: number;
}

/** Total tokens from the usage block each provider returns (shapes differ) */
function totalTokens(data: Record<string, any>): number | undefined {
  const u = data?.usage ?? data?.usageMetadata ?? data?.meta?.billed_units ?? data?.meta?.tokens;
  if (!u) return undefined;
  const total =
    u.total_tokens ??
    u.totalTokenCount ??
    (u.prompt_tokens ?? u.input_tokens ?? 0) + (u.completion_tokens ?? u.output_tokens ?? 0);
  return typeof total === 'number' && total > 0 ? total : undefined;
}

/**
 * Base URLs for providers that use the OpenAI-compatible chat completions format.
 * All use: POST {baseUrl}/chat/completions with Authorization: Bearer
 */
export const OPENAI_COMPATIBLE_URLS: Record<string, string> = {
  openrouter:  'https://openrouter.ai/api/v1',
  openai:      'https://api.openai.com/v1',
  groq:        'https://api.groq.com/openai/v1',
  xai:         'https://api.x.ai/v1',
  mistral:     'https://api.mistral.ai/v1',
  together:    'https://api.together.xyz/v1',
  cerebras:    'https://api.cerebras.ai/v1',
};

/** Suggestions for providers without an OpenAI-style GET /models; any model id still works. */
const KNOWN_MODELS: Record<string, string[]> = {
  anthropic: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  cohere: ['command-a-03-2025', 'command-r-plus', 'command-r'],
  huggingface: ['meta-llama/Llama-3.1-8B-Instruct', 'Qwen/Qwen3-4B', 'mistralai/Mistral-7B-Instruct-v0.3'],
};

/** Providers a super admin can pick. OpenRouter reaches 300+ models with one key. */
export const AI_PROVIDERS = [...Object.keys(OPENAI_COMPATIBLE_URLS), 'anthropic', 'gemini', 'cohere', 'huggingface'] as const;

/** Provider + model + key in effect: the super admin's settings, else the AI_* env vars. */
export interface AiConnection {
  provider: string;
  model: string;
  apiKey: string;
}

/**
 * Supported AI providers:
 *
 * OpenAI-compatible (same format, different base URL):
 *   openrouter, openai, groq, xai, mistral, together, cerebras, huggingface
 *
 * Custom format:
 *   anthropic, gemini, cohere
 */
@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly killSwitches: KillSwitchService,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  /** The super admin's provider settings (Super Admin → AI), falling back to the env vars per field. */
  async connection(): Promise<AiConnection> {
    const { ai } = await this.platformSettings.get();
    return {
      provider: ai.provider ?? this.config.get('AI_PROVIDER', 'groq'),
      model: ai.model ?? this.config.get('AI_MODEL', 'llama-3.3-70b-versatile'),
      apiKey: (await this.platformSettings.getAiApiKey()) ?? this.config.get('AI_API_KEY', ''),
    };
  }

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    // Platform kill switch: every caller (HTTP, chatbot, event handlers) already
    // treats empty text as "no AI result" and falls back, so nothing crashes.
    if (await this.killSwitches.isDisabled('ai')) {
      this.logger.warn('AI is switched off platform-wide (kill switch), skipping completion');
      return { text: '' };
    }

    const conn = await this.connection();
    if (!conn.apiKey) {
      this.logger.warn('No AI API key configured (Super Admin → AI or AI_API_KEY), returning fallback');
      return { text: '' };
    }

    try {
      const result = await this.completeWith(conn, req);
      if (result.text.trim()) markAiAnswered();
      return { ...result, model: result.model ?? conn.model };
    } catch (error) {
      this.logger.error(`AI completion failed (${conn.provider}): ${error.message}`, error.stack);
      return { text: '' };
    }
  }

  /**
   * One completion against `conn`, throwing on any provider error. Used by
   * complete() and by the super admin's "Test connection".
   */
  async completeWith(conn: AiConnection, req: AiCompletionRequest): Promise<AiCompletionResponse> {
    // Custom-format providers
    if (conn.provider === 'anthropic') return this.completeAnthropic(conn, req);
    if (conn.provider === 'gemini') return this.completeGemini(conn, req);
    if (conn.provider === 'cohere') return this.completeCohere(conn, req);
    if (conn.provider === 'huggingface') return this.completeHuggingFace(conn, req);

    const baseUrl = OPENAI_COMPATIBLE_URLS[conn.provider];
    if (!baseUrl) throw new Error(`Unknown AI provider '${conn.provider}'`);
    return this.completeOpenAICompatible(baseUrl, conn, req);
  }

  /**
   * Model ids the provider offers (OpenAI-compatible GET /models), for the super
   * admin's model picker. Empty when the provider has no such endpoint or it fails.
   */
  async listModels(conn: AiConnection): Promise<{ models: string[]; error?: string }> {
    const baseUrl = OPENAI_COMPATIBLE_URLS[conn.provider];
    // No model-list endpoint in the OpenAI format: offer the common ones
    if (!baseUrl) return { models: KNOWN_MODELS[conn.provider] ?? [] };
    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: conn.apiKey ? { Authorization: `Bearer ${conn.apiKey}` } : {},
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 401 || response.status === 403) {
        return { models: [], error: conn.apiKey ? 'The API key was rejected' : 'Paste an API key to list models' };
      }
      if (!response.ok) return { models: [], error: `Model list failed (${response.status})` };
      const data = await response.json();
      const ids: string[] = (data?.data ?? []).map((m: { id?: unknown }) => m?.id).filter((id: unknown) => typeof id === 'string');
      return { models: [...new Set(ids)].sort() };
    } catch (err) {
      this.logger.warn(`Model list from ${conn.provider} failed: ${(err as Error).message}`);
      return { models: [], error: 'Could not reach the provider' };
    }
  }

  // ── OpenAI-Compatible (shared by 6+ providers) ──

  private async completeOpenAICompatible(
    baseUrl: string,
    conn: AiConnection,
    req: AiCompletionRequest,
  ): Promise<AiCompletionResponse> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${conn.apiKey}`,
      },
      body: JSON.stringify({
        model: conn.model,
        max_tokens: req.maxTokens || 1024,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(`${conn.provider} API non-OK: ${response.status}`, { body: body.slice(0, 200) });
      throw new Error(`${conn.provider} API error: ${response.status}`);
    }

    const data = await response.json();
    return { text: data.choices?.[0]?.message?.content || '', tokens: totalTokens(data) };
  }

  // ── Anthropic (custom format) ──

  private async completeAnthropic(conn: AiConnection, req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': conn.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: conn.model,
        max_tokens: req.maxTokens || 1024,
        system: req.systemPrompt,
        messages: [{ role: 'user', content: req.userPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { text: data.content?.[0]?.text || '', tokens: totalTokens(data) };
  }

  // ── Google Gemini (custom format) ──

  private async completeGemini(conn: AiConnection, req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const model = conn.model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': conn.apiKey },
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
    return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '', tokens: totalTokens(data) };
  }

  // ── Cohere (custom format) ──

  private async completeCohere(conn: AiConnection, req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${conn.apiKey}`,
      },
      body: JSON.stringify({
        model: conn.model || 'command-r',
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
    return { text: data.message?.content?.[0]?.text || '', tokens: totalTokens(data) };
  }

  // ── HuggingFace Inference API ──

  private async completeHuggingFace(conn: AiConnection, req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const model = conn.model || 'meta-llama/Llama-3.1-8B-Instruct';
    const url = `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${conn.apiKey}`,
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
    return { text: data.choices?.[0]?.message?.content || '', tokens: totalTokens(data) };
  }
}
