---
name: Field Ledger
description: Production-grade dark UI system for task management, code grading, and administrative health monitoring — a precision academic console rendered in warm graphite, emerald, and amber instead of the generic blue-slate SaaS palette.
colors:
  primary: "#1FA971"
  primary-hover: "#2BC280"
  primary-deep: "#0E5C3C"
  secondary: "#3E93A8"
  secondary-hover: "#4FAEC4"
  accent: "#D9822E"
  accent-hover: "#EC9640"
  neutral-canvas: "#0A0D0A"
  neutral-surface: "#12160F"
  neutral-surface-hover: "#1A2016"
  neutral-elevated: "#1E2519"
  neutral-inset: "#070907"
  border-subtle: "#212B1E"
  border-strong: "#37452E"
  text-heading: "#F4F6EF"
  text-primary: "#CBD3C3"
  text-secondary: "#7C8A72"
  text-faint: "#52604B"
  status-success: "#1FA971"
  status-warning: "#D9822E"
  status-danger: "#E2584F"
rounded:
  sm: "7px"
  md: "11px"
  lg: "16px"
  xl: "22px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#06150E"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System: Field Ledger

## Overview

**Creative North Star: "Field Ledger" — a precision academic-engineering console.**

The UI reads as a grading ledger crossed with an observatory control panel: warm graphite surfaces instead of cold blue-slate, ruled hairlines, mono data labels, and a signature emerald/amber duo standing in for the indigo-on-slate look nearly every SaaS dashboard defaults to. It exists to feel like a purpose-built instrument for reviewing code and tracking academic progress, not a templated admin panel.

**Key Characteristics:**
- Warm graphite-green neutrals (`#0A0D0A` canvas → `#12160F` surface → `#1A2016` hover) — never pure gray, never blue-slate.
- A deep emerald primary (`#1FA971`) doubling as the "pass/correct" signal — literal for a grading platform — paired with a muted teal secondary (`#3E93A8`) and a burnt-amber accent (`#D9822E`) for attention states.
- IBM Plex Sans for all UI text (an engineering-heritage face, not the Inter/Outfit default), JetBrains Mono reserved for code, data figures, and tracked "field label" eyebrows — a deliberate signature device used throughout (`.field-label` utility).
- Editorial two-pane composition on auth screens (`AuthShell`) instead of a centered generic card.

## Colors

### Primary — Emerald
- `#1FA971` (600): primary buttons, active nav state, focus rings, "success"/"passed" semantics.
- `#2BC280` (hover), `#0E5C3C` (deep, for tints and glows).
- Full Tailwind scale registered as `primary-{50..950}`.

### Secondary — Teal
- `#3E93A8`: links, informational badges, secondary emphasis. Full scale as `secondary-{50..950}`.

### Accent — Amber
- `#D9822E`: warnings, streaks, ratings, highlighter moments. Full scale as `accent-{50..950}`.

### Neutrals — warm graphite-green (registered as `sage-{50..950}` for text/border utilities)
- Canvas `#0A0D0A` → Surface `#12160F` → Surface-hover `#1A2016` → Elevated `#1E2519` → Inset `#070907`.
- Border-subtle `#212B1E`, border-strong `#37452E`.
- Text-heading `#F4F6EF`, text-primary `#CBD3C3`, text-secondary `#7C8A72`, text-faint `#52604B`.

### Status
- Success = primary emerald. Warning = accent amber. Danger = coral-red `#E2584F` (Tailwind `rose`/`red` classes render close enough and are kept for semantic clarity in status badges).

### Named Rules
**The Warm Neutral Rule.** Never reach for Tailwind's stock `slate`/`zinc`/`gray`/`blue`/`indigo`/`sky`/`violet`/`purple` families — they pull the UI back toward the generic blue-slate SaaS look this system replaced. Use `sage-*` for neutrals, `primary-*`/`secondary-*`/`accent-*` for brand and semantic color.
**The High-Contrast Text Rule.** Never use light gray text over vibrant colored badge backgrounds. Badges use dark text on light tints or near-white on dark shades.
**The Mono Label Rule.** Any tracked uppercase eyebrow/kicker/data-figure uses `.field-label` (JetBrains Mono, 0.65rem, 600, tracking-wide) — the system's signature texture, used sparingly (page eyebrows, step counters, table headers) so it stays a deliberate device rather than noise.

