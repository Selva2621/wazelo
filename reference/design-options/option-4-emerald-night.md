# Design System Strategy: Emerald Night

## 1. Overview & Creative North Star
The creative north star for this design system is **"The Green Room."**

A WhatsApp CRM should feel at home in the WhatsApp ecosystem. This system draws inspiration from WhatsApp's own DNA — green as the core color — but elevates it from messenger-casual to enterprise-premium. We use a sophisticated emerald green (not WhatsApp's flat green) against a deep warm-dark canvas.

The result is a system that feels like it was born from WhatsApp's world but graduated to a premium tier. The login experience should feel like entering the VIP section of a familiar platform — recognizable roots, elevated execution. Dark surfaces with emerald accents create a "jewel box" aesthetic that communicates both power and belonging.

## 2. Colors & Surface Philosophy
Our palette pairs rich emerald with warm dark neutrals — the green-on-dark combination that is both WhatsApp-native and visually premium.

### The "Jewel Box" Rule
Dark surfaces serve as the stage. Emerald is the jewel.
- Surfaces use warm-dark tones (not cold grays), creating a backdrop that makes green accents luminous.
- The UI should feel like opening a velvet-lined box — dark, warm, and punctuated by green light.

### Surface Hierarchy & Nesting
Layers of warm darkness, each slightly lighter.
- **Base Layer:** `surface` (#111816) — a very dark green-black. Not pure black, not blue-black. Warm and organic.
- **The Container:** The login card uses `surface-container-lowest` (#1a2420) — lifted with a green-warm tint.
- **Interactive Elements:** Inputs use `surface-container-low` (#222e29) — recessed, inviting input.
- **Elevated Elements:** `surface-container` (#2a3833) for dropdowns, tooltips.

### The "Living Green" Rule
Emerald is alive — it should feel organic, not synthetic:
- **Primary CTAs:** Use a gradient from `primary` (#059669) to `primary-container` (#10b981). Direction: 135deg. The slight shift from deep to bright emerald creates a "living gem" effect.
- **Success States:** Emerald green IS the success color by default. For actual "success" feedback, use a brighter `success` (#34d399) to distinguish from the primary.
- **Hover Glow:** Buttons gain a `box-shadow: 0 0 20px rgba(5, 150, 105, 0.3)` on hover — the "emerald glow."

### Color Tokens
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | #059669 | Buttons, links, active states |
| `primary-container` | #10b981 | Gradient endpoint, badges |
| `primary-glow` | rgba(5,150,105,0.3) | Hover glow effect |
| `on-primary` | #ffffff | Text on emerald buttons |
| `surface` | #111816 | Page background |
| `surface-container-lowest` | #1a2420 | Card backgrounds |
| `surface-container-low` | #222e29 | Input backgrounds |
| `surface-container` | #2a3833 | Hover states, elevated areas |
| `surface-container-high` | #334340 | Modal backgrounds |
| `on-surface` | #e6ece9 | Primary text (warm white-green) |
| `on-surface-variant` | #8fa89e | Secondary text (muted green-gray) |
| `outline-variant` | #3d524a | Ghost borders |
| `error` | #f87171 | Error text |
| `error-container` | #3b1515 | Error input background |
| `success` | #34d399 | Success indicators (brighter than primary) |
| `success-container` | #1a3a2a | Success backgrounds |
| `warning` | #fbbf24 | Warning indicators |
| `warning-container` | #3b3510 | Warning backgrounds |

## 3. Typography
We utilize **Inter** with the text colors carrying a green tint — `on-surface` (#e6ece9) has a slight warmth that harmonizes with the emerald palette.

- **Display & Headline:** `headline-md` (24px, Semi-Bold 600) in `on-surface`. The greeting should feel assured and welcoming — a "good to see you" energy.
- **Title & Body:** `title-sm` (13px, Medium 500) in `on-surface-variant` (#8fa69e) for labels. The green-gray muted tone makes labels feel integrated, not overlaid. `body-md` (15px, Regular 400) in `on-surface` for input text.
- **The Hierarchy Strategy:** On dark-green surfaces, we rely on **luminance steps** more than weight. `on-surface` at full opacity for primary content, at 60% for tertiary. The eye naturally builds hierarchy from brightness alone.
- **The "WhatsApp Familiar" Touch:** Use `body-sm` (13px) for helper text and timestamps — the same density WhatsApp users are accustomed to.

## 4. Elevation & Depth
On dark-green surfaces, we use **emerald ambient light** and **warm shadow**.

- **The Layering Principle:** Each surface layer steps up 1-2 lightness values within the green-dark family. The warmth in the undertone (green, not blue) prevents the "terminal" feel.
- **Ambient Shadows:** For the login card:
  - `box-shadow: 0 0 0 1px rgba(5, 150, 105, 0.08), 0 20px 48px -12px rgba(0, 0, 0, 0.5);`
  - The first shadow is an emerald-tinted "luminance edge." The second is a deep atmospheric shadow.
- **The "Emerald Glow" Effect:** Primary buttons gain a hover shadow: `0 0 24px rgba(5, 150, 105, 0.25)`. This "glow" effect makes CTAs feel alive and interactive.

## 5. Components

### Buttons
- **Primary:** Emerald gradient (135deg, `primary` to `primary-container`). `8px` rounded corners. `on-primary` (#ffffff) text, `label-md` (14px, Medium 500). On hover, gains the emerald glow shadow.
- **Secondary:** Transparent background, `1px` border of `outline-variant` (#3d524a). Text in `primary-container` (#10b981 — the brighter emerald for readability). On hover, fills `surface-container-low`.

### Input Fields
- **Default State:** `surface-container-low` (#222e29) background. `12px` corner radius. No visible border. Placeholder in `on-surface-variant` at 50% opacity.
- **Focus State:** Background lifts to `surface-container` (#2a3833). `2px` ring of `primary` at 35% opacity. The green focus ring feels native, not imposed.
- **Validation:** Error inputs shift to `error-container` (#3b1515). The red-dark background is immediately distinct from the green-dark default.

### Chips (WhatsApp Specific)
- **Status Chips:** `primary` at 15% opacity background with `primary-container` text. Full rounded corners. This creates a "WhatsApp badge" aesthetic that feels native.
- **"Connected" State:** Uses a small emerald dot (8px) that pulses with a `@keyframes` glow animation — alive and active, like a heartbeat.

### Cards & Lists
- **Forbid Dividers:** Use `spacing-3` vertical gaps between items. The warm-dark surface provides enough visual separation without lines.
- **List Hover:** Rows gain `surface-container-low` background on hover — a single-step brightness increase.

## 6. Do's and Don'ts

### Do
- **Do** use the radial gradient spotlight on the page background: `radial-gradient(ellipse at 30% 20%, rgba(5, 150, 105, 0.08) 0%, transparent 60%)`. This creates a subtle "northern lights" ambient glow.
- **Do** use `on-surface-variant` (#8fa69e) for all secondary text — the green-tinted gray maintains palette harmony.
- **Do** use the emerald glow hover effect on all primary interactive elements — it's the system's signature.
- **Do** ensure touch targets of `spacing-10` (2.5rem) minimum.

### Don't
- **Don't** use pure white (#ffffff) for body text. Use `on-surface` (#e6ece9) — the green tint keeps everything in family.
- **Don't** use WhatsApp's exact green (#25D366). Our emerald (#059669) is more sophisticated and avoids copyright/brand association issues.
- **Don't** use the emerald glow on more than one element at a time in a view. It's a spotlight — if everything glows, nothing does.
- **Don't** mix blue tones into the dark surfaces. The entire dark palette must stay in the warm green-gray family (#111816 → #334340). Blue would break the WhatsApp-native feeling.
