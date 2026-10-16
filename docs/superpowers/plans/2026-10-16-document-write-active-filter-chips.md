# Document Write Active Filter Chips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the document-writing page's global reset button with visible hashtag chips whose X buttons independently remove the active filters.

**Architecture:** Keep `scope`, `selectedKind`, and `selectedDocumentId` as the source of truth. Centralize existing scope display labels, expose active filter descriptors and per-filter clear callbacks from the page hook, and render a wrapping toolbar chip row with accessible delete controls; the existing effect performs reloads using remaining filters.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File map

- Modify `frontend/src/pages/groupware/documents/write/data/documentPresentation.ts` to expose the shared scope-label function.
- Modify `frontend/src/pages/groupware/documents/write/components/ApprovalSummaryPanel.tsx` and `DocumentStatusPanel.tsx` to reuse the shared label function without changing display strings.
- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts` to derive active chip labels and independently clear filter state; remove the global-reset-only return API.
- Modify `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx` to replace the reset button with wrapping condition chips and keyboard-accessible X controls.
- Modify `frontend/tests/use-document-write-page.test.tsx` and `frontend/tests/document-write-page.test.tsx` to test hook and real page behavior.
- Update dated work docs under `docs/directions/20261016/`, `docs/plan/20261016/`, and `docs/spec/20261016/`; write actual results to `docs/result/20261016/document-write-filter-chips/`.

## Task 1: Add shared scope labels and hook chip tests

**Files:**
- Modify: `frontend/tests/use-document-write-page.test.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/data/documentPresentation.ts`
- Modify: `frontend/src/pages/groupware/documents/write/components/ApprovalSummaryPanel.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentStatusPanel.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`

- [x] **Step 1: Replace reset-only hook tests with descriptor/delete tests**

Extend the hook test imports with `DocumentApprovalScope` and `DocumentKind`. Replace the two tests that call `resetFilters` with tests for the returned `activeFilterChips` and clear handlers. Use these expected descriptor labels and service calls:

```tsx
expect(result.current.activeFilterChips).toEqual([
  expect.objectContaining({ key: 'scope', label: '#결재 진행 중' }),
  expect.objectContaining({ key: 'kind', label: '#업무연락' }),
]);

act(() => result.current.clearScopeFilter());
await waitFor(() =>
  expect(listDocumentApprovals).toHaveBeenLastCalledWith(
    'ALL',
    'BUSINESS_CONTACT',
    undefined,
  ),
);
expect(result.current.activeFilterChips).toEqual([
  expect.objectContaining({ key: 'kind', label: '#업무연락' }),
]);
```

Add a scope table test for `MY_PENDING`, `IN_PROGRESS`, `DRAFT`, `COMPLETED`, `REVISION_REQUESTED`, `REJECTED` expected labels. Add a document case where summary contains document ID `42` with title `필터 대상 문서`; select it, assert `#필터 대상 문서`, clear document only, and verify request arguments are `('ALL', undefined, undefined)`. Also make summary notices empty after selecting ID 42 and assert the nonblank fallback `#문서 42`. Verify default hook state has `activeFilterChips: []`.

- [x] **Step 2: Run hook tests to verify expected failures**

Run from `frontend`: `npx vitest run tests/use-document-write-page.test.tsx`.

Expected: the new tests fail because chip descriptors and individual clear callbacks do not exist yet.

- [x] **Step 3: Centralize scope display labels**

In `documentPresentation.ts`, import `DocumentApprovalScope` and add one exhaustive label map and getter:

```tsx
const documentApprovalScopeLabels: Record<DocumentApprovalScope, string> = {
  ALL: '전체',
  MY_PENDING: '내가 처리할 결재',
  IN_PROGRESS: '결재 진행 중',
  DRAFT: '작성 중 문서',
  COMPLETED: '승인',
  REVISION_REQUESTED: '보완요청',
  REJECTED: '반려',
};

export function getDocumentApprovalScopeLabel(
  scope: DocumentApprovalScope,
): string {
  return documentApprovalScopeLabels[scope];
}
```

Replace only the inline labels in `ApprovalSummaryPanel.tsx` and `DocumentStatusPanel.tsx` with calls to this getter. Preserve their count ordering, scope codes, text, and button behavior.

- [x] **Step 4: Add typed active descriptors and individual clear callbacks**

In `useDocumentWritePage.ts`, import `getDocumentApprovalScopeLabel` and define a local descriptor type:

```tsx
type ActiveDocumentFilterChip = {
  key: 'scope' | 'kind' | 'document';
  label: string;
  deleteLabel: string;
  onDelete: () => void;
};
```

Define stable callbacks `clearScopeFilter`, `clearKindFilter`, and `clearDocumentFilter` that update only `scope`, `selectedKind`, and `selectedDocumentId`, respectively. Derive descriptors in order `scope`, `kind`, `document`. Prefix display labels with `#`; derive document title from `summary?.notices.find(record => record.electronicApprovalId === selectedDocumentId)?.title`, falling back to `문서 ${selectedDocumentId}`. Use delete labels `결재 범위 필터 ${label} 취소`, `업무구분 필터 ${label} 취소`, and `문서 필터 ${title} 취소` so controls can be located unambiguously. Return the descriptors and clear callbacks. Remove `hasActiveFilters`, `resetFilters`, and all obsolete tests for the removed global reset behavior.

