/**
 * Makes a pg-boss job payload safe and small enough to show in the admin UI: values under
 * secret-looking keys are masked, long strings are cut, and deep nesting is collapsed.
 * Pure logic, no I/O.
 */

const SECRET_KEY = /pass(word)?|secret|token|api[-_]?key|auth|credential|cookie|signature|private/i;
const MAX_STRING = 300;
const MAX_DEPTH = 4;
const MAX_KEYS = 50;

export function redactJobData(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}… (${value.length} chars)` : value;
  }
  if (typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return Array.isArray(value) ? `[${value.length} items]` : '{…}';

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_KEYS).map((v) => redactJobData(v, depth + 1));
    return value.length > MAX_KEYS ? [...items, `… ${value.length - MAX_KEYS} more`] : items;
  }

  const out: Record<string, unknown> = {};
  const entries = Object.entries(value as Record<string, unknown>);
  for (const [key, v] of entries.slice(0, MAX_KEYS)) {
    out[key] = SECRET_KEY.test(key) && v !== null && v !== '' ? '[redacted]' : redactJobData(v, depth + 1);
  }
  if (entries.length > MAX_KEYS) out['…'] = `${entries.length - MAX_KEYS} more keys`;
  return out;
}

/** The useful part of a pg-boss failure output: the error message, cut to a readable length. */
export function jobErrorSummary(output: unknown, max = 1000): string | null {
  if (output === null || output === undefined) return null;
  let text: string;
  if (typeof output === 'string') text = output;
  else if (typeof output === 'object') {
    const o = output as Record<string, unknown>;
    const meta = o.meta as Record<string, unknown> | undefined;
    text = String(o.message ?? meta?.error ?? o.value ?? JSON.stringify(output));
  } else text = String(output);
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
