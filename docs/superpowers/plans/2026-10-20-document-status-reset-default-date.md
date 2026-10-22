# Document Status Reset Default Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the document-status submitted-date search field to its existing last-month default whenever search conditions are reset, and persist that state.

**Architecture:** Keep using the existing page session snapshot and date-range helper. Reset clears the keyword and other detail values, inserts the default `submittedAt` range, derives the query filters from that snapshot, and saves it for same-tab restoration.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing `usePageSessionState`.

---

## File Structure

- Modify `frontend/tests/document-status-page.test.tsx`
  - Change the reset regression test to assert the default date range in the controls, API request, and persisted session after reset and remount.
- Modify `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx`
  - Make reset produce and apply the same default submitted-date range as first entry.
- Modify `docs/directions/20261020/20261020_008_문서현황_검색조건_세션복원_작업지시서.md`
  - Correct the reset behavior and completion criteria.
- Modify `docs/plan/20261020/20261020_008_문서현황_검색조건_세션복원_계획서.md`
  - Correct the planned reset state and related test expectations.
- Modify `docs/spec/20261020/20261020_008_문서현황_검색조건_세션복원_상세사양서.md`
  - Specify default-date restoration and persistence when reset is used.
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`
  - Document the corrected reset behavior.
- Modify `docs/result/20261020/document-status-search-session/result.md`
  - Record the correction and actual validation results.

### Task 1: Prove reset restores the default submitted-date range

**Files:**
- Modify: `frontend/tests/document-status-page.test.tsx`

- [x] **Step 1: Update the existing reset regression assertions**

In `restores the default submitted date after resetting conditions`, compute the existing default range before clicking reset. Replace the empty-date assertions with checks for the default date range and versioned snapshot:

```ts
const expectedRange = expectedRecentMonthRange(new Date());
await waitFor(() => {
  expect(getListRequest().get('submittedAtFrom')).toBe(expectedRange.from);
  expect(getListRequest().get('submittedAtTo')).toBe(expectedRange.to);
});
expect(getListRequest().has('keyword')).toBe(false);
expect(getListRequest().has('title')).toBe(false);
await waitFor(() => {
  expect(JSON.parse(
    window.sessionStorage.getItem('s-erp:page:document-status') ?? '{}',
  )).toEqual({
    version: 1,
    value: {
      keyword: '',
      detailValues: { submittedAt: expectedRange },
    },
  });
});
```

After the reset and again after remount, open 상세검색 and assert that the `결재신청일 시작일` and `결재신청일 종료일` textboxes equal `expectedRange.from` and `expectedRange.to`. Also verify the latest list request contains both dates and has no `title` or `keyword`.

- [x] **Step 2: Run the focused test and confirm the expected failure**

Run from `frontend`:

```powershell
npx vitest run tests/document-status-page.test.tsx -t "restores the default submitted date"
```

Expected: the reset regression fails because reset currently stores empty `detailValues` and omits `submittedAtFrom`/`submittedAtTo`. Preserve and report the unrelated pre-existing `updatedAt` field-metadata failure.

### Task 2: Apply and persist the default range on reset

**Files:**
- Modify: `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx`

- [x] **Step 1: Update the reset callback**

Use the existing `getDefaultSubmittedAtRange` calculation at reset time and construct one reset snapshot for UI, session, and API filters:

```ts
const resetSearch = useCallback(() => {
  const resetDetailValues = { submittedAt: getDefaultSubmittedAtRange() };
  const resetSnapshot = {
    keyword: '',
    detailValues: resetDetailValues,
  };
  setKeyword('');
  setDetailValues(resetDetailValues);
  setSearchSession(resetSnapshot);
  setAppliedFilters(
    toDocumentStatusFilters(
      resetSnapshot.keyword,
      resetSnapshot.detailValues,
    ),
  );
}, [setSearchSession]);
```

- [x] **Step 2: Run the focused test and verify the reset behavior**

Run:

```powershell
npx vitest run tests/document-status-page.test.tsx -t "restores the default submitted date"
```

Expected: the reset control values, session snapshot, and list request use the recent-month range. The focused reset test passed.

### Task 3: Align requirements and record verification

**Files:**
- Modify: the dated direction, plan, detailed specification, F1-Grid documentation, and result document listed above.

- [x] **Step 1: Update reset requirements consistently**

Replace the prior “empty snapshot/no date filters after reset” language with: reset clears keyword and all non-date detail conditions, restores the recent-month `submittedAt` range, immediately queries with that range, and persists the resulting snapshot for same-tab restoration. Keep the first-visit default and reset using the same date-range rule.

- [x] **Step 2: Run the frontend build and diff checks**

Run:

```powershell
Set-Location frontend
npm run build
Set-Location ..
git --no-pager diff --check
```

Expected: TypeScript/Vite build succeeds; record any existing bundle-size warning and the known target-test failure accurately.

- [x] **Step 3: Record final verification**

Update `docs/result/20261020/document-status-search-session/result.md` with the corrected reset behavior, focused test result, build result, `git diff --check`, and browser-verification limitation. No UI layout changed; do not introduce unrelated screenshots or files.

## Self-Review

- The approved design’s reset behavior, initial default, immediate query, and session restore requirements are all covered by Tasks 1–3.
- API and database contracts remain unchanged.
- Test assertions compare the same `expectedRange` to UI, request parameters, and session contents.
