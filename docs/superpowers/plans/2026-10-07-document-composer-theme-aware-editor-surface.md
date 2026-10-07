# Document Composer Theme-Aware Editor Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the document editor white in light mode and match the modal body surface (`#1e293b`) in dark mode, with readable placeholder text and regular body typography.

**Architecture:** Reuse the current MUI theme mode in `useDocumentComposer` to select the editor surface. Keep all editor and attachment regions bound to that surface, use the theme's primary color for body text and disabled color for the placeholder, and keep the document title bold while the body defaults to normal weight. Update only the composer theme test and its related dated documentation; preserve existing approval-flow changes.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File map

- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts` to select `#ffffff` in light mode and `#1e293b` in dark mode.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx` so editor text uses the current theme's primary color, the body placeholder uses the same disabled color as the title placeholder, and body typography stays regular while the title remains bold.
- Modify `frontend/tests/document-write-page.test.tsx` to assert the editor surface/text contrast and title/body font weights in both themes, without changing approval-flow tests.
- Update `docs/directions/20261007/20261007_009_문서작성_다크테마_합의칩_에디터_배경_작업지시서.md`, `docs/plan/20261007/20261007_009_문서작성_다크테마_합의칩_에디터_배경_계획서.md`, and `docs/spec/20261007/20261007_009_문서작성_다크테마_합의칩_에디터_배경_사양서.md` so the approved requirement is theme-aware rather than white in both modes.
- Update `docs/result/20261007/document-composer-dark-surfaces/20261007_009_문서작성_다크테마_합의칩_에디터_배경_결과보고서.md` and refresh the dark editor screenshot after validation.

## Task 1: Add theme-aware editor regression coverage

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Assert the dark editor surface and text**

In the existing dark composer surface test, retain the existing dialog-shell assertions. Update the editor assertions to:

```tsx
expect(getComputedStyle(editorPanel).backgroundColor).toBe('rgb(30, 41, 59)');
expect(getComputedStyle(editor).backgroundColor).toBe('rgb(30, 41, 59)');
expect(getComputedStyle(editor).color).toBe('rgb(226, 232, 240)');
expect(getComputedStyle(title).fontWeight).toBe('700');
expect(getComputedStyle(editor).fontWeight).toBe('400');
expect(placeholder).toBeInTheDocument();
```

- [x] **Step 2: Add a light editor surface regression test**

Render the composer using `createAppTheme('light')`, open it using the existing page test setup, and assert:

```tsx
expect(getComputedStyle(editorPanel).backgroundColor).toBe('rgb(255, 255, 255)');
expect(getComputedStyle(editor).backgroundColor).toBe('rgb(255, 255, 255)');
expect(getComputedStyle(editor).color).toBe('rgb(15, 23, 42)');
expect(getComputedStyle(title).fontWeight).toBe('700');
expect(getComputedStyle(editor).fontWeight).toBe('400');
```

Keep the test limited to editor appearance; do not alter approval-stage setup or assertions.

- [x] **Step 3: Run the focused tests and observe RED**

Run from `frontend`:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "editor surface"
```

Expected before implementation: the dark test reports white editor backgrounds and dark text instead of `rgb(30, 41, 59)` and `rgb(226, 232, 240)`; the light test remains green.

## Task 2: Make editor surfaces and text follow the theme

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Select the editor surface from the active theme**

In `useDocumentComposer`, replace the hard-coded editor surface with:

```ts
const editorSurfaceBackground = isDark ? '#1e293b' : '#ffffff';
```

Keep `fieldSurfaceBackground` unchanged. The panel, editable region, `.ProseMirror`, and attachment region already consume `editorSurfaceBackground`; preserve that shared wiring.

- [x] **Step 2: Use theme text colors on the editor**

In `DocumentComposerDialog`, use theme text colors and explicitly keep the editor body at normal weight:

```ts
const editorTextColor = theme.palette.text.primary;
const editorPlaceholderColor = theme.palette.text.disabled;
```

Set `fontWeight: 400` on the editable surface style where `editorTextColor` and `editorSurfaceBackground` are applied. Keep `fontWeight: 700` on the title input. Do not change saved document HTML, template content, or title-field colors.

- [x] **Step 3: Run both focused theme tests**

Run from `frontend`:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "editor surface"
```

Expected: both light and dark editor surface/text assertions pass.

## Task 3: Align dated documentation with the approved behavior

**Files:**
- Modify: `docs/directions/20261007/20261007_009_문서작성_다크테마_합의칩_에디터_배경_작업지시서.md`
- Modify: `docs/plan/20261007/20261007_009_문서작성_다크테마_합의칩_에디터_배경_계획서.md`
- Modify: `docs/spec/20261007/20261007_009_문서작성_다크테마_합의칩_에디터_배경_사양서.md`
- Modify: `docs/result/20261007/document-composer-dark-surfaces/20261007_009_문서작성_다크테마_합의칩_에디터_배경_결과보고서.md`

- [x] **Step 1: Replace the outdated all-white editor requirement**

Record these exact surface expectations consistently:

| Theme | Editor background | Default text | Placeholder |
|---|---|---|---|
| Light | `#ffffff` | `#0f172a` | theme disabled text |
| Dark | `#1e293b` | `#e2e8f0` | theme disabled text |

State that panel, editable canvas, and attachment container use the theme-selected editor background. Record that the body placeholder uses the title placeholder's disabled color, title typography is `700`, body typography is `400`, and rich-text formatting remains unchanged. Keep agreement-chip requirements and approval behavior unchanged.

- [x] **Step 2: Record the regression and validation results**

In the result report, record both theme assertions, focused test results, lint/build output, browser verification, and the shared approval-flow test failures only if they remain present. Replace or update the screenshot caption so it no longer claims the dark editor is white.

## Task 4: Verify implementation and browser rendering

**Files:**
- Verify: `frontend/tests/document-write-page.test.tsx`
- Verify: the three composer implementation files and dated result report

- [x] **Step 1: Run focused theme tests**

Run from `frontend`:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "editor surface"
```

Expected: light and dark editor surface tests pass. Do not fix unrelated existing approval-flow failures in this task.

- [x] **Step 2: Run lint and production build**

Run from `frontend`:

```powershell
npm run lint -- src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx src/pages/groupware/documents/write/hooks/useDocumentComposer.ts tests/document-write-page.test.tsx
npm run build
```

Expected: lint reports no issues; TypeScript and Vite production build succeed.

- [x] **Step 3: Verify the shared browser at supported widths**

At 375px, 768px, and 1280px, inspect light and dark composer themes. Confirm light editor surfaces are white, dark editor surfaces are `rgb(30, 41, 59)`, the body placeholder is as muted as the title placeholder, the title remains bold, body text remains regular, and no page-level horizontal overflow is introduced. Do not stop the already-running shared development server.

- [x] **Step 4: Refresh a privacy-safe dark editor screenshot**

Capture only the composer surface after hiding personal identifiers and clearing document body content. Save it under `docs/result/20261007/document-composer-dark-surfaces/screenshots/` and verify the image exists before referencing it.
