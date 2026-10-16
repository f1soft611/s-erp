# Document Write Filter Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users restore the complete document list from any active document-writing filter in both feed and list modes.

**Architecture:** `useDocumentWritePage` will expose whether any list filter is active and one callback that resets scope, kind, and selected document ID. `DocumentWritePage` will conditionally show an accessible `전체 조회` button beside the existing kind filter; its existing effect will reload using the current view mode and default filters.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File map

- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts` to derive filter activity and reset all filter state together.
- Modify `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx` to render the reset action in the shared toolbar without changing view mode.
- Test `frontend/tests/use-document-write-page.test.tsx` for state transitions and list service arguments.
- Test `frontend/tests/document-write-page.test.tsx` for user-visible control behavior and preserving feed/list mode.
- Create the dated work instruction, project plan, detailed spec, and result report under `docs/directions/20261016/`, `docs/plan/20261016/`, `docs/spec/20261016/`, and `docs/result/20261016/document-write-filter-reset/`.

## Task 1: Prove the hook reset behavior

**Files:**
- Modify: `frontend/tests/use-document-write-page.test.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`

- [x] **Step 1: Add a failing reset test**

In the existing `describe('useDocumentWritePage notice metadata', ...)`, add a separate `describe('filter reset', ...)`. Start from a loaded hook, apply a scope and kind, reset, then verify default state and that the latest list request uses default arguments:

```tsx
const emptySummary: DocumentApprovalSummary = {
  actionRequiredCount: 0,
  inProgressCount: 0,
  draftCount: 0,
  completedCount: 0,
  revisionRequestedCount: 0,
  rejectedCount: 0,
  notices: [],
};

it('resets the scope and kind and reloads the unfiltered list', async () => {
  vi.mocked(getDocumentApprovalSummary).mockResolvedValue(emptySummary);
  const { result } = renderHook(() => useDocumentWritePage());
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => {
    result.current.selectScope('IN_PROGRESS');
    result.current.setSelectedKind('업무연락');
  });
  await waitFor(() =>
    expect(listDocumentApprovals).toHaveBeenLastCalledWith(
      'IN_PROGRESS',
      'BUSINESS_CONTACT',
      undefined,
    ),
  );

  act(() => result.current.resetFilters());
  await waitFor(() =>
    expect(listDocumentApprovals).toHaveBeenLastCalledWith(
      'ALL',
      undefined,
      undefined,
    ),
  );
  expect(result.current.scope).toBe('ALL');
  expect(result.current.selectedKind).toBe('');
  expect(result.current.hasActiveFilters).toBe(false);
});

it('clears a specific document selection', async () => {
  vi.mocked(getDocumentApprovalSummary).mockResolvedValue(emptySummary);
  const { result } = renderHook(() => useDocumentWritePage());
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  act(() => result.current.selectNotice(42));
  await waitFor(() =>
    expect(listDocumentApprovals).toHaveBeenLastCalledWith(
      'ALL',
      undefined,
      42,
    ),
  );

  act(() => result.current.resetFilters());
  await waitFor(() =>
    expect(listDocumentApprovals).toHaveBeenLastCalledWith(
      'ALL',
      undefined,
      undefined,
    ),
  );
});
```

Import `act` from Testing Library and `DocumentApprovalSummary` from the page types in addition to the file's existing imports.

- [x] **Step 2: Run the hook test and confirm it fails**

Run from `frontend`: `npm run test -- tests/use-document-write-page.test.tsx`.

Expected: the new test fails because `resetFilters` and `hasActiveFilters` are not yet returned by the hook.

- [x] **Step 3: Implement one reset callback and derived activity**

In `useDocumentWritePage`, define the derived flag from the three existing filter values and add a memoized callback that resets all filter values:

```tsx
const hasActiveFilters =
  scope !== 'ALL' || selectedKind !== '' || selectedDocumentId !== undefined;
const resetFilters = useCallback(() => {
  setScope('ALL');
  setSelectedKind('');
  setSelectedDocumentId(undefined);
}, []);
```

Return both `hasActiveFilters` and `resetFilters`. Do not modify `viewMode`, `detailDocumentId`, `refresh`, or the existing list effect.

- [x] **Step 4: Re-run the hook test**

Run from `frontend`: `npm run test -- tests/use-document-write-page.test.tsx`.

Expected: all hook tests pass; the final service call has default scope, kind, and document ID.

## Task 2: Add and verify the toolbar action

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`

