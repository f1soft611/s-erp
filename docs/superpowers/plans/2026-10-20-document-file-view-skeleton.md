# Document File View Skeleton Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show file-shaped skeleton rows during the initial file-view request while preserving the existing rows and bottom progress indicator during later page requests.

**Architecture:** Keep the change inside the shared `FileView` component. Reuse MUI `Skeleton` and the component's existing responsive grid columns, selecting the initial skeleton only when loading has no loaded rows; retain the existing spinner for incremental loading.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File Structure

- Modify `docs/directions/20261020/20261020_005_document-file-view_작업지시서.md`
  - Record the approved initial and incremental loading behavior in the existing source direction.
- Modify `docs/plan/20261020/20261020_005_document-file-view_계획서.md`
  - Add the follow-up implementation and verification steps without changing prior history.
- Modify `docs/spec/20261020/20261020_005_document-file-view_상세사양서.md`
  - Specify the initial skeleton structure, page-loading distinction, and unchanged states.
- Modify `frontend/tests/file-view.test.tsx`
  - Assert the initial skeleton and the non-destructive incremental loading indicator.
- Modify `frontend/src/shared/components/view-mode/FileView.tsx`
  - Render the initial loading skeleton while retaining the existing incremental progress UI.
- Modify `docs/result/20261020/document-file-view/20261020_005_document-file-view_결과서.md`
  - Record focused tests, build, and responsive browser verification; add synthetic-data screenshots under the existing screenshots directory.
- Reuse the approved design: `docs/superpowers/specs/2026-10-20-document-file-view-skeleton-design.md`.

## Task 1: Update dated direction, plan, and detailed specification

**Files:**
- Modify: `docs/directions/20261020/20261020_005_document-file-view_작업지시서.md`
- Modify: `docs/plan/20261020/20261020_005_document-file-view_계획서.md`
- Modify: `docs/spec/20261020/20261020_005_document-file-view_상세사양서.md`

- [x] **Step 1: Add the approved behavior to the direction**

Append a follow-up section stating:

```markdown
## 파일형 스켈레톤 로딩 보완

- 최초 파일 페이지를 불러오는 동안에는 이름·소유자·올린 날짜·크기의 머리글과 파일 행 형태의 스켈레톤 8개를 표시한다.
- 다음 페이지 로딩 중에는 이미 표시된 파일 행을 유지하고 목록 아래의 기존 진행 표시를 사용한다.
- 오류·빈 결과·마지막 페이지·자동 페이지 로딩 및 흰색 목록 배경 동작은 유지한다.
```

- [x] **Step 2: Add the implementation and test sequence to the dated plan**

Append a follow-up section naming `FileView.tsx` and `file-view.test.tsx`; require a failing initial-skeleton assertion before implementation, a passing incremental-loading regression, focused Vitest execution, production build, and synthetic-data browser checks at 375px, 768px, and 1280px.

- [x] **Step 3: Add the detailed UI contract to the dated specification**

Append a file-view loading section that states the initial skeleton replaces the initial spinner only when `items.length === 0`; it retains the current desktop columns, follows the current mobile row layout, and does not change subsequent-page loading, errors, empty state, or end-of-list behavior.

- [x] **Step 4: Review the documentation changes**

Run: `git --no-pager diff -- docs/directions/20261020/20261020_005_document-file-view_작업지시서.md docs/plan/20261020/20261020_005_document-file-view_계획서.md docs/spec/20261020/20261020_005_document-file-view_상세사양서.md`

Expected: only the approved skeleton-loading follow-up is added; existing requirements and historical verification remain intact.

## Task 2: Specify loading behavior with regression tests

**Files:**
- Modify: `frontend/tests/file-view.test.tsx`

- [x] **Step 1: Replace the initial loading text expectation with a skeleton assertion**

In `shows empty, loading and end states`, keep the empty-state assertion before rerender, then assert the loading render exposes the named status and exactly eight skeleton rows:

```tsx
rerender(<FileView {...props} isLoading />);
expect(screen.getByRole('status', { name: '파일 불러오는 중' })).toBeInTheDocument();
expect(screen.getByTestId('file-view-skeleton').querySelectorAll('[data-testid="file-view-skeleton-row"]'))
  .toHaveLength(8);
expect(screen.queryByText('첨부파일이 없습니다.')).not.toBeInTheDocument();
```

- [x] **Step 2: Add a regression test for incremental loading**

Add a test with one existing file and `isLoading` true; verify the file row and file name remain visible, `파일 불러오는 중` is announced, and no initial skeleton is rendered:

```tsx
it('keeps loaded file rows while showing the incremental loading indicator', () => {
  const item = {
    id: 1, name: 'sample.pdf', ownerLabel: 'Sample User',
    dateLabel: '2026-10-20 09:00', sizeLabel: '1 KB',
  };
  render(<FileView items={[item]} hasNext isLoading error=""
    onLoadMore={vi.fn()} onRetry={vi.fn()} onDownload={vi.fn()} />);

  expect(screen.getByTestId('file-view-row')).toHaveTextContent('sample.pdf');
  expect(screen.getByRole('status')).toHaveTextContent('파일 불러오는 중');
  expect(screen.queryByTestId('file-view-skeleton')).not.toBeInTheDocument();
});
```

- [x] **Step 3: Run the focused test and confirm the new initial-skeleton assertion fails**

Run: `Set-Location frontend; npm run test -- tests/file-view.test.tsx`

Expected before implementation: the incremental-loading test passes, while the initial-loading assertion fails because `FileView` still renders the spinner and has no skeleton.

