# Frontend Large-Chunk Code-Splitting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the production large-chunk warning without raising the 1,000 kB warning threshold or changing dashboard page-selection behavior.

**Architecture:** Replace the eagerly imported top-level route pages with `React.lazy` and use the existing spinner as the route suspense fallback. Defer the globally mounted login-popup host into a separate module. Keep `DashboardContent` synchronous; the measured `DashboardPage` chunk is 476.38 kB and is below the warning threshold.

**Tech Stack:** React 19, TypeScript, React Router 7, Vite/Rolldown, Vitest, Testing Library.

---

## Files

- `frontend/src/routes/AppRouter.tsx`: lazy route pages and suspense fallback.
- `frontend/src/App.tsx`: lazy login-popup host.
- `frontend/tests/app-router-not-found.test.tsx`: asynchronous assertions for lazy route loading. Preserve the concurrent auth/menu fixture changes already in the worktree.
- `docs/result/20261026/frontend-large-chunk-code-splitting/`: build/browser result and screenshot.

## Task 1: Split top-level route pages

**Files:**
- Modify: `frontend/src/routes/AppRouter.tsx`
- Test: `frontend/tests/app-router-not-found.test.tsx`

- [ ] **Step 1: Make the unknown-route assertion async**

The unknown-route test should await the lazily loaded NotFound page and allow for module loading:

```tsx
expect(
  await screen.findByText(
    '요청하신 페이지를 찾을 수 없습니다',
    {},
    { timeout: 5000 },
  ),
).toBeVisible();
```

Keep the return button assertion after this awaited query. Preserve all current auth tokens, menu response data, and wait logic in the test file.

- [ ] **Step 2: Run focused route tests**

From `frontend`, run:

```powershell
npm run test -- tests\app-router-not-found.test.tsx
```

Expected: all current tests pass with the latest worktree fixtures. If a known baseline failure remains, record the exact assertion and compare it to the recorded pre-change run; do not alter auth or menu behavior to make the test pass.

- [ ] **Step 3: Convert route page imports to lazy imports**

In `AppRouter.tsx`, import `lazy` and `Suspense` from React and import `AppLoadingSpinner`. Replace the six eager page imports with:

```tsx
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const ProfileSettingsPage = lazy(() =>
  import('../pages/dashboard/ProfileSettingsPage'),
);
const SecuritySettingsPage = lazy(() =>
  import('../pages/dashboard/SecuritySettingsPage'),
);
const F1GridDocsPage = lazy(() =>
  import('../pages/f1-grid-docs/F1GridDocsPage').then((module) => ({
    default: module.F1GridDocsPage,
  })),
);
const NotFoundPage = lazy(() =>
  import('../pages/errors/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
);
```

Wrap the existing `<Routes>` element in `<Suspense fallback={<AppLoadingSpinner aria-label="페이지 불러오는 중" />}>`. Do not change any route path, order, element, guard, or redirect.

- [ ] **Step 4: Re-run route tests**

Run `npm run test -- tests\app-router-not-found.test.tsx` from `frontend`.

Expected: lazy routes render and the test result is no worse than the current fixture baseline.

## Task 2: Defer the login-popup host

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Lazy-load the existing named export**

Import `lazy` and `Suspense` from React, remove the static host import, and add:

```tsx
const NoticeLoginPopupHost = lazy(() =>
  import('./pages/groupware/community/notice/components/NoticeLoginPopupHost').then(
    (module) => ({ default: module.NoticeLoginPopupHost }),
  ),
);
```

Wrap the existing host element in `<Suspense fallback={null}>`. Keep it inside the existing router, notification provider, and layout. Do not change the popup component, auth subscription, or service calls.

- [ ] **Step 2: Verify direct screen behavior**

From `frontend`, run:

```powershell
npm run test -- tests\app-loading-spinner.test.tsx
npx vitest run tests\sales-order-create-page.test.tsx -t "renders the sales order form|adds and removes draft detail rows"
```

Expected: all three shared-spinner tests and both selected sales-page tests pass. The sales-order total assertion is excluded from this focused check because its concurrent worktree version has an unrelated whitespace expectation failure.

## Task 3: Verify chunk sizes and document results

**Files:**
- Create: `docs/result/20261026/frontend-large-chunk-code-splitting/20261026_009_frontend_large_chunk_code_splitting_결과.md`
- Create: `docs/result/20261026/frontend-large-chunk-code-splitting/screenshots/sales-order-create.png`

- [ ] **Step 1: Run the frontend production build**

From `frontend`, run:

```powershell
npm run build
```

Expected: TypeScript and Vite succeed without `Some chunks are larger than 1000 kB`. Keep `chunkSizeWarningLimit` at 1,000 kB. Record the final largest chunks; the route-only measurement was `DashboardPage` 476.38 kB and `vendor-exceljs` 929.57 kB.

- [ ] **Step 2: Verify the running screen and capture it**

On the existing S-ERP browser page, verify the `수주등록` heading and selected menu page are visible. Do not submit or modify business data. Save a screenshot under the English-slug result folder.

- [ ] **Step 3: Record results and check the diff**

Record the baseline warning, final chunk sizes, test/build outcomes, browser URL and screenshot in the result report. Run `git diff --check`.

Expected: no whitespace errors, no warning-threshold change, and no edits to `DashboardContent` or `DashboardPage` beyond pre-existing user changes.
