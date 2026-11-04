/**
 * Website chat rules with no database or framework in them: who is answering,
 * what gets written to the chat's timeline, and who is offered the chat next.
 */

/** Who is answering the visitor right now */
export const CHAT_STATE = {
  /** The AI assistant answers */
  AI: 'AI',
  /** The visitor asked for a person; the team has been alerted */
  WAITING: 'WAITING',
  /** A team member took the chat */
  PERSON: 'PERSON',
  /** Finished (visitor left details, a member ended it, …) */
  ENDED: 'ENDED',
} as const;
export type ChatState = (typeof CHAT_STATE)[keyof typeof CHAT_STATE];

export type HandoffTrigger = 'ASKED_FOR_PERSON' | 'UNANSWERED' | 'BUTTON';
/** The visitor agreed to be contacted on WhatsApp and email (both are collected before the chat) */
export type ConsentChannel = 'BOTH';
/**
 * CONSENT: the visitor agreed to a follow-up and nobody could take the chat now.
 * UNAVAILABLE: nobody could take it, and the visitor had already agreed at the start.
 * IDLE: nobody wrote for IDLE_MINUTES.
 */
export type EndReason = 'CONSENT' | 'UNAVAILABLE' | 'MEMBER' | 'VISITOR' | 'IDLE';

/** A chat with no new message for this long ends by itself (and a pending welcome goes out) */
export const IDLE_MINUTES = 30;

/** Every step of a website chat that lands on its timeline */
export const CHAT_EVENT = {
  /** The visitor filled in name, mobile and email; the chat began */
  STARTED: 'STARTED',
  /** The chat ended and the new contact's welcome ("contact created" automations) was released */
  WELCOME_TRIGGERED: 'WELCOME_TRIGGERED',
  AI_ANSWERED: 'AI_ANSWERED',
  AI_NOT_FOUND: 'AI_NOT_FOUND',
  AI_BLOCKED: 'AI_BLOCKED',
  AI_SKIPPED: 'AI_SKIPPED',
  HANDOFF_REQUESTED: 'HANDOFF_REQUESTED',
  TEAM_NOTIFIED: 'TEAM_NOTIFIED',
  OFFERED: 'OFFERED',
  DECLINED: 'DECLINED',
  OFFER_EXPIRED: 'OFFER_EXPIRED',
  ACCEPTED: 'ACCEPTED',
  NO_ONE_AVAILABLE: 'NO_ONE_AVAILABLE',
  FOLLOW_UP_OFFERED: 'FOLLOW_UP_OFFERED',
  RELEASED_TO_AI: 'RELEASED_TO_AI',
  CONSENT_GIVEN: 'CONSENT_GIVEN',
  CONTACT_CREATED: 'CONTACT_CREATED',
  CONTACT_LINKED: 'CONTACT_LINKED',
  LEAD_SAVED: 'LEAD_SAVED',
  LEAD_DISMISSED: 'LEAD_DISMISSED',
  REOPENED: 'REOPENED',
  /** The member asked the AI for a summary or suggested replies */
  AI_ASSIST: 'AI_ASSIST',
  ENDED: 'ENDED',
  FAILED: 'FAILED',
} as const;
export type ChatEventType = (typeof CHAT_EVENT)[keyof typeof CHAT_EVENT];

export type ChatActor = { type: 'visitor' | 'ai' | 'system' } | { type: 'user'; id: string };

export const MANUAL = 'MANUAL';
export const AUTO = 'AUTO';

/** The exact sentence the visitor agrees to (stored with the consent, word for word) */
export function consentText(business: string): string {
  return `I agree to be contacted by ${business} on WhatsApp and email.`;
}

/** Nobody can take the chat now and the visitor agreed to be contacted: the chat ends after it */
export const CONSENT_THANKS = "Thank you! We'll contact you shortly on WhatsApp.";

/** Nobody can take the chat now and the visitor hasn't agreed to be contacted yet: the widget shows a one-tap "Yes, contact me" */
export const FOLLOW_UP_MESSAGE =
  "Sorry, everyone on our team is busy right now. Shall we contact you on WhatsApp or email?";

/** The AI's reply when it couldn't find an answer (before it hands over on the next miss) */
export const NOT_FOUND_MESSAGE =
  "I'm not sure about that one. I'll check with the team — or tap \"Talk to a person\".";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** A plausible email address (format only; a fake one simply fails to deliver, and that is logged) */
export function normalizeEmail(raw: string | undefined | null): string | null {
  const email = (raw ?? '').trim().toLowerCase();
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) return null;
  return email;
}

export interface Candidate {
  userId: string;
  /** Website chats this member is handling now */
  openChats: number;
  /** When they last took a website chat (null = never) */
  lastAcceptedAt: Date | null;
}

/**
 * Auto-assign: the online member with the fewest chats now, then whoever waited
 * longest since their last one. Members already offered this chat are skipped.
 */
export function pickNextMember(candidates: Candidate[], alreadyOffered: Set<string>): string | null {
  const open = candidates.filter((c) => !alreadyOffered.has(c.userId));
  if (!open.length) return null;
  open.sort(
    (a, b) =>
      a.openChats - b.openChats ||
      (a.lastAcceptedAt?.getTime() ?? 0) - (b.lastAcceptedAt?.getTime() ?? 0) ||
      a.userId.localeCompare(b.userId),
  );
  return open[0].userId;
}
