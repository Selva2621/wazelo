/**
 * The first message a new enquiry gets: who the freelancer is, what they do and how
 * that helps the client's business. Written per line of work (onboarding's
 * "What do you do?"), WhatsApp-formatted (*bold*, line breaks, • bullets).
 */
import { FREELANCER_TYPE_OPTIONS } from "./outreach";

interface Pitch {
  /** "a web and app developer" — completes "I'm Selva, …" */
  role: string;
  /** How it helps the client's business, three short lines */
  helps: [string, string, string];
}

const PITCHES: Record<string, Pitch> = {
  WEB_DEVELOPER: {
    role: "a web and app developer",
    helps: [
      "A fast, mobile-friendly website that brings in enquiries",
      "Online orders, bookings and payments",
      "Showing up on Google so more customers find you",
    ],
  },
  DESIGNER: {
    role: "a graphic and UI designer",
    helps: [
      "A logo and brand look people remember",
      "Social media posts and ads that get noticed",
      "Menus, brochures and packaging that look professional",
    ],
  },
  DIGITAL_MARKETER: {
    role: "a digital marketer",
    helps: [
      "More enquiries from Google and social media",
      "Ads that bring customers, not just likes",
      "A clear monthly report of what is working",
    ],
  },
  VIDEO_PHOTO: {
    role: "a photographer and video creator",
    helps: [
      "Reels and short videos that grow your page",
      "Product photos that make people want to buy",
      "Event and brand shoots, edited and ready to post",
    ],
  },
  CONTENT_WRITER: {
    role: "a content writer",
    helps: [
      "Website copy that turns visitors into customers",
      "Blogs that help you get found on Google",
      "Captions and posts written in your brand's voice",
    ],
  },
};

const GENERIC_HELPS: Pitch["helps"] = [
  "Understanding exactly what your business needs",
  "Delivering on time and on budget",
  "Keeping you updated at every step",
];

export interface IntroDetails {
  /** The freelancer's first name; blank → introduced without a name */
  name?: string;
  freelancerTypes?: readonly string[] | null;
  /** Their own words, when the type is OTHER or unknown */
  service?: string | null;
  portfolioUrl?: string;
  /** Tone of the message; friendly when not picked */
  style?: IntroStyle;
}

function roleFor(details: IntroDetails): string {
  const type = details.freelancerTypes?.[0];
  if (type && PITCHES[type]) return PITCHES[type].role;
  const service = details.service?.trim();
  if (service) return `a freelancer for ${service}`;
  const label = FREELANCER_TYPE_OPTIONS.find((o) => o.value === type)?.label;
  return label && type !== "OTHER" ? `a ${label.toLowerCase()}` : "a freelancer";
}

/** What the short intro promises, per line of work: "I help businesses like yours …" */
const ONE_LINERS: Record<string, string> = {
  WEB_DEVELOPER: "get more customers online",
  DESIGNER: "look professional and get noticed",
  DIGITAL_MARKETER: "get more enquiries every month",
  VIDEO_PHOTO: "stand out with great photos and videos",
  CONTENT_WRITER: "get found and trusted online",
};

export const INTRO_STYLES = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "short", label: "Short & quick" },
  { value: "results", label: "Results first" },
] as const;

export type IntroStyle = (typeof INTRO_STYLES)[number]["value"];

/** How the message ends: the chatbot asks questions next, or a one-off welcome asks for the brief */
type IntroEnding = "questions" | "brief";

const ENDINGS: Record<IntroStyle, Record<IntroEnding, string>> = {
  friendly: {
    questions: "Tell me a bit about your project and I'll suggest the best way to get it done. Three quick questions:",
    brief: "Tell me a bit about your project, what you need and by when, and I'll come back with ideas and a quote.",
  },
  professional: {
    questions: "To recommend the right solution, may I ask you three quick questions?",
    brief: "Could you share what you need and your timeline? I'll get back to you with a recommendation and a quote.",
  },
  short: {
    questions: "Three quick questions so I can help you faster:",
    brief: "What do you need, and by when?",
  },
  results: {
    questions: "Let's start with three quick questions:",
    brief: "Tell me what you need and by when, and I'll send you a clear plan.",
  },
};

/** Opening message to a new enquiry: who you are, what you do, how it helps their business */
export function buildFreelancerIntro(
  details: IntroDetails,
  ending: IntroEnding = "questions",
  style: IntroStyle = details.style ?? "friendly",
): string {
  const type = details.freelancerTypes?.[0];
  const helps = (type && PITCHES[type]?.helps) || GENERIC_HELPS;
  const name = details.name?.trim();
  const role = roleFor(details);
  const link = details.portfolioUrl?.trim();
  const close = ENDINGS[style][ending];

  const blocks: (string | false | undefined)[] =
    style === "professional"
      ? [
          "Hello, and thank you for getting in touch.",
          `${name ? `I'm *${name}*, ${role}` : `I'm ${role}`} working with small and growing businesses.`,
          ["What I can do for you:", ...helps.map((h) => `• ${h}`)].join("\n"),
          link && `Portfolio: ${link}`,
          close,
        ]
      : style === "short"
        ? [
            [
              `Hi! I'm ${name ? `*${name}*, ` : ""}${role} 👋 I help businesses like yours ${(type && ONE_LINERS[type]) || "get the job done right"}.`,
              link && `Portfolio: ${link}`,
            ]
              .filter(Boolean)
              .join("\n"),
            close,
          ]
        : style === "results"
          ? [
              "Hi! Most businesses that message me want one thing: *more customers*.",
              [`${name ? `I'm *${name}*, ${role}` : `I'm ${role}`}, and that's exactly what I work on:`, ...helps.map((h) => `→ ${h}`)].join("\n"),
              ["You get a clear plan and price before any work starts.", link && `🔗 See my work: ${link}`].filter(Boolean).join("\n"),
              close,
            ]
          : [
              ["Hi! Thanks for reaching out 👋", name ? `I'm *${name}*, ${role}.` : `I'm ${role}.`].join("\n"),
              ["Here's how I help businesses like yours:", ...helps.map((h) => `✅ ${h}`)].join("\n"),
              link && `🔗 My recent work: ${link}`,
              close,
            ];

  return blocks.filter(Boolean).join("\n\n");
}