- [x] **Step 1: Add a failing page interaction test**

Add a test in `describe('Document write page', ...)` that verifies the button is initially absent, selects the `결재 진행 중` summary action, waits for the scoped request, clicks `전체 조회`, and confirms the button disappears and the list request returns to `('ALL', undefined, undefined)`:

```tsx
expect(screen.queryByRole('button', { name: '전체 조회' })).not.toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: /결재 진행 중/ }));
await waitFor(() =>
  expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
    'IN_PROGRESS',
    undefined,
    undefined,
  ),
);
fireEvent.click(await screen.findByRole('button', { name: '전체 조회' }));
await waitFor(() =>
  expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
    'ALL',
    undefined,
    undefined,
  ),
);
expect(screen.queryByRole('button', { name: '전체 조회' })).not.toBeInTheDocument();
```

Add a separate feed-mode test using the existing `피드형 보기` button name. Switch to feed mode before selecting the summary scope, click `전체 조회`, then verify:

```tsx
expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
  'ALL',
  undefined,
  undefined,
  true,
);
expect(screen.getByTestId('document-feed')).toBeInTheDocument();
expect(screen.queryByTestId('document-list')).not.toBeInTheDocument();
```

- [x] **Step 2: Run the page test and confirm it fails**

Run from `frontend`: `npm run test -- tests/document-write-page.test.tsx`.

Expected: the initial no-button assertion passes, but the new interaction fails because the `전체 조회` control is not implemented.

- [x] **Step 3: Connect the toolbar control**

Destructure `hasActiveFilters` and `resetFilters` from `useDocumentWritePage`. In the `filterAction` passed to `PinnedViewToolbar`, keep `NoticeFilterMenu` and add a small grouped button only when active:

```tsx
<Stack
  direction="row"
  spacing={0.5}
  sx={{ minWidth: 0, flexWrap: 'wrap', alignItems: 'center' }}
>
  <NoticeFilterMenu
    ariaLabel="문서 업무구분 필터"
    filters={documentKinds.map((kind) => ({ code: kind, name: kind }))}
    selectedCode={selectedKind}
    onChange={(code) => setSelectedKind(code as DocumentKind | '')}
  />
  {hasActiveFilters && (
    <Button
      size="small"
      onClick={resetFilters}
      sx={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
    >
      전체 조회
    </Button>
  )}
</Stack>
```

Keep the menu props unchanged, use the existing `Stack`, `Button`, and `DocumentKind` imports, and do not change `viewMode`. The action must remain keyboard accessible with the name `전체 조회`.

- [x] **Step 4: Re-run page and hook tests**

Run from `frontend`: `npm run test -- tests/document-write-page.test.tsx tests/use-document-write-page.test.tsx`.

Expected: all focused tests pass, including existing page behavior and the new reset scenarios.

## Task 3: Validate, document, and capture

**Files:**
- Modify: `docs/directions/20261016/20261016_012_문서작성_전체조회_필터초기화_작업지시서.md`
- Modify: `docs/plan/20261016/20261016_012_문서작성_전체조회_필터초기화_계획서.md`
- Modify: `docs/spec/20261016/20261016_012_문서작성_전체조회_필터초기화_상세사양서.md`
- Create: `docs/result/20261016/document-write-filter-reset/20261016_012_문서작성_전체조회_필터초기화_결과보고서.md`

- [x] **Step 1: Run the production build**

Run from `frontend`: `npm run build`.

Expected: TypeScript and Vite production build complete successfully.

- [ ] **Step 2: Verify responsive browser behavior**

Blocked: the existing S-ERP URL redirected to `/login`. The authenticated page could not be reached, so the 375px/768px/1280px browser checks and screenshots were not completed. Do not start an alternate-port browser server or store login credentials.

- [x] **Step 3: Record actual outcomes**

Create the result report with the completed test/build commands, browser widths that were actually verified, screenshot paths, and any environment limitation. Do not claim a browser check or screenshot that could not be completed.

- [x] **Step 4: Check the final diff**

Run `git diff --check` and inspect only the files changed for this work. Preserve all pre-existing worktree changes and do not stage or commit unrelated files.
