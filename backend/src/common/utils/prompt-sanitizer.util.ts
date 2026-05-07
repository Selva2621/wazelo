/**
 * Prompt Injection Sanitizer Utility
 *
 * Defense-in-depth layer against prompt injection attacks.
 * The primary mitigation is already in place via role separation
 * (system prompt vs. user prompt as separate API fields).
 * This catches naive injection vectors.
 *
 * NOT a guarantee — combine with role separation, output validation,
 * and least-privilege AI permissions.
 */

const MAX_PROMPT_INPUT_LENGTH = 2000;

/**
 * Regex matching common injection command prefixes that attempt to override
 * system instructions. Case-insensitive. Matches at line boundaries.
 */
const INJECTION_PATTERN =
  /(?:^\s*|\n\s*)(system\s*:|ignore\s+(?:all\s+)?(?:previous|above|prior)\s+instructions?|instructions?\s*:|disregard\s+|forget\s+(?:the\s+)?(?:previous|above)|you\s+are\s+now|act\s+as\s+|roleplay\s+as\s+|\[inst\]|<s>|<\/s>|<<sys>>)/gi;

/**
 * Sanitize a single user-supplied string before interpolation into an AI prompt.
 * Suitable for message bodies, search queries, and user-provided DTO fields.
 *
 * @param input  Raw user text
 * @param maxLen Override max length (defaults to MAX_PROMPT_INPUT_LENGTH)
 */
export function sanitizePromptInput(input: string, maxLen = MAX_PROMPT_INPUT_LENGTH): string {
  if (!input || typeof input !== 'string') return '';

  let text = input
    // Normalize unicode to composed form
    .normalize('NFC')
    // Strip ASCII control characters (null bytes, BEL, etc.) except tab, LF, CR
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Collapse runs of 3+ newlines to two (preserve paragraph breaks, kill "wall of newlines" attacks)
    .replace(/(\r?\n){3,}/g, '\n\n')
    // Remove common injection command prefixes
    .replace(INJECTION_PATTERN, ' [removed] ')
    .trim();

  // Hard cap — truncate with a marker so the AI knows text was cut
  if (text.length > maxLen) {
    text = text.slice(0, maxLen) + '\u2026[truncated]';
  }

  return text;
}

/**
 * Sanitize admin-controlled context (e.g., OrgAiMemory.customContext, kbSummary).
 * Uses a higher length cap since this is structured business context.
 */
export function sanitizeContextInput(input: string): string {
  return sanitizePromptInput(input, 4000);
}
