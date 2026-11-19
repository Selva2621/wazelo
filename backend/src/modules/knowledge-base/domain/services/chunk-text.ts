/**
 * Splits text into passages of about `size` characters on paragraph / sentence
 * boundaries, with a little overlap so an answer split across a boundary is still
 * found. Passages are what full-text search ranks and what goes into AI prompts.
 */
export function chunkText(text: string, size = 900, overlap = 120): string[] {
  const clean = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  // Paragraphs first; a paragraph longer than `size` is split into sentences
  const pieces: string[] = [];
  for (const para of clean.split(/\n{1,2}/)) {
    if (para.length <= size) {
      pieces.push(para);
      continue;
    }
    const sentences = para.match(/[^.!?।]+[.!?।]+["')\]]*\s*|[^.!?।]+$/g) ?? [para];
    for (const s of sentences) {
      if (s.length <= size) pieces.push(s.trim());
      else for (let i = 0; i < s.length; i += size) pieces.push(s.slice(i, i + size).trim());
    }
  }

  const chunks: string[] = [];
  let current = '';
  for (const piece of pieces) {
    if (!piece) continue;
    if (current && current.length + piece.length + 1 > size) {
      chunks.push(current);
      // Carry the tail of the previous chunk forward
      const tail = current.slice(-overlap);
      const cut = tail.indexOf(' ');
      current = (cut >= 0 ? tail.slice(cut + 1) : tail) + '\n' + piece;
    } else {
      current = current ? `${current}\n${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
