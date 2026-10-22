# Document File Pagination Spinner and Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the incremental file-page loading text with an accessible spinner and keep file metadata legible across light and dark themes.

**Architecture:** Keep behavior in the shared `FileView`. Use a theme-aware root background that preserves the approved white light-mode surface and switches to `background.paper` in dark mode; use the theme's primary-colored MUI spinner as the sole visible incremental loading indicator.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File Structure

- Modify `docs/directions/20261020/20261020_005_document-file-view_작업지시서.md`
  - Append the approved spinner-only paging and dark-theme visibility direction.
- Modify `docs/plan/20261020/20261020_005_document-file-view_계획서.md`
  - Add dated implementation, tests, build, and responsive verification steps.
- Modify `docs/spec/20261020/20261020_005_document-file-view_상세사양서.md`
  - Clarify theme-aware surface behavior and spinner-only incremental loading.
- Modify `frontend/tests/file-view.test.tsx`
  - Assert no visible loading text, an accessible progress indicator, and light/dark surface colors.
- Modify `frontend/src/shared/components/view-mode/FileView.tsx`
  - Render only the spinner for incremental loading and select the list root surface from the active theme.
- Modify `docs/result/20261020/document-file-view/20261020_005_document-file-view_결과서.md`
  - Record test/build outcomes and synthetic-data screenshots for light and dark theme layouts.
- Reuse the approved design: `docs/superpowers/specs/2026-10-20-document-file-pagination-spinner-dark-theme-design.md`.

## Task 1: Update the dated feature documents

**Files:**
- Modify: `docs/directions/20261020/20261020_005_document-file-view_작업지시서.md`
- Modify: `docs/plan/20261020/20261020_005_document-file-view_계획서.md`
- Modify: `docs/spec/20261020/20261020_005_document-file-view_상세사양서.md`

- [x] **Step 1: Add the approved follow-up to the direction**

Append:

```markdown
## 파일 페이지 로딩 및 다크테마 표시 보완

- 다음 파일 페이지를 불러오는 동안 기존 파일 행은 유지하고 안내 문구 없이 접근성 라벨이 있는 로딩 스피너만 표시한다.
- 라이트 테마의 파일 목록 배경은 흰색으로 유지하고 다크 테마에서는 `background.paper` 표면색을 사용한다.
- 텍스트, 파일 아이콘, 행 hover, 스켈레톤은 현재 앱 테마 팔레트의 대비를 따른다.
- 첫 페이지 스켈레톤, 오류·빈 목록·재시도 및 자동 페이징 동작은 변경하지 않는다.
```

- [x] **Step 2: Add the test-first and verification sequence to the dated plan**

Append a section naming `frontend/tests/file-view.test.tsx` and `frontend/src/shared/components/view-mode/FileView.tsx`; require spinner-only and two-theme assertions before implementation, the focused Vitest command, production build, and 375px/768px/1280px browser checks.

- [x] **Step 3: Add the exact UI contract to the detailed specification**

Append a section specifying that incremental loading retains loaded rows, shows an accessible progress spinner with no visible loading text, preserves a white light-mode root, and uses `theme.palette.background.paper` in dark mode. State that other loading/error/empty/pagination states and backend/API behavior do not change.

- [x] **Step 4: Review the three document diffs**

Run: `git --no-pager diff -- docs/directions/20261020/20261020_005_document-file-view_작업지시서.md docs/plan/20261020/20261020_005_document-file-view_계획서.md docs/spec/20261020/20261020_005_document-file-view_상세사양서.md`

Expected: only the approved spinner and theme-visibility follow-up is added; historical requirements remain intact.

## Task 2: Add failing spinner and dark-theme tests

**Files:**
- Modify: `frontend/tests/file-view.test.tsx`

- [x] **Step 1: Assert spinner-only incremental loading**

Update `keeps loaded file rows while showing the incremental loading indicator` to assert a progressbar exists, its parent status is accessible, loaded file content remains visible, and visible loading text is absent:

```tsx
expect(screen.getByTestId('file-view-row')).toHaveTextContent('sample.pdf');
expect(screen.getByRole('status', { name: '파일 페이지 불러오는 중' })).toBeInTheDocument();
expect(screen.getByRole('progressbar')).toBeInTheDocument();
expect(screen.queryByText('파일 불러오는 중')).not.toBeInTheDocument();
expect(screen.queryByTestId('file-view-skeleton')).not.toBeInTheDocument();
```

- [x] **Step 2: Add light- and dark-theme surface tests**

Import `ThemeProvider` from `@mui/material/styles` and the existing `createAppTheme` from `../src/theme/theme`. Verify the existing list root is white under `createAppTheme('light')` and uses the application paper color `rgb(17, 24, 39)` under `createAppTheme('dark')`. In the dark test, render incremental loading and assert the progressbar computed color is `rgb(96, 165, 250)`.

Example dark test:

