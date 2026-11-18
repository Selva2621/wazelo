---
name: Wazelo
description: WhatsApp-first CRM for teams that share one business number
colors:
  primary: "#b45309"
  primary-container: "#92400e"
  on-primary: "#fffaf2"
  surface: "#eef1f6"
  surface-container-lowest: "#fdfdfe"
  surface-container-low: "#f5f7fa"
  surface-container: "#e9edf3"
  surface-container-high: "#e0e5ec"
  surface-container-highest: "#d6dce5"
  on-surface: "#1d2330"
  on-surface-variant: "#555e70"
  placeholder: "#646d7f"
  outline-variant: "#d9dfe8"
  outline: "#7f889b"
  sidebar-ink: "#15171c"
  sidebar-text: "#f2f3f5"
  sidebar-accent: "#f59e0b"
  bubble-out: "#fbe7c3"
  on-bubble-out: "#2b2006"
  focus: "#b45309"
  error: "#c81e1e"
  error-container: "#fdeaea"
  success: "#047857"
  success-container: "#dff3ea"
  warning: "#8a5a06"
  warning-container: "#fcf1cf"
  info: "#1d4ed8"
  info-container: "#e3ebfd"
typography:
  hero:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 1.2rem + 1.2vw, 2.375rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: "2.125rem"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.625rem"
  title-sm:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.5rem"
  body-lg:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.375rem"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
  caption:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: "1rem"
rounded:
  sm: "4px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  card: "20px"
  page: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.primary-container}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-container-low}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "36px"
  button-destructive:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "36px"
  input:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.surface-container-lowest}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.card}"
  badge-default:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-success:
    backgroundColor: "{colors.success-container}"
    textColor: "{colors.success}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  count-badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    height: "18px"
  bubble-outgoing:
    backgroundColor: "{colors.bubble-out}"
    textColor: "{colors.on-bubble-out}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.2xl}"
    padding: "8px 14px"
  bubble-incoming:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.2xl}"
    padding: "8px 14px"
  sidebar:
    backgroundColor: "{colors.sidebar-ink}"
    textColor: "{colors.sidebar-text}"
    width: "264px"
---

# Design System: Wazelo

<!-- Supersedes frontend/design-system/DESIGN.md (2026-10-04). That file keeps the original audit and migration log; this one is the current source of truth. Token values live in frontend/src/app/globals.css. -->

## Overview

**Creative North Star: "The Shared Counter"**

Wazelo is the counter a whole team works from: an agent, a rep and a manager all stand at it, serving the same customers from the same WhatsApp number. Like a good shop counter it is practical, legible and plain. Everything on it is a tool for a job, nothing is there for show, and the surface stays clear so the work (a conversation, a lead, a campaign result) is what you see. The conversation is the product; the chrome around it recedes.

The system is dense on purpose. Body text is 13px, buttons are 36px, and filters sit on one row, because people spend whole shifts in it and need to see a lot at once. Calm comes from restraint, not from empty space: neutral surfaces, one warm amber accent kept for the action or state that matters, a single level of cards, and shadows only on things that float. The one strong element is the dark sidebar, which looks the same in every theme. It's the counter's edge, and it never changes.

Components are refined and restrained. They sit flat with thin borders, give a small physical press on click (`scale(0.98)`), and get their life from motion rather than ornament. Each page assembles with a short rising stagger and the title letters settle into place, but nothing loops or demands attention once the page has loaded.

**Key Characteristics:**
- Dense, task-first layouts: 13px body and 36px controls.
- One warm amber accent on a neutral canvas.
- A dark sidebar panel in all four themes.
- One card level, tone and hairline before shadow.
- Entrance motion on a single emphasized curve; still at rest.
- Four equal themes: Light (default), Dark, Emerald, Glass.

## Colors

A cool, near-neutral field with a single warm amber voice. Status colours always come with a tinted container. The frontmatter holds the Light (`daylight`) values, which is the first-visit default. Every role is redefined per theme in `frontend/src/app/globals.css` under `[data-theme="…"]`: Light `daylight`, Dark `midnight-ember`, Emerald `emerald-night` and Glass `ember-glass`. All four are equal, and code uses the role token, never the hex.

