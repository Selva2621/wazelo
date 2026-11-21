/**
 * Last check on an AI reply before a customer sees it. Catches the usual results of a
 * prompt injection: echoing our instructions, or sending a link / phone number the
 * business never gave us. A blocked reply is not sent; the chat goes to a person.
 */

export type ReplyBlockReason = 'PROMPT_LEAK' | 'UNKNOWN_LINK' | 'UNKNOWN_PHONE';

export interface ReplyGuardInput {
  reply: string;
  /** Our fixed instructions to the model. The reply must never repeat them. */
  ownInstructions: string;
  /** Text the business stands behind (profile, knowledge, its own instructions, team replies). Links must come from here. */
  trustedText: string;
  /** What the customer wrote (plus their own number). Numbers may be repeated back from here, e.g. an order number. */
  customerText?: string;
}

export type ReplyGuardResult = { ok: true } | { ok: false; reason: ReplyBlockReason };

const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s<>()"']+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|in|net|org|io|co|app|xyz|info|biz|me|ly|link|shop|store|online|site|top|click)\b(?:\/[^\s<>()"']*)?/gi;
const NUMBER_PATTERN = /\+?\d[\d\s().-]{6,}\d/g;
const DATE_PATTERN = /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/;
const MIN_LEAK_CHARS = 30;

export function checkReply(input: ReplyGuardInput): ReplyGuardResult {
  const reply = input.reply ?? '';
  if (leaksInstructions(reply, input.ownInstructions)) return { ok: false, reason: 'PROMPT_LEAK' };

  const trusted = (input.trustedText ?? '').toLowerCase();
  for (const host of hosts(reply)) {
    if (!trusted.includes(host)) return { ok: false, reason: 'UNKNOWN_LINK' };
  }

  const known = phoneNumbers(`${input.trustedText ?? ''}\n${input.customerText ?? ''}`);
  for (const n of phoneNumbers(reply)) {
    if (!known.some((k) => sameNumber(k, n))) return { ok: false, reason: 'UNKNOWN_PHONE' };
  }
  return { ok: true };
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** True when the reply repeats a sentence of our instructions word for word. */
function leaksInstructions(reply: string, instructions: string): boolean {
  const r = normalize(reply);
  return instructions
    .split(/[.\n!?]+/)
    .map(normalize)
    .filter((s) => s.length >= MIN_LEAK_CHARS)
    .some((s) => r.includes(s));
}

/** Hostnames of links in the text, without "www.". */
function hosts(text: string): string[] {
  return (text.match(URL_PATTERN) ?? []).map((u) =>
    u
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split(/[/?#:]/)[0]
      .replace(/\.+$/, ''),
  );
}

/** Digits of phone-like numbers (8-15 digits), skipping dates. */
function phoneNumbers(text: string): string[] {
  return (text.match(NUMBER_PATTERN) ?? [])
    .filter((m) => !DATE_PATTERN.test(m.trim()))
    .map((m) => m.replace(/\D/g, ''))
    .filter((d) => d.length >= 8 && d.length <= 15);
}

/** Same number, ignoring a country code / leading 0 (compares the last 8 digits). */
function sameNumber(a: string, b: string): boolean {
  return a.slice(-8) === b.slice(-8);
}