- [x] **Step 5: Re-run hook tests**

Run from `frontend`: `npx vitest run tests/use-document-write-page.test.tsx`.

Expected: scope labels, fallback title, default-empty descriptors, and independent clear requests pass.

## Task 2: Replace the toolbar reset action with removable chips

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`

- [x] **Step 1: Replace global reset page tests with chip interactions**

Replace the two page tests named `returns the filtered ... to all documents` with tests that use the actual MUI filter menu and right-side summary actions:

```tsx
expect(screen.queryByRole('button', { name: '전체 조회' })).not.toBeInTheDocument();
expect(screen.queryByText('#결재 진행 중')).not.toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: /결재 진행 중/ }));
const scopeChip = await screen.findByText('#결재 진행 중');
expect(scopeChip).toBeInTheDocument();
fireEvent.click(
  screen.getByRole('button', { name: '결재 범위 필터 결재 진행 중 취소' }),
);
await waitFor(() =>
  expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
    'ALL',
    undefined,
    undefined,
  ),
);
expect(screen.queryByText('#결재 진행 중')).not.toBeInTheDocument();
```

Add one kind-menu test: open `문서 업무구분 필터`, select `기안서`, expect `#기안서`, click `업무구분 필터 기안서 취소`, and verify the list request is unfiltered. Add a combined state test via the hook or page that proves removing the scope leaves a selected kind in the next request. Keep an existing feed-mode test verifying that chip removal in feed mode calls `listDocumentApprovals('ALL', undefined, undefined, true)` and does not leave feed view. Update setup timeouts on new large page tests to 20000 ms, matching surrounding slow integration tests.

- [x] **Step 2: Run the named page tests to verify expected failures**

Run from `frontend`: `npx vitest run tests/document-write-page.test.tsx --testNamePattern="filter chip|active filter|selected document kind"`.

Expected: the tests fail because the current button exists and no chips are rendered.

- [x] **Step 3: Render filter chips at the existing toolbar position**

In `DocumentWritePage.tsx`, destructure `activeFilterChips` from the hook. Keep `NoticeFilterMenu`; remove the global reset button and render each descriptor as a compact, wrapping hashtag chip:

```tsx
<Stack
  direction="row"
  spacing={0.5}
  sx={{ minWidth: 0, flexWrap: 'wrap', alignItems: 'center' }}
>
  <NoticeFilterMenu {...existing menu props} />
  {activeFilterChips.map((filter) => (
    <Chip
      key={filter.key}
      label={filter.label}
      size="small"
      aria-label={filter.deleteLabel}
      onDelete={filter.onDelete}
      deleteIcon={
        <CloseOutlinedIcon
          aria-hidden="true"
          data-testid={`filter-delete-icon-${filter.key}`}
          fontSize="small"
        />
      }
      sx={{ maxWidth: '100%' }}
    />
  ))}
</Stack>
```

Add only the required MUI and close-icon imports. Do not nest a button inside the deletable Chip: the Chip itself is keyboard-focusable and receives the condition-specific accessible name; the close icon remains decorative, and clicking it or pressing Delete/Backspace invokes the same delete callback. Test both keyboard deletion and clicking the close icon. Keep chip text ellipsizable/wrappable within the toolbar; do not change view mode, list loading, or API calls.

- [x] **Step 4: Run focused hook and page chip tests**

Run from `frontend`: `npx vitest run tests/use-document-write-page.test.tsx tests/document-write-page.test.tsx --testNamePattern="active filter chips|scope filter chip|selected document kind|defaults to list mode and displays approval status and all document kinds|uses the view-specific skeleton while the document list is loading"`.

Expected: all selected chip tests pass, the `전체 조회` button is absent, and feed/list mode remains unchanged.

## Task 3: Final verification and result record

**Files:**
- Create: `docs/result/20261016/document-write-filter-chips/20261016_015_문서작성_활성필터_칩표시_개별취소_결과보고서.md`
- Update: `docs/superpowers/plans/2026-10-16-document-write-active-filter-chips.md`

- [x] **Step 1: Run the related page regressions**

Run from `frontend`: `npx vitest run tests/document-write-page.test.tsx tests/use-document-write-page.test.tsx --testNamePattern="filter chip|active filter|scope label|defaults to list mode|uses the view-specific skeleton"`.

Expected: all matching tests pass. Record any unrelated existing full-suite failures separately; do not fix unrelated behavior.

- [x] **Step 2: Run build and lint**

Run from `frontend`: `npm run build`, then `npx oxlint` with every changed TS/TSX path from this plan.

Expected: build exits 0. Record existing warnings rather than expanding scope.

- [x] **Step 3: Check responsive browser behavior**

Use the existing authenticated S-ERP browser session at `http://127.0.0.1:4173/groupware/doc/write`. At 375px, 768px, and 1280px apply one scope and one kind filter, confirm chip labels and accessible X controls, remove one condition and verify the other persists, then inspect document-width overflow. Save only screenshots actually captured to `docs/result/20261016/document-write-filter-chips/screenshots/`. If redirected to login, record that the browser check and screenshots were blocked; do not start another port or claim visual verification.

- [x] **Step 4: Record results and check the final diff**

Create the result report with exact commands, counts, warnings, browser outcome, and screenshot paths if available. Run `git diff --check`; inspect only the files listed in this plan, preserving every unrelated worktree change.
