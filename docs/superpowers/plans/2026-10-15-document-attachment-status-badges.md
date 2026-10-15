# Document Attachment Status Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-file status text below document attachment rows with compact status badges between the filename and remove action.

**Architecture:** Keep status mapping in `DocumentComposerDialog`, extending the shared `AttachmentList` with an optional badge slot rendered immediately before its existing remove button. The slot is unused by all other consumers, so their layout and behavior remain unchanged; existing retry and upload reconciliation actions stay available in the document row.

**Tech Stack:** React, TypeScript, MUI `Chip`, Vitest, React Testing Library.

---

## File Map

- Modify `frontend/src/shared/components/feed/AttachmentList.tsx`: add an optional `statusBadge?: ReactNode` and render it before the existing edit/remove or download action.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`: map attachment states to compact chips, pass the chip through `AttachmentList`, remove the below-row status typography, and keep retry/reconcile buttons accessible in the row.
- Modify `frontend/tests/document-write-page.test.tsx`: assert badge labels/placement, no below-row status text, and retained failure actions.
- Create date-scoped task instruction, plan, detailed specification, and result under `docs/directions/20261015`, `docs/plan/20261015`, `docs/spec/20261015`, and `docs/result/20261015/document-attachment-status-badges`.
- The approved design is `docs/superpowers/specs/2026-10-15-document-attachment-status-badge-design.md`.

## Task 1: Add a failing regression for status badge placement

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Extend the existing edit-attachment test for the uploaded badge**

In `shows and preserves existing attachments when editing a revision-requested document`, after finding `기존자료.pdf`, find its row with:

```tsx
const existingAttachmentRow = within(dialog).getByTestId(
  'document-composer-attachment-uploaded',
);
expect(within(existingAttachmentRow).getByText('완료')).toBeInTheDocument();
expect(within(existingAttachmentRow).queryByText('업로드 완료')).not.toBeInTheDocument();
```

Prefer using a stable status-badge test id (for example `document-composer-attachment-status`) on the badge, and assert it is a descendant before the delete button:

```tsx
const statusBadge = within(existingAttachmentRow)
  .getByTestId('document-composer-attachment-status');
const removeButton = within(existingAttachmentRow)
  .getByRole('button', { name: '첨부 파일 삭제' });
