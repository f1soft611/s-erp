# F1-Grid Shared Spinner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use one reusable 34px spinner component in DashboardPage and F1Grid, with the F1Grid overlay rendered at a thinner 1.8px stroke.

**Architecture:** Add `AppLoadingSpinner` as the shared MUI spinner component with a fixed 34px size, theme color, and default 3.6px thickness. DashboardPage uses its default; F1Grid supplies 1.8px inside the existing shared loading overlay, which also covers F1Tree consumers. Preserve the theme-background overlay, input blocking, accessibility state, and all loading lifecycles.

**Tech Stack:** React, TypeScript, MUI, Vitest, Vite.

---

## File Map

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: Shared overlay style and CircularProgress props.
- `frontend/src/shared/components/AppLoadingSpinner.tsx`: Shared 34px MUI spinner, defaulting to 3.6px and accepting a grid-specific thickness override.
- `frontend/src/pages/dashboard/DashboardPage.tsx`: Replace its inline first-access CircularProgress with the shared component default.
- `frontend/tests/app-loading-spinner.test.tsx`: Verify the shared component's 34px size, default thickness, and explicit thickness override.
- `frontend/tests/f1-grid.test.tsx`: Regression coverage for loader shape, theme surface, and existing loading semantics.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: Public documentation for the `loading` prop.
- `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts` and `f1GridDocs.ts`: Loading prop descriptions in the in-app documentation portal.
- `docs/result/20261026/f1-grid-loading-spinner/`: Browser screenshots and verification report.
- `docs/directions/20261026/20261026_002_f1-grid_spinner_visibility_작업지시서.md`: Approved request and acceptance criteria.
- `docs/plan/20261026/20261026_002_f1-grid_spinner_visibility_계획서.md`: Project plan.
- `docs/spec/20261026/20261026_002_f1-grid_spinner_visibility_상세사양서.md`: Detailed UI and test contract.

### Task 1: Add a failing loading-style regression test

**Files:**
- Modify: `frontend/tests/f1-grid.test.tsx:290-311`

- [x] **Step 1: Expect the selected grid stroke thickness**

Keep the existing loading `F1Grid` render in `ThemeProvider` with `createAppTheme('light')`. Rename its test to `uses the thinner shared spinner and restores grid editing after loading`; retain `aria-busy`, overlay, no-skeleton, 34px, background, and edit-restoration assertions, and expect a `1.8` stroke:

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
expect(progressCircle).toHaveAttribute('stroke-width', '1.8');
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

- [x] **Step 2: Run the focused test and confirm the regression**

Run from `frontend`: `npx vitest run tests/f1-grid.test.tsx -t "uses the thinner shared spinner"`.

Expected: the loading overlay, size, surface color, and edit-restoration assertions pass; the revised stroke-width assertion fails because F1Grid currently renders 3.6px.

### Task 2: Add and adopt the shared spinner component

**Files:**
- Create: `frontend/src/shared/components/AppLoadingSpinner.tsx`
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx` at the loading overlay around lines 2980-2996.
- Test: `frontend/tests/f1-grid.test.tsx`
- Test: `frontend/tests/app-loading-spinner.test.tsx`

- [x] **Step 1: Implement the shared component with one explicit default**

Create a focused component that keeps the common surface and color from MUI and makes the base appearance explicit:

```tsx
import { CircularProgress } from '@mui/material';

type AppLoadingSpinnerProps = {
  thickness?: number;
};

export function AppLoadingSpinner({
  thickness = 3.6,
}: AppLoadingSpinnerProps) {
  return <CircularProgress size={34} thickness={thickness} />;
}
```

- [x] **Step 2: Replace both inline spinner instances**

Import `AppLoadingSpinner` into `DashboardPage.tsx` and render `<AppLoadingSpinner />` for the initial loader. In `F1Grid.tsx`, remove the direct `CircularProgress` import and render `<AppLoadingSpinner thickness={1.8} />` inside the current overlay. Keep the overlay's `position`, `inset`, `zIndex`, flex centering, `pointerEvents`, `aria-live`, and `alpha(theme.palette.background.default, 0.84)` unchanged.

- [x] **Step 3: Verify the common component contract**

Create `frontend/tests/app-loading-spinner.test.tsx` with this default-and-override contract test:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppLoadingSpinner } from '../src/shared/components/AppLoadingSpinner';

describe('AppLoadingSpinner', () => {
  it('uses the 34px size with a 3.6px default and supports a thinner override', () => {
    render(
      <>
        <AppLoadingSpinner />
        <AppLoadingSpinner thickness={1.8} />
      </>,
    );

    const progressbars = screen.getAllByRole('progressbar');
    expect(progressbars).toHaveLength(2);
    for (const progressbar of progressbars) {
      expect(progressbar).toHaveStyle({ width: '34px', height: '34px' });
    }
    const defaultCircle = progressbars[0].querySelector('circle');
    const overrideCircle = progressbars[1].querySelector('circle');
    expect(defaultCircle).not.toBeNull();
    expect(overrideCircle).not.toBeNull();
    expect(defaultCircle).toHaveAttribute(
      'stroke-width',
      '3.6',
    );
    expect(overrideCircle).toHaveAttribute(
      'stroke-width',
      '1.8',
    );
  });
});
```

