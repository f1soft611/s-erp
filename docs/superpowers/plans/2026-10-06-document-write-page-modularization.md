# Document Write Page Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax; completed steps are checked.

**Goal:** Split the document-write page into focused page, component, hook, type, and data modules without changing existing behavior.

**Architecture:** Keep `DocumentWritePage.tsx` as the composition layer. The page hook owns list view/filter/dialog visibility and derived document view models; the composer hook owns composer fields and the editor instance supplied by the shared rich-text editor. Use the shared `RichTextEditor`, `RichTextEditorToolbar`, and `CommonDialog`; do not recreate the editor or add a service module because no API operation exists in this scope.

**Tech Stack:** React, TypeScript, MUI, shared Tiptap-based rich-text editor, Vitest, React Testing Library, Vite.

---

## File Map

Create these files under `frontend/src/pages/groupware/documents/write/`:

- `types/documentWrite.types.ts`: document-kind/status unions, document item, and page prop types.
- `data/documentWriteData.ts`: immutable document-kind options, existing sample documents, and status-color mapping.
- `hooks/useDocumentWritePage.ts`: view mode, selected kind, composer visibility, and filtered/pinned/list-view data.
- `hooks/useDocumentComposer.ts`: active kind, title, shared editor instance, attachments, attachment selection, and close/reset behavior.
- `components/DocumentComposerDialog.tsx`: current compose form rendered inside the unchanged shared `CommonDialog`.
- `components/DocumentFeedItem.tsx`: document feed card and status chip.
- `components/ApprovalSummaryPanel.tsx`: approval summary and reminder cards.
- `components/EmptyDocumentList.tsx`: empty state and create action.

Modify:

- `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`: compose the page using the new modules and keep header/layout wiring.
- `frontend/tests/document-write-page.test.tsx`: add a regression assertion that closing and reopening the composer clears the title.

Do not modify `CommonDialog`, notice page files, routing, API services, or backend code.

## Task 1: Lock Down Existing Composer Reset Behavior

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Add a close/reopen regression test**

Add this test inside the existing `describe('Document write page', ...)` block:

```tsx
it('clears the compose title when the dialog closes and reopens', () => {
  render(<DashboardContent {...pageProps} />);

  fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
  fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
    target: { value: '작성 중 제목' },
  });
  expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue(
    '작성 중 제목',
  );

  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));

  expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('');
});
```

- [x] **Step 2: Run the targeted test before refactoring**

Run from `frontend/`: `npm run test -- tests/document-write-page.test.tsx`

Expected: all document-write tests pass against the current implementation.

## Task 2: Extract Domain Types and Static Data

**Files:**
- Create: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Create: `frontend/src/pages/groupware/documents/write/data/documentWriteData.ts`
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Move existing declarations without changing their values**

Move `DocumentKind`, `ApprovalStatus`, `DocumentWriteItem`, and `DocumentWritePageProps` into `documentWrite.types.ts`. Keep the existing values, fields, and dashboard prop types unchanged.

The extracted declarations retain these exact shapes:

```ts
export type DocumentKind = '기안서' | '업무연락' | '지출결의서' | '근태신청';
export type ApprovalStatus =
  | '임시저장'
  | '결재대기'
  | '결재중'
  | '보완요청'
  | '완료';

export type DocumentWriteItem = {
  id: number;
  title: string;
  kind: DocumentKind;
  status: ApprovalStatus;
  author: string;
  date: string;
  summary: string;
  isPinned?: boolean;
};

export type DocumentWritePageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};
```

- [x] **Step 2: Move sample constants and status mapping**

Move `documentKinds`, `sampleDocuments`, and `statusColor` from the page to `documentWriteData.ts`, importing the domain types from `../types/documentWrite.types`.

- [x] **Step 3: Update imports and remove duplicate declarations**

Import the extracted symbols in the page. Do not modify sample item order, text, date, statuses, pin flags, or color mapping.

- [x] **Step 4: Run the focused page test**

Run from `frontend/`: `npm run test -- tests/document-write-page.test.tsx`

Expected: all existing behavior assertions pass.

## Task 3: Extract Page and Composer State Hooks

