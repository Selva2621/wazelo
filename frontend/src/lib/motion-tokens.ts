// Motion tokens for `motion/react`. Mirror the CSS tokens in DESIGN.md §7
// (duration-fast 120ms / base 180ms / slow 240ms, ease-standard) so JS-driven
// and CSS-driven motion feel like one system.

export const motionTokens = {
  duration: {
    fast: 0.12,
    base: 0.18,
    slow: 0.24,
    crawl: 0.6,
  },
  easing: {
    standard: [0.2, 0, 0, 1] as const,
    exit: [0.4, 0, 1, 1] as const,
  },
  distance: {
    sm: 6,
    md: 10,
    lg: 16,
  },
} as const;

export const springs = {
  /** Entrances of content blocks (messages, rows). */
  gentle: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 },
  /** Layout shifts (list reordering). */
  layout: { type: "spring", stiffness: 420, damping: 38 },
  /** Small state flips (badges, ticks). */
  snappy: { type: "spring", stiffness: 520, damping: 32 },
} as const;