## Task 3: Implement the file-row skeleton

**Files:**
- Modify: `frontend/src/shared/components/view-mode/FileView.tsx`
- Test: `frontend/tests/file-view.test.tsx`

- [x] **Step 1: Import MUI Skeleton**

Add `Skeleton` to the existing `@mui/material` import. Retain `CircularProgress` because incremental page requests continue to use it.

- [x] **Step 2: Render eight responsive skeleton rows for the initial request**

Replace the single unconditional loading block with an initial-skeleton branch and the existing progress stack for loaded rows:

```tsx
{isLoading && items.length === 0 ? (
  <Stack role="status" aria-label="파일 불러오는 중" data-testid="file-view-skeleton">
    {Array.from({ length: 8 }).map((_, index) => (
      <Box key={index} data-testid="file-view-skeleton-row" sx={{
        display: 'grid', gridTemplateColumns: columns, alignItems: 'center',
        columnGap: 1.5, rowGap: 0.5, px: 1.5, py: 1.25,
        borderBottom: 1, borderColor: 'divider', minWidth: 0,
      }}>
        <Stack direction="row" spacing={1.25} sx={{ minWidth: 0, alignItems: 'center' }}>
          <Skeleton variant="rounded" width={22} height={26} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Skeleton variant="text" width={`${55 + (index % 4) * 10}%`} height={24} />
            <Skeleton variant="text" width="70%" height={18}
              sx={{ display: { xs: 'block', md: 'none' } }} />
          </Box>
        </Stack>
        <Skeleton variant="text" width="72px" height={22}
          sx={{ display: { xs: 'none', md: 'block' } }} />
        <Skeleton variant="text" width="104px" height={22}
          sx={{ display: { xs: 'none', md: 'block' } }} />
        <Skeleton variant="text" width="42px" height={22}
          sx={{ display: { xs: 'none', md: 'block' } }} />
        {onOpenSource && <Skeleton variant="circular" width={32} height={32} />}
      </Box>
    ))}
  </Stack>
) : isLoading ? (
  <Stack role="status" direction="row" spacing={1} sx={{
    py: 3, alignItems: 'center', justifyContent: 'center',
  }}>
    <CircularProgress size={20} />
    <Typography variant="body2">파일 불러오는 중</Typography>
  </Stack>
) : null}
```

Keep the current table header outside this conditional so it remains visible during the initial skeleton. Leave the error, empty-state, sentinel, white background, and hover code unchanged.

- [x] **Step 3: Run focused UI and page tests**

Run: `Set-Location frontend; npm run test -- tests/file-view.test.tsx tests/document-file-page.test.tsx`

Expected: all tests in both files pass, including the eight-row initial skeleton and retained-row incremental loading assertions.

- [x] **Step 4: Build the frontend**

Run: `Set-Location frontend; npm run build`

Expected: TypeScript project build and Vite production build succeed. Existing unrelated baseline test failures are not part of this focused command.

## Task 4: Verify responsive rendering and document the result

**Files:**
- Modify: `docs/result/20261020/document-file-view/20261020_005_document-file-view_결과서.md`
- Create: `docs/result/20261020/document-file-view/screenshots/file-view-loading-375.png`
- Create: `docs/result/20261020/document-file-view/screenshots/file-view-loading-768.png`
- Create: `docs/result/20261020/document-file-view/screenshots/file-view-loading-1280.png`

- [x] **Step 1: Verify the actual rendered component with synthetic file data**

Use the existing S-ERP Vite server only after confirming it is the app on port 4173. If the existing page requires login, use a temporary local preview with synthetic FileView props rather than real credentials or tenant data; remove the temporary preview after capturing screenshots.

- [x] **Step 2: Check the required viewports**

At 375px, 768px, and 1280px, verify the header, eight initial skeleton rows, white list surface, no page-level horizontal overflow, and the desktop metadata column alignment. Also verify an incremental-loading preview retains its loaded rows and shows the bottom progress indicator.

- [x] **Step 3: Save the synthetic-data screenshots**

Save the three viewport captures at the paths listed above. Do not include real file names, document content, account details, or tenant data.

- [x] **Step 4: Add a dated result section**

Record the implemented distinction between initial and incremental loading, focused test and build commands with their actual outcomes, viewport checks, screenshot links, and any limitation. Preserve the pre-existing baseline-test limitations in the result document.

- [x] **Step 5: Review the final scoped diff**

Run: `git --no-pager status --short; git --no-pager diff -- frontend/src/shared/components/view-mode/FileView.tsx frontend/tests/file-view.test.tsx docs/directions/20261020/20261020_005_document-file-view_작업지시서.md docs/plan/20261020/20261020_005_document-file-view_계획서.md docs/spec/20261020/20261020_005_document-file-view_상세사양서.md docs/result/20261020/document-file-view/20261020_005_document-file-view_결과서.md`

Expected: this task changes only its listed files; unrelated pre-existing worktree changes remain untouched.

## Self-review

- Spec coverage: initial eight-row skeleton, existing desktop/mobile file layout, retained incremental progress, unchanged error/empty/end behavior, focused tests/build, and 375/768/1280 synthetic-data browser verification are all assigned to tasks.
- Placeholder scan: no TODO/TBD steps; commands, paths, expected outcomes, and test assertions are specified.
- Type consistency: `FileView` uses its existing `items`, `isLoading`, `onOpenSource`, and responsive `columns` values; no API, type, or hook contract changes are introduced.
