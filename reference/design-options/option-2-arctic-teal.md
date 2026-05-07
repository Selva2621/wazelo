# Design System Strategy: Arctic Teal

## 1. Overview & Creative North Star
The creative north star for this design system is **"The Nordic Studio."**

Inspired by Scandinavian design principles — function-first beauty, natural materials, restrained color — this system uses a teal primary against a cool, almost icy neutral canvas. Where most CRM tools drown in blue, we distinguish ourselves with the green-blue sophistication of teal: a color that communicates trust, clarity, and forward-thinking.

The login experience should feel like entering a well-lit architect's studio in Copenhagen — everything has a reason, every surface is intentional, and the space itself is the design. We use generous white space, ultra-clean lines, and a single bold accent color that says "we are not another blue SaaS tool."

## 2. Colors & Surface Philosophy
Our palette is anchored by a rich teal primary, supported by cool gray-blue neutrals that feel crisp without being clinical.

### The "No-Line" Rule
Standard UI relies on `1px` borders to separate ideas. This design system prohibits them for sectioning. Boundaries are defined through **temperature shifts** in background color.
- To separate a header from a body, transition from `surface` (#f5f7f8) to `surface-container-low` (#eef1f3).
- The cool undertone creates a "frosted" layering effect — like stacked panes of frosted glass.

### Surface Hierarchy & Nesting
Treat the UI as layers of Nordic birch plywood — light, warm-cool, and naturally layered.
- **Base Layer:** `surface` (#f5f7f8) — a cool off-white with the slightest blue-green tint.
- **The Container:** The login card uses `surface-container-lowest` (#ffffff) — pure white, the crispest layer.
- **Interactive Elements:** Inputs use `surface-container` (#e8ecef) — recessed, like an inset on a wooden panel.

### The "Teal Signal" Rule
Teal is used to signal action and focus — it is the only color with chromaticity in most views.
- **Primary CTAs:** Use a linear gradient from `primary` (#0d9488) to `primary-container` (#14b8a6). Direction: 180deg (top-to-bottom) for a calm, grounding energy.
- **Focus Rings:** `primary` at 30% opacity, 2px offset. The teal ring on focused inputs is a "calm highlight" — noticeable but not aggressive.
- **Floating Elements:** Glassmorphism with `surface-container-lowest` at 85% opacity, `backdrop-blur` of 8px.

### Color Tokens
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | #0d9488 | Buttons, links, active states |
| `primary-container` | #14b8a6 | Gradient endpoint, badges |
| `on-primary` | #ffffff | Text on teal buttons |
| `surface` | #f5f7f8 | Page background |
| `surface-container-lowest` | #ffffff | Card backgrounds |
| `surface-container-low` | #eef1f3 | Input backgrounds, sections |
| `surface-container` | #e8ecef | Hover states, recessed areas |
| `surface-container-high` | #dfe3e7 | Borders (when necessary) |
| `on-surface` | #1a2332 | Primary text |
| `on-surface-variant` | #5b6b7a | Secondary text, labels |
| `outline-variant` | #c1cad3 | Ghost borders (20% opacity) |
| `error` | #dc2626 | Error text |
| `error-container` | #fef2f2 | Error input background |
| `success` | #059669 | Success indicators |
| `success-container` | #ecfdf5 | Success backgrounds |
| `warning` | #d97706 | Warning indicators |
| `warning-container` | #fffbeb | Warning backgrounds |

## 3. Typography
We utilize **Inter** leaning into its geometric neutrality — letting the teal accent and generous spacing do the personality work.

- **Display & Headline:** `headline-md` (26px, Semi-Bold 600) in `on-surface` (#1a2332). The "Welcome back" greeting should feel like a concise, warm nod — not a billboard.
- **Title & Body:** `title-sm` (13px, Medium 500, uppercase, `letter-spacing: 0.08em`) in `on-surface-variant` for field labels. The uppercase + wide tracking creates a "architectural label" aesthetic. `body-md` (15px, Regular 400) in `on-surface` for input text.
- **The Hierarchy Strategy:** We create hierarchy through **case and tracking**, not just size. Labels in uppercase 13px feel structurally distinct from body text in sentence case 15px, even though the size difference is only 2px.
- **Line Height:** Body text uses `1.65` — the extra leading creates the "breathing" Scandinavian feel.

## 4. Elevation & Depth
We use **Arctic Light** — the soft, diffused luminance of a Nordic winter.

- **The Layering Principle:** The white card on a cool gray background creates natural depth without shadows. The eye reads the temperature shift as elevation.
- **Ambient Shadows:** For the login card:
  - `box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03), 0 8px 32px -4px rgba(13, 148, 136, 0.06);`
  - A near-invisible structural shadow plus a tinted "ambient glow" that subtly references the primary color. This makes the card feel like it's floating on teal-tinted light.
- **The "Ghost Border" Fallback:** Use `outline-variant` (#c1cad3) at 15% opacity — even less visible than standard, because the surface color shifts do most of the work.

## 5. Components

### Buttons
- **Primary:** Teal gradient (180deg, `primary` to `primary-container`). `10px` rounded corners — slightly softer than the reference to match the Nordic softness. `on-primary` (#ffffff) text in `label-md` (14px, Medium 500, sentence case).
- **Secondary:** Transparent background, `1px` border of `outline-variant` at 25% opacity. Text in `primary`. On hover, background fills to `surface-container-low`.

### Input Fields
- **Default State:** `surface-container-low` (#eef1f3) background. `12px` corner radius. No visible border.
- **Focus State:** Background transitions to `surface-container-lowest` (#ffffff). A `2px` ring of `primary` at 30% opacity. The teal glow is calm, not electric.
- **Validation:** Error inputs use `error-container` (#fef2f2) background. The pink-red tint is immediately distinct from the cool gray palette, providing instant peripheral recognition.

### Chips (WhatsApp Specific)
- **Status Chips:** Use `primary-container` (#14b8a6) at 15% opacity as background with `primary` text. Full rounded corners (9999px). The diluted teal creates a "tag" look without visual weight.

### Cards & Lists
- **Forbid Dividers:** Use `spacing-3` (0.75rem) vertical gaps between list items. Background alternation between `surface-container-lowest` and `surface-container-low` for subtle zebra effect.

## 6. Do's and Don'ts

### Do
- **Do** use `spacing-10` to `spacing-14` between the logo and form — the Nordic aesthetic demands generous vertical rhythm.
- **Do** use `on-surface-variant` (#5b6b7a) for all secondary text. It should feel like pencil notes on an architect's blueprint.
- **Do** use uppercase + wide tracking for all labels and category headers — it creates the "designed" look.
- **Do** ensure interactive elements have `spacing-11` (2.75rem) minimum height — slightly taller than standard for a relaxed, confident feel.

### Don't
- **Don't** use pure black (#000000). Use `on-surface` (#1a2332) — a dark blue-gray that feels sophisticated.
- **Don't** use `DEFAULT` (0.5rem) radius for the login card. Use `xl` (1.5rem) or `2xl` (2rem) for that soft, modern container feel.
- **Don't** mix teal with other chromatic colors in the same view. Teal is the solo performer — let it own the stage.
- **Don't** add teal to backgrounds. It's an accent and action color only. Surfaces stay neutral.
