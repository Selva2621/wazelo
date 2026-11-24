/** The four beats of the hero. Shared by the film/scene (camera/focus) and the step chips. */
export type HeroDevice = "phone" | "laptop" | "monitor";

// `ms` is each step's length: the chip's progress bar, and the length of that step's film clip
// (demo/blender-hero/build_steps.py STEP_FRAMES). The film itself advances the steps.
export const HERO_STEPS: { device: HeroDevice; chip: string; tag: string; ms: number }[] = [
  { device: "phone", chip: "Lead arrives", tag: "New lead · WhatsApp", ms: 6000 },
  { device: "laptop", chip: "AI replies", tag: "AI drafts the reply", ms: 7000 },
  { device: "monitor", chip: "Follow-ups", tag: "Follow-ups on autopilot", ms: 7000 },
  // {price} is filled from the visitor's currency (story-media.ts), like the recordings.
  { device: "phone", chip: "Deal won", tag: "Proposal accepted · {price}", ms: 6500 },
];
