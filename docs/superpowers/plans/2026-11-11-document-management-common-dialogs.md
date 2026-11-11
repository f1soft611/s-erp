# Document Management Common Dialogs Implementation Plan

> **For agentic workers:** Follow this plan task-by-task. Steps use checkbox syntax for tracking. No commit is requested; preserve all unrelated worktree changes.

**Goal:** Use `CommonDialog` for ordinary document-management confirmations and input dialogs without changing other modules or existing workflow behavior.

**Architecture:** Keep `CommonDialog` as the single visual shell, adding a 600px `sm` size to preserve the reference-add dialog footprint. Migrate document-management callers directly instead of changing the globally shared `UnsavedChangesConfirmDialog`; specialized image viewers and popovers remain as-is.

**Tech Stack:** React, TypeScript, MUI, Vitest, React Testing Library, Vite.

---

### Task 1: Add a 600px common dialog size

**Files:**
- Modify: `frontend/tests/common-dialog.test.tsx`
- Modify: `frontend/src/shared/components/CommonDialog.tsx`

- [ ] **Step 1: Add the failing `sm` size test**

Add a rerender case beside the existing `xs`/`md`/`lg` width assertions:

```tsx
rerender(
  <CommonDialog open title="작은 중간 크기" onClose={vi.fn()} size="sm">
    <p>본문</p>
  </CommonDialog>,
);
expect(screen.getByRole('dialog')).toHaveStyle({ maxWidth: '600px' });
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run from `frontend`: `npm run test -- tests/common-dialog.test.tsx`

Expected: the test fails because `sm` is not an allowed size and has no 600px width mapping.

- [ ] **Step 3: Implement the size mapping**

Update the size union and width selection:

```tsx
export type CommonDialogSize = 'xs' | 'sm' | 'md' | 'lg';
const maxWidth =
  size === 'xs' ? 480 : size === 'sm' ? 600 : size === 'lg' ? 990 : 820;
```

- [ ] **Step 4: Run the focused test**

Run from `frontend`: `npm run test -- tests/common-dialog.test.tsx`

Expected: all CommonDialog tests pass; existing width values remain 480px, 820px, and 990px.

### Task 2: Convert direct document dialogs

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentReferenceAddDialog.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Preserve the current behavior in focused tests**

Run the existing cancellation, deletion, and reference-add tests before changing implementation:

```powershell
npm run test -- tests/document-write-page.test.tsx -t "취소|삭제|참조자 추가"
```

Expected: existing dialogs expose the same titles, button labels, error text, and callbacks.

- [ ] **Step 2: Convert approval cancellation and document deletion**

Replace each MUI `<Dialog>` shell with a `<CommonDialog>` using `size="xs"`, its existing title and body text as `title`/`description`, and its existing action buttons through `actions`. Keep error alerts in `children`; keep `onClose` guarded by `isActing` or `isDeleting`, respectively.

Example shell:

```tsx
<CommonDialog
  open={cancelDialogType !== null}
  onClose={() => !isActing && setCancelDialogType(null)}
  title={cancelDialogType === 'submission' ? '결재신청 취소' : '승인 취소'}
  description={
    cancelDialogType === 'submission'
      ? '결재신청을 취소하고 임시저장 상태로 되돌립니다.'
      : '본인의 승인을 취소합니다.'
  }
  size="xs"
  actions={
    <>
      <Button
        variant="outlined"
        color="error"
        onClick={() => void handleCancelDocumentAction()}
        disabled={isActing}
      >
        {isActing
          ? '취소 중...'
          : cancelDialogType === 'submission'
            ? '상신 취소'
            : '승인 취소'}
      </Button>
      <Button onClick={() => setCancelDialogType(null)} disabled={isActing}>
        닫기
      </Button>
    </>
  }
>
  {actionError && <Alert severity="error" sx={{ mt: 1 }}>{actionError}</Alert>}
</CommonDialog>
```

- [ ] **Step 3: Convert the reference-add dialog**

Use the common shell and preserve the existing user selector, alerts, submit/cancel controls, and pending-state guards:

```tsx
<CommonDialog
  open={open}
  onClose={() => !isSubmitting && onClose()}
  title="참조자 추가"
  size="sm"
  actions={
    <>
      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={isSubmitting || selectedUserIds.length === 0}
      >
        {isSubmitting ? '추가 중...' : '참조자 추가'}
      </Button>
      <Button onClick={onClose} disabled={isSubmitting}>
        취소
      </Button>
    </>
  }
