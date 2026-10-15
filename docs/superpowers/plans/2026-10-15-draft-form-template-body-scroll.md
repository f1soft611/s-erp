# Draft form template body scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the draft-form template editor borderless at its top/bottom and let the shared dialog body own vertical scrolling.

**Architecture:** Keep `CommonDialog` unchanged. Add an opt-in `scrollMode` to `RichTextEditor`, defaulting to the existing editor-owned scroll behavior; select container-owned scrolling only from `DraftFormTemplateDialog`. The modal header and footer remain fixed.

**Tech Stack:** React, TypeScript, MUI, Tiptap, Vitest, Vite.

---

## File map

- Modify `frontend/src/shared/components/rich-text-editor/richTextEditor.types.ts` to type the opt-in scroll mode.
- Modify `frontend/src/shared/components/rich-text-editor/RichTextEditor.tsx` to apply container-growth styles only when requested; preserve current styles by default.
- Modify `frontend/src/pages/co/workflow/form/components/DraftFormTemplateDialog.tsx` to remove the editor-frame top/bottom borders and opt into the shared dialog body's scroll region.
- Modify `frontend/tests/rich-text-editor.test.tsx` to prove the default internal scroll behavior is unchanged and container mode does not create a vertical editor viewport.
- Modify `frontend/tests/draft-form-template-dialog.test.tsx` to assert borderless editor frame, dialog-body scrolling, and existing editor padding.
- Create the dated detailed specification and result report in `docs/spec/20261015/` and `docs/result/20261015/draft-form-template-body-scroll/`.

## Task 1: Add focused scroll ownership regression tests

**Files:**
- Modify: `frontend/tests/rich-text-editor.test.tsx`
- Modify: `frontend/tests/draft-form-template-dialog.test.tsx`

- [ ] **Step 1: Preserve and add rich-text scroll-mode assertions**

In `rich-text-editor.test.tsx`, retain the current default-mode assertion that the `.ProseMirror` viewport has `overflowY: auto`. Add a `scrollMode="container"` case and assert that the root editor, `.rich-text-editor-content`, and `.ProseMirror` do not own vertical scrolling (`overflowY: visible`) and the ProseMirror maximum height is not capped.

```tsx
render(
  <ThemeProvider theme={createTheme()}>
    <RichTextEditor
      ariaLabel="본문"
      className="scroll-test-editor"
      scrollMode="container"
    />
  </ThemeProvider>,
);
const root = document.querySelector('.scroll-test-editor');
const editor = await screen.findByRole('textbox', { name: '본문' });
const editorContent = editor.closest('.rich-text-editor-content');
expect(root).not.toBeNull();
expect(editorContent).not.toBeNull();
if (root === null || editorContent === null) {
  throw new Error('Container-scroll editor elements were not rendered.');
}
expect(getComputedStyle(root).height).toBe('auto');
expect(getComputedStyle(editorContent).overflowY).toBe('visible');
expect(getComputedStyle(editor).overflowY).toBe('visible');
expect(getComputedStyle(editor).maxHeight).toBe('none');
```

- [ ] **Step 2: Replace the old template editor-owned scroll expectation**

Replace the test that expects an inner ProseMirror scrollbar and a clipped frame. Assert that the frame has no top/bottom border and uses visible overflow, that the editor content has no vertical scrollbar while retaining 16px padding, and that its closest `.MuiDialogContent-root` owns vertical scrolling.

```tsx
expect(frame).toHaveStyle({ overflow: 'visible' });
expect(getComputedStyle(frame).borderTopStyle).not.toBe('solid');
expect(getComputedStyle(frame).borderBottomStyle).not.toBe('solid');
expect(editor).toHaveStyle({ overflowY: 'visible', padding: '16px' });
expect(frame.closest('.MuiDialogContent-root')).toHaveStyle({
  overflowY: 'auto',
});
```

- [ ] **Step 3: Run the focused tests before implementation**

Run from `frontend`:

```powershell
npm run test -- tests/draft-form-template-dialog.test.tsx tests/rich-text-editor.test.tsx
```

Expected: FAIL because container mode is not implemented and the template dialog still has a bordered, internally scrolling editor. The unchanged default-mode test must continue to pass.

## Task 2: Implement opt-in container-owned editor scrolling