Roles follow the Material 3 model: `X` is a fill, `on-X` is content on that fill, and `X-container` is a quieter tinted fill. Theme values flow through three layers: raw hex per theme → semantic CSS variable (`--surface`) → the Tailwind bridge in `@theme inline` (`bg-surface`). A theme switch flips one attribute on `<html>`. There are no `dark:` variants and no React re-render.

### Primary
- **Counter Amber** (`primary`): primary button fill, the active state of filters and tabs, count pills, the focus ring. In Light it's a deep burnt amber that passes contrast on white; Dark and Glass use a brighter amber (`#d97706`), and Emerald replaces it with green (`#047857`).
- **Deep Amber** (`primary-container`): hover for primary buttons, text on primary-tinted badges, links and progress fills.

### Neutral
- **Canvas** (`surface`): the page and message-thread background.
- **Paper** (`surface-container-lowest`): cards, tables, modals. The one raised level.
- **Mist ramp** (`surface-container-low` → `-highest`): inputs and hovered rows → selected row, incoming bubble and popovers → pressed and nested chips → tooltips.
- **Ink** (`on-surface`) and **Slate** (`on-surface-variant`): primary and secondary text. **Placeholder** is only for empty inputs.
- **Hairline** (`outline-variant`): card borders, dividers, table rules (decorative). **Outline**: input and checkbox borders on hover, at least 3:1 against the fill.
- **Counter Edge** (`--side-bg` `#15171c`, `--side-text`, `--side-accent`): the sidebar is dark in every theme, with a bright amber accent (emerald in Emerald, and translucent in Glass).

### Conversation
- **Sent Bubble** (`bubble-out` / `on-bubble-out`): the agent's own messages. It's a tinted solid, never a gradient: pale amber in Light and dark bronze in Dark. Incoming bubbles use `surface-container`.

### Status
- **Success / Warning / Error / Info** are each paired with a `-container` tint. Warning is a yellow rather than an amber, so it never reads as the primary accent. Lead status always maps the same way: New → `info`, Contacted → `primary`, Interested → `warning`, Converted → `success`, Closed → `muted` (`components/contacts/lead-status-badge.tsx`). Every other status badge (campaign, automation, scheduler, channel) reuses these variants plus `error`. Charts use `chart-1`…`chart-6`, set per theme.

### Named Rules
**The One Amber Rule.** Amber appears only on the primary button, the active nav row, links, the focus ring, unread and count badges, the sent-bubble tint and progress fills. Never on headings, decorative icons or card borders. If two things compete in amber on one screen, one of them is wrong.

**The Token-Only Rule.** No `bg-[#…]`, `text-[13px]` or `bg-gray-*` in feature code; if a value is missing, add a token. `npm run lint:tokens` enforces this. Documented exceptions: the public CSAT page, the printable invoice, the client-facing proposal document and its public page (`p/[token]`), the auth brand panel, user-picked label and category colours, chatbot and automation node categories, the chat-widget preview, third-party brand marks, initials-avatar colours, and the Razorpay checkout hex.

**The Status-Is-Status Rule.** Success, warning, error and info appear only when the UI is reporting a state, and always with a label or icon, so meaning never depends on hue alone.

**The Quiet Chip Rule.** The header status chip (AI credits, WhatsApp health) stays neutral until something needs attention.

## Typography

**Display Font:** Inter via `next/font` (`--font-inter`, with ui-sans-serif, system-ui)
**Body Font:** Inter
**Label/Mono Font:** ui-monospace, "SF Mono", "Cascadia Mono", Menlo, for IDs, API keys, phone numbers and webhook URLs

**Character:** One workhorse sans at compact sizes. Inter's tabular figures and tall x-height hold up at 13px in dense data. Hierarchy comes from size and from `on-surface` versus `on-surface-variant` colour, not from weight inflation or a second typeface.

### Hierarchy
- **Hero** (600, clamp 30–38px, 1.1, −0.025em): auth and onboarding headlines only.
- **Display** (600, 28px, 34px, −0.02em): KPI values and auth headings.
- **Headline** (600, 22px, 28px, −0.01em): the page title, rendered once by `PageHeader`.
- **Title** (600, 18px) / **Title-sm** (600, 16px): modal and section titles / card, panel and drawer titles.
- **Body-lg** (400, 14px, 22px): inputs, message text, descriptions, md/lg buttons.
- **Body** (400, 13px, 20px): the default for lists, table cells, nav and sm buttons.
- **Label** (500, 12px): form labels and table headers, sentence case.
- **Caption** (500, 11px): timestamps, meta, badges, counters, helper and error text. Nothing smaller than this for reading text.

