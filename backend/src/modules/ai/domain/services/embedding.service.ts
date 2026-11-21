import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KillSwitchService } from '@/modules/billing/domain/services/kill-switch.service';
import { AiProviderService } from './ai-provider.service';

/** Every stored vector has this size (kb_chunks.embedding is vector(768)) */
export const EMBEDDING_DIMENSIONS = 768;

/** Text sent per passage/question (embedding models cap input; passages are ~1–2k chars) */
const MAX_INPUT_CHARS = 6000;

type EmbeddingProvider = 'openai' | 'openrouter' | 'gemini';

interface EmbeddingConnection {
  provider: EmbeddingProvider;
  model: string;
  apiKey: string;
}

/** OpenAI-format embedding endpoints (same request and response shape) */
const OPENAI_FORMAT_URLS: Record<'openai' | 'openrouter', string> = {
  openai: 'https://api.openai.com/v1/embeddings',
  openrouter: 'https://openrouter.ai/api/v1/embeddings',
};

const isEmbeddingProvider = (p: string | undefined): p is EmbeddingProvider =>
  p === 'openai' || p === 'openrouter' || p === 'gemini';

/**
 * Turns text into meaning vectors for knowledge search ("cost" finds the
 * "pricing" page). Uses EMBEDDINGS_PROVIDER / EMBEDDINGS_API_KEY / EMBEDDINGS_MODEL,
 * or reuses the super admin's AI key when that provider is OpenAI or Gemini.
 * Without either, `embed` returns null and search stays keyword-only.
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly ai: AiProviderService,
    private readonly killSwitches: KillSwitchService,
  ) {}

  async connection(): Promise<EmbeddingConnection | null> {
    const provider = this.config.get<string>('EMBEDDINGS_PROVIDER');
    const apiKey = this.config.get<string>('EMBEDDINGS_API_KEY');
    if (isEmbeddingProvider(provider) && apiKey) {
      return { provider, apiKey, model: this.config.get<string>('EMBEDDINGS_MODEL') || defaultModel(provider) };
    }
    // Same key as the chat AI (Super Admin → AI), when that provider also does embeddings
    const chat = await this.ai.connection();
    if (isEmbeddingProvider(chat.provider) && chat.apiKey) {
      return { provider: chat.provider, apiKey: chat.apiKey, model: defaultModel(chat.provider) };
    }
    return null;
  }

  /** One vector per text, in order; null when embeddings are off or the call failed. */
  async embed(texts: string[]): Promise<number[][] | null> {
    if (!texts.length) return [];
    if (await this.killSwitches.isDisabled('ai')) return null;
    const conn = await this.connection();
    if (!conn) return null;
    const input = texts.map((t) => (t || ' ').slice(0, MAX_INPUT_CHARS));
    try {
      const vectors = conn.provider === 'gemini' ? await this.gemini(conn, input) : await this.openaiFormat(conn, input);
      if (vectors.length !== texts.length || vectors.some((v) => v.length !== EMBEDDING_DIMENSIONS)) {
        this.logger.warn(`Embeddings came back in an unexpected shape (${conn.provider}/${conn.model})`);
        return null;
      }
      return vectors;
    } catch (err) {
      this.logger.warn(`Embedding failed (${conn.provider}): ${(err as Error).message}`);
      return null;
    }
  }

  /** OpenAI and OpenRouter (which serves OpenAI's embedding models) */
  private async openaiFormat(conn: EmbeddingConnection, input: string[]): Promise<number[][]> {
    const res = await fetch(OPENAI_FORMAT_URLS[conn.provider as 'openai' | 'openrouter'], {
      method: 'POST',
      headers: { Authorization: `Bearer ${conn.apiKey}`, 'Content-Type': 'application/json' },
      // text-embedding-3 models can return shorter vectors, so every provider stores the same size
      body: JSON.stringify({ model: conn.model, input, dimensions: EMBEDDING_DIMENSIONS }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`${conn.provider} ${res.status}`);
    const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
    return [...json.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }

  private async gemini(conn: EmbeddingConnection, input: string[]): Promise<number[][]> {
    const model = conn.model.startsWith('models/') ? conn.model : `models/${conn.model}`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:batchEmbedContents`, {
      method: 'POST',
      headers: { 'x-goog-api-key': conn.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: input.map((text) => ({ model, content: { parts: [{ text }] }, outputDimensionality: EMBEDDING_DIMENSIONS })),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const json = (await res.json()) as { embeddings: { values: number[] }[] };
    return json.embeddings.map((e) => e.values);
  }
}

function defaultModel(provider: EmbeddingProvider): string {
  if (provider === 'openrouter') return 'openai/text-embedding-3-small';
  return provider === 'openai' ? 'text-embedding-3-small' : 'text-embedding-004';
}

/** pgvector's text form: "[0.1,0.2,…]" */
export function toVectorLiteral(v: number[]): string {
  return `[${v.map((n) => (Number.isFinite(n) ? n : 0)).join(',')}]`;
}
