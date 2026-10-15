/**
 * Deal Guard — pure rules, no I/O:
 *  - ghost radar: is the client going cold?
 *  - trust signals: scam patterns in the client's messages + history with them
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ChatMessage {
  direction: 'INBOUND' | 'OUTBOUND';
  body: string | null;
  status: string;
  createdAt: Date;
  sentAt: Date | null;
  readAt: Date | null;
}

// ─── Ghost radar ──────────────────────────────────────────────────────────────

export type GhostLevel = 'active' | 'your_turn' | 'slow' | 'cold' | 'no_chat';

export interface GhostRadar {
  level: GhostLevel;
  reason: string;
  /** A ready-to-edit follow-up message, when one would help */
  suggestion: string | null;
}

export function evaluateGhostRadar(input: {
  messages: ChatMessage[];
  stageName: string;
  contactName: string | null;
  now: Date;
}): GhostRadar {
  const sorted = [...input.messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const last = sorted[sorted.length - 1];
  if (!last) {
    return { level: 'no_chat', reason: 'No WhatsApp messages with this client yet', suggestion: null };
  }

  const firstName = (input.contactName ?? '').trim().split(/\s+/)[0] || 'there';

  if (last.direction === 'INBOUND') {
    const waited = ago(input.now, last.createdAt);
    return {
      level: 'your_turn',
      reason: `Client replied ${waited} — waiting on you`,
      suggestion: null,
    };
  }

  const sentAt = last.sentAt ?? last.createdAt;
  const days = (input.now.getTime() - sentAt.getTime()) / DAY_MS;
  const read = last.status === 'READ' || last.readAt !== null;
  const seen = read ? `read ${ago(input.now, last.readAt ?? sentAt)}` : 'not opened yet';

  let level: GhostLevel = 'active';
  if (read && days >= 3) level = 'cold';
  else if (read && days >= 1) level = 'slow';
  else if (!read && days >= 5) level = 'cold';
  else if (!read && days >= 2) level = 'slow';

  if (level === 'active') {
    return { level, reason: `Your last message ${seen}`, suggestion: null };
  }

  return {
    level,
    reason: `Your last message ${seen}, no reply for ${Math.floor(days)}d`,
    suggestion: nudgeFor(input.stageName, firstName),
  };
}

/** One short, polite nudge per stage — the user edits it before sending. */
export function nudgeFor(stageName: string, firstName: string): string {
  const stage = stageName.toLowerCase();
  if (stage.includes('proposal') || stage.includes('quote')) {
    return `Hi ${firstName}, did you get a chance to look at the proposal? Happy to adjust anything or jump on a quick call.`;
  }
  if (stage.includes('call') || stage.includes('discovery')) {
    return `Hi ${firstName}, shall we fix a time for a quick call this week? Let me know what suits you.`;
  }
  if (stage.includes('negotiation')) {
    return `Hi ${firstName}, just checking in — is there anything holding you back? I'm sure we can find something that works.`;
  }
  if (stage.includes('advance')) {
    return `Hi ${firstName}, once the advance is in, I can start right away. Sharing the payment details again if needed!`;
  }
  return `Hi ${firstName}, just following up. Let me know if you have any questions.`;
}

function ago(now: Date, then: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - then.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// ─── Trust signals ────────────────────────────────────────────────────────────

/** Common WhatsApp job/task scam patterns aimed at freelancers and job-seekers. */
const SCAM_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(registration|joining|onboarding|verification|processing|security)\s+(fee|charge|deposit|amount)\b/i, label: 'Asks you to pay a fee to get the work' },
  { pattern: /\b(pay|deposit|transfer|send)\b[^.?!]{0,40}\b(first|before)\b[^.?!]{0,40}\b(work|task|project|start)\b/i, label: 'Wants you to pay before the work starts' },
  { pattern: /\b(prepaid|premium|vip)\s+task/i, label: '"Prepaid task" scam pattern' },
  { pattern: /\b(like|subscribe|rate|review)\b[^.?!]{0,30}\b(youtube|hotel|google|videos?)\b[^.?!]{0,30}\b(earn|paid|commission|₹|rs\.?)/i, label: 'Pay-per-like / review task scam' },
  { pattern: /\b(refund|return|send back)\b[^.?!]{0,30}\b(extra|excess|balance|difference)\b/i, label: 'Overpayment refund scam' },
  { pattern: /\b(cheque|check|demand draft)\b[^.?!]{0,40}\b(more than|extra|excess)\b/i, label: 'Overpaid cheque pattern' },
  { pattern: /\b(otp|one[- ]time password|upi pin|pin number)\b/i, label: 'Asked for an OTP or PIN' },
  { pattern: /\b(usdt|crypto|bitcoin|binance|trc20)\b/i, label: 'Wants to pay or be paid in crypto' },
  { pattern: /\b(telegram)\b[^.?!]{0,40}\b(join|contact|message|group|channel)\b|\bt\.me\//i, label: 'Moving the chat to Telegram' },
  { pattern: /\b(part[- ]time|work from home)\b[^.?!]{0,40}\b(daily|per day|earn)\b/i, label: '"Earn daily, part-time" job pitch' },
];

export interface TrustFlag {
  label: string;
  /** Short quote of the matching message */
  excerpt: string;
  at: Date;
}

export interface TrustHistory {
  won: number;
  lost: number;
  open: number;
}

export interface TrustCard {
  flags: TrustFlag[];
  history: TrustHistory;
  /** first-time | returning | risky */
  standing: 'first_time' | 'returning' | 'risky';
  /** Suggested advance before starting work */
  suggestedAdvancePct: number;
  summary: string;
}

export function scanForScamPatterns(messages: ChatMessage[]): TrustFlag[] {
  const flags: TrustFlag[] = [];
  const seen = new Set<string>();
  for (const message of messages) {
    if (message.direction !== 'INBOUND' || !message.body) continue;
    for (const { pattern, label } of SCAM_PATTERNS) {
      if (seen.has(label)) continue;
      const match = message.body.match(pattern);
      if (!match) continue;
      seen.add(label);
      flags.push({ label, excerpt: excerptAround(message.body, match.index ?? 0), at: message.createdAt });
    }
  }
  return flags;
}

export function evaluateTrust(input: { messages: ChatMessage[]; history: TrustHistory }): TrustCard {
  const flags = scanForScamPatterns(input.messages);
  const { won, lost } = input.history;

  if (flags.length > 0) {
    return {
      flags,
      history: input.history,
      standing: 'risky',
      suggestedAdvancePct: 100,
      summary: 'Scam patterns in this chat — never pay anything, and take full payment upfront if you continue',
    };
  }
  if (won > 0 && won >= lost) {
    return {
      flags,
      history: input.history,
      standing: 'returning',
      suggestedAdvancePct: 30,
      summary: `Returning client — ${won} deal${won !== 1 ? 's' : ''} won before`,
    };
  }
  return {
    flags,
    history: input.history,
    standing: 'first_time',
    suggestedAdvancePct: 50,
    summary: lost > 0 ? `${lost} earlier deal${lost !== 1 ? 's' : ''} lost — take a solid advance` : 'First deal with this client',
  };
}

function excerptAround(text: string, index: number): string {
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + 70);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}