expect(statusBadge.compareDocumentPosition(removeButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
```

- [ ] **Step 2: Add a pending-state assertion**

Within the same test, select one new attachment through the existing accessible file input:

```tsx
const fileInput = within(dialog).getByLabelText('첨부 파일 선택');
fireEvent.change(fileInput, {
  target: { files: [new File(['new'], 'new-file.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })] },
});
const pendingRow = within(dialog).getByTestId('document-composer-attachment-pending');
expect(within(pendingRow).getByText('대기')).toBeInTheDocument();
expect(within(pendingRow).queryByText('저장 후 업로드')).not.toBeInTheDocument();
```

Dispatch `fireEvent.change` directly on the hidden file input; do not change production code to make the test helper easier.

- [ ] **Step 3: Run the focused regression to verify RED**

Run from `frontend`:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "shows and preserves existing attachments"
```

Expected: FAIL because the current row has no `완료`/`대기` badge, and current status copy is rendered below the file box.

## Task 2: Add the optional status badge slot to AttachmentList

**Files:**
- Modify: `frontend/src/shared/components/feed/AttachmentList.tsx`

- [ ] **Step 1: Add the optional slot type**

Import React's `ReactNode` type and add the property:

```tsx
import type { ReactNode } from 'react';

export type AttachmentListProps = {
  // existing props...
  statusBadge?: ReactNode;
};
```

Destructure `statusBadge` as optional. When provided, render it immediately before the existing action button, in the same file-row flex container:

```tsx
{statusBadge}
{showActions && (
  <IconButton ...>
```

Keep the current default behavior byte-for-byte equivalent when the prop is omitted.

- [ ] **Step 2: Run the focused regression**

Run:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "shows and preserves existing attachments"
```

Expected: still FAIL, now only because the document composer has not supplied a badge.

## Task 3: Render compact state badges and remove below-row text

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`

- [ ] **Step 1: Map attachment state to a concise MUI Chip**

For each attachment, map `uploaded` to `완료/success`, `pending` to `대기/default`, `failed` to `실패/error`, and `unknown` to `확인 필요/warning`. Build a compact `statusBadge` adornment containing the MUI `Chip` and, when applicable, its `재시도` or `상태 확인` button; pass it to `AttachmentList` with stable `data-testid="document-composer-attachment-status"`. Keep the badge and supplementary action in a non-shrinking flex group.

- [ ] **Step 2: Remove the status Typography below each file row**

Delete the Typography that currently prints `업로드 완료`, `저장 후 업로드`, and `attachment.error` under the file card. Retain the modal-level `saveError` alert for detailed failure information.

- [ ] **Step 3: Preserve the retry and reconcile actions**

Keep the existing `재시도` and `상태 확인` buttons and their handlers inside the attachment row, immediately after the badge and before the remove action. Ensure only the filename region can shrink:

```tsx
sx={{
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  minWidth: 0,
  flex: 1,
}}
```

Retain `isSaving` disabled behavior and the existing unknown-state deletion policy.

- [ ] **Step 4: Run the focused regression to verify GREEN**

Run:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "shows and preserves existing attachments"
```

Expected: PASS; uploaded and pending files each show a badge inside their row and no prior status sentence.

## Task 4: Verify failed/unknown state badges and action behavior

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Assert the failed-state badge and retry action**

In the existing `keeps failed attachments and retries them individually` test, assert that the failed row contains `실패` and retains the `재시도` button; assert there is no `업로드 실패` status line inside the row.

- [ ] **Step 2: Assert the unknown-state badge and reconcile action**

In `marks an ambiguous upload as unknown and does not retry it automatically`, assert that the unknown row contains `확인 필요` and retains `상태 확인`; do not assert backend-specific error details in the badge.

- [ ] **Step 3: Run focused state regressions**

Run:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "shows and preserves existing attachments|keeps failed attachments and retries them individually|marks an ambiguous upload as unknown and does not retry it automatically"
```

Expected: PASS for all selected tests. If the existing unknown test's default timeout is flaky, run it by itself; do not increase suite-wide timeout to mask unrelated slowness.

## Task 5: Update work documents and validate the final patch

**Files:**
- Modify/create docs under `docs/directions/20261015`, `docs/plan/20261015`, `docs/spec/20261015`, `docs/superpowers/specs`, and `docs/result/20261015/document-attachment-status-badges`.

- [ ] **Step 1: Record the final UI and regression contract**

Ensure the dated work instruction, plan, and detailed spec agree on the exact labels (`완료`, `대기`, `실패`, `확인 필요`), no below-row status copy, and unchanged retry/reconcile behavior.

- [ ] **Step 2: Run the relevant test**

Run from `frontend`:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "shows and preserves existing attachments|keeps failed attachments and retries them individually|marks an ambiguous upload as unknown and does not retry it automatically"
```

Expected: selected attachment tests pass.

- [ ] **Step 3: Run the production build**

Run:

```powershell
npm run build
```

Expected: TypeScript and Vite build succeed. Record any pre-existing chunk-size warning.

- [ ] **Step 4: Run Problems and whitespace validation**

Inspect Problems for `AttachmentList.tsx`, `DocumentComposerDialog.tsx`, and `document-write-page.test.tsx`, then run:

```powershell
git diff --check
```

Expected: no relevant diagnostics and no whitespace errors.

- [ ] **Step 5: Record browser validation status**

Try the existing S-ERP browser at `http://127.0.0.1:4173/groupware/documents/write` without attempting to bypass authentication. If it redirects to login, record that visual validation was blocked and rely on the DOM regression tests; do not create misleading screenshots.

- [ ] **Step 6: Write the result report**

Record exact test/build outcomes, the login restriction if applicable, and the files changed in `docs/result/20261015/document-attachment-status-badges/`.
