# Document Approval Display Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate approval selection from committed approval display, show approvers in a wrapping table grid, and show agreement participants in individually removable wrapping chips.

**Architecture:** Keep stage state grouped in `useDocumentComposer`; derive a stable flattened participant list in `DocumentApprovalFields` for global numbering. Split the form into four labeled rows, render approval users as grid cells and agreement users as chips, and replace whole-stage removal wiring with participant-level removal that prunes empty stages.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File map

- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx` — four labeled rows, approval grid, agreement chip wrapping, global display order.
- `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts` — participant-specific removal with empty-stage cleanup and candidate restoration via existing stage-derived filtering.
- `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx` — pass the participant-removal callback to the fields component.
- `frontend/tests/document-write-page.test.tsx` — regression coverage for row layout, content, wrapping, individual deletion, global numbering, and references.
- `docs/directions/20261007/20261007_006_문서작성_결재표_합의칩_배치_작업지시서.md` — approved task and completion conditions.
- `docs/plan/20261007/20261007_006_문서작성_결재표_합의칩_배치_계획서.md` — dated implementation plan.
- `docs/spec/20261007/20261007_006_문서작성_결재표_합의칩_배치_사양서.md` — detailed UI and behavior specification.
- `docs/result/20261007/document-approval-display-layout/20261007_006_문서작성_결재표_합의칩_배치_결과보고서.md` — validation results and screenshot links.
- `docs/result/20261007/document-approval-display-layout/screenshots/` — privacy-safe responsive evidence.

## Task 1: Record dated requirements

**Files:**
- Create: dated direction, plan, and specification listed in the file map.

- [x] **Step 1: Verify the four-row requirements**

Record exact order: `결재선` selector/actions, `결재` wrapping approval grid, `합의` wrapping participant chips, and unchanged `참조` selector.

- [x] **Step 2: Verify state and removal requirements**

Record global numbering by flattening stages in existing stage/user order, individual removal for both approval and agreement users, agreement-stage pruning when empty, selector candidate restoration, and unchanged reference behavior.

- [x] **Step 3: Cross-check all dated document links**

Ensure the dated direction, plan, and specification all link to `../../superpowers/specs/2026-10-07-document-approval-display-layout-design.md` and this plan.

## Task 2: Write failing row and presentation tests

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Replace the old single-row approval-stage assertions**

Test that the row labels appear in order using `document-approval-input-row`, `document-approval-display-row`, `document-agreement-display-row`, and the existing `document-reference-row`. Assert the approval selector and `결재 추가`/`합의 추가` buttons stay in the first row and committed users do not appear there.

- [x] **Step 2: Assert approval grid participant columns**

After committing `김민수` and then `홍길동`, assert that each approval user appears in `document-approval-person` with their position (`과장` / `대리`), stamp, global sequence, name, and individual remove button. Assert grid wrapping styles and that approval order matches selection order:

```tsx
const approvalPeople = screen.getAllByTestId('document-approval-person');
expect(approvalPeople).toHaveLength(2);
expect(approvalPeople[0]).toHaveTextContent('과장');
expect(approvalPeople[0]).toHaveTextContent('1');
expect(approvalPeople[0]).toHaveTextContent('김민수');
expect(approvalPeople[1]).toHaveTextContent('대리');
expect(approvalPeople[1]).toHaveTextContent('2');
expect(approvalPeople[1]).toHaveTextContent('홍길동');
expect(screen.getByTestId('document-approval-grid')).toHaveStyle({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
});
```

- [x] **Step 3: Assert agreement chips and single-user deletion**

After committing two agreement users, assert one chip per user with sequence, name, seal and accessible individual delete; assert avatar and stage-kind text are absent. Remove the first agreement chip and verify the other remains, only the removed user returns to selector candidates, and all remaining participant sequence labels close the gap.

```tsx
const agreementChips = screen.getAllByTestId('document-agreement-chip');
expect(agreementChips).toHaveLength(2);
expect(agreementChips[0]).toHaveTextContent('1');
expect(agreementChips[0]).toHaveTextContent('홍길동');
expect(agreementChips[1]).toHaveTextContent('김민수');
expect(agreementChips[0].querySelector('img')).toBeNull();