**Files:**
- Create: `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`
- Create: `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Implement the page hook with the current defaults**

`useDocumentWritePage` must default to `viewMode: 'list'` and `selectedKind: ''`, own `isComposerOpen`, and expose stable open/close callbacks. It must derive `visibleDocuments`, `pinnedDocuments`, `unpinnedDocuments`, `pinnedViewItems`, and `unpinnedViewItems` from the extracted sample data. Preserve the existing view-item keys and `statusColor` values.

Its public return value must contain `viewMode`, `setViewMode`, `selectedKind`, `setSelectedKind`, `isComposerOpen`, `openComposer`, `closeComposer`, `visibleDocuments`, `pinnedDocuments`, `unpinnedDocuments`, `pinnedViewItems`, and `unpinnedViewItems`. Keep view mode typed as `CommonViewMode` and selected kind as `DocumentKind | ''`.

- [x] **Step 2: Implement the composer hook**

`useDocumentComposer(onClose: () => void)` must own `activeDocumentKind` (default `'기안서'`), `composerTitle`, `attachments`, the hidden file input ref, and `editor: Editor | null` state populated by `RichTextEditor.onEditorReady`. Do not create an editor with `useEditor` in the page-specific hook. Expose the existing attachment-select behavior and a close handler that clears title, attachments, and editor content before invoking `onClose`.

Return these values to the dialog: `activeDocumentKind`, `setActiveDocumentKind`, `composerTitle`, `setComposerTitle`, `attachments`, `setAttachments`, `attachmentInputRef`, `editor`, `setEditor`, `handleAttachmentSelect`, `closeComposer`, `editorSurfaceBackground`, and `fieldSurfaceBackground`. Keep attachment selection as the existing `Array.from(event.target.files ?? [])` append behavior and clear `event.target.value` after handling. Toolbar visibility belongs to `RichTextEditorToolbar` and is not duplicated in the page hook.

- [x] **Step 3: Move state ownership to the hooks**

Remove duplicate `useState`, `useRef`, editor initialization, filtering, and close/attachment handlers from the page and modal after their hook replacements are wired. Keep all defaults and reset behavior identical.

- [x] **Step 4: Run the focused page test**

Run from `frontend/`: `npm run test -- tests/document-write-page.test.tsx`

Expected: all existing assertions plus the new close/reopen test pass.

## Task 4: Extract Presentational Components and Common-Dialog Composer

**Files:**
- Create: `frontend/src/pages/groupware/documents/write/components/DocumentFeedItem.tsx`
- Create: `frontend/src/pages/groupware/documents/write/components/ApprovalSummaryPanel.tsx`
- Create: `frontend/src/pages/groupware/documents/write/components/EmptyDocumentList.tsx`
- Create: `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Move the feed item and status chip**

Move the current card markup and status chip into `DocumentFeedItem`. Preserve `data-testid="document-write-item"`, styling, text, author initial, category chip, and status variant/color behavior.

Use this component contract:

```tsx
type DocumentFeedItemProps = {
  item: DocumentWriteItem;
  isDark: boolean;
};
```

Export `DocumentFeedItem` with this prop type and move the existing card JSX into its body.

- [x] **Step 2: Move the approval summary**

Move `ApprovalSummaryPanel` unchanged, retaining counts, labels, ordering, and reminder limit.

Its prop remains `{ items: DocumentWriteItem[] }`.

- [x] **Step 3: Move the empty state**

Move `EmptyDocumentList` unchanged and retain the create callback and accessible button label.

Its prop remains `{ onCreate: () => void }`.

- [x] **Step 4: Move the composer markup into its own component**

Move the entire current form markup to `DocumentComposerDialog`. Keep the shared `CommonDialog`, title, `lg` size, `fill` body mode, footer-start toolbar, disabled save action, cancel behavior, dialog test id, tab availability, title input, editor styles, and attachment chips. Replace local `EditorContent`/`useEditor` and custom format buttons with shared `RichTextEditor`, `RichTextEditorToolbar`, and `richTextEditorIconButtonSx`. Connect the editor instance using `onEditorReady={setEditor}` and retain the current editor surface and `.ProseMirror` scroll styles through `className` and `contentSx`. The dialog consumes `useDocumentComposer`; its props are `open: boolean` and `onClose: () => void`.

Use this component contract:

```tsx
type DocumentComposerDialogProps = {
  open: boolean;
  onClose: () => void;
};
```

Export `DocumentComposerDialog` with this prop type and move the existing `CommonDialog` JSX into its body.

- [x] **Step 5: Keep the page focused on composition**

Replace the moved JSX in `DocumentWritePage` with the extracted component calls. Keep `PageHeader`, `ContentSplitLayout`, common view controls, and current right/left layout in the page.

- [x] **Step 6: Run the focused page test**

Run from `frontend/`: `npm run test -- tests/document-write-page.test.tsx`

Expected: list/feed rendering, status and kind options, composer tabs, text inputs, toolbar, and close/reopen reset assertions pass.

## Task 5: Validate the Refactor and Record Results

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/**`
- Modify: `frontend/tests/document-write-page.test.tsx`
- Create: `docs/result/20261006/document-write-page-modularization/20261006_004_문서작성_페이지_소스분리_결과보고서.md`
- Create: `docs/result/20261006/document-write-page-modularization/screenshots/` (375px, 768px, and 1280px captures)

- [x] **Step 1: Run the focused test**

Run from `frontend/`: `npm run test -- tests/document-write-page.test.tsx`

Expected: the document-write test file passes.

- [x] **Step 2: Run the frontend production build**

Run from `frontend/`: `npm run build`

Expected: TypeScript and Vite build complete successfully.

- [x] **Step 3: Inspect the page at required viewport widths**

Run `npm run dev` from `frontend/`, open the groupware document-write page in the browser, and inspect 375px, 768px, and 1280px widths. Confirm the list/feed, filter, summary, and CommonDialog composer remain usable without unintended page-level horizontal overflow. Save screenshots in the specified result folder and stop only the development server started for this check.

- [x] **Step 4: Write the result report**

Record changed files, preserved behaviors, test/build commands and results, viewport observations, and screenshot paths. Explicitly state that API/save behavior was not added and that the save button remains disabled.

- [x] **Step 5: Review the final diff**

Run `git diff --check` and `git status --short`. Confirm no shared dialog, notice, route, or backend files were changed.
