# Shared Dialog Theme Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make common dialogs consistently use white surfaces in light mode and explicitly themed slate surfaces in dark mode, including the document composer.

**Architecture:** Resolve the default surface centrally in `CommonDialog` and apply the resolved color to all dialog regions. Preserve caller-provided `surfaceBackgroundColor`, remove the document composer’s forced white value, and lock the shared and integrated behaviors with tests.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library.

---

## File map

- Modify `frontend/src/shared/components/CommonDialog.tsx` to define and apply the shared theme surface.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx` to opt into the shared theme behavior.
- Modify `frontend/tests/common-dialog.test.tsx` for common light/dark and explicit override coverage.
- Modify `frontend/tests/document-write-page.test.tsx` for the dark-mode composer integration.
- Create the dated direction, plan, detailed spec, and result report under `docs/directions/20261007`, `docs/plan/20261007`, `docs/spec/20261007`, and `docs/result/20261007/shared-dialog-theme-surfaces`.

## Task 1: Verify and test shared dialog theme surfaces

**Files:**
- Modify: `frontend/tests/common-dialog.test.tsx`
- Test: `frontend/tests/common-dialog.test.tsx`

- [x] **Step 1: Update the existing surface expectations**

In `uses the dark page palette with a distinct slate shell`, expect paper, header, body, and footer to be `rgb(30, 41, 59)`. In `uses white surfaces throughout the dialog in light mode`, expect paper, header, body, and footer all to be `rgb(255, 255, 255)`.

- [x] **Step 2: Run the focused test to confirm the current mismatch fails**

Run from `frontend`:

```powershell
npm run test -- tests/common-dialog.test.tsx
```

Expected: the dark body fails because it is currently `rgb(15, 23, 42)`, and the light body fails because it is currently `rgb(244, 247, 251)`.

- [x] **Step 3: Add explicit override coverage**

Render `CommonDialog` under `ThemeProvider theme={createAppTheme('dark')}` with `surfaceBackgroundColor="#334155"` and verify paper, header, body, and footer each compute to `rgb(51, 65, 85)`. Keep the existing accessibility, layout, and responsive tests intact.

## Task 2: Apply one theme-derived surface to the common dialog

**Files:**
- Modify: `frontend/src/shared/components/CommonDialog.tsx`
- Test: `frontend/tests/common-dialog.test.tsx`

- [x] **Step 1: Define the shared default**

Resolve the surface with:

```tsx
const surfaceBackground =
  surfaceBackgroundColor ??
  (theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff');
```

- [x] **Step 2: Apply the resolved value to every dialog region**

Use `surfaceBackground` for `Dialog` paper, header `Box`, `DialogContent`, and `DialogActions`. Do not leave the body on `background.default`. Keep `surfaceBackgroundColor` as the highest-precedence explicit override and preserve the existing size, flex, overflow, and border settings.

- [x] **Step 3: Run the shared dialog test**

Run from `frontend`:

```powershell
npm run test -- tests/common-dialog.test.tsx
```

Expected: all common dialog tests pass, including light, dark, explicit override, accessibility, layout, and mobile behavior.

## Task 3: Integrate the document composer and test it

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`
- Modify: `frontend/tests/document-write-page.test.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Add dark-mode integration coverage**

Wrap a document write page render in `ThemeProvider theme={createAppTheme('dark')}`, open the composer, await `waitForComposerReady()`, and assert the dialog paper, header, body, and footer compute to `rgb(30, 41, 59)`. Also assert the editor panel remains `rgb(15, 23, 42)` to protect its intentional surface.

- [x] **Step 2: Run the focused integration test to confirm it fails**

Run from `frontend`:

```powershell
npm run test -- tests/document-write-page.test.tsx
```

Expected: the integration test fails because `DocumentComposerDialog` currently forces the shared dialog surface to white.

- [x] **Step 3: Remove the fixed white override**

Remove only `surfaceBackgroundColor="#ffffff"` from the `CommonDialog` call in `DocumentComposerDialog.tsx`. Keep `editorSurfaceBackground` and `fieldSurfaceBackground` usage unchanged.

- [x] **Step 4: Re-run the focused integration test**

Run:

```powershell
npm run test -- tests/document-write-page.test.tsx
```

Expected: all document-write page tests pass and the dialog/editor colors match the integration expectations.

## Task 4: Run focused validation and document results

**Files:**
- Create: `docs/result/20261007/shared-dialog-theme-surfaces/20261007_008_공통_모달_테마_배경_통일_결과보고서.md`
- Create: `docs/result/20261007/shared-dialog-theme-surfaces/screenshots/` only if browser captures can be saved through the browser workflow.

- [x] **Step 1: Run focused tests**

```powershell
Set-Location frontend
npm run test -- tests/common-dialog.test.tsx tests/document-write-page.test.tsx
```

Expected: both test files pass.

- [x] **Step 2: Run lint on changed source and test files**

```powershell
npm run lint -- src/shared/components/CommonDialog.tsx src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx tests/common-dialog.test.tsx tests/document-write-page.test.tsx
```

Expected: no lint errors.

- [x] **Step 3: Run the frontend production build**

```powershell
npm run build
```

Expected: TypeScript project build and Vite production build succeed.

- [x] **Step 4: Verify the shared browser**

Inspect the already-running `http://127.0.0.1:4173/groupware/doc/write` shared page after applying the changes. Confirm dark paper/header/body/footer surfaces are slate and editor content keeps its separate surface. Do not stop the shared server or alter document data.

- [x] **Step 5: Record exact results**

Record the actual test/lint/build results, computed theme colors, and browser verification outcome in the dated result report. Do not claim browser screenshots unless they were actually saved.

## Self-review

- Spec coverage: shared light/dark colors, all-region consistency, explicit override precedence, document composer integration, preserved editor surface, and validation are covered by Tasks 1–4.
- Placeholder scan: no TBD/TODO implementation steps remain.
- Type consistency: implementation and tests refer to the existing `surfaceBackgroundColor` prop and existing `createAppTheme` helper.
