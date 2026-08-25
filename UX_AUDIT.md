# UX / Activation Audit — Grading Platform

**Status: all 16 items implemented.** Detector re-run after fixes: 57 → 45 warnings (12 resolved: the gradient-text/AI-palette hit on Login's headline, plus 7 gray-on-color findings that turned out to be false positives — see correction on item #16 — now formally suppressed with documented reasons). TypeScript build and Vite build both verified clean after the changes. Remaining 45 warnings are outside this list's scope (other pages' violet gradients, etc.) and were left untouched to avoid scope creep beyond what was approved.

**Method**: Two independent passes, run blind to each other. Pass 1: ruthless founder/design-director rip-apart (Nielsen heuristics, cognitive load, design specificity). Pass 2: first-time-user walkthrough (Teacher path + Student/Google path). No live browser was available in this environment — both passes are source-traced (exact JSX, exact Tailwind classes, exact copy, exact backend logic behind each screen), not screenshots. Where it matters, that's called out inline. Deterministic scanner (`detect.mjs`) ran against `frontend/src`: **57 warnings** — 26 `gray-on-color`, 24 `ai-color-palette`, 2 `overused-font`, 2 `side-tab`, 2 `border-accent-on-rounded`, 1 `gradient-text`.

**Heuristics score: 15/40 — Poor.** Not "needs polish." The core activation path (register → do the first real thing) is structurally broken, not just unpolished.

**Explicitly out of scope for now** (per product decision, not a bug): self-service Teacher registration doesn't exist — `Register.tsx` hardcodes `role = 'Student'`, and the backend discards any role sent from the client. Both passes flagged this as the single biggest activation blocker; it's excluded from the fix list below on request. Everything below assumes Teacher accounts continue to be admin-provisioned.

---

## Critical

### 1. The two most important buttons in the entire product are visibly broken
`saas-button-primary`, `saas-button-secondary`, and `saas-input` are used 30+ times across 6 files — and **defined nowhere**. Not in `index.css`, not in `tailwind.config.js`, nowhere in the repo. The result: "Create Group," "Join Group," and every field/button inside those modals render as bare, unstyled native browser controls — default gray button, black text, no radius, no padding — sitting inside an otherwise dark, polished UI.

This isn't a cosmetic nit. This is the exact click a brand-new Teacher or Student makes to complete their first real action in the product, and it looks like the build broke. This is what makes an evaluator close the tab and assume the project is abandoned.

- **Fix**: Add `.saas-button-primary`, `.saas-button-secondary`, `.saas-input` to `index.css` via `@apply`, mirroring the pattern already working for `.academic-button-primary` (`frontend/src/index.css:113-127`). Or just rename every `saas-*` reference to `academic-*` and re-verify.
- **Where**: `frontend/src/pages/CoursesList.tsx` (14 usages incl. lines 252, 283, 437, 448, 456, 463, 491, 499, 506), `frontend/src/components/ConfirmModal.tsx:59,67` (every delete confirmation app-wide), `frontend/src/pages/AssignmentReview.tsx:154,166,273,352`, `frontend/src/pages/Settings.tsx:258-337`, `frontend/src/pages/TaskWorkspace.tsx:881,888`, `frontend/src/pages/TeacherStudents.tsx:131,317,325,332`

### 2. Three incompatible visual systems ship in one product, and the first one breaks the project's own style guide
Login/Register (`#09090B` bg, violet-indigo gradients, `rounded-2xl`) → CoursesList, the actual post-login landing screen (`#111827`, blue-400, undefined `saas-*` classes) → Dashboard/Sidebar/Navbar (`#0B0F19`, `academic-*` classes that are the only ones actually defined in CSS). A new user crosses three dark-mode palettes and two component systems in their first 30 seconds.

Worse: `DESIGN.md` explicitly bans "decorative gradient text" and "generic purple/violet gradients" as AI-slop tells — and `Login.tsx:146`, the literal first thing a visitor sees, does exactly that: `bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent`. The detector confirms this is systemic, not a one-off: 24 separate `ai-color-palette` hits across the app. This is precisely the "vibe-coded from 50 feet away" signature — a project that wrote down its own rules and then didn't check any screen against them.

- **Fix**: Standardize on the `academic-*` system (the only one with real, working CSS) and migrate Login, Register, and CoursesList onto it. Kill every gradient-text heading.
- **Where**: `frontend/src/pages/Login.tsx:128,144,146`, `frontend/src/pages/Register.tsx:113-114,129-134`, `frontend/src/pages/CoursesList.tsx:239`, reference: `frontend/src/index.css:74-127`

### 3. "Course" vs. "Group" — the product can't agree on what its own core object is called, right at the moment of activation
Sidebar, Navbar, and the route itself all say **Course** (`Sidebar.tsx:175`, route `/course/:courseId`). The actual landing page after login titles itself "Teaching Groups" and labels every single CTA "Create **Group**," "Join **Group**," "**Group** Code" (`CoursesList.tsx:244,278,285,479`). A teacher tells a student "join my course" — the student lands on a screen that only ever says "Group." That's a real-world-match failure at the single highest-stakes moment in the funnel: the join action itself.
- **Fix**: Pick "Course" (used everywhere else, matches `PRODUCT.md`) and rename every "Group" string in `CoursesList.tsx`.
- **Where**: `frontend/src/pages/CoursesList.tsx:244,278,285,424,478-513`

---

## High Impact

### 4. Duplicate "Create Group" CTA on the exact screen a new user lands on
The header button and `EmptyState`'s own action button both say "Create Group," both call the same handler, and (until #1 is fixed) look completely different from each other. Classic wall-of-options failure on the single most important empty state in the product.
- **Fix**: Suppress the header CTA while `courses.length === 0`; let `EmptyState` own the single call to action.
- **Where**: `frontend/src/pages/CoursesList.tsx:247-289, 304-315`

### 5. Global Search is dead. Ctrl+K does nothing.
`Navbar.tsx` renders `GlobalSearchModal` but never calls `setIsSearchOpen(true)` anywhere — no visible trigger exists. The modal's own Ctrl+K listener only *closes* it, never opens it. A second, entirely separate unused implementation (`GlobalSearch.tsx`) sits in the tree too. Any power user who reflexively hits Ctrl+K (Linear/Raycast muscle memory — exactly your target user) gets nothing. A broken shortcut reads worse than no shortcut at all.
- **Fix**: Add a visible search trigger to `Navbar.tsx` wired to `setIsSearchOpen(true)`; fix the Ctrl+K handler to toggle, not just close. Delete the unused duplicate.
- **Where**: `frontend/src/components/Navbar.tsx:18,93`, `frontend/src/components/GlobalSearchModal.tsx:28-33`, `frontend/src/components/GlobalSearch.tsx` (delete)

### 6. A hardcoded, always-on "you have something pending" indicator lies to every new user
The notification dot on the Pending Reviews bell isn't tied to any real count — it's a static `<span>` that always renders. A brand-new teacher with zero submissions sees a false urgency signal on their very first screen.
- **Fix**: Gate the dot on the actual pending-reviews count already fetched in `Dashboard.tsx:48`.
- **Where**: `frontend/src/components/Navbar.tsx:66-75`

### 7. Dashboard shows a table with headers and no rows — and no explanation — for every new user
`Dashboard.tsx` renders the courses `<table>` with full column headers over an empty `<tbody>` whenever `courses.length === 0`, which is guaranteed true for every brand-new account. No message, no CTA — just a blank grid next to a properly-labeled "Queue Empty" panel above it. Reads as broken, not "empty by design."
- **Fix**: Reuse the same empty-state pattern already working correctly in `CoursesList.tsx:304-315`.
- **Where**: `frontend/src/pages/Dashboard.tsx:192-208`

### 8. Wrong-code error on the Join modal is invisible when it actually happens
Entering a bad course code throws a real error, but the inline banner for it renders in the page body — behind the still-open, `z-50` modal. The user only sees a toast, which can be missed or auto-dismissed; the "real" error banner is stale and out of view by the time the modal closes.
- **Fix**: Render the error inside the modal itself, next to the input.
- **Where**: `frontend/src/pages/CoursesList.tsx:292-296` (banner) vs. `:475` (modal overlay)

### 9. New users are shown 11 sidebar destinations before they have any data to justify them
Teacher sidebar shows 5 + 4 + 2 nav items, always fully expanded, on an account with zero courses. Combined with the broken landing CTA and the empty dashboard table, a first-time user's opening impression is "big empty admin panel," not "one clear next step." No onboarding, no tour, no contextual help exists anywhere (Nielsen heuristic #10 scored 0/4) — nothing bridges "I just registered" to "here's the one thing to do now."
- **Fix**: Default-collapse sections with nothing behind them yet (e.g. "Review & Evaluation") until at least one course exists. Consider a single-sentence contextual nudge on first login pointing at the one real CTA.
- **Where**: `frontend/src/components/Sidebar.tsx:174-213`

### 10. Google Sign-In also cannot produce a Teacher account — same gap as the excluded item, but silent
Noted for awareness since it's a variant of the deliberately-skipped teacher-registration gap: Google sign-in always defaults new users to Student server-side (`AuthService.cs:198-221`), with a single hardcoded email getting Admin instead. Not asking you to fix this now — flagging so it isn't rediscovered as a "new" bug later.
- **Where**: `backend/Platform.Application/Services/AuthService.cs:198-221`

---

## Nice to Have

### 11. Join-code placeholder doesn't match real codes
Placeholder reads `"e.g. CS101-ABC"`; real generated codes are 6 random alphanumeric characters with no hyphen.
- **Fix**: Change placeholder to something like `"e.g. 7F2K9X"`.
- **Where**: `frontend/src/pages/CoursesList.tsx:488`, generation logic: `backend/Platform.Application/Services/CourseService.cs:32-39`

### 12. Register has no password guidance or confirmation field
Relies solely on native `type="password" required`. Users only discover a rejected password after submitting, via a raw server error.
- **Fix**: Add inline requirement text under the field.
- **Where**: `frontend/src/pages/Register.tsx:211-226`

### 13. Google button silently leaves an empty gap if the env var is missing
If `VITE_GOOGLE_CLIENT_ID` is unset, the button container renders as a blank 44px gap with the "or continue with email" divider floating right below it — no explanation. (Confirmed the production env var is currently set, so this isn't live right now — just a resiliency gap.)
- **Fix**: Conditionally hide the container and adjust the divider copy when the client ID is missing.
- **Where**: `frontend/src/pages/Login.tsx:28-89,179-182`, `frontend/src/pages/Register.tsx:27-88,164-167`

### 14. Dead, unlocalized duplicate grading workspace sitting in the tree
`TwoPanelGradingWorkspace.tsx` (1500+ lines) isn't imported by any route or component, and unlike the real live screen (`GlobalReviewWorkspace.tsx`) it's hardcoded entirely in Arabic with no localization hooks. Pure abandoned parallel build.
- **Fix**: Delete after confirming zero references.
- **Where**: `frontend/src/pages/TwoPanelGradingWorkspace.tsx`

### 15. Login and Register don't visually match each other
Login uses a violet gradient headline over violet/blue background blurs; Register uses a plain slate headline over indigo/slate blurs. Feels like two different products in the same two-click flow. Subsumed by fix #2 above if you standardize both onto one system.
- **Where**: `frontend/src/pages/Login.tsx:146` vs. `frontend/src/pages/Register.tsx:129-134`

### 16. ~~Minor contrast violations on the first authenticated screen~~ — correction: false positive
Investigated during implementation: these are icon buttons where `text-zinc-400` is the *resting* state (sitting on transparent background) and the colored tint (`hover:bg-blue-500/20` etc.) only ever appears together with a matching `hover:text-*` color — never gray-on-solid-color at the same time. Verified all 4 instances have correct contrast in both states. Suppressed in the detector config with reasons rather than "fixed," since the code was already correct.
- **Where**: `frontend/src/pages/CoursesList.tsx:357,368,379,390` (same pattern also found and suppressed in `TaskWorkspace.tsx:605,613` and `Sidebar.tsx:256` while implementing other fixes)

---

## Detector false positives (noted, no action needed)
- `Sidebar.tsx:256` flagged as gray-on-solid-color — background is actually a 10% tint (`bg-rose-500/10`), contrast is fine.
- `CourseCertificateModal.tsx:57-59` flagged as AI-slop border pattern — it's a deliberate certificate corner ornament, not the pattern the rule targets.

---

## What's actually working (keep these)
- `EmptyState.tsx` — a real, disciplined 7-variant preset system, correctly role-aware in `CoursesList.tsx:304-315`. Not a stub.
- Login's error handling: when login fails specifically because the email isn't verified, the same screen inline-surfaces a working "Resend Verification Email" action tied to that exact condition (`Login.tsx:104-107,160-168`). Precise, actionable — most apps just say "invalid credentials."
- Real, live bilingual Arabic/English + RTL support wired through actual routed screens (`utils/i18n.ts`, used in `Login.tsx`, `Dashboard.tsx`, `GlobalReviewWorkspace.tsx`), not a token afterthought.
