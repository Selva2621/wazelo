/**
 * Messages that carry a secret (sign-in and verification codes) are flagged with
 * `metadata.redactAfterSend`. Once such a message is sent, or has failed for good, its
 * stored copy is rewritten so the secret can't be read back from the database.
 * Pure logic.
 */
export const REDACT_AFTER_SEND = 'redactAfterSend';

const MASK = '•';

/** Every run of four or more digits becomes dots ("482913 is your code" → "•••••• is your code") */
export function redactDigits(text: string): string {
  return text.replace(/\d{4,}/g, (run) => MASK.repeat(run.length));
}

/**
 * The redacted body and metadata to store for a flagged message, or null when the
 * message isn't flagged (nothing to do). Template values in `cloudTemplate.params`
 * are redacted too: an official number sends the code as a template value.
 */
export function redactedCopy(
  body: string | null | undefined,
  metadata: unknown,
): { body: string | null; metadata: Record<string, unknown> } | null {
  const meta = metadata as Record<string, unknown> | null | undefined;
  if (!meta || meta[REDACT_AFTER_SEND] !== true) return null;

  const template = meta.cloudTemplate as { params?: unknown } | null | undefined;
  return {
    body: body ? redactDigits(body) : null,
    metadata: {
      ...meta,
      ...(template &&
        Array.isArray(template.params) && {
          cloudTemplate: { ...template, params: template.params.map((p) => redactDigits(String(p))) },
        }),
    },
  };
}
