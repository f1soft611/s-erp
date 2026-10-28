# Login Page Design Implementation Plan

> **For agentic workers:** Use executing-plans to carry out this plan task-by-task. Preserve unrelated worktree changes and do not modify authentication behavior.

**Goal:** Refine the existing S-ERP login page into a polished, responsive card layout while preserving all login behavior.

**Architecture:** Keep `LoginPage` and `useLoginForm` unchanged. Adjust the existing MUI `AuthLayout` and `LoginForm` presentation, accounting for the app shell's fixed-height, overflow-hidden container by making the auth layout its own scrollable flex child.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite, Playwright.

---

## File map

- Modify `frontend/src/shared/components/layout/AuthLayout.tsx`: themed backdrop, available-height layout, card centering and vertical overflow behavior.
- Modify `frontend/src/pages/auth/components/LoginForm.tsx`: card surface, type hierarchy, spacing and theme-consistent button while preserving conditional/support content.
- Modify `frontend/tests/login.test.tsx` only if a focused behavior regression test is needed; retain the existing login flow coverage.
- Create `docs/result/20261028/login-page-design/20261028_005_login-page-design_결과.md` and browser screenshots after implementation.
- Work order, dated plan/spec and design documents already define scope and acceptance checks.

## Task 1: Establish the login behavior baseline

**Files:**
- Test: `frontend/tests/login.test.tsx`

- [x] Run `cd frontend; npm run test -- tests/login.test.tsx`.
- [x] Record existing pass/fail results. Do not edit auth services, login hooks, route code, or input contracts.
- [x] If the baseline reveals a failing unrelated test, report it separately and do not weaken the test.

## Task 2: Make the auth viewport resilient

**Files:**
- Modify: `frontend/src/shared/components/layout/AuthLayout.tsx`

- [x] Update the outer layout to occupy the app shell's available flex height (`flex: 1`, `minHeight: 0`) and allow vertical scrolling (`overflowY: 'auto'`), keeping `minHeight: '100vh'` only if it does not defeat the flex sizing.
- [x] Use theme background tokens and a subtle blue accent rather than a strong multi-stop gradient.
- [x] Keep a centered card on normal-height viewports, but ensure a taller-than-viewport card can scroll from its top on short screens. Keep horizontal padding fluid with at least 16px on mobile.
- [x] Run `cd frontend; npm run test -- tests/login.test.tsx`; the new layout regression test passes. The five known baseline failures in `login.test.tsx` persist and are documented.

## Task 3: Refine card presentation without changing behavior

**Files:**
- Modify: `frontend/src/pages/auth/components/LoginForm.tsx`
- Test: `frontend/tests/login.test.tsx` (only when adding a focused regression assertion)

- [x] Set the card's light/dark surface from the existing theme, with a quiet border and restrained shadow; retain its 450px maximum width.
- [x] Improve the heading/supporting-copy hierarchy and use consistent, intentional vertical spacing across the three fields, status alerts, submit button and footer.
- [x] Use theme palette colors for the primary action and retain submitting/disabled states.
- [x] Preserve the existing field labels, values, callbacks, placeholders, autoComplete attributes, password visibility toggle, validation/error messages, session notice, DEV-only test-account block and copyright.
- [x] Do not introduce remember-me, password reset, social login, new API behavior, or extra controls.
- [x] Run focused tests; the new layout regression test passes and the same five pre-existing login-test failures remain.

## Task 4: Verify build and browser rendering

**Files:**
- No application files unless a verified defect requires a focused correction.

- [x] Run `cd frontend; npm run build`; TypeScript and Vite build succeed.
- [x] Verify `http://127.0.0.1:4173` serves this S-ERP app and reuse the existing server.
- [x] Use Playwright/browser at 375px, 768px and 1280px in both themes. Confirm no horizontal overflow and no unreachable card content at a short viewport height.
- [x] Verify the password toggle; report the existing login test failures separately.
- [x] Save screenshots under `docs/result/20261028/login-page-design/screenshots/`. Existing server was reused and left running.

## Task 5: Record the result

**Files:**
- Create: `docs/result/20261028/login-page-design/20261028_005_login-page-design_결과.md`
- Create: `docs/result/20261028/login-page-design/screenshots/` (screenshots only)

- [x] Record the design changes, unchanged login behavior, exact test/build outcomes, viewport/theme matrix and screenshot links.
- [x] Clearly document the baseline validation failures and the masked account area in screenshots.
- [x] Run `git diff --check`; confirm changes are limited to login UI, login tests and related docs/results.
