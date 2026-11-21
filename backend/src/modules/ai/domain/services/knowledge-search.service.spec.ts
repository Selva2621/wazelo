import { KnowledgeSearchService, fuse } from './knowledge-search.service';
import { EmbeddingService, toVectorLiteral } from './embedding.service';
import { KbChunkRepository } from '@/modules/knowledge-base/infrastructure/repositories/kb-chunk.repository';
import { KbEmbeddingWorker } from '@/jobs/knowledge/kb-embedding.worker';

const hit = (id: string, rank = 1) => ({ id, documentId: 'd', articleId: null, title: id, content: `about ${id}`, sourceUrl: null, rank });

describe('fuse (keyword + meaning results)', () => {
  it('ranks a passage found by both searches first', () => {
    const merged = fuse([[hit('a'), hit('both')], [hit('both'), hit('c')]], 3);
    expect(merged.map((h) => h.id)).toEqual(['both', 'a', 'c']);
  });
});

describe('KnowledgeSearchService', () => {
  function setup(vector: number[] | null, semantic = [hit('pricing', 0.8), hit('far-off', 0.1)]) {
    const chunks = {
      search: jest.fn(async () => [hit('keyword')]),
      searchByVector: jest.fn(async () => semantic),
    };
    const embeddings = { embed: jest.fn(async () => (vector ? [vector] : null)) };
    return { service: new KnowledgeSearchService(chunks as never, embeddings as never), chunks };
  }

  it('without embeddings it is exactly the keyword search', async () => {
    const { service, chunks } = setup(null);
    expect((await service.search('o1', 'how much does it cost')).map((h) => h.id)).toEqual(['keyword']);
    expect(chunks.searchByVector).not.toHaveBeenCalled();
  });

  it('with embeddings it adds close-in-meaning passages for the same org, dropping weak ones', async () => {
    const { service, chunks } = setup([0.1, 0.2]);
    const ids = (await service.search('o1', 'how much does it cost', 6, { flowId: 'f1' })).map((h) => h.id);
    expect(chunks.searchByVector).toHaveBeenCalledWith('o1', '[0.1,0.2]', 12, { flowId: 'f1' });
    expect(ids).toContain('pricing');
    expect(ids).toContain('keyword');
    expect(ids).not.toContain('far-off');
  });
});

describe('KbChunkRepository.searchByVector — same privacy filters as keyword search', () => {
  it('stays inside the org and skips deleted/unpublished/team-only knowledge', async () => {
    const calls: { sql: string; values: unknown[] }[] = [];
    const settings: string[] = [];
    const tx = {
      $executeRaw: jest.fn((strings: TemplateStringsArray) => {
        settings.push(strings.join('?'));
        return Promise.resolve(0);
      }),
      $queryRaw: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
        calls.push({ sql: strings.join('?'), values });
        return Promise.resolve([]);
      }),
    };
    const prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
    await new KbChunkRepository(prisma as never).searchByVector('org-A', '[0.1]');
    // Keeps scanning past other orgs' vectors until this org has enough results
    expect(settings).toContain('SET LOCAL hnsw.iterative_scan = relaxed_order');
    const { sql, values } = calls[0];
    expect(sql).toMatch(/WHERE c\.org_id = \?::uuid/);
    expect(values).toContain('org-A');
    for (const rule of ['d.deleted_at IS NULL', "d.status = 'READY'", 'a.is_published = true', 'a.is_internal = false']) {
      expect(sql).toContain(rule);
    }
  });
});

describe('EmbeddingService', () => {
  function setup(env: Record<string, string>, chat = { provider: 'groq', model: 'x', apiKey: 'k' }) {
    const config = { get: jest.fn((k: string) => env[k]) };
    const ai = { connection: jest.fn(async () => chat) };
    const killSwitches = { isDisabled: jest.fn(async () => false) };
    return new EmbeddingService(config as never, ai as never, killSwitches as never);
  }

  it('is off (null) when no embeddings key and the chat AI has no embeddings', async () => {
    expect(await setup({}).embed(['hi'])).toBeNull();
  });

  it('reuses an OpenRouter chat key (OpenAI embedding model through OpenRouter)', async () => {
    const conn = await setup({}, { provider: 'openrouter', model: 'openai/gpt-4o-mini', apiKey: 'or' }).connection();
    expect(conn).toEqual({ provider: 'openrouter', apiKey: 'or', model: 'openai/text-embedding-3-small' });
  });

  it('reuses an OpenAI or Gemini chat key', async () => {
    expect((await setup({}, { provider: 'openai', model: 'gpt', apiKey: 'sk' }).connection())?.model).toBe('text-embedding-3-small');
    expect((await setup({}, { provider: 'gemini', model: 'g', apiKey: 'gk' }).connection())?.model).toBe('text-embedding-004');
  });

  it('prefers the dedicated EMBEDDINGS_* settings', async () => {
    const conn = await setup({ EMBEDDINGS_PROVIDER: 'gemini', EMBEDDINGS_API_KEY: 'e' }).connection();
    expect(conn).toEqual({ provider: 'gemini', apiKey: 'e', model: 'text-embedding-004' });
  });

  it('writes vectors in pgvector text form', () => {
    expect(toVectorLiteral([0.5, Number.NaN, -1])).toBe('[0.5,0,-1]');
  });
});

describe('KbEmbeddingWorker', () => {
  it('gives waiting passages a vector, and does nothing when embeddings are off', async () => {
    const chunks = {
      findUnembedded: jest.fn(async () => [{ id: 'c1', title: 'Pricing', content: 'Logo ₹4,999' }]),
      setEmbedding: jest.fn(async () => undefined),
    };
    const on = { connection: jest.fn(async () => ({})), embed: jest.fn(async () => [[0.1]]) };
    expect(await new KbEmbeddingWorker(chunks as never, on as never).run()).toBe(1);
    expect(on.embed).toHaveBeenCalledWith(['Pricing\nLogo ₹4,999']);
    expect(chunks.setEmbedding).toHaveBeenCalledWith('c1', '[0.1]');

    const off = { connection: jest.fn(async () => null), embed: jest.fn() };
    expect(await new KbEmbeddingWorker(chunks as never, off as never).run()).toBe(0);
    expect(off.embed).not.toHaveBeenCalled();
  });
});
