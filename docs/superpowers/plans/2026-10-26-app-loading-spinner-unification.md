# Application Loading Spinner Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route every indeterminate application loading spinner through `AppLoadingSpinner` while preserving each use site's size, color, label, layout, and loading lifecycle, and improve Grid/Tree visibility with a 2.4px stroke.

**Architecture:** Extend the existing shared wrapper around MUI `CircularProgress` to forward compatible spinner props, with defaults of 34px and 3.6px. Replace direct application-source usages with the wrapper and pass existing MUI default dimensions explicitly where necessary; F1Grid/F1Tree retain their shared overlay with a 2.4px override.

**Tech Stack:** React, TypeScript, MUI, Vitest, Vite, Playwright/browser validation.

---

## File Map

- `frontend/src/shared/components/AppLoadingSpinner.tsx`: Add typed forwarding for MUI `CircularProgress` props and keep 34px/3.6px defaults.
- `frontend/tests/app-loading-spinner.test.tsx`: Verify defaults and forwarding of contextual size, thickness, color, and accessibility label.
- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: Set the shared Grid/Tree spinner to a 2.4px stroke without changing the overlay.
- `frontend/tests/f1-grid.test.tsx`, `frontend/tests/f1-tree.test.tsx`: Assert the 34px/2.4px shared overlay contract.
- Replace direct `CircularProgress` usage in:
  - `frontend/src/pages/co/master/materials/MaterialManagementPage.tsx`
  - `frontend/src/pages/co/master/customers/CustomerManagementPage.tsx`
  - `frontend/src/pages/co/workflow/form/DraftFormManagementPage.tsx`
  - `frontend/src/pages/co/workflow/form/components/DraftFormTemplateDialog.tsx`
  - `frontend/src/pages/groupware/community/notice/components/NoticeComposerDialog.tsx`
  - `frontend/src/pages/groupware/community/notice/components/NoticeLoginPopupHost.tsx`
  - `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx`
  - `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
  - `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`
  - `frontend/src/shared/components/common-code/CommonCodeItemHelpDialog.tsx`
  - `frontend/src/shared/components/feed/PostDetailPanel.tsx`
  - `frontend/src/shared/components/view-mode/FileView.tsx`
  - `frontend/src/shared/components/view-mode/ViewModePagination.tsx`
- Update consumer regressions in the existing focused tests: `frontend/tests/common-code-item-help-dialog.test.tsx`, `customer-management-page.test.tsx`, `document-write-page.test.tsx`, `draft-form-management.test.tsx`, `feed-components.test.tsx`, `file-view.test.tsx`, `material-management.test.tsx`, and `notice-page.test.tsx` only if assertions reveal behavior changes.
- Update `frontend/src/pages/f1-grid-docs/F1-GRID.md`, `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts`, and `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts` to document the updated Grid/Tree stroke.
- Update the dated work direction, plan, and detailed spec under `docs/directions/20261026`, `docs/plan/20261026`, and `docs/spec/20261026`; record browser evidence in `docs/result/20261026/f1-grid-loading-spinner/`.
- `docs/superpowers/specs/2026-10-26-app-loading-spinner-unification-design.md`: Approved design, committed as `cd8f40a5`.

## Task 1: Update dated requirement documents before implementation

**Files:**
- Modify: `docs/directions/20261026/20261026_002_f1-grid_spinner_visibility_작업지시서.md`
- Modify: `docs/plan/20261026/20261026_002_f1-grid_spinner_visibility_계획서.md`
- Modify: `docs/spec/20261026/20261026_002_f1-grid_spinner_visibility_상세사양서.md`

- [ ] **Step 1: Expand the work direction**

Update the request/background/scope to cover every application `CircularProgress` call site through `AppLoadingSpinner`, preserving contextual dimensions and color. Record the approved Grid/Tree stroke as 2.4px, preserve the existing overlay alpha and loading lifecycle, and keep backend/API/DB out of scope.

- [ ] **Step 2: Expand the dated implementation plan**

Add the common wrapper prop forwarding, all call-site replacements, Grid/Tree visibility update, focused tests, direct-use source audit, and actual browser validation at 375px, 768px, and 1280px. Require these dated docs to be updated before source implementation.

- [ ] **Step 3: Expand the detailed specification**

Specify the wrapper defaults (34px/3.6px), contextual size/color and accessible-label preservation, Grid/Tree override (34px/2.4px), and unchanged layout/loading behavior. Record concrete test and browser acceptance criteria.

## Task 2: Expand the shared spinner contract

**Files:**
- Modify: `frontend/tests/app-loading-spinner.test.tsx`
- Modify: `frontend/src/shared/components/AppLoadingSpinner.tsx`

- [ ] **Step 1: Add a failing forwarding test**

Extend the current test to render the shared spinner with a compact contextual configuration and an accessible label:

```tsx
<AppLoadingSpinner
  size={16}
  thickness={2.4}
  color="inherit"
  aria-label="저장 중"
