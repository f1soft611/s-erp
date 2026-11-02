# 종합현황 문서 액션 조용한 갱신 구현 계획

> **For agentic workers:** Use inline execution task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the existing overview and document detail visible while approval/confirmation success triggers quiet refreshes.

**Architecture:** Add an explicit quiet refresh path to the overview data hook while preserving normal refresh behavior. Pass the quiet option from successful detail actions to the parent, and let the detail feed perform its own quiet reload so the parent does not cause duplicate detail fetches.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library, Vite.

---

### Task 1: Prove overview continuity during a quiet action refresh

**Files:**
- Modify: `frontend/tests/overview-page.test.tsx`

- [ ] Add a test with an initially resolved overview request and a deferred second overview request.
- [ ] Click a summary document, invoke the mocked action-complete callback with `{ quiet: true }`, then assert the previous overview panel and detail remain visible while the second request is unresolved.
- [ ] Resolve the deferred overview with updated confirmation counts and assert the displayed summary updates.
- [ ] Run `cd frontend; npm run test -- tests/overview-page.test.tsx` and confirm the new assertion fails before implementation.

### Task 2: Add quiet overview refresh

**Files:**
- Modify: `frontend/src/pages/dashboard/overview/hooks/useOverviewData.ts`
- Modify: `frontend/src/pages/groupware/OverviewPage.tsx`
- Test: `frontend/tests/overview-page.test.tsx`

- [ ] Track overview refresh requests with a `quiet` flag while keeping request versioning and abort handling.
- [ ] For quiet requests, continue returning the last resolved overview while the new request runs; for normal requests, preserve the current loading skeleton.
- [ ] Expose `refreshQuietly` and use it only when the parent receives `{ quiet: true }`.
- [ ] Do not increment `detailVersion` for quiet callbacks; normal callbacks keep the existing full overview/detail refresh.
- [ ] Run `cd frontend; npm run test -- tests/overview-page.test.tsx` and confirm the continuity test passes.

### Task 3: Make approval and confirmation detail reloads quiet

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/overview-page.test.tsx`
- Test: existing document approval/detail tests covering approve, reference confirm, and final confirm.

- [ ] On successful approval, rejection, return, reference confirmation, and final confirmation, call `onActionComplete({ quiet: true })`.
- [ ] Set the internal detail retry request to `quiet: true` for those successful actions.
- [ ] Keep each action's pending state, success toast, and existing error state unchanged.
- [ ] Run targeted overview and document approval/detail tests.

### Task 4: Validate and document

**Files:**
- Create: `docs/result/20261102/overview-silent-document-actions/result.md`
- Create: `docs/result/20261102/overview-silent-document-actions/screenshots/` (browser output only)

- [ ] Run the related frontend tests, `cd frontend; npm run build`, `cd frontend; npm run lint`, and `git diff --check`.
- [ ] Confirm the app at `127.0.0.1:4173` is the S-ERP server before browser checks; do not interrupt an unrelated server or switch ports.
- [ ] Check the relevant overview/detail behavior at 375px, 768px, and 1280px and save screenshots if the browser verification can run safely.
- [ ] Record implementation, failure behavior, test results, and any browser limitation in the result document.
