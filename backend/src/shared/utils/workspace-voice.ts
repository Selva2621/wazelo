import { OrgType } from '@prisma/client';

/**
 * Who AI-written text speaks as. A FREELANCER workspace is one person talking to
 * clients ("I"); every other type (TEAM, and the legacy CRM / DEVELOPER) is a
 * business with staff talking to customers ("we" / "our team").
 */
export type WorkspaceKind = 'FREELANCER' | 'TEAM';

export interface WorkspaceVoice {
  kind: WorkspaceKind;
  /** Freelancers: what they offer in words, e.g. "interior design" (null when not set) */
  service: string | null;
}

export const TEAM_VOICE: WorkspaceVoice = { kind: 'TEAM', service: null };

export function workspaceKind(orgType: OrgType | string | null | undefined): WorkspaceKind {
  return orgType === OrgType.FREELANCER ? 'FREELANCER' : 'TEAM';
}

/** The writing rule on its own, for a prompt's rules list */
export function voiceRule(voice: WorkspaceVoice): string {
  return voice.kind === 'FREELANCER'
    ? 'Write in first person singular ("I"), as the freelancer, to clients. Never say "we" or "our team".'
    : 'Write as "we" / "our team" to customers.';
}

/**
 * Fixed or default lines visitors/customers see that are written as a team. For a
 * freelancer the same moment reads in first person. Only these exact texts are swapped,
 * so anything a user wrote themselves (edited handoff / after-hours messages) is kept.
 */
const SOLO_VERSIONS: Record<string, string> = {
  // Chatbot settings defaults (prisma BotSettings.handoffMessage / afterHoursMessage)
  'Thanks! Someone from our team will reply to you here shortly.': "Thanks! I'll reply to you here shortly.",
  "Thanks! Our team is offline right now and will reply when we're back.":
    "Thanks! I'm away right now and will reply as soon as I'm back.",
  // Website chat greeting (WidgetConfig.welcomeMessage default)
  'Hi! How can we help you?': 'Hi! How can I help you?',
  // Website chat (widget/domain/services/website-chat.ts)
  "Thank you! We'll contact you shortly on WhatsApp.": "Thank you! I'll contact you shortly on WhatsApp.",
  'Sorry, everyone on our team is busy right now. Shall we contact you on WhatsApp or email?':
    "Sorry, I can't reply right now. Shall I contact you on WhatsApp or email?",
  'I\'m not sure about that one. I\'ll check with the team — or tap "Talk to a person".':
    'I\'m not sure about that one. I\'ll check and get back to you, or tap "Talk to a person".',
};

/** A team-worded fixed line, reworded for a freelancer (other text is returned as is) */
export function inWorkspaceVoice(text: string, kind: WorkspaceKind): string {
  return kind === 'FREELANCER' ? (SOLO_VERSIONS[text] ?? text) : text;
}

/** One line for the shared business context: who this is, and how to write */
export function voiceLine(voice: WorkspaceVoice): string {
  const who =
    voice.kind === 'FREELANCER'
      ? `This is a solo freelancer${voice.service ? ` offering ${voice.service}` : ''}.`
      : 'This is a business with a team.';
  return `Voice: ${who} ${voiceRule(voice)}`;
}