/>
```

Assert the resulting progressbar has 16px width and height, its SVG circle has `stroke-width="2.4"`, its SVG has the accessible name `저장 중`, and the root has the inherited color class/style expected from MUI. Keep the existing assertions that the default is 34px/3.6px.

- [ ] **Step 2: Run the focused test and confirm it fails for unsupported props**

From `frontend`, run:

```powershell
npm run test -- tests/app-loading-spinner.test.tsx
```

Expected: TypeScript/Vitest reports that `size`, `color`, or `aria-label` is not accepted by the current wrapper.

- [ ] **Step 3: Forward typed MUI props while retaining defaults**

Use `CircularProgressProps` from MUI as the wrapper prop type and destructure only the defaulted `size` and `thickness`:

```tsx
import {
  CircularProgress,
  type CircularProgressProps,
} from '@mui/material';

type AppLoadingSpinnerProps = Omit<CircularProgressProps, 'size' | 'thickness'> & {
  size?: CircularProgressProps['size'];
  thickness?: number;
};

export function AppLoadingSpinner({
  size = 34,
  thickness = 3.6,
  ...props
}: AppLoadingSpinnerProps) {
  return <CircularProgress {...props} size={size} thickness={thickness} />;
}
```

- [ ] **Step 4: Run the shared component regression**

From `frontend`, run:

```powershell
npm run test -- tests/app-loading-spinner.test.tsx
```

Expected: all default and forwarded-property assertions pass.

## Task 3: Unify application spinner call sites

**Files:**
- Modify every direct-use file listed in the File Map.
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`

- [ ] **Step 1: Replace imports and elements without changing context**

In each listed file, replace the MUI `CircularProgress` import with the relative `AppLoadingSpinner` import. Keep all existing wrappers, conditions, labels, colors, and dimensions. For callers that relied on MUI's default 40px size, pass `size={40}` explicitly. Preserve existing `size={16}`, `18`, `20`, `22`, or `24` and `color="inherit"`/`"primary"` values.

Examples:

```tsx
<AppLoadingSpinner size={16} color="inherit" aria-label="품목 저장 중" />
<AppLoadingSpinner size={24} color="primary" aria-label="로딩 중" />
<AppLoadingSpinner size={40} aria-label="문서 정보 불러오는 중" />
```

- [ ] **Step 2: Run affected unit tests**

From `frontend`, run:

```powershell
npx vitest run tests/common-code-item-help-dialog.test.tsx tests/customer-management-page.test.tsx tests/document-write-page.test.tsx tests/draft-form-management.test.tsx tests/feed-components.test.tsx tests/file-view.test.tsx tests/material-management.test.tsx tests/notice-page.test.tsx
```

Expected: existing loading labels, action states, and dialog/content behavior remain unchanged.

- [ ] **Step 3: Increase the Grid/Tree stroke to the approved value**

