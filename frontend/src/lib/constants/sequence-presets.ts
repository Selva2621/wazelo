import { getOutreachSteps } from "@/lib/constants/outreach";
import type { OrgType } from "@/lib/types/auth";

/**
 * Ready-made drip sequences shown when creating a sequence. Freelancers and teams
 * get different sets. delayMinutes = wait after the previous step and must match
 * one of the modal's delay options.
 */
export interface PresetStep {
  name: string;
  messageType: "TEXT";
  messageBody: string;
  delayMinutes: number;
}

/**
 * What adds a contact by default. Stages are named loosely ("proposal" / "won")
 * because every org has its own pipeline; the modal finds the matching stage.
 */
export type PresetTrigger =
  | { type: "DEAL_STAGE_CHANGED"; stage: "proposal" | "won" }
  | { type: "CONTACT_CREATED" };

export interface SequencePreset {
  id: string;
  name: string;
  description: string;
  exitOnReply: boolean;
  /** Unset → sent once to an audience */
  trigger?: PresetTrigger;
  steps: PresetStep[];
}

const HOUR = 60;
const DAY = 24 * HOUR;

const text = (name: string, delayMinutes: number, messageBody: string): PresetStep => ({
  name,
  messageType: "TEXT",
  messageBody,
  delayMinutes,
});

const PROPOSAL_FOLLOW_UP: SequencePreset = {
  id: "proposal-follow-up",
  name: "Proposal follow-up",
  description: "Nudge a client after you send a quote",
  exitOnReply: true,
  trigger: { type: "DEAL_STAGE_CHANGED", stage: "proposal" },
  steps: [
    text("Proposal sent", 0, "Hi {{name}}, I've sent over the proposal we discussed. Let me know if you have any questions or want anything changed."),
    text("Follow-up", 2 * DAY, "Hi {{name}}, just checking if you had a chance to look at the proposal. Happy to jump on a quick call to go through it."),
    text("Last check-in", 3 * DAY, "Hi {{name}}, following up one last time on the proposal. If the timing isn't right, no problem. Just let me know either way."),
  ],
};

const PAYMENT_REMINDER: SequencePreset = {
  id: "payment-reminder",
  name: "Payment reminder",
  description: "Polite reminders for an unpaid invoice",
  exitOnReply: true,
  trigger: { type: "DEAL_STAGE_CHANGED", stage: "won" },
  steps: [
    text("Invoice sent", 0, "Hi {{name}}, sharing the invoice for the recent work. Please let me know once the payment is done. Thank you!"),
    text("Gentle reminder", 3 * DAY, "Hi {{name}}, a gentle reminder about the pending invoice. Do let me know if you need any details from my side."),
    text("Final reminder", 7 * DAY, "Hi {{name}}, the invoice is still pending. Could you please share an update on the payment? Thank you."),
  ],
};

const REVIEW_REQUEST: SequencePreset = {
  id: "review-request",
  name: "Review request",
  description: "Ask a happy client for a review or referral",
  exitOnReply: true,
  trigger: { type: "DEAL_STAGE_CHANGED", stage: "won" },
  steps: [
    // A week after the win, so it doesn't land with the payment reminder
    text("Thank you", 7 * DAY,"Hi {{name}}, thank you for working with me! I hope you're happy with the result. If you have a minute, a short review would really help me."),
    text("Referral", 3 * DAY, "Hi {{name}}, if you know anyone who needs similar work, I'd be grateful for a referral. Thanks again!"),
  ],
};

const NEW_LEAD_WELCOME: SequencePreset = {
  id: "new-lead-welcome",
  name: "New lead welcome",
  description: "Welcome new contacts and start the conversation",
  exitOnReply: true,
  trigger: { type: "CONTACT_CREATED" },
  steps: [
    text("Welcome", 0, "Hi {{name}}! Welcome aboard. We're excited to have you. How can we help you today?"),
    text("Day 1 check-in", DAY, "Hi {{name}}, just checking in! Did you get a chance to explore our services? Feel free to ask any questions."),
    text("Day 3 value", 2 * DAY, "Hey {{name}}, here's something you might find valuable: the features our customers love most. Want to learn more?"),
  ],
};