**Files:**
- Modify: `frontend/src/shared/components/rich-text-editor/richTextEditor.types.ts`
- Modify: `frontend/src/shared/components/rich-text-editor/RichTextEditor.tsx`
- Modify: `frontend/src/pages/co/workflow/form/components/DraftFormTemplateDialog.tsx`

- [ ] **Step 1: Add a typed, backward-compatible scroll mode**

In `richTextEditor.types.ts`, define `RichTextEditorScrollMode = 'editor' | 'container'` and add `scrollMode?: RichTextEditorScrollMode` to `RichTextEditorProps`. In `RichTextEditor.tsx`, default the prop to `'editor'`. Add container-mode style overrides after `contentSx` so the editor root and content wrapper can grow naturally, the ProseMirror content has no max-height cap, and none of these elements clips or scrolls vertically. Do not modify the existing shared style defaults or change behavior when `scrollMode` is omitted.

```tsx
scrollMode = 'editor',
```

```tsx
scrollMode === 'container'
  ? {
      display: 'block',
      flex: 'none',
      height: 'auto',
      overflow: 'visible',
      '& .rich-text-editor-content': {
        display: 'block',
        flex: 'none',
        height: 'auto',
        overflow: 'visible',
      },
      '& .rich-text-editor-content > .ProseMirror': {
        flex: 'none',
        minHeight: 180,
        maxHeight: 'none',
        overflowX: 'visible',
        overflowY: 'visible',
        overflow: 'visible',
      },
    }
  : {},
```

- [ ] **Step 2: Scope the mode and remove the editor separators**

In `DraftFormTemplateDialog.tsx`, set `scrollMode="container"` on its `RichTextEditor`. On the surrounding column Box, remove `height: '100%'` and `minHeight: 0`, then set `minHeight: '100%'`. On the editor frame, replace `flex: 1` with `flex: '1 0 auto'`, remove `borderTop` and `borderBottom`, and change `overflow: 'hidden'` to `overflow: 'visible'`. Remove the ProseMirror `minHeight: '100%'`, `overflowX: 'auto'`, and `overflowY: 'auto'` overrides. Keep `px: 2`, `py: 2`, line-height, outline, wrapping, and placeholder styles; the existing `.tableWrapper` remains responsible for horizontal table scrolling.

- [ ] **Step 3: Run focused tests**

Run from `frontend`:

```powershell
npm run test -- tests/draft-form-template-dialog.test.tsx tests/rich-text-editor.test.tsx
```

Expected: PASS, including existing default editor viewport behavior, container mode, the borderless template editor, and dialog-body scroll ownership.

## Task 3: Complete documentation and UI verification

**Files:**
- Create: `docs/plan/20261015/20261015_015_기안양식_본문_스크롤_공통화_계획서.md`
- Create: `docs/spec/20261015/20261015_015_기안양식_본문_스크롤_공통화_상세사양서.md`
- Create: `docs/result/20261015/draft-form-template-body-scroll/20261015_015_기안양식_본문_스크롤_공통화_결과.md`
- Create, when browser verification succeeds: `docs/result/20261015/draft-form-template-body-scroll/screenshots/`

- [ ] **Step 1: Record the approved behavior in the dated plan and detailed specification**

Link both dated documents to the approved work instruction and this implementation plan. Specify that the template dialog alone opts into container scrolling; the CommonDialog shell separators, fixed header/footer, and other RichTextEditor consumers remain unchanged.

- [ ] **Step 2: Run the frontend build and inspect responsive behavior**

Run from `frontend`:

```powershell
npm run build
```

Expected: TypeScript and Vite build complete successfully. In the shared browser, inspect the dialog at 375px, 768px, and 1280px: long content scrolls through the dialog body, title and toolbar/actions remain visible, the editor top/bottom lines are absent, and horizontal tables do not introduce page-level overflow.

- [ ] **Step 3: Record evidence and remaining limitations**

Write the result report with the focused test and build outcomes, browser viewport checks, and screenshot paths. If the authenticated form-management page cannot be reached or screenshots are unavailable, state that limitation instead of claiming visual verification.

## Completion checks

- The template editor frame has no top/bottom borders.
- Vertical scrolling is on the shared dialog body, not a nested editor viewport.
- The title and footer remain fixed.
- RichTextEditor default behavior, template editing, save/cancel, image upload, and unsaved-change flow remain unchanged.
- Focused tests and frontend build pass; browser verification and results are recorded.
