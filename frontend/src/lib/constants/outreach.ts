/**
 * What a freelancer does (asked in onboarding) and the ready-made first-contact
 * sequence written for it. Mirrors backend/src/shared/constants/freelancer-profiles.ts.
 * delayMinutes = wait after the previous step.
 */
export const FREELANCER_TYPE_OPTIONS = [
  { value: "WEB_DEVELOPER", label: "Web / App Developer", description: "Websites, online stores, web and mobile apps" },
  { value: "DESIGNER", label: "Graphic / UI Designer", description: "Logos, brand identity, UI and print design" },
  { value: "DIGITAL_MARKETER", label: "Digital Marketer", description: "SEO, social media and paid ads" },
  { value: "VIDEO_PHOTO", label: "Video & Photography", description: "Reels, product shoots, events, editing" },
  { value: "CONTENT_WRITER", label: "Content Writer", description: "Website copy, blogs, captions, translation" },
  { value: "OTHER", label: "Something else", description: "Tell us your service" },
] as const;

export type FreelancerTypeValue = (typeof FREELANCER_TYPE_OPTIONS)[number]["value"];

interface OutreachStep {
  name: string;
  delayMinutes: number;
  messageBody: string;
}

const DAY = 24 * 60;

/** The intro line differs per line of work; follow-ups are shared. */
const INTROS: Record<Exclude<FreelancerTypeValue, "OTHER">, string> = {
  WEB_DEVELOPER:
    "Hi {{name}}, I came across your business online. I build fast, mobile-friendly websites and apps that bring in enquiries. Would you be open to a quick chat this week?",
  DESIGNER:
    "Hi {{name}}, I came across your business online. I design logos, brand identity and social media visuals that make a business look trustworthy. Would you be open to a quick chat this week?",
  DIGITAL_MARKETER:
    "Hi {{name}}, I came across your business online. I help local businesses get more enquiries through Google, social media and ads. Would you be open to a quick chat this week?",
  VIDEO_PHOTO:
    "Hi {{name}}, I came across your business online. I shoot and edit reels, product photos and event videos for businesses. Would you be open to a quick chat this week?",
  CONTENT_WRITER:
    "Hi {{name}}, I came across your business online. I write website copy, blogs and captions that help businesses get found and trusted. Would you be open to a quick chat this week?",
};

/**
 * Ready-made outreach for a freelancer's line of work. With several types the first
 * one picked writes the intro; unknown type → a fill-in version.
 */
export function getOutreachSteps(types?: readonly string[] | null, service?: string | null): OutreachStep[] {
  const type = types?.[0];
  const intro =
    type && type in INTROS
      ? INTROS[type as keyof typeof INTROS]
      : `Hi {{name}}, I came across your business online. I help businesses like yours with ${service?.trim() || "[your service]"}. Would you be open to a quick chat this week?`;

  return [
    { name: "Intro", delayMinutes: 0, messageBody: intro },
    {
      name: "Follow-up",
      delayMinutes: 2 * DAY,
      messageBody: "Hi {{name}}, just following up on my last message. Happy to share a few examples of my work.",
    },
    {
      name: "Last check-in",
      delayMinutes: 3 * DAY,
      messageBody: "Hi {{name}}, last check-in from my side. If now isn't the right time, no worries at all. All the best!",
    },
  ];
}

/** Default (no type known) — kept for callers that don't have org settings */
export const OUTREACH_STEPS = getOutreachSteps(null);

/** "[your service]"-style blanks the user must replace before sending */
export const hasOutreachBlanks = (text: string) => /\[[^\]]+\]/.test(text);
