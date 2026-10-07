# Document Composer Editor Fill-Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the document composer editor fill the remaining modal content height when the dialog opens, keep long-document scrolling on the modal body, and make template editor edge whitespace symmetric.

**Architecture:** Keep the shared `RichTextEditor` and `CommonDialog` unchanged. Give the composer layout a bounded, min-height-safe flex column and let only its editor panel grow into the free space; preserve the editor's natural content height and the dialog content's vertical scrolling.

**Tech Stack:** React, TypeScript, MUI `sx`, Vitest, Testing Library, Vite, Playwright browser verification.

---

## Files and responsibilities

- Modify `frontend/tests/document-write-page.test.tsx`: replace the obsolete initial-180px-only assertion with DOM structure/style checks for a growing composer layout and editor panel; verify template edge margins do not unbalance editor top/bottom whitespace.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`: make the composer content occupy the `CommonDialog` fill body, let the editor panel consume remaining height with a 180px minimum, and normalize only the first/last ProseMirror blocks' outer margins.
- Modify `docs/spec/20261007/20261007_002_문서작성_결재선_입력필드_공간개선_사양서.md`: update the editor sizing and scroll behavior.
- Modify `docs/plan/20261007/20261007_002_문서작성_결재선_입력필드_공간개선_계획서.md` and `docs/directions/20261007/20261007_002_문서작성_결재선_입력필드_공간개선_작업지시서.md`: record the fill-remaining-height requirement and its verification.
- Create `docs/result/20261007/document-write-approval-card-row/20261007_003_문서작성_결재선_카드형_레이아웃_결과보고서.md` and viewport screenshots after implementation and verification.

## Task 1: Add a failing editor fill-height regression test

**File:** `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Replace the old initial-height-only assertion**

In the existing `lets the dialog content scroll while the editor surface grows naturally` test, keep the composer opening and editor lookup, then assert the composer layout and editor panel use the available flex height:

```tsx
const composerLayout = screen.getByTestId('document-composer-layout');
const editorPanel = screen.getByTestId('document-composer-editor-panel');
const editor = screen.getByRole('textbox', { name: '본문' });
const dialogContent = editor.closest('.MuiDialogContent-root');

expect(composerLayout).toHaveStyle({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: '0',
});
expect(editorPanel).toHaveStyle({
  flexGrow: '1',
  flexShrink: '0',
  minHeight: '180px',
});
expect(editor).toHaveStyle({
  minHeight: '180px',
  maxHeight: 'none',
  flexShrink: '0',
});
expect(dialogContent).toHaveStyle({ overflowY: 'auto' });
```

- [x] **Step 2: Add a failing template-edge spacing regression**

Mock a template whose first block is a blockquote and whose final block is a paragraph. After selecting it, assert equal editor top/bottom padding and zero `marginTop` on the first block and `marginBottom` on the last block. Run only this test first and confirm the first block's default `8px` margin causes the expected failure.

- [x] **Step 3: Run the focused test and confirm the missing fill-height structure fails**

Run:

```powershell
Set-Location frontend
npm run test -- tests/document-write-page.test.tsx
```

Expected before implementation: the test fails because the composer layout/editor panel test IDs and grow styles do not exist.

## Task 2: Implement the bounded flex layout

**File:** `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`

- [x] **Step 1: Make the composer root fill the dialog content**

On the root `Box` directly inside `CommonDialog`, add `data-testid="document-composer-layout"` and retain its current column/gap/min-width styles while adding `height: '100%'` and `minHeight: 0`.

- [x] **Step 2: Let the editor panel consume remaining space**

On the editor panel wrapper that contains `RichTextEditor`, add `data-testid="document-composer-editor-panel"` and use a column flex layout with `flex: '1 0 auto'`, `minHeight: 180`, and `minWidth: 0`. Keep the title, tabs, metadata, and approval controls non-growing. Set the nested editor root/content to grow without shrinking below the content's natural height, keep `minHeight: 180`, `maxHeight: 'none'`, and retain modal-body scrolling.

Add local editor selectors for `> :first-child` and `> :last-child` that set only `marginTop: 0` and `marginBottom: 0`. This keeps the existing internal block spacing and equal editor padding without changing shared rich-text styles.

- [x] **Step 3: Run the focused regression tests**

Run:

```powershell
Set-Location frontend
npm run test -- tests/document-write-page.test.tsx tests/user-select-editor.test.tsx
```

Expected: both files pass, including the composer body scroll test, approval card/layout tests, and shared selector regressions.

## Task 3: Reconcile requirements and verify the rendered layout

**Files:** dated direction, plan, spec, result report, and browser screenshots listed above.

- [x] **Step 1: Update dated documentation**

Specify that the editor fills the remaining modal content height on open, keeps a 180px minimum, grows with body content, leaves vertical scrolling to the modal content, and has equal top/bottom whitespace even when selected template blocks have outer margins. Keep the shared editor and non-composer dialogs unchanged.

- [x] **Step 2: Run source lint and the production build**

Run:

```powershell
Set-Location frontend
npm run lint -- src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx tests/document-write-page.test.tsx
npm run build
```

Expected: Oxlint reports no errors and TypeScript/Vite complete successfully.

- [x] **Step 3: Verify browser geometry at supported widths**

At 375px, 768px, and 1280px, open the composer and record viewport width, modal content client/scroll heights, and editor panel bounds. Confirm the editor starts below the fields, occupies the remaining modal content area, page width does not exceed viewport width, and modal body scroll can reach long editor content while header/footer remain accessible.

- [x] **Step 4: Save screenshots and record only observed results**

Save screenshots under `docs/result/20261007/document-write-approval-card-row/screenshots/`. Record actual test counts, lint/build outcomes, dimensions, and any browser/data limitation in the result report. Do not reuse old selector-layout screenshots as evidence for the corrected card layout.

- [x] **Step 5: Run final whitespace and worktree checks**

Run `git diff --check` and `git status --short`; ensure only the document composer, its tests, and directly related task/result documentation are included.
