// Springs shared with the app (frontend/src/lib/motion-tokens.ts) so the site's
// mocks move exactly like the product does.

export const springs = {
  /** Entrances of content blocks (messages, rows). */
  gentle: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 },
  /** Layout shifts (cards moving between pipeline columns). */
  layout: { type: "spring", stiffness: 420, damping: 38 },
  /** Small state flips (badges, ticks, pressed buttons). */
  snappy: { type: "spring", stiffness: 520, damping: 32 },
} as const;

export const easeOut = [0.16, 1, 0.3, 1] as const;