```tsx
it('uses readable theme surfaces and spinner colors in dark mode', () => {
  const { container } = render(
    <ThemeProvider theme={createAppTheme('dark')}>
      <FileView items={[{
        id: 1, name: 'sample.pdf', ownerLabel: 'Sample User',
        dateLabel: '2026-10-20 09:00', sizeLabel: '1 KB',
      }]} hasNext isLoading error="" onLoadMore={vi.fn()} onRetry={vi.fn()}
        onDownload={vi.fn()} />
    </ThemeProvider>,
  );

  expect(screen.getByLabelText('파일형 첨부파일 목록')).toHaveStyle({
    backgroundColor: 'rgb(17, 24, 39)',
  });
  expect(screen.getByRole('progressbar')).toHaveStyle({ color: 'rgb(96, 165, 250)' });
  expect(screen.getByTestId('file-view-row')).toHaveTextContent('Sample User');
  expect(container).toBeInTheDocument();
});
```

Use a corresponding light-mode wrapper to prove the earlier approved white background remains unchanged.

- [x] **Step 3: Run the focused file view test and verify it fails**

Run: `Set-Location frontend; npm run test -- tests/file-view.test.tsx`

Expected before implementation: spinner-only fails because the text is still rendered and the status has no paging-specific accessible name; dark surface fails because the root is hard-coded to white.

## Task 3: Implement spinner-only paging and theme-aware surface

**Files:**
- Modify: `frontend/src/shared/components/view-mode/FileView.tsx`
- Test: `frontend/tests/file-view.test.tsx`

- [x] **Step 1: Make the root background theme-aware**

Replace `sx={{ bgcolor: 'common.white' }}` with:

```tsx
sx={{
  bgcolor: (theme) => theme.palette.mode === 'dark'
    ? 'background.paper'
    : 'common.white',
}}
```

This preserves the requested light-theme background but prevents pale dark-theme text from rendering on a fixed white surface.

- [x] **Step 2: Remove visible text from the incremental loading status**

Keep the existing branch condition (`isLoading && items.length > 0`) and use only a primary-colored MUI progress indicator inside an accessible status:

```tsx
<Stack
  role="status"
  aria-label="파일 페이지 불러오는 중"
  direction="row"
  sx={{ py: 3, alignItems: 'center', justifyContent: 'center' }}
>
  <CircularProgress size={24} color="primary" aria-label="로딩 중" />
</Stack>
```

Do not change the initial eight-row skeleton, errors, empty message, sentinel, retry controls, or pagination state.

- [x] **Step 3: Run focused UI and page tests**

Run: `Set-Location frontend; npm run test -- tests/file-view.test.tsx tests/document-file-page.test.tsx`

Expected: all tests pass, including no visible paging text, preserved loaded files, accessible spinner, the existing light surface, and the dark paper surface/spinner colors.

- [x] **Step 4: Build the frontend**

Run: `Set-Location frontend; npm run build`

Expected: TypeScript and Vite production build exit successfully. Note any existing chunk-size warning; do not broaden scope to address it.

## Task 4: Verify both themes in the browser and update the result

**Files:**
- Modify: `docs/result/20261020/document-file-view/20261020_005_document-file-view_결과서.md`
- Create: `docs/result/20261020/document-file-view/screenshots/file-view-pagination-light.png`
- Create: `docs/result/20261020/document-file-view/screenshots/file-view-pagination-dark.png`

- [x] **Step 1: Render actual FileView with synthetic data**

Use the existing S-ERP Vite server at port 4173 only after confirming it is the app. Create a temporary preview entry with actual `FileView`, `ThemeProvider`, and `createAppTheme` imports. Render one existing sample row with incremental loading active in both theme modes. Do not use credentials or tenant data.

- [x] **Step 2: Verify light and dark theme states at required viewport widths**

At 375px, 768px, and 1280px, check that the light root remains white, dark root uses the app paper surface, file metadata is legible, and the spinner is visible without loading text. Confirm `document.documentElement.scrollWidth <= clientWidth` in every theme/viewport combination.

- [x] **Step 3: Capture representative theme screenshots**

Save synthetic-data captures at the paths above, using the 1280px viewport. Ensure screenshots show the existing file row and spinner-only state in both themes.

- [x] **Step 4: Remove temporary preview files**

Delete only the temporary preview HTML/TSX/script files created for this verification. Leave the already-running shared Vite server running.

- [x] **Step 5: Record actual verification in the result document**

Append behavior, focused test count/outcome, build outcome and warnings, dark/light viewport measurements, screenshot links, and any limitation. Preserve earlier result history.

- [x] **Step 6: Review the scoped diff**

Run: `git --no-pager diff --check -- docs/directions/20261020/20261020_005_document-file-view_작업지시서.md docs/plan/20261020/20261020_005_document-file-view_계획서.md docs/spec/20261020/20261020_005_document-file-view_상세사양서.md docs/result/20261020/document-file-view/20261020_005_document-file-view_결과서.md frontend/src/shared/components/view-mode/FileView.tsx frontend/tests/file-view.test.tsx`

Expected: only the approved FileView behavior, its tests, and its related documentation/screenshots are changed; unrelated dirty work remains untouched.

## Self-review

- Spec coverage: spinner-only incremental page loading, accessible status, preserved rows, light-mode white surface, dark-mode paper surface, initial skeleton and other states unchanged, tests/build, and responsive screenshots all have explicit steps.
- Placeholder scan: commands, file paths, test assertions, expected results, and screenshot names are concrete.
- Type consistency: `createAppTheme` returns the app MUI theme; `ThemeProvider` wraps existing `FileView` props without changing public types or API contracts.
