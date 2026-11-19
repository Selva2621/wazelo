import type { ChatbotNodeType, CreateFlowRequest, SaveNodesRequest } from "@/lib/types/chatbot";
import type { OrgType } from "@/lib/types/settings";
import { DEFAULT_PRESET_PROFILE, type PresetProfile } from "./preset-profile";
import { buildFreelancerIntro } from "./freelancer-pitch";

/**
 * Ready-made chatbot flows shown as recipe cards on the Chatbot page. A recipe
 * creates the flow (inactive) with its steps, then opens the builder to review.
 * Freelancers get flows that qualify a project; teams get flows that route enquiries.
 */
export type ChatbotPresetIcon = "qualify" | "portfolio" | "hours" | "ai";

export interface ChatbotPreset {
  id: string;
  icon: ChatbotPresetIcon;
  title: string;
  summary: string;
  needs?: string;
  flow: CreateFlowRequest;
  /** Steps in order; saved once the flow exists */
  steps?: { type: ChatbotNodeType; data: Record<string, unknown> }[];
}

/** Steps run top to bottom, each linked to the next */
export function buildPresetNodes(steps: NonNullable<ChatbotPreset["steps"]>): SaveNodesRequest["nodes"] {
  const ids = steps.map(() => crypto.randomUUID());
  return steps.map((step, i) => ({
    id: ids[i],
    type: step.type,
    data: step.data,
    position: { x: 250, y: 50 + i * 150 },
    nextNodes: i < steps.length - 1 ? [{ nodeId: ids[i + 1] }] : [],
  }));
}

const ask = (question: string, variableName: string) => ({
  type: "ASK_QUESTION" as const,
  data: { question, variableName },
});
const say = (message: string) => ({ type: "SEND_MESSAGE" as const, data: { message } });
const tag = (tagName: string) => ({ type: "SET_TAG" as const, data: { tagName } });

// ─── Freelancer ──────────────────────────────────────────────────────────────

const freelancerQualifier = (profile: PresetProfile): ChatbotPreset => ({
  id: "freelancer-qualifier",
  icon: "qualify",
  title: "Project enquiry",
  summary: "Asks what they need, budget and deadline, then promises a quote",
  flow: {
    name: "Project enquiry",
    description: "Collects the project, budget and deadline from new enquiries.",
    trigger: { type: "FIRST_MESSAGE" },
  },
  steps: [
    say(profile.intro?.trim() || buildFreelancerIntro(profile.introDetails ?? {})),
    ask("What do you need help with?", "project"),
    ask("What budget do you have in mind?", "budget"),
    ask("When do you need it done?", "deadline"),
    tag("qualified-lead"),
    say(
      `Thanks! So you need {{project}}, budget {{budget}}, by {{deadline}}. I'll come back with a quote ${profile.replyTime}.`,
    ),
  ],
});

const freelancerPortfolio = (profile: PresetProfile): ChatbotPreset => ({
  id: "freelancer-portfolio",
  icon: "portfolio",
  title: "Share my portfolio",
  summary: "Someone types \"portfolio\" → send your best work",
  needs: profile.portfolioUrl ? undefined : "Add your portfolio link",
  flow: {
    name: "Share my portfolio",
    description: "Replies to portfolio requests with links to past work.",
    trigger: { type: "KEYWORD", value: "portfolio" },
  },
  steps: [
    say(`Here's some of my recent work: ${profile.portfolioUrl?.trim() || "[your portfolio link]"}`),
    ask("Which kind of project are you planning? I'll share the closest examples.", "projectType"),
    say("Great — I'll send a few {{projectType}} examples shortly."),
  ],
});

const FREELANCER_AI: ChatbotPreset = {
  id: "freelancer-ai",
  icon: "ai",
  title: "AI assistant",
  summary: "Answers questions about your services while you're busy",
  flow: {
    name: "AI assistant",
    description: "Replies to new enquiries about your services using AI.",
    trigger: { type: "FIRST_MESSAGE" },
    aiEnabled: true,
    aiSystemPrompt:
      "You are the assistant of an independent freelancer. Answer questions about their services, process and availability politely and briefly. Never promise prices or deadlines — say the freelancer will confirm them personally. Ask what the person needs and by when. Keep replies under 80 words.",
    useKnowledgeBase: true,
  },
};

// ─── Team ────────────────────────────────────────────────────────────────────

const TEAM_QUALIFIER: ChatbotPreset = {
  id: "team-qualifier",
  icon: "qualify",
  title: "Lead qualifier",
  summary: "Asks name and what they're looking for, then tags the lead",
  flow: {
    name: "Lead qualifier",
    description: "Collects the name and need of new enquiries before the team replies.",
    trigger: { type: "FIRST_MESSAGE" },
  },
  steps: [
    say("Hi! Thanks for contacting us."),
    ask("May I know your name?", "name"),
    ask("What are you looking for today?", "need"),
    tag("new-enquiry"),
    say("Thanks {{name}}! Our team will get back to you about {{need}} shortly."),
  ],
};

const TEAM_HOURS: ChatbotPreset = {
  id: "team-hours",
  icon: "hours",
  title: "Opening hours",
  summary: "Someone asks \"timing\" → reply with your hours",
  needs: "Edit your hours",
  flow: {
    name: "Opening hours",
    description: "Answers questions about when you're open.",
    trigger: { type: "KEYWORD", value: "timing" },
  },
  steps: [say("We're open Monday to Saturday, 10 AM – 7 PM. Message us anytime and we'll reply during these hours.")],
};

const TEAM_AI: ChatbotPreset = {
  id: "team-ai",
  icon: "ai",
  title: "AI support bot",
  summary: "Replies using AI and your product knowledge",
  flow: {
    name: "AI Support Bot",
    description: "AI-powered chatbot that automatically replies to customers using your product knowledge.",
    trigger: { type: "FIRST_MESSAGE" },
    aiEnabled: true,
    aiSystemPrompt:
      "You are a helpful and professional customer support agent. Answer customer questions accurately and concisely based on the product knowledge provided. If you don't know the answer, politely say so and offer to connect them with a human agent. Keep responses under 150 words.",
    useKnowledgeBase: true,
  },
};

/** AI recipes only when the plan includes AI */
export function getChatbotPresets(
  orgType: OrgType | undefined,
  aiEnabled: boolean,
  profile: PresetProfile = DEFAULT_PRESET_PROFILE,
): ChatbotPreset[] {
  const presets =
    orgType === "FREELANCER"
      ? [freelancerQualifier(profile), freelancerPortfolio(profile), FREELANCER_AI]
      : [TEAM_QUALIFIER, TEAM_HOURS, TEAM_AI];
  return aiEnabled ? presets : presets.filter((p) => p.icon !== "ai");
}
