import type { IntroDetails } from "./freelancer-pitch";

/**
 * The few details the starter pack asks once, so ready-made messages need no
 * "[your …]" editing. Recipe cards use the defaults.
 */
export interface PresetProfile {
  /** "within a few hours" — finishes "I'll come back with a quote …" */
  replyTime: string;
  /** Link sent by the portfolio chatbot; blank → a "[your portfolio link]" placeholder */
  portfolioUrl?: string;
  /** Who the freelancer is — builds the self-introduction of the first message */
  introDetails?: IntroDetails;
  /** The chatbot's first message as the user edited it; wins over the generated one */
  intro?: string;
}

export const REPLY_TIME_OPTIONS = [
  { value: "within a few hours", label: "Within a few hours" },
  { value: "the same day", label: "The same day" },
  { value: "within 24 hours", label: "Within 24 hours" },
] as const;

export const DEFAULT_PRESET_PROFILE: PresetProfile = { replyTime: "within 24 hours" };