**Size-only tokens.** These set font size and nothing else (no line height), so they swap 1:1 for a pixel value.
- `text-overline` (11px): the sidebar's uppercase section labels. `text-micro` (10px): numerals inside tiny step circles only.
- **Native mobile scale** (below 1024px, iOS and Material shell only): `native-badge` 10.5px, `native-caption2` 11px, `native-caption` 12px, `native-footnote` 13px, `native-subhead-sm` 14px, `native-subhead` 15px, `native-callout` 16px, `native-body` 17px, `native-title3` 19px, `native-title2` 22px. Use these in the mobile shell instead of `text-[Npx]`, and never use them on desktop.

### Named Rules
**The Three Weights Rule.** Use 400, 500 and 600 only.

**The One Title Rule.** Each page has exactly one `<h1>`, from `PageHeader`. The header bar repeats it only after it scrolls away.

**The Sentence Case Rule.** Labels, buttons, table headers and menu items use sentence case; the sidebar's section labels are the only uppercase. Button labels are at most three words and never wrap.

**The Tabular Rule.** Numbers in tables, KPIs and timestamps use `tabular-nums`, and counts and money are grouped `en-IN` (1,00,000).

## Layout

The desktop shell (≥1024px) has a fixed 264px dark sidebar that collapses to an 88px floating rail (the `[` key toggles it), a 64px sticky header bar, and a content column on the `surface` canvas. Page padding is 24px (16px below `md`), and sections are 16–32px apart. Each page follows the same order: a `PageHeader` row (title, muted count, actions with the primary button last), then one `FilterBar` row (tabs, chips and `FilterSelect` pills), then content in cards or a `DataTable`. Use `min-h-dvh`, never `h-screen`.

The inbox has three panes: the conversation list (320px), a fluid thread, and the contact panel (320px). The contact panel collapses below `xl`, and below `md` the list becomes a full-screen view.

Spacing is Tailwind's 4px grid. Controls are 8px apart, cards have 20px padding, list and table rows use 10px/12px padding, and forms stack at 8/12/16px. In a form field, the label sits above the control with 8px between them and 6px before helper or error text. Never use a placeholder as the label.

Below 1024px the app becomes an adaptive PWA shell and desktop is untouched. On Apple devices it uses iOS styling: a large title that collapses on scroll, and a tab bar of Home · Inbox · raised + · Contacts · More, where + opens the Apps sheet. Android gets Material 3: a top app bar, a pill nav indicator and no chevrons. `data-platform` on `<html>` switches between them. Filter bars scroll horizontally (`mobile-scroll-x`) and tables fall back to phone cards.

Layering order: sticky table header at z 10, header bar 20, sidebar 30, popover and dropdown 40, modal, drawer and command palette 50, toast 60.

### Named Rules
**The Desktop Is Frozen Rule.** Mobile work lives only under `max-lg:` / `lg:hidden` / `max-width: 1023.98px`. A mobile change that moves even one pixel at ≥1024px is a bug, and so is a mobile change that alters a flow, route or action.

**The One Row Rule.** All of a list's filters share one row. Never stack filter rows.

## Elevation & Depth

The system is flat with tonal layering. Depth is the surface ramp (canvas → paper → mist) plus a 1px hairline, not shadow. Shadows appear only on layers that float, and they pair a soft drop with a 1px `outline-variant` ring so edges stay crisp in every theme. Glass is the one theme with material depth: translucent fills over a warm canvas with amber radial glows, and a 20px blur only on dialogs, the floating rail and the header. Dense lists, tables and pipeline boards stay on normal fills even in Glass.

### Shadow Vocabulary
- **Popover** (`0 8px 24px -6px var(--shadow-color), 0 0 0 1px var(--outline-variant)`): menus, dropdowns, tooltips, the sidebar ⋮ menu.
- **Modal** (`0 24px 64px -12px var(--shadow-color), 0 0 0 1px var(--outline-variant)`): dialogs and drawers, over the `scrim` backdrop, which is the only place blur is allowed outside Glass.

### Named Rules
**The Floating-Only Shadow Rule.** If it doesn't float, it has no shadow. Cards, tables and stat tiles sit flat with a hairline.