## Typography

**UI Face:** IBM Plex Sans (400/500/600/700, italic 500) — chosen for its engineering/technical heritage, fitting a code-assessment console; replaces the Inter+Outfit pairing.
**Code / Data Face:** JetBrains Mono — code blocks, `.field-label` eyebrows, table headers, badges.

### Hierarchy
- **Display / H1**: 28–48px, weight 600–700, tracking -0.02em. Auth hero headlines run up to `text-6xl` on desktop.
- **Headline / H2**: 20–24px, weight 600.
- **Title / H3**: 16px, weight 600.
- **Body**: 13–14px, weight 400, `text-primary`.
- **Label / Code**: 11–12px, JetBrains Mono, tracking-wide, uppercase — via `.field-label`.

## Layout

- **Spatial Model**: Flexbox and responsive CSS grids, `gap-4`/`gap-6`/`p-6` scale, unchanged from the prior system.
- **Auth screens**: editorial two-pane layout (`AuthShell` component) — a fixed-width brand pane (hidden below `lg`) with layered radial-gradient wash, hairline grid texture, headline, and a three-step mono footer; the form floats card-less on the remaining space.
- **Responsive Breakpoints**: standard Tailwind (`sm`/`md`/`lg`/`xl`); mobile nav collapses into a drawer; verified overflow-free at 1440/1280/1024/768/390/360px.

## Elevation & Depth

Layered shadow tokens (`shadow-field-sm/md/lg/glow`) replace ad hoc `shadow-xl`/`shadow-2xl`: soft offset blurs, with `shadow-field-glow` reserved for primary-button hover and emphasized card hover states — an emerald-tinted ambient glow, not a flat halo.

## Shapes

- **Corner Radius**: custom scale registered on Tailwind's `rounded-sm/md/lg/xl` utilities — `sm` 7px, `md` 11px (buttons/inputs), `lg` 16px (cards/panels), `xl` 22px. This is a global override: existing `rounded-lg`/`rounded-xl` usage across the app picked up the new shape automatically.
- **Borders**: 1px solid `border-subtle` (`#212B1E`) for quiet separation, `border-strong` (`#37452E`) for emphasis/hover.

## Components

### Buttons (`.academic-button-primary/-secondary/-danger` in index.css)
- **Primary:** emerald fill, near-black text (`#06150E`) for AA contrast, glow-shadow on hover, `active:scale-[0.97]`.
- **Secondary:** surface fill, strong border, lightens on hover.
- **Danger:** coral-red tint, no solid fill (reserves solid red for truly destructive confirmation).

### Inputs (`.academic-input`)
- Inset background (`#070907`), strong border, emerald focus ring (`box-shadow: 0 0 0 3px primary-tint`) — verified live in-browser: `rgb(244,246,239)` text on `rgb(7,9,7)` background, ~19:1 contrast.

### Cards
- `bg-surface border-subtle rounded-lg shadow-field-md`, hover raises to `shadow-field-glow` with a 2px lift (`hover:-translate-y-0.5`) and border tints toward primary.

### Motion
- `.animate-rise-in` (staggered via `.stagger-1..5`) for hero/entrance content, `.animate-fade-in-scale` for empty states and modals, both using `--ease-out: cubic-bezier(0.16,1,0.3,1)`.

## Do's and Don'ts

### Do:
- Do use `sage-*` for all neutral text/border/background needs — never raw Tailwind gray families.
- Do use `.field-label` for eyebrows, step counters, and table headers as the system's signature mono texture.
- Do use the registered `shadow-field-*` and `rounded-{sm,md,lg,xl}` tokens instead of ad hoc shadow/radius values.

### Don't:
- Don't use `slate`/`zinc`/`gray`/`blue`/`indigo`/`sky`/`violet`/`purple` Tailwind color classes — the whole codebase was swept off them; reintroducing one regresses toward the old identity.
- Don't use decorative gradient text.
- Don't use `animate-bounce` for status indicators or feedback elements.
- Don't wrap a thick multi-side accent border around a rounded card (the one exception, `CourseCertificateModal`'s diploma-style corner flourish, is intentional and documented, not a pattern to repeat elsewhere).
