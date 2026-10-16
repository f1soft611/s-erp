# Document Approval Sequence Badge Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render approval and agreement sequence badges as matching 24px outlined circles in the document composer and detail view, with centered numbers and a centered composer approver footer.

**Architecture:** Add one feature-local `ApprovalSequenceBadge` component and use it in the composer approval fields and read-only detail feed. Keep order calculation, agreement grouping, participant layout, and document workflow unchanged.

**Tech Stack:** React, TypeScript, MUI `Box`, Vitest, Testing Library, Vite.

---

## Files and responsibilities

- Create `frontend/src/pages/groupware/documents/write/components/ApprovalSequenceBadge.tsx`: the shared 24px outlined sequence marker.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`: replace its filled 15px marker for approval/agreement participants; center the approval badge/name pair.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: replace inline 24px approval and 28px agreement-stage markers with the shared component; retain current test IDs and approval-name alignment. Preserve unrelated existing modifications in this file.
- Modify `frontend/tests/document-write-page.test.tsx`: cover matching badge size/style/centering on both screens; preserve existing unrelated modifications in this file.
- Update the dated direction, plan, and spec in `docs/directions/20261015/`, `docs/plan/20261015/`, and `docs/spec/20261015/`.
- Create `docs/result/20261015/document-approval-sequence-badge/` documentation and screenshots after browser verification.

## Task 1: Add regression assertions

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Extend the composer approval rendering test**

In the existing test `adds the signed-in user as a non-removable first approver`, after locating `approverName`, assert the approval number badge is 24px and its parent aligns the badge/name pair centrally:

```tsx
const sequenceBadge = within(firstApprover).getByLabelText('참여 순번 1');
expect(sequenceBadge).toHaveStyle({
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
});
expect(approverName.parentElement).toHaveStyle({
  display: 'flex',
  justifyContent: 'center',
});
```

- [ ] **Step 2: Extend the composer agreement presentation test**

In the existing test `renders each selected agreement user as a wrapped chip and appends the next selector`, locate the first `document-agreement-chip` and verify that its existing stage number 2 uses the same 24px outlined badge style:

```tsx
const agreementSequenceBadge = within(agreement).getByLabelText('참여 순번 2');
expect(agreementSequenceBadge).toHaveStyle({
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
});
```

Do not change participant creation or sequence logic.

- [ ] **Step 3: Extend detail approval and agreement sequence assertions**

In the existing detail approval-line test, assert that the stage-order marker under `approval-line-sequence-74` and the stage marker `approval-line-agreement-stage-order` both use the same 24px outlined centered style:

```tsx
const approvalSequenceBadge = within(centeredStage).getByLabelText(
  /^결재선 순번 /,
);
const agreementSequenceBadge = within(agreementStageRow).getByLabelText(
  /^합의 순번 /,
);
for (const badge of [approvalSequenceBadge, agreementSequenceBadge]) {
  expect(badge).toHaveStyle({
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
  });
}
```

Keep the existing wrapper test IDs and center-alignment assertions. Use the concrete stage numbers already in the fixture.

- [ ] **Step 4: Run the focused test and confirm the new expectations fail**

Run from `frontend`:

```powershell
npm run test -- tests/document-write-page.test.tsx
```

Expected: FAIL only for the new 24px/outline/center assertions against the current 15px filled composer badges and 28px detail agreement badge. Investigate unrelated failures separately; do not change unrelated fixtures or worktree edits.

## Task 2: Implement the shared 24px badge

**Files:**
- Create: `frontend/src/pages/groupware/documents/write/components/ApprovalSequenceBadge.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [ ] **Step 1: Add the shared component**

Create `ApprovalSequenceBadge.tsx`:

