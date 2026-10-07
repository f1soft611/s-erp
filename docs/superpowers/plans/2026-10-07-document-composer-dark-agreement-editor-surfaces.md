# Document Composer Dark Agreement and Editor Surfaces Implementation Plan

> **Superseded editor-surface requirement:** the follow-up user-approved design uses `#ffffff` in light mode and `#1e293b` in dark mode. See [the corrected design](../specs/2026-10-07-document-composer-dark-agreement-editor-surfaces-design.md) and [follow-up implementation plan](./2026-10-07-document-composer-theme-aware-editor-surface.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dark-mode agreement chips adapt to the dark theme and use the same white editor canvas in both themes with readable text.

**Architecture:** Resolve the editor canvas and text contrast in the composer hook and pass that styling through the existing editor props. Make only agreement chip colors theme-aware in `DocumentApprovalFields`; do not alter approval-stage data or actions.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library.

---

## File map

- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx` for agreement chip theme colors.
- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts` to supply the white editor surface for either theme.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx` for dark-ink editor text and placeholder colors.
- Create `frontend/tests/document-approval-fields-theme.test.tsx` to directly test light/dark agreement chip colors without changing the collaborator's approval-flow tests.
- Make one local assertion update in `frontend/tests/document-write-page.test.tsx` to verify the editor remains white with readable text. Preserve all unrelated changes in this shared file.
- Create the dated result report and a privacy-safe screenshot in `docs/result/20261007/document-composer-dark-surfaces/`.

## Task 1: Add agreement chip theme regression tests

**Files:**
- Create: `frontend/tests/document-approval-fields-theme.test.tsx`
- Test: `frontend/tests/document-approval-fields-theme.test.tsx`

- [x] **Step 1: Render a one-user agreement stage in each theme**

Use `ThemeProvider`, `createAppTheme`, Testing Library `render` and `screen`, and `DocumentApprovalFields`. Supply one user option and one stage:

```tsx
const user = {
  value: 'agreement-user',
  label: '합의 사용자',
  positionName: '대리',
};
const stage = { id: 1, kind: 'agreement' as const, users: [user] };
```

Pass empty selected/reference user arrays and `vi.fn()` callbacks for all changes, add actions, and removal.

- [x] **Step 2: Assert the expected colors and observe RED**

Under `createAppTheme('light')`, assert the agreement chip computed background is the existing `grey.100` result (`rgb(245, 245, 245)`) and border is `grey.300` (`rgb(224, 224, 224)`). Under `createAppTheme('dark')`, assert background is `rgb(51, 65, 85)` and border equals the theme divider. Run:

```powershell
Set-Location frontend
npm run test -- tests/document-approval-fields-theme.test.tsx
```

Expected before implementation: the dark surface assertion fails because the component uses `grey.100`.

## Task 2: Theme only the agreement chip surface

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`
- Test: `frontend/tests/document-approval-fields-theme.test.tsx`

- [x] **Step 1: Resolve dark mode using MUI theme**

Import `useTheme` from `@mui/material/styles`, read `theme.palette.mode === 'dark'`, and set the agreement chip `borderColor` to `dark ? 'divider' : 'grey.300'`, `bgcolor` to `dark ? '#334155' : 'grey.100'`. Leave text, badge, seal, layout, stage order, and removal action unchanged.

- [x] **Step 2: Run agreement theme tests**

```powershell
Set-Location frontend
npm run test -- tests/document-approval-fields-theme.test.tsx
```

Expected: light and dark agreement chip color assertions pass.

## Task 3: Use a white canvas and readable default editor text

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`
- Modify: `frontend/tests/document-write-page.test.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Extend the existing dark composer test**

In `uses the shared dark surface while retaining the editor surface`, update its editor-panel expectation from `rgb(15, 23, 42)` to `rgb(255, 255, 255)`. Also assert the `.ProseMirror` element background is white and its base `color` is `rgb(15, 23, 42)`, and confirm the empty placeholder paragraph is present. JSDOM does not compute pseudo-element styles; verify its explicit `#475569` placeholder color in the real browser instead.

- [x] **Step 2: Run the focused test and observe RED**

```powershell
Set-Location frontend
npm run test -- tests/document-write-page.test.tsx -t "uses the shared dark surface"
```

Expected before implementation: editor background is `rgb(15, 23, 42)` and the current dark theme editor text does not match the white-canvas assertions.

- [x] **Step 3: Make editor background theme-independent**

In `useDocumentComposer.ts`, set `editorSurfaceBackground` to `'#ffffff'` for both modes. Keep `fieldSurfaceBackground` theme-dependent so the document title input remains dark in dark mode.

- [x] **Step 4: Set editor ink colors for the white canvas**

In `DocumentComposerDialog.tsx`, derive editor text and placeholder colors from the light palette’s `text.primary` and `text.secondary` (or their equivalent explicit values `#0f172a` and `#475569`). Replace only the editor `.ProseMirror` text and placeholder references with these canvas-specific values. Preserve title field placeholder behavior and all editor content/HTML data.

- [x] **Step 5: Run the focused composer theme test**

```powershell
Set-Location frontend
npm run test -- tests/document-write-page.test.tsx -t "uses the shared dark surface"
```

Expected: the dialog stays slate, the editor canvas is white, base text is dark, and the empty placeholder exists. Verify placeholder contrast in the browser.

## Task 4: Validate integration and document results

**Files:**
- Create: `docs/result/20261007/document-composer-dark-surfaces/20261007_009_문서작성_다크테마_합의칩_에디터_배경_결과보고서.md`
- Create: `docs/result/20261007/document-composer-dark-surfaces/screenshots/dark-document-composer.png`

- [x] **Step 1: Run focused agreement and composer tests**

```powershell
Set-Location frontend
npm run test -- tests/document-approval-fields-theme.test.tsx tests/document-write-page.test.tsx
```

Expected: agreement theme tests and relevant page tests pass. If the file reports already-known unrelated failures, record them separately without changing unrelated assertions.

- [x] **Step 2: Run lint for the touched source and tests**

```powershell
npm run lint -- src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx src/pages/groupware/documents/write/hooks/useDocumentComposer.ts tests/document-approval-fields-theme.test.tsx tests/document-write-page.test.tsx
```

Expected: no lint errors.

- [x] **Step 3: Build the frontend**

```powershell
npm run build
```

Expected: TypeScript and Vite production build succeed.

- [x] **Step 4: Verify the shared browser at 375px, 768px, and 1280px**

Reuse the already-running shared page. Verify the agreement chip is slate and legible, the editor canvas is white with dark placeholder text, the shell remains slate, and the document/page has no horizontal overflow. Do not stop the shared server.

- [x] **Step 5: Save a privacy-safe capture and result**

Capture only the modal with document editor content hidden or cleared; avoid personal identifiers and live document text. Record test, lint, build, and browser results in the dated report. Do not describe a screenshot as saved unless the file exists.

## Self-review

- Spec coverage: light agreement style retention, dark chip color/border/legibility, shared white editor canvas, dark text/placeholder contrast, unchanged selection behavior, and responsive browser verification are covered.
- Placeholder scan: no TBD/TODO work steps remain.
- Type consistency: the plan uses existing `DocumentApprovalStage`, `F1GridUserOption`, `createAppTheme`, and `DocumentComposerDialog` APIs.
