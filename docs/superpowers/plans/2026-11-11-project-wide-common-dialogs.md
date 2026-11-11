# Project-Wide Common Dialogs Implementation Plan

> **For agentic workers:** Follow this plan task-by-task. Preserve unrelated worktree changes. No commit is requested.

**Goal:** Replace frontend MUI dialog shells with `CommonDialog` while keeping the shared modal API and existing workflows stable.

**Architecture:** `CommonDialog` becomes the only direct MUI `Dialog` renderer. Other dialog components keep their existing responsibilities and content but use the shared shell; `UnsavedChangesConfirmDialog` retains its public API and delegates its UI to `CommonDialog`.

**Tech Stack:** React, TypeScript, MUI, Vitest, React Testing Library, Vite.

---

### Task 1: Expand and test the shared dialog contract

**Files:**
- Modify: `frontend/tests/common-dialog.test.tsx`
- Modify: `frontend/src/shared/components/CommonDialog.tsx`

- [ ] **Step 1: Add failing size and accessibility tests**

Extend the existing size test with `sm=600px` and `xl=1200px`. Add a separate render assertion that `titleId="custom-title"` sets both the `<h2>` ID and dialog `aria-labelledby`, and `closeButtonLabel="이미지 뷰어 닫기"` names the close button.

```tsx
render(
  <CommonDialog
    open
    title="이미지 보기"
    titleId="custom-title"
    closeButtonLabel="이미지 뷰어 닫기"
    onClose={vi.fn()}
    size="xl"
  >
    <p>본문</p>
  </CommonDialog>,
);
expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'custom-title');
expect(screen.getByRole('heading', { name: '이미지 보기' })).toHaveAttribute('id', 'custom-title');
expect(screen.getByRole('button', { name: '이미지 뷰어 닫기' })).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and confirm the new assertions fail**

Run from `frontend`: `npm run test -- tests/common-dialog.test.tsx`

Expected: the existing `sm=600px` assertion fails before implementation; after adding it, the `xl` and accessibility props fail until implemented.

- [ ] **Step 3: Implement the common contract**

Use the size map `{ xs: 480, sm: 600, md: 820, lg: 990, xl: 1200 }`; accept optional `titleId` and `closeButtonLabel`, generate a title ID with `useId()` when omitted, and apply the resolved ID to both `aria-labelledby` and `DialogTitle`. Pass the close label to `Tooltip` and `IconButton`.

- [ ] **Step 4: Run CommonDialog tests**

Run from `frontend`: `npm run test -- tests/common-dialog.test.tsx`

Expected: all size, accessibility, theme, footer, and responsive tests pass.

### Task 2: Standardize shared unsaved confirmations

**Files:**
- Modify: `frontend/src/shared/components/UnsavedChangesConfirmDialog.tsx`
- Create: `frontend/tests/unsaved-changes-confirm-dialog.test.tsx`

- [ ] **Step 1: Add a failing shared-shell test**

Render `UnsavedChangesConfirmDialog` open with `dialogTitleId="test-title"`, a continue label, and cancel label. Assert the dialog title ID is `test-title`, the common close button `닫기` exists, continue precedes cancel, and clicking cancel calls `onCancel`.

- [ ] **Step 2: Run the test and verify the missing common close button**

Run from `frontend`: `npm run test -- tests/unsaved-changes-confirm-dialog.test.tsx`

Expected: current behavior renders no common header close button.

- [ ] **Step 3: Delegate rendering to `CommonDialog`**

Keep the component's props and `actionItems` construction. Render `CommonDialog` with `size="xs"`, `titleId={dialogTitleId}`, `title`, `description`, `onClose={onCancel}`, `children={null}`, and map each `actionItems` entry to an MUI `Button` in the same order, carrying over `variant`, `color`, `onClick`, `disabled`, and `autoFocus`.

- [ ] **Step 4: Verify the shared wrapper and representative consumers**

Run `npm run test -- tests/unsaved-changes-confirm-dialog.test.tsx tests/document-write-page.test.tsx tests/document-approval-settings-dialog.test.tsx tests/role-management-page.test.tsx`.

Expected: common shell assertions and existing cancel/continue workflows pass.

### Task 3: Migrate dashboard and F1-Grid dialogs

**Files:**
- Modify: `frontend/src/pages/dashboard/components/MenuFavoriteContextMenu.tsx`
- Modify: `frontend/src/shared/components/f1-grid/editing/TimeEditor.tsx`
- Modify: `frontend/src/pages/settings/system/f1-grid-test/F1GridTestPage.tsx`
- Tests: existing dashboard favorites and F1-Grid test files

- [ ] **Step 1: Convert folder create/rename**

Replace the `Dialog` wrapper with `CommonDialog size="xs"`, title the existing create/rename state, keep the folder `TextField` as children, map save/cancel buttons to `actions`, and retain `closeDialog`/`submitting` behavior.

- [ ] **Step 2: Convert the time picker**

Use `CommonDialog title="시간 선택" size="sm"`, `onClose={() => setOpen(false)}`, and keep `DigitalClock` in children. Keep `onChange` formatting and close-on-selection logic unchanged.

- [ ] **Step 3: Convert the F1-Grid demo picker**

Use `CommonDialog title="품목 코드 선택" size="sm"`; keep explanatory text and both sample-selection buttons in children; keep the close action in the footer and preserve each row patch.

- [ ] **Step 4: Run the corresponding existing tests**

Run the matching dashboard favorites and F1-Grid Vitest files. Expected: folder operations, time editing, and picker patch behavior pass.

### Task 4: Migrate system-setting dialogs

**Files:**
- Modify: `frontend/src/pages/settings/system/roles/components/RoleManagementPanel.tsx`
- Modify: `frontend/src/pages/settings/system/policies/SystemPolicyPage.tsx`
- Modify: `frontend/src/pages/settings/system/policies/components/PolicyEditor.tsx`
- Tests: corresponding role-management and system-policy Vitest files

- [ ] **Step 1: Convert role-user addition**

Use `CommonDialog size="sm"` with title `사용자 추가`, retain the search field and candidate list, preserve save-in-flight checks, and keep the existing cancel/add actions.

- [ ] **Step 2: Convert policy deletion and history**

Use `CommonDialog size="xs"` for deletion and `size="md"` for history. Preserve deletion busy guards, error text, loading/empty/history entries, and all callbacks. Supply existing history text through `description` only if present; keep entry content in children.

- [ ] **Step 3: Convert the policy editor**

Use `CommonDialog size="md"` with its current form contents and save/cancel buttons. Preserve `close`, `save`, `saving`, validation, and error state; its discard confirmation is covered by Task 2.

- [ ] **Step 4: Run role and policy tests**

Run the existing role-management and system-policy Vitest files. Expected: user assignment, policy CRUD/history, unsaved confirmation, and errors pass.

### Task 5: Migrate common code, archive, notifications, documents, and image viewer

**Files:**
- Modify: `frontend/src/pages/co/master/common-code/components/CommonCodeManagementPanel.tsx`
- Modify: `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`
- Modify: `frontend/src/pages/groupware/community/archive/components/ArchiveFileEditDialog.tsx`
- Modify: `frontend/src/pages/groupware/notifications/NotificationInboxPage.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentReferenceAddDialog.tsx`
- Modify: `frontend/src/shared/components/ImageViewerDialog.tsx`
- Tests: corresponding existing feature tests and `frontend/tests/image-viewer-dialog.test.tsx`

- [ ] **Step 1: Convert parent-code selection**

Use `CommonDialog size="sm"` and preserve the parent option list, empty state, saving guards, selection application, and close behavior.

- [ ] **Step 2: Convert archive delete and edit**

Use `CommonDialog size="xs"` for delete confirmation and `size="sm"` for file edit. Preserve file name/folder fields, validation errors, save state, and delete/edit callbacks.

- [ ] **Step 3: Convert notification cleanup confirmation**

Use `CommonDialog size="xs"` with existing title/description and keep cancel/confirm actions, busy-state disabling, and `hideReadNotifications`.

- [ ] **Step 4: Convert document cancel/delete/reference dialogs**

Use `CommonDialog size="xs"` for cancel/delete and `size="sm"` for reference input. Preserve current action errors, labels, pending guards, user selection, submit conditions, and handlers.

- [ ] **Step 5: Convert image viewer shell**

Use `CommonDialog size="xl" bodyMode="fill" paperHeight="90vh"` with its existing title, `closeButtonLabel="이미지 뷰어 닫기"`, and `onClose`. Keep the checkerboard canvas and image sizing inside children.

- [ ] **Step 6: Run affected feature tests**

Run the existing common-code, archive, notification, document-write, and image-viewer Vitest files. Expected: selection, confirmation, save/delete, error, and image accessibility behavior pass.

### Task 6: Verify the project-wide invariant and document results

**Files:**
- Modify: `docs/spec/20261111/20261111_002_프론트엔드_공통다이얼로그_표준화_상세사양서.md`
- Create: `docs/result/20261111/frontend-common-dialogs/20261111_002_프론트엔드_공통다이얼로그_표준화_결과.md`
- Create: `docs/result/20261111/frontend-common-dialogs/screenshots/`

- [ ] **Step 1: Verify no direct application dialogs remain**

Run from repository root: `rg "<Dialog\\b" frontend/src -g "*.tsx" -g "*.jsx"`

Expected: only `frontend/src/shared/components/CommonDialog.tsx` contains a direct MUI `<Dialog>`.

- [ ] **Step 2: Run the full frontend test suite**

Run from `frontend`: `npm run test`

Expected: all Vitest files pass.

- [ ] **Step 3: Run the production build**

Run from `frontend`: `npm run build`

Expected: TypeScript and Vite production build pass.

- [ ] **Step 4: Check representative browser layouts**

At 375px, 768px, and 1280px, inspect representative confirmation, form, selection, and image-viewer dialogs. Confirm no clipped actions or horizontal overflow; save representative screenshots.

- [ ] **Step 5: Write the result record**

Record all converted dialog categories, retained exceptions, exact test/build outcomes, and screenshot paths. Do not alter unrelated worktree changes.
