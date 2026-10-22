import { chunkText } from './chunk-text';

describe('chunkText', () => {
  it('keeps short text as one chunk', () => {
    expect(chunkText('We deliver within 5 km.')).toEqual(['We deliver within 5 km.']);
  });

  it('returns nothing for blank text', () => {
    expect(chunkText('   \n\n ')).toEqual([]);
  });

  it('splits long text near the size, with overlap between chunks', () => {
    const para = (n: number) => `Paragraph ${n}. `.repeat(20).trim();
    const text = [1, 2, 3, 4, 5, 6].map(para).join('\n\n');
    const chunks = chunkText(text, 600, 100);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(600 + 100 + 1);
    // Every paragraph's text appears somewhere
    for (const n of [1, 6]) expect(chunks.some((c) => c.includes(`Paragraph ${n}.`))).toBe(true);
  });

  it('splits a single huge paragraph by sentences', () => {
    const text = 'Short sentence here. '.repeat(200);
    const chunks = chunkText(text, 500, 50);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.length <= 551)).toBe(true);
  });
});
