/**
 * Pure rules for the freelancer line-of-work catalog: matching what someone typed
 * under "Something else" to a catalog entry (by keywords, no AI), and checking
 * entries a super admin adds.
 */

export interface MatchCandidate {
  key: string;
  label: string;
  keywords: string[];
}

const PITCH_KEYS = ['intro', 'portfolio', 'followup', 'packages'] as const;
const ALLOWED_PLACEHOLDERS = new Set(['contact.name', 'org.name', 'lead.portfolio_link']);
export const MAX_KEY_CHARS = 30;

/** "  Interior-Design!! " → "interior design": how typed text and keywords are compared */
export function normalizeService(text: string | null | undefined): string {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

/** "Interior Designer" → "INTERIOR_DESIGNER" (A-Z, 0-9, _; fits the 30-char column) */
export function profileKey(label: string): string {
  return label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_KEY_CHARS)
    .replace(/_+$/, '');
}

/**
 * The catalog entry a typed service means, or null. Each keyword found as whole
 * words scores its word count (so "civil engineer" beats "engineer"); the label
 * counts as a keyword too. A tie between entries is too unsure, so it's null.
 */
export function matchService(text: string | null | undefined, candidates: MatchCandidate[]): string | null {
  const typed = ` ${normalizeService(text)} `;
  if (typed.trim().length < 2) return null;

  let best: string | null = null;
  let bestScore = 0;
  let tie = false;
  for (const c of candidates) {
    const phrases = new Set([...c.keywords, c.label].map(normalizeService).filter((k) => k.length >= 2));
    let score = 0;
    for (const p of phrases) if (typed.includes(` ${p} `)) score += p.split(' ').length;
    if (score > bestScore) {
      best = c.key;
      bestScore = score;
      tie = false;
    } else if (score > 0 && score === bestScore) {
      tie = true;
    }
  }
  return tie ? null : best;
}

/** Problems with a super admin's pitch templates (empty when fine) */
export function pitchProblems(pitch: Record<string, unknown>): string[] {
  const problems: string[] = [];
  for (const k of PITCH_KEYS) {
    const text = typeof pitch?.[k] === 'string' ? (pitch[k] as string).trim() : '';
    if (text.length < 20) {
      problems.push(`${k}: write at least 20 characters`);
      continue;
    }
    for (const [, name] of text.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
      if (!ALLOWED_PLACEHOLDERS.has(name)) problems.push(`${k}: {{${name}}} is not available (use {{contact.name}}, {{org.name}}, {{lead.portfolio_link}})`);
    }
  }
  return problems;
}
