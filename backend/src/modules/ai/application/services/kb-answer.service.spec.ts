import { parseAnswer } from './kb-answer.service';
import { ChunkHit } from '@/modules/knowledge-base/infrastructure/repositories/kb-chunk.repository';

const hit = (n: number, extra: Partial<ChunkHit> = {}): ChunkHit => ({
  id: `c${n}`,
  documentId: `d${n}`,
  articleId: null,
  title: `Page ${n}`,
  content: '...',
  sourceUrl: `https://shop.in/p${n}`,
  rank: 1,
  ...extra,
});

describe('parseAnswer', () => {
  const hits = [hit(1), hit(2), hit(3, { documentId: 'd1' })];

  it('reads fenced JSON and maps cited passages to unique sources', () => {
    const text = '```json\n{"answer":"We deliver within 5 km.","found":true,"sources":[1,3,2,9],"confidence":0.9}\n```';
    const r = parseAnswer(text, hits);
    expect(r.answer).toBe('We deliver within 5 km.');
    expect(r.found).toBe(true);
    expect(r.confidence).toBe(0.9);
    // [3] is the same document as [1]; [9] doesn't exist
    expect(r.sources.map((s) => s.url)).toEqual(['https://shop.in/p1', 'https://shop.in/p2']);
  });

  it('keeps the polite "not found" answer with found=false', () => {
    const r = parseAnswer('{"answer":"Let me check with the team.","found":false,"sources":[]}', hits);
    expect(r).toMatchObject({ answer: 'Let me check with the team.', found: false, sources: [] });
  });

  it('accepts a plain-text reply as an unsourced answer', () => {
    expect(parseAnswer('Yes, we are open on Sunday.', hits)).toMatchObject({ answer: 'Yes, we are open on Sunday.', found: true, sources: [] });
  });

  it('returns nothing for an empty reply or JSON without an answer', () => {
    expect(parseAnswer('', hits).answer).toBe('');
    expect(parseAnswer('{"found":true}', hits).answer).toBe('');
  });

  it('clamps confidence', () => {
    expect(parseAnswer('{"answer":"x","confidence":7}', hits).confidence).toBe(1);
  });
});
