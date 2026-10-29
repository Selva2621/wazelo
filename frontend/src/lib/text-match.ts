/**
 * Free, local word matching (no AI): ranks FAQs or saved replies by how many of
 * the query's meaningful words they contain. Handles simple word forms
 * ("deliver" ~ "delivery") by matching a shared start of 4+ letters.
 */

const STOP_WORDS = new Set(
  (
    "a an and are as at be but by can could do does did for from had has have hi hello hey how i if in " +
    "into is it its me my no not of on or our please pls so some than thanks thank that the their them " +
    "then there these they this to too u us want was we what when where which who why will with would " +
    "you your yours ok okay sir madam"
  ).split(" "),
);

/** Meaningful lowercase words (any script), without filler words */
export function words(text: string): string[] {
  const all = text.toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]+/gu) ?? [];
  return all.filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/** How strongly a word list matches the query words: exact word = 2, same start = 1 */
function wordScore(query: string[], target: string[]): number {
  let score = 0;
  for (const q of query) {
    if (target.includes(q)) score += 2;
    else if (
      q.length >= 4 &&
      target.some((t) => t.length >= 4 && (t.startsWith(q.slice(0, 4)) || q.startsWith(t.slice(0, 4))))
    )
      score += 1;
  }
  return score;
}

export interface WeightedField {
  text: string;
  /** e.g. 3 for a title, 1 for body text */
  weight: number;
}

/**
 * Items ordered by match strength; items with no match are left out.
 * An empty query returns the first `limit` items unchanged.
 */
export function rankByWords<T>(items: T[], query: string, fields: (item: T) => WeightedField[], limit = 5): T[] {
  const q = [...new Set(words(query))];
  if (q.length === 0) return items.slice(0, limit);
  return items
    .map((item, index) => ({
      item,
      index,
      score: fields(item).reduce((sum, f) => sum + f.weight * wordScore(q, words(f.text)), 0),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((r) => r.item);
}

/** First few words of a message, for a default quick-reply title */
export function titleFrom(text: string, maxWords = 6): string {
  const first = text.replace(/\s+/g, " ").trim().split(" ").slice(0, maxWords).join(" ");
  return first.length > 60 ? `${first.slice(0, 57)}…` : first;
}