>
  <Box sx={{ pt: 1 }}>
    <UserSelectEditor
      value={selectedUserIds}
      options={options}
      multiple
      disableCloseOnSelect={false}
      hideSelectedOptions
      preserveSelectionOrder
      label="참조자 선택"
      readOnly={options.length === 0}
      disabled={isSubmitting}
      onChange={(value) =>
        onSelectionChange(Array.isArray(value) ? value.map(String) : [])
      }
    />
  </Box>
  {options.length === 0 && (
    <Alert severity="info" sx={{ mt: 1 }}>
      추가할 수 있는 사용자가 없습니다.
    </Alert>
  )}
  {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
  {info && <Alert severity="info" sx={{ mt: 1 }}>{info}</Alert>}
</CommonDialog>
```

- [ ] **Step 4: Re-run focused document tests**

Run from `frontend`: `npm run test -- tests/document-write-page.test.tsx -t "취소|삭제|참조자 추가"`

Expected: the same business callbacks and messages pass with the common dialog shell.

### Task 3: Convert document-management confirmation callers

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`
- Test: `frontend/tests/document-approval-settings-dialog.test.tsx`

- [ ] **Step 1: Identify current confirmation test coverage**

Run from `frontend`:

```powershell
npm run test -- tests/document-write-page.test.tsx -t "상단 고정|문서 유형 변경|본문 교체"
npm run test -- tests/document-approval-settings-dialog.test.tsx -t "저장하지 않은 변경사항"
```

Expected: current pin/unpin, document-kind, template-replacement, and template-setting confirmation flows pass.

- [ ] **Step 2: Replace each document-management `UnsavedChangesConfirmDialog` caller**

Use `CommonDialog` with `size="xs"`, preserve the supplied title/description, and retain the existing action order (continue, then cancel). The confirm button keeps `variant="contained"`, its existing color/disabled state, and `autoFocus`; the cancel button keeps its existing callback and label. `onClose` invokes the same cancel handler.

Example:

```tsx
<CommonDialog
  open={Boolean(pendingPinAction)}
  onClose={() => setPendingPinAction(null)}
  title={pendingPinAction?.isPinned ? '상단 고정 해제' : '상단 고정'}
  description={
    pendingPinAction?.isPinned
      ? '이 문서의 상단 고정을 해제하시겠습니까?'
      : '이 문서를 상단에 고정하시겠습니까?'
  }
  size="xs"
  actions={
    <>
      <Button
        variant="contained"
        onClick={() => void confirmPinToggle()}
        autoFocus
        disabled={
          pendingPinAction
            ? isPinPending(pendingPinAction.electronicApprovalId)
            : false
        }
      >
        확인
      </Button>
      <Button onClick={() => setPendingPinAction(null)}>취소</Button>
    </>
  }
  children={null}
/>
```

For document-kind change, use title `문서 유형 변경`, the existing description, `cancelDocumentKindChange`/`confirmDocumentKindChange`, and labels `취소`/`이동`. For template replacement, use title `작성 중인 본문 교체`, the existing description, `cancelTemplateReplacement`/`confirmTemplateReplacement`, and labels `취소`/`교체`. For template-setting changes, preserve the current `templateLabel` description, `setDiscardTemplateChangesOpen(false)`/`confirmDiscardTemplateChanges`, and labels `취소`/`계속`; the cancel action also clears `pendingManagerAction`. In all cases retain the continue-first action order, contained variant, `autoFocus`, and existing disabled condition. Do not edit the shared `UnsavedChangesConfirmDialog`.

- [ ] **Step 3: Re-run focused confirmation tests**

Run the two commands from Step 1 again.

Expected: all existing confirmation, cancel, and continue flows pass; the document-management files no longer import `UnsavedChangesConfirmDialog`.

### Task 4: Verify and document

**Files:**
- Modify: `docs/spec/20261111/20261111_002_문서관리_공통모달_통일_상세사양서.md`
- Create: `docs/result/20261111/document-management-common-dialogs/20261111_002_문서관리_공통모달_통일_결과.md`
- Create: `docs/result/20261111/document-management-common-dialogs/screenshots/` (375px, 768px, 1280px captures)

- [ ] **Step 1: Run related test suites**

Run from `frontend`:

```powershell
npm run test -- tests/common-dialog.test.tsx tests/document-write-page.test.tsx tests/document-approval-settings-dialog.test.tsx
```

Expected: all selected tests pass.

- [ ] **Step 2: Run the production build**

Run from `frontend`: `npm run build`

Expected: TypeScript and Vite production build pass.

- [ ] **Step 3: Check responsive rendering**

At 375px, 768px, and 1280px, open representative pin confirmation, approval cancellation, and reference-add dialogs. Confirm no clipped actions, horizontal overflow, or selector truncation; capture the three viewport widths.

- [ ] **Step 4: Write the result record**

Record changed dialogs, behavior preserved, exact test/build outcomes, screenshot paths, and any pre-existing failures. Do not modify or remove unrelated worktree changes.