**The No-Nesting Rule.** Never put a card inside a card. Group content inside a card with `divide-y divide-outline-variant`, spacing, or the stat tile's `inset` variant.

## Shapes

Gently rounded, with one rule for each kind of element. Checkboxes, kbd and tiny chips use 4px. Controls (buttons, inputs, selects, textareas, nav rows, tabs, hovered rows) use 8px, including hand-built field class strings. Containers (base `Card`, panels, dropdowns, table wrappers) use 12px. Top-level page cards, modals, drawer edges and message bubbles use 16px. Badges, avatars, counts, toggles and filter pills are fully round. `rounded-md`, `rounded-sm` and `rounded-3xl` are retired. Borders are a single 1px hairline. The one signature shape is the sidebar's active row, drawn with an accent bar and inverted corners so it reads as a tab fused to the page.

## Components

All primitives live in `frontend/src/components/ui/`. Feature code composes them rather than restyling them with one-off class strings.

### Buttons
Restrained, with a small physical press.
- **Shape:** gently rounded (8px).
- **Primary:** `primary` fill and `on-primary` text. Sizes are sm 32px/12px padding/13px, md 36px/16px/14px (the default), and lg 44px/20px for auth and empty-state CTAs. Hover darkens to `primary-container`. Solid fill only: no gradient, no glow.
- **Hover / Focus:** 120ms colour transitions on `--ease-standard` `cubic-bezier(0.2, 0, 0, 1)`; `active:scale(0.98)`; a 2px `focus` ring offset from the surface on `:focus-visible`. Disabled is 50% opacity. When loading, the spinner sits beside the label.
- **Secondary:** transparent with a hairline border and neutral text; hover fills `surface-container-low`.
- **Ghost:** no border, `on-surface-variant` text; hover gives a mist fill and ink text.
- **Destructive:** `error` fill. **Link:** `primary-container` text that underlines on hover.
- **IconButton:** square, and `aria-label` is required. Sizes are xs 24px (in chips, inputs and dense rows), sm 32px (toolbars) and md 36px. Variants are ghost, primary and danger (red on hover).

### Chips & Badges
- **Badge:** fully round, 11px caption, tinted container plus matching status text. An optional leading dot can pulse for live states such as a running campaign.
- **Count badge:** an 18px amber pill with tabular numerals, capped at "99+".
- **Filter pill (`FilterSelect`):** a compact rounded dropdown that reads as filled once set, matching active chips. On phones it opens a sheet.

### Cards / Containers
- **Corner Style:** 16px for page-level cards (Quiet Ops), 12px for the base `Card` primitive and inner panels.
- **Background:** `surface-container-lowest` on `surface`.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px `outline-variant` on page cards.
- **Internal Padding:** 20px. Title is `text-title-sm` semibold, description `text-body` `on-surface-variant`.
- **Stat tile:** `text-label` label, `text-display` tabular value, and a detail line in muted/success/error. No coloured icon tiles on desktop.

### Inputs / Fields
- **Style:** 40px, 8px radius, `surface-container-low` fill, hairline border that becomes `outline` on hover, 14px text, `placeholder` hint colour, optional 16px leading icon.
- **Focus:** the border shifts to `primary` with a 2px `primary/30` ring.
- **Error / Disabled:** `error` border and ring, with an 11px `error` line below (`role="alert"`, `aria-invalid`, `aria-describedby`). Disabled is 50% opacity.

### Navigation
- **Sidebar:** dark in all themes. A brand block with a collapse button, uppercase section labels, rows with icon and count pill, nested groups with tree lines (from nav-config `parent`), the active row marked by an amber accent bar, an AI-credits meter, and a portalled footer ⋮ menu. The scrollbar is hidden (`.side-scroll`) so nothing sits between the active tab and the page.
- **Header bar:** 64px and sticky. It shows the title only after scroll, a neutral status chip, notifications and the account menu.
- **Tabs:** a sliding pill indicator (shared layout animation) under the active tab.
- **Mobile:** iOS tab bar or Material 3 bottom nav, with the raised centre + opening the Apps sheet.

