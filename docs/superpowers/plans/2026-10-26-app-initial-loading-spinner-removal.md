# App Initial Loading Spinner Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove app-route lazy-load and initial dashboard menu-loading spinners while preserving lazy loading, the menu gate, and all other loading behavior.

**Architecture:** `AppRouter` keeps its lazy route modules and `Suspense` boundary with a `null` fallback. `DashboardPage` continues fetching menus and withholding the sidebar and page content until that request completes, but renders no spinner while waiting. Its existing error and loaded states remain unchanged. An existing delayed-menu integration test verifies the absence of app-entry spinners and the retained content gate.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Playwright.

---

## File map

- Modify `frontend/src/pages/dashboard/DashboardPage.tsx` to remove the spinner import and initial pending-state spinner branch.
- Modify `frontend/src/routes/AppRouter.tsx` to keep lazy routes but use a `null` `Suspense` fallback.
- Modify `frontend/tests/app-router-not-found.test.tsx` to strengthen the existing delayed-menu test.
- Create the dated direction, plan, and detailed specification in `docs/directions/20261026/`, `docs/plan/20261026/`, and `docs/spec/20261026/`.
- Create the implementation result and viewport screenshots under `docs/result/20261026/app-initial-loading-spinner-removal/`.

### Task 1: Add the pending-state regression assertions

**Files:**
- Modify: `frontend/tests/app-router-not-found.test.tsx`

- [x] **Step 1: Assert the spinner is absent and content remains gated**

In the existing test `keeps the dashboard root path valid while the menu list is loading`, add `waitFor` to the Testing Library import:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
```

Immediately after `render`, assert that lazy route loading has no progressbar. Then wait for the deferred menu callback to be registered and assert the menu-pending state and content gate:

```tsx
expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
await waitFor(() => expect(resolveMenuResponse).toBeDefined(), {
  timeout: 25000,
});
expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
expect(
  screen.queryByRole('heading', { name: '종합현황' }),
).not.toBeInTheDocument();
```

Set both test auth fixtures to expire five minutes from `Date.now()` so they stay outside the API client's 60-second token-refresh buffer. Keep the deferred menu response and final `findByRole('heading', { name: '종합현황' })` assertion. Its response must contain a module with an accessible leaf menu named `종합현황`; the module itself is not the leaf menu. The five-minute token, condition-based callback wait, and valid leaf menu correct pre-existing test-fixture problems found during baseline investigation. The dashboard integration test uses a 25-second condition-based callback wait and a 30-second test timeout because the measured lazy dashboard-module startup took over 12 seconds. The invalid-route integration test uses a 15-second `findByText` wait and a 20-second test timeout for cold lazy-route loading.

- [x] **Step 2: Confirm the regression fails before implementation**

Run from `frontend`:

```powershell
npm run test -- tests/app-router-not-found.test.tsx
```

Expected: the pending-state `progressbar` absence assertion fails because `AppRouter` currently renders its Suspense spinner and `DashboardPage` renders the menu spinner; the other assertions remain viable.

### Task 2: Complete the dated detailed specification

**Files:**
- Create: `docs/spec/20261026/20261026_009_app_initial_loading_spinner_removal_상세사양서.md`

- [x] **Step 1: Record approved behavior and measurable verification**

Documented that the loading shell remains with no child indicator while menus are pending; menu data still gates sidebar and content; failures still show the existing error/retry UI; other spinners are unchanged. The dated direction and plan are linked, and the focused test and viewport checks are stated.

### Task 3: Remove both app-entry spinners

**Files:**
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/routes/AppRouter.tsx`

- [x] **Step 1: Remove only the route-loading indicator**

In `AppRouter.tsx`, delete the `AppLoadingSpinner` import and change the Suspense fallback:

```tsx
<Suspense fallback={null}>
```

Keep all route imports and `lazy()` calls unchanged.

- [x] **Step 2: Remove the menu-loading indicator**

In `DashboardPage.tsx`, delete this import:

```tsx
import { AppLoadingSpinner } from '../../shared/components/AppLoadingSpinner';
```

- [x] **Step 3: Preserve the loaded subtree while removing the pending UI**

In the final dashboard shell, remove the `menusLoading` branch that creates a centered `Box` and renders `<AppLoadingSpinner thickness={3.6} />`. Keep the existing loaded branch's `DashboardSidebar` and page-content JSX intact, rendered only when menus are ready. Keep the outer dashboard shell, menu request effect, error/retry state, and route checks unchanged. Do not add a replacement loading indicator.

- [x] **Step 4: Run the focused regression test**

Run from `frontend`:

```powershell
npm run test -- tests/app-router-not-found.test.tsx
```

Expected: all tests in the file pass, including the pending state without a progressbar, the gated content before menu resolution, and the dashboard heading after resolution.

### Task 4: Verify build and browser presentation

**Files:**
- Create: `docs/result/20261026/app-initial-loading-spinner-removal/20261026_009_app_initial_loading_spinner_removal_결과.md`
- Create: `docs/result/20261026/app-initial-loading-spinner-removal/screenshots/` viewport captures

- [x] **Step 1: Run the frontend production build**

Run from `frontend`:

```powershell
npm run build
```

Expected: TypeScript compilation and Vite production build succeed.

- [x] **Step 2: Inspect the pending state at required widths**

Reuse the existing S-ERP browser server at `http://127.0.0.1:4173`; do not start another server. With the menu request held pending, inspect 375px, 768px, and 1280px widths. Confirm no progress spinner or dashboard content is displayed, the shell background remains, and no horizontal overflow appears. Save one screenshot per viewport.

- [x] **Step 3: Record results and check the diff**

Record the changed behavior, test/build commands and outcomes, viewport findings, and screenshot paths in the dated result document. Run:

```powershell
git diff --check
```

Expected: no whitespace errors.

## Project documentation links

- [Task direction](../../directions/20261026/20261026_009_app_initial_loading_spinner_removal_작업지시서.md)
- [Dated project plan](../../plan/20261026/20261026_009_app_initial_loading_spinner_removal_계획서.md)
- [Dated detailed specification](../../spec/20261026/20261026_009_app_initial_loading_spinner_removal_상세사양서.md)