const ENQUIRY_FOLLOW_UP: SequencePreset = {
  id: "enquiry-follow-up",
  name: "Enquiry follow-up",
  description: "Follow up when an enquiry goes quiet",
  exitOnReply: true,
  steps: [
    text("1 hour follow-up", HOUR, "Hi {{name}}, thank you for reaching out! I wanted to follow up on your enquiry. Do you have any questions?"),
    text("Day 1 reminder", DAY, "Hi {{name}}, just a friendly reminder that I'm here if you need any more information about what you asked for."),
    text("Last follow-up", 2 * DAY, "Hey {{name}}, I don't want to miss the chance to help you. This is my last follow-up. Let me know if you'd like to proceed!"),
  ],
};

const RE_ENGAGEMENT: SequencePreset = {
  id: "re-engagement",
  name: "Re-engagement",
  description: "Win back inactive customers",
  exitOnReply: true,
  steps: [
    text("Re-engage", 0, "Hey {{name}}, we haven't heard from you in a while! We've been making some exciting improvements. Would you like to hear what's new?"),
    text("Special offer", 3 * DAY, "Hi {{name}}, we miss you! Here's a special offer just for you. Reply 'YES' to learn more."),
  ],
};

const POST_PURCHASE_FEEDBACK: SequencePreset = {
  id: "post-purchase-feedback",
  name: "Post-purchase feedback",
  description: "Check in after a purchase and ask for a review",
  exitOnReply: true,
  trigger: { type: "DEAL_STAGE_CHANGED", stage: "won" },
  steps: [
    text("Thank you", 0, "Hi {{name}}, thank you for your purchase! We hope you're enjoying it. Let us know if you need any help getting started."),
    text("Feedback", 3 * DAY, "Hi {{name}}, how has your experience been so far? Reply with a rating from 1 to 5. Your feedback helps us improve."),
    text("Review", 7 * DAY, "Hi {{name}}, if you're happy with us, a quick Google review would mean a lot. Thank you for your support!"),
  ],
};

interface PresetOrgSettings {
  orgType?: OrgType;
  freelancerTypes?: readonly string[] | null;
  freelancerService?: string | null;
  freelancerServiceLabel?: string | null;
}

/** Presets for this org. The outreach intro is written for the freelancer's line of work. */
export function getSequencePresets(org?: PresetOrgSettings): SequencePreset[] {
  const isFreelancer = org?.orgType === "FREELANCER";
  const service = org?.freelancerServiceLabel ?? org?.freelancerService;
  const outreach: SequencePreset = {
    id: "lead-outreach",
    name: isFreelancer ? "Cold outreach" : "Scraped lead outreach",
    description: "First contact with leads from the lead scraper",
    exitOnReply: true,
    steps: getOutreachSteps(isFreelancer ? org?.freelancerTypes : null, isFreelancer ? service : null).map(
      (s) => ({ ...s, messageType: "TEXT" as const }),
    ),
  };

  return isFreelancer
    ? [outreach, PROPOSAL_FOLLOW_UP, PAYMENT_REMINDER, REVIEW_REQUEST]
    : [NEW_LEAD_WELCOME, ENQUIRY_FOLLOW_UP, outreach, RE_ENGAGEMENT, POST_PURCHASE_FEEDBACK];
}

/** Card hint for presets that run on their own */
export function presetTriggerLabel(preset: SequencePreset): string | null {
  if (!preset.trigger) return null;
  if (preset.trigger.type === "CONTACT_CREATED") return "Auto · every new contact";
  return preset.trigger.stage === "won" ? "Auto · when a deal is won" : "Auto · when a deal reaches proposal";
}

/** "3 steps · 5 days" */
export function presetSummary(preset: SequencePreset): string {
  const total = preset.steps.reduce((sum, s) => sum + s.delayMinutes, 0);
  const span =
    total >= DAY
      ? `${Math.round(total / DAY)} day${Math.round(total / DAY) === 1 ? "" : "s"}`
      : `${Math.max(1, Math.round(total / HOUR))} hour${Math.round(total / HOUR) === 1 ? "" : "s"}`;
  const count = `${preset.steps.length} step${preset.steps.length === 1 ? "" : "s"}`;
  return total === 0 ? count : `${count} · ${span}`;
}