```tsx
import { Box } from '@mui/material';

type ApprovalSequenceBadgeProps = {
  order: number;
  'aria-label'?: string;
  testId?: string;
};

export function ApprovalSequenceBadge({
  order,
  'aria-label': ariaLabel,
  testId,
}: ApprovalSequenceBadgeProps) {
  return (
    <Box
      component="span"
      aria-label={ariaLabel}
      data-testid={testId}
      sx={{
        display: 'grid',
        placeItems: 'center',
        flex: '0 0 24px',
        width: 24,
        height: 24,
        border: '1px solid',
        borderColor: 'text.secondary',
        borderRadius: '50%',
        fontSize: '1rem',
        fontWeight: 700,
      }}
    >
      {order}
    </Box>
  );
}
```

- [ ] **Step 2: Reuse the component in composer approval fields**

Import `ApprovalSequenceBadge` from `./ApprovalSequenceBadge`. Remove the local `ParticipantSequenceBadge` implementation. Replace its approval and agreement uses with `<ApprovalSequenceBadge order={order} aria-label={`참여 순번 ${order}`} />`.

Change the approval footer from a two-column grid to a centered flex row:

```tsx
sx={{
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 0.5,
  minWidth: 0,
  px: 0.25,
}}
```

Retain the name `Typography`'s existing `title`, `noWrap`, minimum-width, overflow, and ellipsis rules. Do not change the 40px agreement chip height or its participant order.

- [ ] **Step 3: Reuse the component in the detail approval sequence**

Import `ApprovalSequenceBadge` from `./ApprovalSequenceBadge`. In `approval-line-sequence-${line.electronicApprovalLineId}`, replace the inline 24px number `Box` with:

```tsx
<ApprovalSequenceBadge
  order={line.stageOrder}
  aria-label={`결재선 순번 ${line.stageOrder}`}
/>
```

Keep the wrapper's `data-testid`, alignment, and participant-name `Typography` unchanged.

- [ ] **Step 4: Reuse the component in detail agreement stage headers**

Replace the inline 28px `approval-line-agreement-stage-order` `Box` with:

```tsx
<ApprovalSequenceBadge
  order={stage.stageOrder}
  aria-label={`합의 순번 ${stage.stageOrder}`}
  testId="approval-line-agreement-stage-order"
/>
```

Keep the agreement group structure, participants, and row layout unchanged.

- [ ] **Step 5: Run focused regression tests**

Run from `frontend`:

```powershell
npm run test -- tests/document-write-page.test.tsx
```

Expected: PASS, including the existing approval numbering, agreement grouping, participant removal, status/profile fallback, and detail alignment assertions.

## Task 3: Build and verify browser layouts

**Files:**
- Verify: the component and test files from Tasks 1–2
- Create: `docs/result/20261015/document-approval-sequence-badge/`

- [ ] **Step 1: Run the frontend production build**

Run from `frontend`:

```powershell
npm run build
```

Expected: TypeScript project build and Vite production build complete with exit code 0.

- [ ] **Step 2: Verify the application in the existing browser server**

Use `http://127.0.0.1:4173`; verify that the running server is the S-ERP frontend before reuse. Open a safe, non-personal document test fixture, inspect the composer and its detail view at 1280px, 768px, and 375px, and verify:

- composer approval and agreement numbers have matching 24px outline circles;
- numbers are centered inside the circles;
- composer approval number and name form a centered row;
- detail approval and agreement numbers use the same 24px circle;
- no page-level horizontal overflow is introduced at 375px.

Do not capture real user names, account data, or other personal information.

- [ ] **Step 3: Record the result**

Create `docs/result/20261015/document-approval-sequence-badge/` with a result document containing the changed surfaces, exact test/build commands and outcomes, the three viewport checks, and links to screenshots stored in the same folder. Record a limitation explicitly if a viewport or safe test fixture cannot be verified.

## Completion checklist

- [ ] `ApprovalSequenceBadge` is the single source of badge geometry and number centering in both views.
- [ ] Both composer and detail approval/agreement badges are exactly 24px.
- [ ] Existing order values, agreement-stage grouping, participant operations, and detail workflows are unchanged.
- [ ] Focused tests and production build pass.
- [ ] Browser checks and result evidence are recorded without personal data.