### Inbox (signature)
- **Conversation row:** 64px, 36px avatar, name `text-body` medium, single-line truncated preview in `on-surface-variant`, time `text-caption` tabular. Unread switches name and preview to `on-surface` and adds a count badge. Selected is `surface-container`, hover `surface-container-low`.
- **Bubbles:** 16px radius, 8px×14px padding, max width 70% (85% below `md`), 14px text, 11px meta. Incoming bubbles use `surface-container`, outgoing `bubble-out`, internal notes `warning-container` with a dashed `warning` border, and failed messages the outgoing fill plus an `error` border and a retry action. Messages from the same sender are 4px apart, a sender change gets 12px, and date separators are centred caption chips.
- **Composer:** a `surface-container-lowest` bar with a top hairline, a textarea that auto-grows to 6 lines, and a primary icon button to send.

### Data Table (signature)
`DataTable` is the standard list surface: configured columns, a loading skeleton, empty and error states, sort, selection, keyboard-navigable rows, pagination, and phone cards below 1024px. The wrapper is 12px radius with a hairline. The sticky header row uses `text-label` `on-surface-variant`. Rows are 44px `text-body`, with `divide-y` hairlines and a `surface-container-low` hover. Numbers are right-aligned and tabular, and there are no per-cell borders. On page entry the first 12 rows cascade in.

### Page Header (signature)
The single title row: a 22px semibold title with a letter-by-letter rise (`SplitText`), a muted `en-IN` count, an optional one-line description, and right-aligned actions with the primary button last. It carries `data-tour="page-header"` / `"page-actions"` for product tours.

### Overlays
- **Modal:** `scrim` backdrop, panel `surface-container-lowest`, 16px radius, hairline, `shadow-modal`. Widths are sm 400, md 560 and lg 720. Header `text-title`, actions right-aligned (secondary, then primary). Focus is trapped and `Esc` closes it.
- **Drawer:** right edge, 480px, same surface.
- **Popover / dropdown:** `surface-container`, 12px radius, `shadow-popover`, with 32px items at 8px radius.
- **Toast:** sonner, bottom-right, `text-body`.

### States
- **Loading:** skeletons shaped like the final content (`surface-container`, pulsing). The spinner is only for in-button and inline refresh.
- **Empty:** `EmptyState` with an icon, a one-line title, a one-line hint and one primary CTA.
- **Error:** inline in forms, `Alert` for section failures, and a toast only for transient outcomes.

### Icons
`lucide-react` only, with stroke 1.75. 16px in controls and badges, 18px in nav, 20px in empty states.

## Do's and Don'ts

### Do:
- **Do** build every page as `PageHeader` → one `FilterBar` row → cards or `DataTable`.
- **Do** use role tokens only, and check every new screen in all four themes: Light, Dark, Emerald and Glass.
- **Do** keep amber for the one primary action or active state per view.
- **Do** use the type tokens (`text-body`, `text-label`, `text-headline`) and register any new `--text-*`, `--shadow-*` or `--ease-*` token in `extendTailwindMerge` (`src/lib/utils.ts`) so `cn()` doesn't drop it.
- **Do** use the shared entrance motion (`.page-stagger`, `.rise-in`, `.stagger-rows`, `.grow-x`/`.grow-y`) on `--ease-emphasized` `cubic-bezier(0.22, 1, 0.36, 1)`. Animate transform and opacity only, and honour `prefers-reduced-motion`.
- **Do** give every interactive element a visible `focus-visible` ring, keep body text at 4.5:1 or better on every surface step it can sit on, and keep targets at 32px or larger.
- **Do** add `data-tour` anchors and a tour definition to any new or changed screen.
- **Do** keep mobile changes under `max-lg:` so desktop renders identically.

### Don't:
- **Don't** put cards inside cards or add coloured icon tiles to desktop stat cards.
- **Don't** stack filter rows or show a second page title in the header bar.
- **Don't** give flat surfaces (cards, tables, stat tiles) a shadow, or use gradients and glows on buttons and bubbles.
- **Don't** use raw hex, arbitrary `text-[Npx]` or Tailwind palette colours outside the documented exceptions.
- **Don't** colour the header status chip when nothing is wrong.
- **Don't** use title case or all caps for labels, buttons or table headers, or any text smaller than 11px.
- **Don't** add a global `* { transition }` or ambient looping motion (the typing indicator is the only loop).
- **Don't** restyle colours or fonts toward the Kerfa demo theme; only its motion was kept.