Run `npm run test -- tests/app-loading-spinner.test.tsx` and `npx vitest run tests/f1-grid.test.tsx -t "uses the thinner shared spinner"` from `frontend`.

Expected: PASS, including the dashboard-equivalent default, thinner F1Grid override, backdrop color, loading accessibility, and restored editing. Existing skeleton and body behavior remain unchanged.

### Task 3: Update F1-GRID documentation

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md` near the `loading` option description around line 128.
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts` at the loading property entry.
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts` at the two F1Grid loading property entries.
- Modify: `docs/directions/20261026/20261026_002_f1-grid_spinner_visibility_작업지시서.md`
- Modify: `docs/plan/20261026/20261026_002_f1-grid_spinner_visibility_계획서.md`
- Modify: `docs/spec/20261026/20261026_002_f1-grid_spinner_visibility_상세사양서.md`

- [x] **Step 1: Document the shared visual contract**

Update each loading description to state that the prop keeps the existing grid-wide input-blocking overlay, centers the shared 34px spinner at 1.8px thickness with the theme color, and uses a translucent `background.default` surface. In the full F1-GRID guide, note that F1Tree inherits this behavior through F1Grid and page loading policies remain unchanged. Also update the dated direction, plan, and detailed spec to record that DashboardPage uses the same component at its unchanged 3.6px default while F1Grid passes 1.8px.

- [x] **Step 2: Review documentation consistency**

Read the updated `loading` entry together with the nearby sections describing page-owned loading and save/refresh behavior. Ensure no statement says that page callers or backend behavior changed.

### Task 4: Verify and capture the browser result

**Files:**
- Create: `docs/result/20261026/f1-grid-loading-spinner/20261026_002_f1-grid_spinner_visibility_결과.md`
- Create: `docs/result/20261026/f1-grid-loading-spinner/screenshots/` with 375px, 768px, and 1280px captures.

- [x] **Step 1: Run the focused test**

From `frontend`, run:

npm run test -- tests/app-loading-spinner.test.tsx
npx vitest run tests/f1-grid.test.tsx -t "uses the thinner shared spinner"

Expected: both focused commands exit with code 0.

- [x] **Step 2: Build the frontend**

From `frontend`, run `npm run build`.

Expected: TypeScript and Vite build exit with code 0.

- [x] **Step 3: Verify and capture 375px**

Open `/f1-grid-docs`, use the Large Data Playground's `1,000 rows` control to exercise its existing loading state, and capture the loading grid at a 375px viewport. Verify the overlay stays within the grid and does not create page-level horizontal overflow. Save `screenshots/loading-375.png`.

- [x] **Step 4: Verify and capture 768px**

At a 768px viewport, repeat the same existing loading interaction. Verify the spinner remains centered and the overlay remains within the grid. Save `screenshots/loading-768.png`.

- [x] **Step 5: Verify and capture 1280px**

At a 1280px viewport, repeat the same existing loading interaction. Verify the spinner remains centered and the overlay remains within the grid. Save `screenshots/loading-1280.png`. At each viewport, confirm loading completion restores the ordinary grid.

- [x] **Step 6: Record evidence**

Write the exact test/build outcomes, browser surface, viewport sizes, screenshot paths, and DB/API non-impact in the result report. Do not claim browser coverage for a size that was not captured.

## Scope Guard

- Do not modify `GridRow.tsx` or the concurrent F1-Grid render-performance work.
- Do not change the existing loading state contract, skeleton/body behavior, page loading policies, or F1Tree implementation.
- Do not change DashboardPage's visible spinner size, color, or default thickness.
- Do not alter other `CircularProgress` instances or the global MUI theme.
- Do not modify backend, API, or database files.