In `F1Grid.tsx`, change only the shared spinner override from 1.8px to 2.4px:

```tsx
<AppLoadingSpinner thickness={2.4} />
```

Do not change the 34px default size, theme overlay alpha, loading timing, aria state, or pointer-event blocking.

- [ ] **Step 4: Update Grid and Tree regression expectations**

In `frontend/tests/f1-grid.test.tsx` and `frontend/tests/f1-tree.test.tsx`, assert `stroke-width="2.4"` while retaining the 34px dimensions, loading overlay presence, `aria-busy`, and loading completion checks.

- [ ] **Step 5: Run Grid and Tree regressions**

From `frontend`, run:

```powershell
npx vitest run tests/f1-grid.test.tsx -t "loading overlay"
npx vitest run tests/f1-tree.test.tsx -t "same loading spinner as F1Grid"
```

Expected: the shared overlay and 34px/2.4px progress indicator pass for both components.

- [ ] **Step 6: Audit for unwrapped application spinners**

From the repository root, run:

```powershell
rg -n "CircularProgress" frontend/src
```

Expected: application source contains the MUI `CircularProgress` import/use only in `frontend/src/shared/components/AppLoadingSpinner.tsx`. In-app documentation strings mentioning the name may remain.

## Task 4: Update user-facing Grid documentation

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts`
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`

- [ ] **Step 1: Update user-facing Grid documentation**

Replace every stale Grid/Tree 1.8px description with 2.4px. Keep the explanation that Grid and Tree share one F1Grid overlay and that other application loading contexts use the same spinner component while retaining their contextual sizes.

## Task 5: Browser verification and result report

**Files:**
- Create/update screenshots under `docs/result/20261026/f1-grid-loading-spinner/screenshots/`.
- Modify: `docs/result/20261026/f1-grid-loading-spinner/20261026_002_f1-grid_spinner_visibility_결과.md`

- [ ] **Step 1: Verify the active Grid loading overlay at each required width**

Use the local S-ERP F1-Grid Large Dataset example at `http://127.0.0.1:4173/f1-grid-docs`. At 375px, 768px, and 1280px, trigger the 10,000-row sample; for capture only, extend the demo's 250ms timer through browser instrumentation without changing repository code. Verify the visible 34px spinner, 2.4px stroke, centered position, overlay bounds, and that the page has no horizontal overflow.

- [ ] **Step 2: Verify loading completion**

Allow the demo timer to complete and confirm that the overlay and progressbar are removed and the data grid renders.

- [ ] **Step 3: Save and inspect browser screenshots**

Save one active Grid overlay screenshot per viewport under the result screenshot directory. Inspect the images themselves; if the integrated screenshot tool captures stale or post-loading content, use a browser Playwright screenshot to a local file and inspect that file instead. Record any unresolved capture limitation instead of claiming an unverified visual result.

- [ ] **Step 4: Write the result report**

Record exact commands and pass counts, build outcome, each viewport's DOM/layout measurements, screenshot paths, and any browser-tool limitation. Do not state a viewport was visually confirmed unless its active-state screenshot or live browser rendering was inspected.

## Task 6: Final verification

**Files:**
- No additional implementation files.

- [ ] **Step 1: Run the focused regression set**

From `frontend`, run:

```powershell
npx vitest run tests/app-loading-spinner.test.tsx tests/f1-grid.test.tsx -t "AppLoadingSpinner|loading overlay"
npx vitest run tests/f1-tree.test.tsx -t "same loading spinner as F1Grid"
```

Also run the consumer regression command from Task 2.

- [ ] **Step 2: Build and check the patch**

From `frontend`, run `npm run build`. From the repository root, run `git diff --check` and inspect the worktree to ensure only approved spinner, test, and documentation paths changed.

Expected: tests and build exit successfully; only the known bundle-size warning may remain; direct MUI spinner usage is confined to the shared wrapper.
