# Design System Strategy: Indigo Luxe

## 1. Overview & Creative North Star
The creative north star for this design system is **"The Velvet Console."**

This system channels the rich depth of a late-night creative studio — where deep indigo meets soft lavender in a palette that feels inherently premium. Where generic SaaS tools use blue out of laziness, we use indigo out of intention. The difference is warmth: indigo carries a red undertone that makes it feel rich, almost tactile, like velvet.

The login experience should feel like opening a beautifully crafted notebook. The left half of the screen features a rich indigo brand panel with a subtle geometric pattern, while the right half presents the form on a warm off-white surface. This asymmetric split layout breaks the "centered card" convention and immediately signals that this is not a template.

## 2. Colors & Surface Philosophy
Our palette is built on deep indigo as the foundation, with a warm cream-white for content surfaces and rose-pink as a sophisticated accent.

### The "Split Canvas" Rule
Unlike centered-card layouts, this system uses a **split-screen architecture** for auth pages:
- **Left Panel:** `primary` (#4338ca) to `primary-dark` (#3730a3) gradient — the brand panel. Contains logo, tagline, and subtle geometric mesh.
- **Right Panel:** `surface` (#faf9f7) — a warm cream-white. Contains the actual form.
- This creates immediate visual interest and brand presence without relying on illustrations.

### Surface Hierarchy & Nesting
The right (form) side uses warm-toned layering.
- **Base Layer:** `surface` (#faf9f7) — warm cream-white, not sterile blue-white.
- **The Container:** Form area uses `surface-container-lowest` (#ffffff) if a card is needed, but the split layout often makes this unnecessary.
- **Interactive Elements:** Inputs use `surface-container-low` (#f3f1ee) — a warm recessed tone that matches the cream base.
- **Accent Surfaces:** Success and info panels use tinted versions of the primary — `primary-container` (#e8e3ff) — to maintain the indigo family.

### The "Warm + Cool" Tension
The visual interest comes from the tension between the cool indigo brand panel and the warm cream content surface:
- **Primary CTAs:** Solid `primary` (#4338ca) — no gradient needed when the button sits against the warm surface. The contrast is already striking.
- **Accent Links:** Use `accent` (#e11d48) — a deep rose that complements indigo. Used sparingly for "Forgot password?" and secondary actions.
- **Focus Rings:** `primary-container` (#7c6ef0) at 40% opacity — a softer indigo for focus states.

### Color Tokens
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | #4338ca | Buttons, brand panel, active states |
| `primary-dark` | #3730a3 | Brand panel gradient endpoint |
| `primary-container` | #7c6ef0 | Focus rings, badges, tinted backgrounds |
| `primary-surface` | #e8e3ff | Light indigo backgrounds |
| `on-primary` | #ffffff | Text on indigo buttons |
| `accent` | #e11d48 | Secondary links, attention markers |
| `surface` | #faf9f7 | Right panel / page background |
| `surface-container-lowest` | #ffffff | Card backgrounds |
| `surface-container-low` | #f3f1ee | Input backgrounds |
| `surface-container` | #ebe8e4 | Hover states |
| `on-surface` | #1c1917 | Primary text (warm black) |
| `on-surface-variant` | #78716c | Secondary text (warm gray) |
| `outline-variant` | #d6d3d1 | Ghost borders (20% opacity) |
| `error` | #dc2626 | Error text |
| `error-container` | #fef2f2 | Error backgrounds |
| `success` | #059669 | Success text |
| `success-container` | #ecfdf5 | Success backgrounds |

## 3. Typography
We utilize **Inter** but push the weight spectrum harder — using Light (300) for large display text and Medium (500) for body, creating a "editorial magazine" hierarchy.

- **Display & Headline:** `headline-lg` (32px, Light 300, `letter-spacing: -0.02em`) in `on-surface` for the "Welcome back" message. The light weight at large size creates an elegant, editorial feel.
- **Brand Panel:** `headline-md` (24px, Semi-Bold 600) in `on-primary` (#ffffff) for tagline text on the indigo panel.
- **Title & Body:** `title-sm` (13px, Semi-Bold 600, uppercase, `letter-spacing: 0.06em`) in `on-surface-variant` for labels. `body-md` (15px, Regular 400) in `on-surface` for input text.
- **The Hierarchy Strategy:** The contrast between Light 300 headlines and Semi-Bold 600 labels creates a "typographic polarity" — the headline floats while the labels anchor. This is the magazine editorial approach.

## 4. Elevation & Depth
In the split layout, depth is already established by the two-panel architecture. The form side needs minimal elevation treatment.

- **The Layering Principle:** The indigo left panel IS the elevation. It provides such strong visual weight that the right side feels naturally "in front" without needing shadows.
- **Ambient Shadows:** For any card elements on the form side:
  - `box-shadow: 0 4px 24px -4px rgba(67, 56, 202, 0.08);`
  - The shadow is tinted with the primary indigo — this ties the shadow to the brand panel, creating visual cohesion.
- **The Brand Panel Pattern:** Use a subtle CSS `radial-gradient` mesh overlay on the indigo panel:
  - `background: radial-gradient(circle at 20% 80%, rgba(124, 110, 240, 0.3) 0%, transparent 50%);`
  - This creates a "living" surface that feels like more than a flat color block.

## 5. Components

### Buttons
- **Primary:** Solid `primary` (#4338ca) background. `8px` rounded corners. `on-primary` text. On hover, shifts to `primary-dark` (#3730a3). The warmth of the cream surface makes the indigo button pop without needing a gradient.
- **Secondary:** Transparent background, `1px` border of `primary-container` (#7c6ef0) at 40%. Text in `primary`. On hover, fills with `primary-surface` (#e8e3ff).
- **Text/Link:** `accent` (#e11d48) for destructive or attention actions. `primary` for standard navigation.

### Input Fields
- **Default State:** `surface-container-low` (#f3f1ee) background. `12px` corner radius. The warm tone recedes into the cream surface.
- **Focus State:** Background brightens to `surface-container-lowest` (#ffffff). `2px` ring of `primary-container` (#7c6ef0) at 40%.
- **Validation:** Error inputs use `error-container` (#fef2f2) background with `error` text below. The red is distinct from the warm-neutral palette.

### Chips (WhatsApp Specific)
- **Status Chips:** `primary-surface` (#e8e3ff) background with `primary` text. Full rounded corners. The indigo tint keeps chips on-brand.

### Cards & Lists
- **Forbid Dividers:** Use `spacing-4` vertical gaps. Background alternation uses `surface` and `surface-container-low` for warmth-graded zebra striping.

## 6. Do's and Don'ts

### Do
- **Do** use the split layout (50/50 or 40/60) for all auth pages. The brand panel creates instant brand recognition.
- **Do** use the brand panel to show different messaging per page: "Welcome back" for login, "Start your journey" for register.
- **Do** use `on-surface-variant` (#78716c) for secondary text — the warm gray feels intentional against the cream surface.
- **Do** use the rose accent (`accent` #e11d48) very sparingly — only for 1-2 links per page.

### Don't
- **Don't** use the brand panel on non-auth pages. It's an auth-only dramatic element.
- **Don't** use cool grays (blue-tinted) for surfaces. The entire right panel must stay in the warm family (#faf9f7 → #f3f1ee → #ebe8e4).
- **Don't** use the rose accent for primary actions (buttons). It's a text-only accent.
- **Don't** add illustrations to the brand panel. The geometric mesh pattern and typography are enough. Illustrations would cheapen the editorial feel.
