# Wazelo Design System

Version 1.0 · 2026-10-04 · Source of truth for tokens: [design-tokens.json](design-tokens.json) · Visual reference: [design-preview.html](design-preview.html)

## 1. Design read

**Reading this as:** a redesign (preserve mode) of a dense, dark-first B2B operator console for sales and support agents who live in the Inbox all day. The language is quiet and utilitarian, built on Tailwind v4 CSS-variable tokens and the existing `components/ui` primitives.

| Dial | Value | Why |
|---|---|---|
| DESIGN_VARIANCE | 3 | Repeated daily workflows. Predictable grids beat asymmetry. |
| MOTION_INTENSITY | 3 | Hover/press feedback and panel transitions only. No ambient motion. |
| VISUAL_DENSITY | 7 | Agents scan conversation lists, tables and pipelines. 13px body, tight rows. |

**Guiding principles**

1. **The conversation is the product.** Chrome (sidebar, header, panels) recedes into tonal surfaces. Colour is spent on state: unread, assigned, failed, SLA risk.
2. **One accent, earned.** Amber comes from the logo. It marks the primary action, the active nav item and the agent's own messages. Nothing else is amber.
3. **Tone before shadow.** In dark UI, elevation is expressed by lighter surface steps plus a 1px hairline. Shadows are reserved for floating layers (popover, modal, toast).
4. **Tokens or nothing.** No `text-[13px]`, no `bg-[#1e3a5f]`, no `bg-gray-500` in feature code. If a value is missing, add a token.

## 2. Current state (audit, 2026-10-04)

Measured across `frontend/src/**/*.tsx`.

| Dimension | Score | Evidence |
|---|---|---|
| Color consistency | 5/10 | Token layer exists and is widely used, but 118 hex literals (19 files) and 210 raw Tailwind palette classes (28 files: gray 82, green 49, amber 45...). Worst: `app/(protected)/chatbot/[id]/page.tsx`, `settings/chat-widget/page.tsx`, `super-admin/plans/page.tsx` (59). |
| Typography hierarchy | 3/10 | 1,655 arbitrary `text-[Npx]` classes across 152 files, 14 distinct sizes (9 to 28px). 139 uses of 9px/10px, below comfortable reading size. |
| Spacing rhythm | 6/10 | Tailwind 4px scale is respected; no semantic page/card padding, so cards range from `p-4` to `p-8`. |
| Component consistency | 4/10 | ~370 raw `<button>` elements vs the `Button` primitive. Radius: `lg` 366, `xl` 292, `2xl` 88, bare `rounded` 106, `md` 24. Buttons are `xl`, inputs `xl`, cards `2xl` with no documented rule. |
| Dark mode | 7/10 | Complete via CSS variables and `data-theme` (two dark themes, FOUC-safe script). No light theme. `surface-container-highest` is used in `chat/message-bubble.tsx:123` but never defined. |
| Animation | 5/10 | Global `* { transition }` in `app/globals.css:116` animates every element on every colour change. Glow hover on primary button. |
| Accessibility | 3/10 | **Zero `focus-visible` styles** in the codebase; `ui/button.tsx` has no focus ring. Input placeholder at 50% opacity fails AA. `on-surface-variant` on `surface-container-high` is 4.4:1 (fails AA for small text). |
| Information density | 7/10 | Appropriate for the domain. |
| Responsive / Polish | not audited | Requires a running app; see section 11. |

**AI-slop check**

| Tell | Where | Verdict |
|---|---|---|
| Gradient primary button + outer glow on hover | `ui/button.tsx:16` | Remove. Solid fill, no glow. |
| Gradient outgoing bubble | `chat/message-bubble.tsx:246` | Replace with tinted solid (see 6.6). |
| `backdrop-blur-sm` on 14 overlays | modals | Keep only on the modal scrim; remove from panels. |
| Hand-picked hex avatar palette incl. indigo/violet | `ui/avatar.tsx:21` | Keep the idea, move to `identity` tokens (6.9). |
| Inter as default sans | `app/layout.tsx:8` | **Accepted.** Inter's tabular figures and x-height suit a 13px data-dense UI. Override documented. |

## 3. Color

### 3.1 Architecture

Three layers, all in `app/globals.css`:

1. **Theme values** under `[data-theme="..."]` (raw hex per theme).
2. **Semantic CSS variables** (`--surface`, `--on-surface`, `--primary`...). Feature code never sees raw hex.
3. **Tailwind bridge** in `@theme inline` (`--color-surface: var(--surface)`), giving `bg-surface`, `text-on-surface`, etc.

Theme switching flips one attribute and repaints via CSS variables. No React re-render, no `dark:` variants. Keep it this way.

Naming follows the Material 3 role model already in use: `X` is a fill, `on-X` is content placed on that fill, `X-container` is a quieter tinted fill.

### 3.2 Roles (Midnight Ember, default)

| Token | Value | Use |
|---|---|---|
| `primary` | `#d97706` | Primary button fill, active nav indicator, focus ring |
| `primary-container` | `#f59e0b` | Brand text on dark (higher contrast), links, progress fills |
| `on-primary` | `#1a1d27` | Text/icons on `primary` (5.3:1) |
| `surface` | `#0f1117` | App background, message thread background |
| `surface-container-lowest` | `#1e2130` | Sidebar, cards, panels (level 1) |
| `surface-container-low` | `#252838` | Inputs, row hover (level 2) |
| `surface-container` | `#2d3044` | Selected row, incoming bubble, popover (level 3) |
| `surface-container-high` | `#363a50` | Pressed, nested chip (level 4) |
| `surface-container-highest` | `#40445c` | **New.** Hover on level 4, tooltips |
| `on-surface` | `#e8eaed` | Primary text |
| `on-surface-variant` | `#a3aabb` | **Adjusted** from `#9ca3b4`. Secondary text. Now ≥4.5:1 on every surface step up to `high` |
| `placeholder` | `#8a91a5` | **New.** Input placeholder (4.6:1 on input). Replaces `on-surface-variant/50` |
| `outline-variant` | `#3d4258` | Hairline dividers, card borders (decorative) |
| `outline` | `#6e7594` | **New.** Input borders, checkbox borders (3.2:1 on the input fill, meets UI-component 3:1) |
| `success` / `success-container` | `#34d399` / `#1a3a2a` | Delivered, converted, connected |
| `warning` / `warning-container` | `#facc15` / `#3a3010` | **Shifted** from `#fbbf24` to yellow so it no longer collides with amber `primary` |
| `error` / `error-container` | `#f87171` / `#451a1a` | Failed send, validation, destructive |
| `on-error` | `#1a1d27` | **New.** Text on solid `error` fill |
| `info` / `info-container` | `#60a5fa` / `#172a45` | **New** (replaces `bg-[#1e3a5f] text-[#60a5fa]` in `ui/badge.tsx:24`) |
| `scrim` | `rgb(5 6 10 / 0.6)` | **New.** Modal backdrop (replaces `bg-black/40`, `/50`, `/70`) |
| `bubble-out` / `on-bubble-out` | `#4a3413` / `#f3ede2` | **New.** Agent's own messages |
| `focus` | `#f59e0b` | **New.** Focus ring colour |

Emerald Night and the light Daylight theme define the same roles; values are in `design-tokens.json`.

**Emerald Night fix:** its shipped `primary` `#059669` with white `on-primary` is 3.77:1 and fails AA on every primary button today. The token set darkens it to `#047857` (5.48:1) and keeps `#10b981` as `primary-container`.

### 3.2a Ember Glass (opt-in "Glass" theme)

Source: Stitch project "Wazelo — Ember Glass Theme" (2026-10-07). Dark glassmorphism with a single amber accent.

- **Canvas, not a flat page.** `.app-canvas` (app shell + reload skeleton) paints `#0b0c10` with fixed amber radial glows. Glass only reads as glass over something warm; never put it over a flat opaque fill.
- **Three glass levels.** Level 1 cards = `bg-surface-container-lowest` (72% fill + hairline + specular edge, no blur: the canvas is smooth, so blur would cost GPU for nothing). Level 2 = `[role="dialog"]`, the floating rail and the header (denser fill + 20px blur). Floating layers (menus, listboxes, tooltips: any `absolute`/`fixed` element on a `surface-container*` fill) get a 94% fill so text over content stays readable.
- **Nested surfaces are white overlays** (`surface-container-low` = 4.5% white …), so a tile inside a card is lighter, never a second dark slab.
- **Floating rail.** On desktop the sidebar floats in every theme (inset 12px, 24px radius, `outline-variant` border, active item = rounded pill; collapsed rail = 52px pill inside the 76px `--sidebar-collapsed` column). Glass adds blur, a specular edge and an orange glowing icon circle on the active item.
- **Keep dense lists off glass.** Inbox lists, tables and pipeline boards stay on their normal fills; glass is for the frame and top-level cards.
- **Contrast.** Body text sits on ≥ 72% fills; check new surfaces with the same AA rule as other themes.

