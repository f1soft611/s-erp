# F1-Grid Loading Spinner Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the F1-Grid loading spinner to the S-ERP first-access spinner while making it clearer against grid contents.

**Architecture:** Keep the common F1Grid overlay and existing loading contract. Render the same 34px MUI CircularProgress with default thickness and theme color as DashboardPage, and replace the low-opacity dark overlay with the theme `background.default` at 0.84 alpha. Update the existing regression test and F1-GRID usage documentation; no page-specific loading logic changes.

**Tech Stack:** React, TypeScript, MUI, Vitest, Vite.

---

## File Map

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: Shared overlay style and CircularProgress props.
- `frontend/tests/f1-grid.test.tsx`: Regression coverage for loader shape, theme surface, and existing loading semantics.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: Public documentation for the `loading` prop.
- `docs/result/20261026/f1-grid-loading-spinner/`: Browser screenshots and verification report.
- `docs/directions/20261026/20261026_002_f1-grid_spinner_visibility_작업지시서.md`: Approved request and acceptance criteria.
- `docs/plan/20261026/20261026_002_f1-grid_spinner_visibility_계획서.md`: Project plan.
- `docs/spec/20261026/20261026_002_f1-grid_spinner_visibility_상세사양서.md`: Detailed UI and test contract.

### Task 1: Add a failing loading-style regression test

**Files:**
- Modify: `frontend/tests/f1-grid.test.tsx:290-311`

- [ ] **Step 1: Extend the current loading test**

Wrap the existing loading `F1Grid` in the already imported `ThemeProvider` with `createAppTheme('light')`. Keep its existing assertions for `aria-busy`, the overlay test id, and no skeleton rows. Add assertions for the MUI loader dimensions and light-theme surface color:

```tsx
const theme = createAppTheme('light');
const { rerender } = render(
  <ThemeProvider theme={theme}>
    <F1Grid
      rows={rows}
      columns={columns}
      rowKey="id"
      ariaLabel="grid loading overlay"
      loading
    />
  </ThemeProvider>,
);

const overlay = screen.getByTestId('f1-grid-loading-overlay');
const progress = screen.getByRole('progressbar');
const progressCircle = progress.querySelector('circle');
expect(overlay).toBeInTheDocument();
expect(progress).toHaveStyle({ width: '34px', height: '34px' });
expect(progressCircle).not.toBeNull();
expect(progressCircle).toHaveStyle({ strokeWidth: '3.6' });
expect(getComputedStyle(overlay).backgroundColor).toBe(
  'rgba(244, 247, 251, 0.84)',
);

rerender(
  <ThemeProvider theme={theme}>
    <F1Grid
      rows={rows}
      columns={columns}
      rowKey="id"
      ariaLabel="grid loading overlay"
    />
  </ThemeProvider>,
);
expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
expect(screen.getByRole('grid')).not.toHaveAttribute('aria-busy');
const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
expect(codeCell).toBeInTheDocument();
fireEvent.doubleClick(codeCell);
expect(screen.getByDisplayValue('DASH')).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and confirm the regression**

Run from `frontend`: `npm run test -- tests/f1-grid.test.tsx`.

Expected: the existing loading assertions, 34px dimensions, and transition-to-editable-row assertions pass. The new default stroke-width assertion fails on the current explicit 4px thickness, and the theme-surface color assertion fails on the current `rgba(15, 23, 42, 0.08)` overlay.

### Task 2: Align the shared F1Grid loader

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx` at the loading overlay around lines 2980-2996.
- Test: `frontend/tests/f1-grid.test.tsx`

- [ ] **Step 1: Use a theme-aware backdrop**

Import `alpha` from `@mui/material/styles`. In the existing overlay `sx`, replace the fixed dark background with:

```tsx
backgroundColor: (theme) => alpha(theme.palette.background.default, 0.84),
```

Keep `position`, `inset`, `zIndex`, flex centering, `pointerEvents`, and `aria-live` unchanged.

- [ ] **Step 2: Match DashboardPage’s spinner defaults**

Change the existing `CircularProgress` to:

```tsx
<CircularProgress size={34} />
```

Do not add a `thickness`, color, label text, or other visual treatment. This matches DashboardPage’s first-access loader.

- [ ] **Step 3: Re-run the focused test**

Run from `frontend`: `npm run test -- tests/f1-grid.test.tsx`.

Expected: PASS, including the 34px loader, default 3.6px stroke width, and light-theme overlay assertions. Existing skeleton, aria, and interaction expectations remain unchanged.

### Task 3: Update F1-GRID documentation

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md` near the `loading` option description around line 128.

- [ ] **Step 1: Document the shared visual contract**

Extend the `loading` description to state that the prop keeps the existing grid-wide input-blocking overlay, centers a 34px MUI spinner using the default thickness and theme color, and uses a translucent `background.default` surface. Note that F1Tree inherits this behavior through F1Grid and page loading policies remain unchanged.

- [ ] **Step 2: Review documentation consistency**

Read the updated `loading` entry together with the nearby sections describing page-owned loading and save/refresh behavior. Ensure no statement says that page callers or backend behavior changed.

### Task 4: Verify and capture the browser result

**Files:**
- Create: `docs/result/20261026/f1-grid-loading-spinner/20261026_002_f1-grid_spinner_visibility_결과.md`
- Create: `docs/result/20261026/f1-grid-loading-spinner/screenshots/` with 375px, 768px, and 1280px captures.

- [ ] **Step 1: Run the focused test**

From `frontend`, run:

npm run test -- tests/f1-grid.test.tsx

Expected: the focused F1-Grid test file exits with code 0.

- [ ] **Step 2: Build the frontend**

From `frontend`, run `npm run build`.

Expected: TypeScript and Vite build exit with code 0.

- [ ] **Step 3: Verify and capture 375px**

Open `/f1-grid-docs`, use the Large Data Playground's `1,000 rows` control to exercise its existing loading state, and capture the loading grid at a 375px viewport. Verify the overlay stays within the grid and does not create page-level horizontal overflow. Save `screenshots/loading-375.png`.

- [ ] **Step 4: Verify and capture 768px**

At a 768px viewport, repeat the same existing loading interaction. Verify the spinner remains centered and the overlay remains within the grid. Save `screenshots/loading-768.png`.

- [ ] **Step 5: Verify and capture 1280px**

At a 1280px viewport, repeat the same existing loading interaction. Verify the spinner remains centered and the overlay remains within the grid. Save `screenshots/loading-1280.png`. At each viewport, confirm loading completion restores the ordinary grid.

- [ ] **Step 6: Record evidence**

Write the exact test/build outcomes, browser surface, viewport sizes, screenshot paths, and DB/API non-impact in the result report. Do not claim browser coverage for a size that was not captured.

## Scope Guard

- Do not modify `GridRow.tsx` or the concurrent F1-Grid render-performance work.
- Do not change the existing loading state contract, skeleton/body behavior, page loading policies, or F1Tree implementation.
- Do not modify backend, API, or database files.
