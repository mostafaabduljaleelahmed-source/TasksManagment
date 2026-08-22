---
name: Task Management & Learning Platform
description: Production-grade dark & light UI system for task management, code grading, and administrative health monitoring.
colors:
  primary: "#4f46e5"
  primary-hover: "#4338ca"
  secondary: "#0284c7"
  neutral-bg: "#0f172a"
  neutral-surface: "#1e293b"
  neutral-border: "#334155"
  text-primary: "#f8fafc"
  text-secondary: "#94a3b8"
  accent-success: "#10b981"
  accent-warning: "#f59e0b"
  accent-danger: "#ef4444"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
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
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System: Task Management & Learning Platform

## Overview

**Creative North Star: "Precision Command Station"**

The UI reflects a high-density, professional command deck for students, educators, and administrators. Visual elements prioritize readability, actionable feedback, dark-mode comfort, and crisp data visualization. It eliminates decorative AI cliches such as purple-to-violet text gradients and bounce animations in favor of solid typography, subtle micro-interactions, and contrast-compliant status indicators.

**Key Characteristics:**
- Dark slate background (`#0f172a`) paired with clean surface layering (`#1e293b`).
- Focused primary accents (`#4f46e5` Indigo / `#0284c7` Sky) reserved for primary actions and active states.
- High-contrast typography adhering to WCAG AAA standard ratios.
- Clean 1px slate borders (`#334155`) defining clear surface boundaries without aggressive drop shadows.

## Colors

The palette provides strong visual hierarchy across dark slate backgrounds with high contrast text and purposeful status colors.

### Primary
- **Command Indigo** (`#4f46e5` / `rgb(79, 70, 229)`): Primary actionable buttons, active tab indicators, key focus states.
- **Deep Indigo Hover** (`#4338ca`): Hover state for primary buttons.

### Secondary
- **Sky Focus** (`#0284c7` / `rgb(2, 132, 199)`): Code workspace highlights, informational badges, secondary action toggles.

### Neutral
- **Slate Canvas** (`#0f172a`): Application background.
- **Slate Surface** (`#1e293b`): Cards, panels, modal dialogs, and workspace containers.
- **Slate Border** (`#334155`): Dividers, panel separators, input outlines.
- **Bright White Text** (`#f8fafc`): Primary headings, card titles, button labels.
- **Muted Slate Text** (`#94a3b8`): Subtitles, helper text, timestamps, table metadata.

### Status & Accents
- **Emerald Pass** (`#10b981`): Passing grades, successful database connections, active status badges.
- **Amber Warning** (`#f59e0b`): Pending reviews, high memory warnings, cautionary badges.
- **Rose Error** (`#ef4444`): Failed tests, critical system errors, delete actions.

### Named Rules
**The Single Accent Rule.** Primary indigo accent is applied to at most one dominant focal action per view.
**The High-Contrast Text Rule.** Never use light gray text (e.g. `zinc-400`, `slate-500`) over vibrant colored badge backgrounds (`amber-400`, `blue-600`). Badges must use dark text on light tints or pure white on dark shades.

## Typography

**Display Font:** Inter / System UI sans-serif stack (`font-sans`).
**Code / Editor Font:** JetBrains Mono / Fira Code / monospace (`font-mono`).

### Hierarchy
- **Display / H1** (Bold, 24px/30px, 1.25 line-height): Main dashboard headers, page titles.
- **Headline / H2** (SemiBold, 20px/28px, 1.3 line-height): Section titles, panel headers.
- **Title / H3** (Medium, 16px/24px, 1.4 line-height): Card headers, modal titles, table column group headers.
- **Body** (Regular, 14px/20px, 1.5 line-height): Descriptions, table content, form labels.
- **Label / Code** (Medium/Monospace, 12px/16px, tracking-wide): Badges, status tags, inline code snippets.

## Layout

- **Spatial Model**: Flexbox and 12-column responsive CSS grids with consistent spacing scale (`gap-4`, `gap-6`, `p-6`).
- **Container Behavior**: Full-width fluid layout inside 1280px max-width container bounds. Two-panel responsive workspace for code review.
- **Responsive Breakpoints**: Standard Tailwind breakpoints (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`). Mobile navigation collapses into a responsive drawer.

## Elevation & Depth

Surfaces use subtle 1px border outlines (`border-slate-800` or `border-slate-700`) and tonal background shifts rather than heavy drop shadows.

**The Flat Surface Rule.** Panels rest flat by default. Subtle ambient glow (`shadow-sm` or `shadow-indigo-500/10`) appears only on interactive hover and active modal overlays.

## Shapes

- **Corner Radius**: `rounded-lg` (8px) for cards, panels, containers; `rounded-md` (6px) for buttons and inputs; `rounded-full` for status dots and avatars.
- **Borders**: Crisp 1px solid stroke (`border border-slate-800`).

## Components

### Buttons
- **Shape:** `rounded-md` (6px radius).
- **Primary:** `bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-2 text-sm font-medium transition-colors`.
- **Secondary:** `bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-sm font-medium`.
- **Danger:** `bg-rose-600 text-white hover:bg-rose-500 px-4 py-2 text-sm font-medium`.

### Cards & Panels
- **Style:** `bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-sm`.
- **Header:** `border-b border-slate-800 pb-4 mb-4 font-semibold text-slate-100`.

### Status Badges
- **Style:** `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold`.
- **Success Badge:** `bg-emerald-950/80 text-emerald-300 border border-emerald-800/50`.
- **Warning Badge:** `bg-amber-950/80 text-amber-300 border border-amber-800/50`.
- **Danger Badge:** `bg-rose-950/80 text-rose-300 border border-rose-800/50`.

### Form Fields & Inputs
- **Style:** `bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent`.

## Do's and Don'ts

### Do:
- **Do** use dark background tints with bright, accessible text colors for badges and status indicators.
- **Do** keep button styling consistent across views using predefined Tailwind utility classes.
- **Do** maintain a strict 1px border grid hierarchy for surface separation.

### Don't:
- **Don't** use decorative gradient text (`bg-clip-text text-transparent bg-gradient-to-r`).
- **Don't** use generic purple/violet gradients (`from-violet-500 to-purple-600`) as default card backgrounds.
- **Don't** use washed-out gray text (`text-zinc-400`, `text-zinc-500`) over vibrant colored backgrounds (`bg-amber-400`, `bg-blue-600`).
- **Don't** use `animate-bounce` for status indicators or feedback elements.