### 3.3 Rules

- **Accent lock.** Amber (`primary*`) appears only on: primary button, active nav item and its indicator, links, focus ring, unread count badge, own-message bubble tint, progress fills. Not on headings, not on decorative icons, not on card borders.
- **Status colours are for status.** `success/warning/error/info` only when the UI is reporting a state. Each status badge also carries a label or icon so meaning never depends on hue alone (Emerald Night's `primary` and `success` share a hue family).
- **No raw palette.** `bg-gray-*`, `text-green-*`, `bg-[#...]` are banned in `src/` with three exceptions: third-party brand marks (`channel` tokens), chart series (`chart` tokens), avatar identity (`identity` tokens). All three are tokenized too.
- **No pure black or white.** Off-black `surface`, off-white `on-surface`.
- **Opacity modifiers** (`bg-primary/10`) are allowed for tinted hover/active states on `primary`, `error`, `success`; never to fake text hierarchy (use `on-surface-variant`).

### 3.4 Lead and pipeline status mapping

| Status | Badge variant |
|---|---|
| New | `info` |
| Contacted | `primary` |
| Interested | `warning` |
| Converted | `success` |
| Closed | `muted` |

Already implemented in `components/contacts/lead-status-badge.tsx`. All other status badges (campaign, automation, scheduler, channel) must map to these same variants plus `error`; do not invent new status colours per feature.

## 4. Typography

**Family:** Inter (via `next/font`), tabular numerals for all numbers in tables, KPIs and timestamps (`tabular-nums`). Mono: system stack for IDs, API keys, phone numbers, webhook URLs.

**Fix:** `@theme` currently hard-codes `"Inter"` while `next/font` exposes `--font-inter`. Point `--font-sans` at `var(--font-inter)` so the self-hosted, size-adjusted font is reliably used.

### 4.1 Scale

| Token | Size / line | Weight | Use | Replaces |
|---|---|---|---|---|
| `text-caption` | 11 / 16 | 500 | Timestamps, meta, badges, counters | 9px, 10px, 11px |
| `text-label` | 12 / 16 | 500 | Form labels, table headers, nav group titles | 12px |
| `text-body` | 13 / 20 | 400 | **Default UI text**: lists, table cells, nav, sm buttons | 13px |
| `text-body-lg` | 14 / 22 | 400 | Inputs, message text, descriptions, md/lg buttons | 14px, 15px |
| `text-title-sm` | 16 / 24 | 600 | Panel and card titles, drawer headers | 16px, 17px |
| `text-title` | 18 / 26 | 600 | Modal titles, section titles | 18px, 20px |
| `text-headline` | 22 / 28 | 600, -0.01em | Page titles | 22px |
| `text-display` | 28 / 34 | 600, -0.02em | KPI values, auth headings | 26px, 28px |

**Weights:** 400, 500, 600 only. `font-bold` (76 uses) maps to 600; `font-extrabold` (5) is removed. Hierarchy comes from size and colour (`on-surface` vs `on-surface-variant`), not weight inflation.

**No uppercase micro-labels by default.** Table headers and nav group titles use sentence case `text-label text-on-surface-variant`.

## 5. Space, shape, elevation, layers

### 5.1 Spacing

Tailwind's 4px scale stays. Semantic spacing for consistency:

| Token | Value | Use |
|---|---|---|
| `page` | 24px (`p-6`) | Page content padding (16px below `md`) |
| `section` | 32px (`gap-8`) | Between page sections |
| `card` | 20px (`p-5`) | Card and panel padding (auth card keeps 32px) |
| `row-y` / `row-x` | 10px / 12px | List and table rows |
| `stack-sm/md/lg` | 8 / 12 / 16px | Vertical rhythm inside forms and panels |

Form field block: label, 8px, control, 6px, helper/error. Label always above the control; never placeholder-as-label.

### 5.2 Radius (shape lock)

One documented rule, mapped to Tailwind defaults so no config change is needed:

| Element | Radius | Class |
|---|---|---|
| Checkbox, kbd, tiny chips | 4px | `rounded` |
| **Controls**: button, input, select, nav item, tab, row hover | 8px | `rounded-lg` |
| **Containers**: card, panel, dropdown, popover, table wrapper | 12px | `rounded-xl` |
| **Overlays and bubbles**: modal, drawer edge, message bubble | 16px | `rounded-2xl` |
| Badge, avatar, count, toggle | full | `rounded-full` |

`rounded-md`, `rounded-sm`, `rounded-3xl` are retired.

### 5.3 Elevation

| Level | Surface | Border | Shadow | Examples |
|---|---|---|---|---|
| 0 | `surface` | none | none | Page, thread |
| 1 | `surface-container-lowest` | `outline-variant` hairline | none | Sidebar, cards, panels |
| 2 | `surface-container-low` | none | none | Inputs, hovered row |
| 3 | `surface-container` | `outline-variant` | `shadow-popover` | Dropdown, popover, command palette |
| 4 | `surface-container-lowest` | `outline-variant` | `shadow-modal` | Modal, drawer |

No card inside a card. Group inside a card with `divide-y divide-outline-variant` or spacing.

### 5.4 Z-index scale

| Layer | z | Replaces |
|---|---|---|
| raised (sticky table header) | 10 | |
| header | 20 | |
| sidebar | 30 | |
| dropdown / popover | 40 | |
| modal / drawer / command palette | 50 | |
| toast | 60 | `z-[100]`, `z-[9999]` |

### 5.5 Layout

App shell (Lavish-style, Wazelo tokens): sidebar 256px; pinned icon rail 72px that peeks open over the content on hover or keyboard focus (pin state persisted); off-canvas drawer with scrim below `lg`, closed by Escape, scrim click or navigation. Header 64px, sticky and translucent (`bg-surface/60` + `backdrop-blur-md`), turning solid with a hairline once content scrolls under it (IntersectionObserver sentinel in `app-shell.tsx`, no scroll listener). Header holds: drawer/rail toggle, page title, search pill (opens ⌘K palette), AI-credit pill, 40px round notification and account buttons. Inbox is a three-pane layout: conversation list 320px, thread fluid, contact panel 320px; contact panel collapses below `xl`, list becomes a full-screen view below `md`. Use `min-h-dvh`, never `h-screen`.

## 6. Components

All primitives live in `components/ui/`. Feature code composes them; it does not restyle them with one-off class strings.

### 6.1 Button

| Size | Height | Padding | Text |
|---|---|---|---|
| sm | 32px | 12px | `text-body` |
| md (default) | 36px | 16px | `text-body-lg` |
| lg | 44px | 20px | `text-body-lg` (auth, empty-state CTA) |

| Variant | Rest | Hover | Notes |
|---|---|---|---|
| primary | `bg-primary text-on-primary` | `bg-primary-container` | **No gradient, no glow** |
| secondary | `border-outline-variant text-on-surface` | `bg-surface-container-low` | Text is neutral, not amber |
| ghost | `text-on-surface-variant` | `bg-surface-container-low text-on-surface` | Icon buttons are square (`size-9`) ghost |
| destructive | `bg-error text-on-error` | `bg-error/90` | |
| link | `text-primary-container` | underline | |

**IconButton** (`ui/icon-button.tsx`): icon-only actions. `aria-label` is a required prop. Sizes `xs` 24px (inside chips, inputs, dense rows), `sm` 32px (toolbars), `md` 36px (default). Variants `ghost` (default), `primary`, `danger` (red on hover, for delete/remove).

All variants: `rounded-lg`, `active:scale-[0.98]`, `focus-visible:ring-2 ring-focus ring-offset-2 ring-offset-surface`, disabled at 50% opacity. Labels max three words, never wrap.

### 6.2 Input, select, textarea

Height 40px, `rounded-lg`, `bg-surface-container-low`, 1px `outline-variant` border (becomes `outline` on hover), `text-body-lg`, placeholder `text-placeholder`. Focus: border `primary` plus `ring-2 ring-primary/30`. Error: border `error`, message below in `text-caption text-error` with `role="alert"` (already done in `ui/input.tsx`).

### 6.3 Badge

`rounded-full px-2 py-0.5 text-caption`, `bg-{status}-container text-{status}`. Variants: default, primary, success, warning, error, info, muted. `CountBadge`: `bg-primary text-on-primary`, min 18px, `tabular-nums`.

### 6.4 Card / panel

`rounded-xl bg-surface-container-lowest p-5`. **Borderless, no shadow**: tone contrast against `surface` separates it. Title `text-title-sm font-semibold`, description `text-body text-on-surface-variant`. KPI tile (`components/dashboard/stat-tile.tsx`): label `text-label`, value `text-display tabular-nums`, 40px round icon chip tinted with a categorical colour at 15%, detail line in `muted`/`success`/`error`. Inside another card use `variant="inset"` (`bg-surface-container-low`, smaller value) instead of nesting cards.

### 6.5 Navigation item

Row 48px, `text-body`, icon 18px inside a 36px tile (`rounded-[10px]`, `bg-surface-container-low`). The list has 10px left padding and no right padding so rows reach the sidebar edge. **Active:** row painted `bg-surface` (the page colour) with `rounded-l-2xl`, tile `bg-primary text-on-primary`; `.side-tab` pseudo-elements in `globals.css` draw inverted corners so the row reads as a tab fused into the page. **Hover:** `bg-surface-container-low` with `rounded-r-full`. Group titles `text-label text-on-surface-variant`, sentence case, hidden in the rail. The nav scroll area hides its scrollbar (`.side-scroll`) so nothing sits between the tab and the page.

### 6.6 Inbox

**Conversation item:** 64px row, avatar 36px, name `text-body font-medium`, preview `text-body text-on-surface-variant` single line truncated, time `text-caption tabular-nums`. Unread: name and preview switch to `on-surface`, `CountBadge` at right. Selected: `bg-surface-container`. Hover: `bg-surface-container-low`.

**Message bubble:** `rounded-2xl px-3.5 py-2`, max width 70% (85% below `md`), text `text-body-lg`, meta (time, ticks) `text-caption`.

| | Fill | Text |
|---|---|---|
| Incoming | `surface-container` | `on-surface` |
| Outgoing | `bubble-out` | `on-bubble-out` |
| Internal note | `warning-container` | `on-surface`, dashed `warning` border |
| Failed | outgoing fill + `error` border and retry action | |

The outgoing bubble changes from a full amber gradient to an amber-tinted dark fill (9.7:1 contrast). It stays recognisably "mine" without making a long thread glare. Spacing: 4px between consecutive messages from the same sender, 12px between sender changes, date separator as a centred `text-caption` chip.

**Composer:** `bg-surface-container-lowest` bar with top hairline, textarea auto-grows to 6 lines, send is a primary icon button.

### 6.7 Table

Wrapper `rounded-xl border border-outline-variant`. Header row `bg-surface-container-lowest text-label text-on-surface-variant`, sticky (`z-10`). Rows 44px, `text-body`, `divide-y divide-outline-variant`, hover `bg-surface-container-low`. Numbers right-aligned, `tabular-nums`. No border on every cell.

### 6.8 Overlays

- **Modal:** scrim `bg-scrim` (blur allowed here only), panel `rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-modal`. Widths: sm 400, md 560, lg 720. Header `text-title`, footer actions right-aligned (secondary then primary). Focus trapped, `Esc` closes.
- **Drawer:** right edge, 480px, same surface.
- **Popover/dropdown:** `rounded-xl bg-surface-container shadow-popover`, items 32px `rounded-lg`.
- **Toast:** sonner, bottom-right, `text-body`, `z-60`.

### 6.9 Avatars and identity colours

Initials avatars draw from eight `identity` tokens, chosen by a stable hash of the contact ID. They are desaturated so a list of avatars does not compete with the amber accent. Text on identity fills is `#0f1117`.

### 6.10 States

- **Loading:** skeleton blocks shaped like the final content (`bg-surface-container animate-pulse rounded-lg`). The `Spinner` is for in-button and inline refresh only.
- **Empty:** `ui/empty-state.tsx` with icon, one-line title, one-line hint, one primary CTA.
- **Error:** inline in forms; `Alert` for section-level failures; toast only for transient outcomes.

### 6.11 Icons

Keep `lucide-react` (existing dependency; Next.js optimizes its imports). Sizes: 16px in controls and badges, 18px in nav, 20px in empty states. Stroke width 1.75 globally. One icon family only.

## 7. Motion

| Token | Value | Use |
|---|---|---|
| `duration-fast` | 120ms | Hover, press, colour changes |
| `duration-base` | 180ms | Dropdowns, tabs, sidebar collapse |
| `duration-slow` | 240ms | Modals, drawers |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Enter and move |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Exit |

Rules:

- **Remove** the global `* { transition: ... }` (`globals.css:116`). It attaches transitions to every node, which costs style recalculation in long lists and makes theme switches drag. Scope transitions to interactive primitives (`transition-colors duration-fast`).
- Animate `transform` and `opacity` only. Sidebar width transition is the one exception (already scoped).
- New-message arrival: 120ms fade plus 4px rise. No bouncing, no infinite loops except the typing indicator.
- Everything respects `prefers-reduced-motion: reduce` (disable transforms, keep instant state changes).

## 8. Accessibility baseline

- **Focus:** every interactive element gets `focus-visible:ring-2 ring-focus ring-offset-2 ring-offset-surface`. Add a base rule in `globals.css` so raw `<button>`/`<a>` are covered while they are migrated.
- **Contrast:** body text ≥4.5:1 on every surface step it can appear on; UI component borders ≥3:1 (`outline`). Role pairs are checked live in the preview's contrast table.
- **Targets:** 32px minimum (sm button), 36px default, icon buttons 36px.
- **Status** is never colour-only: badge text or icon always accompanies it.
- **Forms:** label above, `aria-invalid`, `aria-describedby` for errors (already in `ui/input.tsx`).

## 9. Themes

| Theme | Status | Character |
|---|---|---|
| Midnight Ember | default, shipped | Cool charcoal + amber. Matches the logo. |
| Emerald Night | shipped | Green-black + emerald. WhatsApp-adjacent. |
| Daylight | shipped | Light. Lavish-style layering: blue-grey page `#eef1f6`, white cards, darker sidebar `#e3e8ef`, deep amber `#b45309` accent. Default for first visits when the OS prefers light. |

**Cascade order matters:** `:root` and `[data-theme="..."]` have the same specificity, so the default block is written as `:root, [data-theme="midnight-ember"]` and must come *before* the other themes. Until 2026-10-04 a trailing `:root` block silently overrode every theme, so Emerald Night never applied.

All three implement the identical role list plus `--sidebar` (sidebar surface; equals `surface-container-lowest` in the dark themes) and per-theme `--chart-1..6`. Users switch themes under **Account menu → Appearance** (`ui/theme-toggle.tsx`, a radio group); the choice persists in `crm-theme`. The pre-paint script in `providers/theme-provider.tsx` applies the stored theme, or the OS preference on first visit, before first paint. Each theme sets `color-scheme` so native scrollbars and form controls match.

## 10. Implementation snippet (`app/globals.css`)

```css
@theme inline {
  /* existing --color-* bridge stays, plus: */
  --color-surface-container-highest: var(--surface-container-highest);
  --color-outline: var(--outline);
  --color-placeholder: var(--placeholder);
  --color-info: var(--info);
  --color-info-container: var(--info-container);
  --color-on-error: var(--on-error);
  --color-scrim: var(--scrim);
  --color-bubble-out: var(--bubble-out);
  --color-on-bubble-out: var(--on-bubble-out);
  --color-focus: var(--focus);

  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace;

  --text-caption: 0.6875rem;  --text-caption--line-height: 1rem;
  --text-label: 0.75rem;      --text-label--line-height: 1rem;
  --text-body: 0.8125rem;     --text-body--line-height: 1.25rem;
  --text-body-lg: 0.875rem;   --text-body-lg--line-height: 1.375rem;
  --text-title-sm: 1rem;      --text-title-sm--line-height: 1.5rem;
  --text-title: 1.125rem;     --text-title--line-height: 1.625rem;
  --text-headline: 1.375rem;  --text-headline--line-height: 1.75rem;  --text-headline--letter-spacing: -0.01em;
  --text-display: 1.75rem;    --text-display--line-height: 2.125rem;  --text-display--letter-spacing: -0.02em;

  --shadow-popover: 0 8px 24px -6px var(--shadow-color), 0 0 0 1px var(--outline-variant);
  --shadow-modal: 0 24px 64px -12px var(--shadow-color), 0 0 0 1px var(--outline-variant);

  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
}

/* replaces the global * { transition } */
:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 11. Migration plan

Ordered by value per unit of risk. Each step ships on its own.

**Status (2026-10-04):** steps 1 to 7 done. Step 6 migrated 149 action buttons (19 primary, 11 secondary to `Button`; 119 icon-only to `IconButton`) and gave every remaining icon-only button and toggle switch an accessible name (`aria-label`, plus `role="switch"` / `aria-checked` on switches). About 200 raw `<button>`s remain on purpose: tabs, chips, list rows, cards and buttons with dynamic class names. `npm run lint:tokens` enforces zero arbitrary font sizes, zero default Tailwind sizes and zero raw palette classes in `src/`.

Documented exceptions (allowed hex or palette values):

| Where | Why |
|---|---|
| `app/csat/[conversationId]` | Public customer survey, standalone light page (excluded from the guardrail; rebrand is a product decision) |
| `billing/invoice-detail-modal.tsx` | Printable invoice rendered to PDF (excluded) |
| `app/auth/layout.tsx` inline styles | Brand hero panel in fixed logo amber, independent of theme |
| `chat/conversation-labels.tsx`, `products/category-form-modal.tsx` | User-selectable colours stored as data |
| `chatbot/[id]`, `automation/[id]` node colours | Categorical node types (more categories than the 6 chart tokens) |
| `settings/chat-widget` | Preview of the customer's external widget |
| `contacts/contact-notes.tsx` `#96bf48`, channel icons | Third-party brand marks (Shopify, WhatsApp, Facebook, Instagram) |
| Razorpay `theme.color` | External checkout needs a hex; set to brand `#d97706` |

Adding a new `--text-*`, `--shadow-*` or `--ease-*` token also requires registering it in `src/lib/utils.ts` (`extendTailwindMerge`), otherwise `cn()` treats `text-body` as a colour and silently drops it when a `text-on-*` class follows.

1. **Tokens in `globals.css`:** add the new roles to all theme blocks, adjust `on-surface-variant` and `warning`, add the snippet above, remove `* { transition }`.
2. **Primitives:** `ui/button.tsx` (solid, sizes 32/36/44, focus ring), `ui/input.tsx` (border, placeholder token), `ui/badge.tsx` (info token), `ui/card.tsx` (p-5, hairline, no shadow), `ui/avatar.tsx` (identity tokens).
3. **Inbox:** `chat/message-bubble.tsx` (bubble tokens, fixes undefined `-highest`), `chat/conversation-item.tsx`, `chat/chat-input.tsx`.
4. **Typography codemod:** `text-[9px|10px|11px]` to `text-caption`, `text-[12px]` to `text-label`, `text-[13px]` to `text-body`, `text-[14px|15px]` to `text-body-lg`, `text-[16px|17px]` to `text-title-sm`, `text-[18px|20px]` to `text-title`, `text-[22px]` to `text-headline`, `text-[26px|28px]` to `text-display`. Review visually per route.
5. **Colour cleanup:** heaviest files first: `super-admin/plans`, `chatbot/[id]`, `settings/chat-widget`, `settings/page.tsx`, `csat/[conversationId]`.
6. **Buttons:** migrate raw `<button>` in modals and settings to `Button`; icon-only buttons to a new `IconButton` primitive.
7. **Guardrail:** a CI grep (or ESLint `no-restricted-syntax`) failing on `text-\[\d+px\]`, `#[0-9a-fA-F]{6}` and raw palette classes in `src/` outside documented exceptions.

## 12. Verification

- Open `design-preview.html`, switch all three themes, confirm every row in the contrast table passes.
- After steps 1 to 3: `npm run build`, then walk Login, Inbox, Contacts, Campaigns, Settings in both shipped themes; tab through each page and confirm a visible focus ring on every control.
- Re-run the counts in section 2. Targets after step 5: zero arbitrary font sizes, zero hex outside token files and brand marks.