fireEvent.click(
  within(agreementChips[0]).getByRole('button', {
    name: '합의 참여자 1 홍길동 삭제',
  }),
);
expect(screen.getAllByTestId('document-agreement-chip')).toHaveLength(1);
expect(screen.getByTestId('document-agreement-chip')).toHaveTextContent(
  '김민수',
);
const activeApprovalPicker = screen.getByRole('combobox', {
  name: '결재선 2 사용자 선택',
});
fireEvent.click(activeApprovalPicker);
expect(await screen.findByRole('option', { name: /홍길동/ })).toBeInTheDocument();
expect(screen.queryByRole('option', { name: /김민수/ })).not.toBeInTheDocument();
```

- [x] **Step 4: Assert global renumbering across mixed stages**

Create an approval, then a two-user agreement group, then another approval. Verify their displayed global numbers are 1, 2, 3, 4 across the approval grid and agreement chips. Delete the first approval and verify the remaining participants renumber 1, 2, 3 and the next selector label is `결재선 4 사용자 선택`.

- [x] **Step 5: Run composer tests and confirm failures are requirement-related**

Run from `frontend`:

```powershell
npm run test -- tests/document-write-page.test.tsx
```

Expected before implementation: failures identify missing four-row IDs, participant grid/chip presentation, individual agreement removal, or global sequence numbering. Do not proceed if failures are unrelated runtime/setup errors.

## Task 3: Implement the four-row component layout

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`

- [x] **Step 1: Keep only selector and actions in the first row**

Move the active multi-user selector and both action buttons into the `결재선` content row. Keep existing `UserSelectEditor` props, candidate filtering, current 40px field/action heights, labels, and callbacks.

- [x] **Step 2: Derive participant order once**

Flatten `approvalStages` in order to entries `{ stageId, kind, user, sequence }`, incrementing `sequence` once per user. Filter this ordered list by `kind` for the two display rows without recomputing a kind-local sequence:

```tsx
let sequence = 0;
const participants = approvalStages.flatMap((stage) =>
  stage.users.map((user) => ({
    stageId: stage.id,
    kind: stage.kind,
    user,
    sequence: ++sequence,
  })),
);
const approvalParticipants = participants.filter(
  (participant) => participant.kind === 'approval',
);
const agreementParticipants = participants.filter(
  (participant) => participant.kind === 'agreement',
);
```

- [x] **Step 3: Render approval users in a wrapping table-like grid**

Render approval entries in a min-width-safe CSS grid:

```tsx
<Box
  data-testid="document-approval-grid"
  sx={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 0.5,
    minWidth: 0,
  }}
>
  {approvalParticipants.map(({ stageId, user, sequence }) => (
    <Box
      key={`${stageId}-${String(user.value)}`}
      role="group"
      aria-label={`결재 ${sequence} ${user.label}`}
      data-testid="document-approval-person"
      sx={{
        display: 'grid',
        gridTemplateRows: '32px 64px 32px',
        minWidth: 0,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" textAlign="center">
        {user.positionName ?? ''}
      </Typography>
      <Box
        aria-label="결재 도장 자리"
        sx={{ display: 'grid', placeItems: 'center', borderBlock: '1px solid', borderColor: 'divider' }}
      >
        도장
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
        <Typography variant="caption">{sequence}</Typography>
        <Typography variant="body2" noWrap>{user.label}</Typography>
        <IconButton
          size="small"
          aria-label={`결재 참여자 ${sequence} ${user.label} 삭제`}
          onClick={() => onRemoveApprovalUser(stageId, String(user.value))}
        >
          <DeleteOutlineOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  ))}
</Box>
```

Each fixed-minimum 120px cell contains the user's `positionName`, a bordered seal area, a lower sequence/name line, and a remove icon whose accessible name includes sequence and name. Keep column order stable and do not make the outer row horizontally scrollable.

- [x] **Step 4: Render agreement users as individually removable wrapping chips**

Render one muted compact chip per agreement entry, with only global sequence, user name, seal slot, and an individual delete button. Use:

```tsx
<Box
  data-testid="document-agreement-list"
  sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, minWidth: 0 }}
>
  {agreementParticipants.map(({ stageId, user, sequence }) => (
    <Box
      key={`${stageId}-${String(user.value)}`}
      data-testid="document-agreement-chip"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        height: 40,
        px: 0.75,
        bgcolor: 'grey.100',
        border: '1px solid',
        borderColor: 'grey.300',
        borderRadius: 1,
      }}
    >
      <Typography variant="caption" aria-label={`결재 순번 ${sequence}`}>
        {sequence}
      </Typography>
      <Typography variant="body2" noWrap>{user.label}</Typography>
      <SealSlot kind="agreement" />
      <IconButton
        size="small"
        aria-label={`합의 참여자 ${sequence} ${user.label} 삭제`}
        onClick={() => onRemoveApprovalUser(stageId, String(user.value))}
      >
        <DeleteOutlineOutlinedIcon fontSize="small" />
      </IconButton>
    </Box>
  ))}
</Box>
```

Each chip is 40px high; omit avatar and `합의` text inside it.

- [x] **Step 5: Keep reference row unchanged**

Retain the existing `참조` label, `UserSelectEditor`, selected values, and callback; relocate only as required to preserve order after the new approval and agreement display rows.

## Task 4: Implement participant-level removal and global input numbering

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`

- [x] **Step 1: Replace the stage-only removal callback**

Implement and return `removeApprovalUser(stageId: number, userId: string)` in the hook:

```tsx
const removeApprovalUser = useCallback((stageId: number, userId: string) => {
  setApprovalStages((current) =>
    current.flatMap((stage) => {
      if (stage.id !== stageId) return [stage];
      const users = stage.users.filter(
        (user) => String(user.value) !== userId,
      );
      return users.length > 0 ? [{ ...stage, users }] : [];
    }),
  );
}, []);
```

Replace `removeApprovalStage` in the hook return object and dialog wiring. Candidate exclusions already derive from remaining stage users.

- [x] **Step 2: Wire each grid/chip remove button to its participant**

Pass stage ID and `String(user.value)` from each rendered approval/agreement entry. Use accessible labels containing kind, sequence, and name. Do not add a second whole-stage action.

- [x] **Step 3: Number the next active selector by participant count**

In `DocumentApprovalFields`, compute and label the next selector number:

```tsx
const nextApprovalNumber =
  approvalStages.reduce((total, stage) => total + stage.users.length, 0) + 1;
```

Use `결재선 ${nextApprovalNumber} 사용자 선택`; preserve existing selector values, selection, and commit behavior.

- [x] **Step 4: Run focused tests**

Run:

```powershell
npm run test -- tests/document-write-page.test.tsx tests/user-select-editor.test.tsx
```

Expected: all row, ordering, grouping, individual-removal, renumbering, candidate-restoration, reference, and shared selector tests pass.

## Task 5: Validate responsive behavior and document results

**Files:**
- Modify: dated direction, plan, and specification.
- Create: dated result report and privacy-safe screenshots.
- Modify: component, hook, dialog wiring, and tests only as required by observed failures.

- [ ] **Step 1: Run lint and production build**

From `frontend`:

```powershell
npm run lint -- src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx src/pages/groupware/documents/write/hooks/useDocumentComposer.ts tests/document-write-page.test.tsx
npm run build
```

Expected: no lint errors and a successful TypeScript/Vite production build.

- [ ] **Step 2: Inspect 375px, 768px, and 1280px browser widths**

Verify four row order, selector/actions on the first row, approval table cells and agreement chips wrapping to subsequent lines, preserved sequence order, individual deletions and candidate restoration, unchanged reference selection, and no page-level horizontal overflow.

- [ ] **Step 3: Capture privacy-safe screenshots**

Use synthetic or otherwise non-sensitive participants; save screenshots under `docs/result/20261007/document-approval-display-layout/screenshots/`. Do not capture actual names/profile information or document body data.

- [ ] **Step 4: Record observed results and check the final diff**

Write actual test/lint/build/browser results in the dated report. Run `git diff --check`, inspect `git status`, and leave unrelated worktree modifications untouched.
