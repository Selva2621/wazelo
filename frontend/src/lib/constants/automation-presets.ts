import type { CreateAutomationRuleFormData } from "@/lib/validations/automation";
import type { OrgType } from "@/lib/types/settings";
import { DEFAULT_PRESET_PROFILE, type PresetProfile } from "./preset-profile";
import { buildFreelancerIntro } from "./freelancer-pitch";

/**
 * Ready-made automation rules shown as recipe cards on the Automation page.
 * Picking one opens the create form filled in; everything stays editable.
 * Freelancers get rules for winning and keeping clients, teams for handling enquiries.
 */
export type AutomationPresetIcon = "welcome" | "pricing" | "follow-up" | "proposal" | "won" | "website";

export interface AutomationPreset {
  id: string;
  icon: AutomationPresetIcon;
  title: string;
  summary: string;
  /** Shown on the card when the user still has to pick something (e.g. a deal stage) */
  needs?: string;
  values: Partial<CreateAutomationRuleFormData>;
}

const DAY = 24 * 60 * 60;

const sendMessage = (messageBody: string, delaySeconds = 0) => ({
  actionType: "SEND_MESSAGE" as const,
  actionConfig: { messageBody },
  orderIndex: 0,
  delaySeconds,
});

// ─── Freelancer ──────────────────────────────────────────────────────────────

const freelancerPresets = (profile: PresetProfile): AutomationPreset[] => [
  {
    id: "freelancer-welcome",
    icon: "welcome",
    title: "Welcome new enquiries",
    summary: "First message from someone → ask about their project",
    values: {
      name: "Welcome new enquiries",
      triggerType: "MESSAGE_RECEIVED",
      triggerConfig: {},
      maxExecutionsPerContact: 1,
      actions: [sendMessage(buildFreelancerIntro(profile.introDetails ?? {}, "brief"))],
    },
  },
  {
    id: "freelancer-pricing",
    icon: "pricing",
    title: "Answer pricing questions",
    summary: "Message says \"price\" → reply and mark Interested",
    values: {
      name: "Answer pricing questions",
      triggerType: "MESSAGE_RECEIVED",
      triggerConfig: { messageKeyword: "price" },
      cooldownSeconds: DAY,
      actions: [
        sendMessage(
          `Happy to share pricing! It depends on the scope — could you tell me what you need and your timeline? I'll send you a clear quote ${profile.replyTime}.`,
        ),
        { actionType: "UPDATE_STATUS", actionConfig: { newStatus: "INTERESTED" }, orderIndex: 1, delaySeconds: 0 },
      ],
    },
  },
  {
    id: "freelancer-no-reply",
    icon: "follow-up",
    title: "Follow up after 2 days",
    summary: "No reply for 2 days → gentle nudge",
    values: {
      name: "Follow up after 2 days",
      triggerType: "NO_REPLY",
      triggerConfig: { delaySeconds: 2 * DAY },
      maxExecutionsPerContact: 1,
      actions: [
        sendMessage(
          "Hi {{contact.name}}, just checking in on my last message. Happy to answer any questions or share a few examples of my work.",
        ),
      ],
    },
  },
  {
    id: "freelancer-proposal",
    icon: "proposal",
    title: "Chase a sent proposal",
    summary: "Deal moves to Proposal sent → follow up 2 days later",
    needs: "Pick the proposal stage",
    values: {
      name: "Chase a sent proposal",
      triggerType: "DEAL_STAGE_CHANGED",
      triggerConfig: {},
      actions: [
        sendMessage(
          "Hi {{contact.name}}, did you get a chance to look at the proposal? Happy to walk you through it or adjust anything.",
          2 * DAY,
        ),
      ],
    },
  },
  {
    id: "freelancer-won",
    icon: "won",
    title: "Thank a new client",
    summary: "Deal won → thank you message and Client tag",
    needs: "Pick the won stage",
    values: {
      name: "Thank a new client",
      triggerType: "DEAL_STAGE_CHANGED",
      triggerConfig: {},
      actions: [
        sendMessage(
          "Thank you for choosing to work with me, {{contact.name}}! I'll share the next steps shortly. Excited to get started.",
        ),
        { actionType: "ADD_TAG", actionConfig: { tagName: "client" }, orderIndex: 1, delaySeconds: 0 },
      ],
    },
  },
];

// ─── Team ────────────────────────────────────────────────────────────────────

const TEAM_PRESETS: AutomationPreset[] = [
  {
    id: "team-welcome",
    icon: "welcome",
    title: "Welcome new customers",
    summary: "First message from someone → greet and set expectations",
    values: {
      name: "Welcome new customers",
      triggerType: "MESSAGE_RECEIVED",
      triggerConfig: {},
      maxExecutionsPerContact: 1,
      actions: [
        sendMessage(
          "Hi {{contact.name}}, thanks for contacting us! Someone from our team will reply shortly. Meanwhile, tell us how we can help.",
        ),
      ],
    },
  },
  {
    id: "team-pricing",
    icon: "pricing",
    title: "Answer pricing questions",
    summary: "Message says \"price\" → reply and mark Interested",
    values: {
      name: "Answer pricing questions",
      triggerType: "MESSAGE_RECEIVED",
      triggerConfig: { messageKeyword: "price" },
      cooldownSeconds: DAY,
      actions: [
        sendMessage(
          "Thanks for your interest! Could you tell us which product or service you're looking at? We'll send you the latest prices right away.",
        ),
        { actionType: "UPDATE_STATUS", actionConfig: { newStatus: "INTERESTED" }, orderIndex: 1, delaySeconds: 0 },
      ],
    },
  },
  {
    id: "team-no-reply",
    icon: "follow-up",
    title: "Follow up after 2 days",
    summary: "No reply for 2 days → friendly reminder",
    values: {
      name: "Follow up after 2 days",
      triggerType: "NO_REPLY",
      triggerConfig: { delaySeconds: 2 * DAY },
      maxExecutionsPerContact: 1,
      actions: [
        sendMessage("Hi {{contact.name}}, just following up — is there anything else we can help you with?"),
      ],
    },
  },
  {
    id: "team-website-lead",
    icon: "website",
    title: "Tag website leads",
    summary: "Chat widget message → tag Website lead",
    values: {
      name: "Tag website leads",
      triggerType: "WIDGET_MESSAGE_RECEIVED",
      triggerConfig: {},
      maxExecutionsPerContact: 1,
      actions: [{ actionType: "ADD_TAG", actionConfig: { tagName: "website-lead" }, orderIndex: 0, delaySeconds: 0 }],
    },
  },
];

export function getAutomationPresets(
  orgType?: OrgType,
  profile: PresetProfile = DEFAULT_PRESET_PROFILE,
): AutomationPreset[] {
  return orgType === "FREELANCER" ? freelancerPresets(profile) : TEAM_PRESETS;
}
