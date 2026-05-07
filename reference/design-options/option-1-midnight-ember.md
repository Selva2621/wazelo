# Design System Strategy: Midnight Ember

## 1. Overview & Creative North Star
The creative north star for this design system is **"The Ember Lounge."**

This system draws from the visual language of premium, after-hours software — tools you trust with serious work. Think Linear's dark precision meets Raycast's warm confidence. The palette centers on a deep charcoal-navy foundation with a signature warm amber accent that glows like an ember in a dark room.

We reject the "corporate blue box" by anchoring every screen in rich, dark neutrals. The result is an interface that feels like a luxury instrument panel — where every glow of amber signals intent, every surface whispers "built for professionals." The login experience should feel like stepping into a private command center, not a generic SaaS form.

## 2. Colors & Surface Philosophy
Our palette is built on a dark-first foundation with warm amber as the energizing accent.

### The "Dark Canvas" Rule
Backgrounds are never pure black. We use layered dark tones with warm undertones to create depth without harshness.
- Base surfaces transition from `surface` (#0f1117) to `surface-container` (#1a1d27) — the warmth in the undertone prevents the "code editor" feel.
- This creates a sense of depth through tonal graduation, not harsh borders.

### Surface Hierarchy & Nesting
Treat the UI as layers of smoked glass.
- **Base Layer:** `surface` (#0f1117) — the deepest background, nearly black with a blue-gray warmth.
- **The Container:** The login card uses `surface-container-lowest` (#1e2130) — lifted just enough to be perceived.
- **Interactive Elements:** Inputs use `surface-container` (#252838) — a recessed well that invites interaction.

### The "Ember Glow" Rule
Amber is used surgically — never for backgrounds, only for:
- **Primary CTAs:** Use a linear gradient from `primary` (#d97706) to `primary-container` (#f59e0b). 135deg diagonal.
- **Active/Focus States:** A `2px` ring of `primary` at 40% opacity creates an "ember glow."
- **Text Links:** `primary` (#d97706) for actionable links.

### Color Tokens
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | #d97706 | Buttons, links, active states |
| `primary-container` | #f59e0b | Gradient endpoint, badges |
| `on-primary` | #1a1d27 | Text on amber buttons (dark) |
| `surface` | #0f1117 | Page background |
| `surface-container-lowest` | #1e2130 | Card backgrounds |
| `surface-container-low` | #252838 | Input backgrounds |
| `surface-container` | #2d3044 | Hover states |
| `on-surface` | #e8eaed | Primary text |
| `on-surface-variant` | #9ca3b4 | Secondary text |
| `error` | #f87171 | Error text |
| `error-container` | #451a1a | Error backgrounds |
| `success` | #34d399 | Success indicators |
