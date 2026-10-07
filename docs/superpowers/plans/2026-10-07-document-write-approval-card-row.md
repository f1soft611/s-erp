# Document Write Approval Card Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected read-only selector boxes with compact approval participant cards and align approval/reference controls in the two-row layout approved in the design spec.

**Architecture:** Keep `approvalStages` and the existing composer callbacks as the single source of approval/agreement state. Change only `DocumentApprovalFields` presentation: each committed stage is a compact card with sequence, participant avatars/names/departments, seal placeholder, and a whole-stage remove action; the active multi-select and commit buttons follow the cards. Retain the shared `UserSelectEditor` only for active approval and reference inputs.

**Tech Stack:** React, TypeScript, MUI, shared `UserSelectEditor`, Vitest, Testing Library, Vite.

---

## Files and responsibilities

- Modify `frontend/tests/document-write-page.test.tsx`: test the label/control rows, approval participant cards, stage numbering, role-specific grouping, whole-stage removal, candidate restoration, reference separation, and modal behavior. Replace assertions tied to the rejected read-only committed selector boxes.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`: render left-side labels and right-side rows; render participant cards with avatar, name, department, sequence, seal, and whole-stage removal; keep active selection and role buttons adjacent; retain local horizontal scrolling on the approval content only.
- Modify `frontend/src/shared/components/CommonDialog.tsx`: add an optional surface background override for dialog paper, header, content, and footer while preserving the default theme surface when omitted.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`: request a white surface for the document composer only.
- Modify `frontend/src/shared/components/f1-grid/editing/UserSelectEditor.tsx`: remove only the previous task's `readOnly`-specific chip-delete suppression, which is no longer needed when committed users are not selector chips. Preserve the existing `hideSelectedOptions`, `preserveSelectionOrder`, and default editable-chip behavior.
- Modify `frontend/tests/user-select-editor.test.tsx`: remove the assertion for the superseded read-only chip behavior; retain coverage for selected-option filtering, selection order, and normal chip deletion.
- Extend `frontend/tests/document-write-page.test.tsx`: verify exact height parity, no unavailable-user message, and white composer dialog surfaces.
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`: remove the prior task's `readOnly` chip behavior note; keep documentation for the supported selection-order and candidate-filter options.
- Update `docs/directions/20261007/20261007_002_문서작성_결재선_입력필드_공간개선_작업지시서.md`, `docs/plan/20261007/20261007_002_문서작성_결재선_입력필드_공간개선_계획서.md`, and `docs/spec/20261007/20261007_002_문서작성_결재선_입력필드_공간개선_사양서.md`: replace the superseded read-only selector-box layout with the approved participant-card layout.
- Update `docs/superpowers/specs/2026-10-07-document-write-approval-selector-fields-design.md` and `docs/superpowers/plans/2026-10-07-document-write-approval-selector-fields.md`: mark the former selector-box design and its plan as superseded and link the approved card-row design and this implementation plan.
- Update `docs/result/20261007/document-write-approval-selector-fields/20261007_002_문서작성_결재선_입력필드_공간개선_결과보고서.md`: mark the prior UI capture as superseded by this correction without claiming its measurements describe the new layout.
- Create `docs/result/20261007/document-write-approval-card-row/20261007_003_문서작성_결재선_카드형_레이아웃_결과보고서.md` and screenshots in its `screenshots/` directory: record focused tests, lint/build, responsive browser measurements, and live-data limitations.

## Task 1: Define the corrected UI with regression tests

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Assert the initial two-row form layout**

In the document composer test, assert the approval and reference rows exist in DOM order and their labels are visible. The active approval selector and both commit buttons remain present on the approval row, and the reference selector remains on the row below.

```tsx
const approvalRow = screen.getByTestId('document-approval-row');
const referenceRow = screen.getByTestId('document-reference-row');
expect(within(approvalRow).getByText('결재선')).toBeInTheDocument();
expect(within(referenceRow).getByText('참조')).toBeInTheDocument();
expect(
  within(approvalRow).getByRole('combobox', {
    name: '결재선 1 사용자 선택',
  }),
).toBeInTheDocument();
expect(
  within(approvalRow).getByRole('button', { name: '결재 추가' }),
).toBeDisabled();
expect(
  within(approvalRow).getByRole('button', { name: '합의 추가' }),
).toBeDisabled();
expect(
  within(referenceRow).getByRole('combobox', { name: '참조자 선택' }),
).toBeInTheDocument();
expect(
  approvalRow.compareDocumentPosition(referenceRow) &
    Node.DOCUMENT_POSITION_FOLLOWING,
).not.toBe(0);
```

- [x] **Step 2: Assert approval participant card metadata and field-height parity**

After selecting `홍길동` and clicking `결재 추가`, assert the stage card contains the current sequence and role, a profile image, name, department (`기획팀`), the seal placeholder, and exactly one stage-level remove action. Assert no committed `결재선 1` combobox exists; the next active picker is `결재선 2 사용자 선택`. The participant card and both action buttons must have the same CSS height as the active selector control.

```tsx
const stage = screen.getByTestId('document-approval-stage');
expect(stage).toHaveTextContent('결재 1');
expect(stage).toHaveTextContent('홍길동');
expect(stage).toHaveTextContent('기획팀');
expect(stage.querySelector('img[src="/users/emp-1.png"]')).not.toBeNull();
expect(within(stage).getByLabelText('결재 도장 자리')).toBeInTheDocument();
expect(
  within(stage).getByRole('button', { name: '결재 단계 1 삭제' }),
).toBeInTheDocument();
expect(
  screen.queryByRole('combobox', { name: '결재선 1' }),
).not.toBeInTheDocument();
```

- [x] **Step 3: Assert unavailable-user empty state and white modal surfaces**

Select all users and commit them; assert that the empty trailing selector has no candidates, both actions are disabled, and `선택 가능한 사용자가 없습니다.` is absent. In the open document composer, assert computed white backgrounds for the dialog paper, title surface, content, and footer.

```tsx
expect(
  screen.queryByText('선택 가능한 사용자가 없습니다.'),
).not.toBeInTheDocument();
expect(screen.getByRole('button', { name: '결재 추가' })).toBeDisabled();
expect(screen.getByRole('button', { name: '합의 추가' })).toBeDisabled();
```

- [x] **Step 4: Update multi-approval and agreement assertions**

Retain existing tests proving that `결재 추가` creates ordered individual stages and `합의 추가` creates one group stage. Assert the agreement card contains both users and their departments under a single stage role and has one group-level remove action. Keep candidate exclusion assertions on the trailing active picker.

- [x] **Step 5: Verify the target tests fail for the current layout and missing modal styling**

Run:

```powershell
Set-Location frontend
npm run test -- tests/document-write-page.test.tsx
```

Expected: the new row and card assertions fail because the current UI still renders selector boxes and places `참조` beside the approval strip.

## Task 2: Implement participant cards and aligned rows

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Render the two labeled rows**

Replace the current two-column grid with a vertical stack of two labeled rows. Each row uses a label column sized consistently and a `minWidth: 0` content column. Give the rows `data-testid="document-approval-row"` and `data-testid="document-reference-row"`. Keep the reference selector directly below the approval row.

- [x] **Step 2: Render each committed stage as one compact unit**

For every `approvalStages` entry, render one bounded horizontal card with sequence and role, followed by its participant content. For each participant render an MUI `Avatar`, name, and department from `F1GridUserOption`. Keep the existing `SealSlot`. An approval stage has one participant; an agreement stage displays its members together inside one stage card. Give each committed card `data-testid="document-approval-stage"` and a stage group accessible name. Match the actual active selector height: style the card as a 40px border-box row, use a 30px avatar and seal no taller than the selector, and keep the two-line name/department within that height.

- [x] **Step 3: Make the card action remove the whole stage**

Render one `IconButton` per stage with `aria-label` `${role} 단계 ${index + 1} 삭제`, wired to the existing `onRemoveApprovalStage(stage.id)`. Do not render per-user delete actions. Keep numbering derived from the current ordered `approvalStages` array so remaining cards renumber after removal.

- [x] **Step 4: Put the active selector and role actions after the cards**

Render one active `UserSelectEditor` after the committed cards, using filtered `approvalOptions`, `multiple`, `hideSelectedOptions`, `preserveSelectionOrder`, and label `결재선 ${approvalStages.length + 1} 사용자 선택`. Set both `결재 추가` and `합의 추가` buttons to the same 40px height as the selector; disable both while no user is selected. Remove the “선택 가능한 사용자가 없습니다.” messages from approval and reference fields. Keep the approval content in its own `overflowX: auto` container with visible label outside the scroll area.

- [x] **Step 5: Run composer tests**

Run:

```powershell
Set-Location frontend
npm run test -- tests/document-write-page.test.tsx
```

Expected: all document composer tests pass, including ordered approvals, grouped agreements, whole-stage removal, candidate restoration, and reference independence.

## Task 3: Set a white surface on the document composer dialog only

**Files:**
- Modify: `frontend/src/shared/components/CommonDialog.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Add the optional common dialog surface override**

Add `surfaceBackgroundColor?: string` to `CommonDialogProps`. Use the override for the paper, title surface, content, and actions surface. When omitted, preserve the current theme-dependent paper/title/actions background and `background.default` content background.

- [x] **Step 2: Apply white only to the document composer**

Pass `surfaceBackgroundColor="#ffffff"` to `CommonDialog` in `DocumentComposerDialog`. Do not change other common dialog call sites.

- [x] **Step 3: Verify the document composer surfaces**

Assert computed background color `rgb(255, 255, 255)` for the dialog paper, title container, `.MuiDialogContent-root`, and `.MuiDialogActions-root`.

## Task 4: Remove the obsolete shared read-only chip change

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/editing/UserSelectEditor.tsx`
- Modify: `frontend/tests/user-select-editor.test.tsx`
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`

- [x] **Step 1: Restore prior read-only chip rendering**

In `renderValue`, restore the original chip `onDelete` callback for the reusable selector. Do not change `hideSelectedOptions`, `preserveSelectionOrder`, or selection candidate behavior.

- [x] **Step 2: Remove only the superseded read-only-chip test and documentation**

Delete the test `does not expose chip removal in read-only mode` from `user-select-editor.test.tsx`. Remove the `readOnly` chip-deletion behavior note from the F1-Grid document. Keep tests and documentation for filtered candidates, ordered chips, and default editable-chip deletion.

- [x] **Step 3: Run shared selector regression tests**

Run:

```powershell
Set-Location frontend
npm run test -- tests/user-select-editor.test.tsx
```

Expected: all remaining shared selector tests pass and normal selected-chip deletion remains available.

## Task 5: Reconcile requirements and superseded documents

**Files:**
- Modify: `docs/directions/20261007/20261007_002_문서작성_결재선_입력필드_공간개선_작업지시서.md`
- Modify: `docs/plan/20261007/20261007_002_문서작성_결재선_입력필드_공간개선_계획서.md`
- Modify: `docs/spec/20261007/20261007_002_문서작성_결재선_입력필드_공간개선_사양서.md`
- Modify: `docs/superpowers/specs/2026-10-07-document-write-approval-selector-fields-design.md`
- Modify: `docs/superpowers/plans/2026-10-07-document-write-approval-selector-fields.md`
- Modify: `docs/result/20261007/document-write-approval-selector-fields/20261007_002_문서작성_결재선_입력필드_공간개선_결과보고서.md`
- Test: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Replace the dated direction, plan, and spec**

Document the side labels, compact committed participant cards, active selector and two role actions on the approval row, independent reference selector below, whole-stage deletion, agreement grouping, responsive local scrolling, and validation criteria. Remove requirements for committed read-only selector inputs.

- [x] **Step 2: Mark the previous selector design and result as superseded**

Link the old design/plan/result to `2026-10-07-document-write-approval-card-row-design.md`, this implementation plan, and the new result report. State explicitly that old screenshots/measurements describe the rejected UI, not the corrected one.

- [x] **Step 3: Write corrected result evidence**

Create the dated result report and screenshots. Include only measurements and browser behaviors observed after implementing the card layout. Document any limitation in available live users; rely on tests for multi-user/group coverage without claiming those interactions were live-tested.

## Task 6: Responsive and final verification

**Files:**
- Verify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`
- Verify: `frontend/src/shared/components/f1-grid/editing/UserSelectEditor.tsx`
- Verify: `frontend/tests/document-write-page.test.tsx`
- Verify: `frontend/tests/user-select-editor.test.tsx`
- Verify: dated result report and screenshots

- [x] **Step 1: Run focused tests, lint, and production build**

Run:

```powershell
Set-Location frontend
npm run test -- tests/document-write-page.test.tsx tests/user-select-editor.test.tsx
npm run lint -- src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx src/shared/components/f1-grid/editing/UserSelectEditor.tsx tests/document-write-page.test.tsx tests/user-select-editor.test.tsx
npm run build
```

Expected: both focused test files pass, Oxlint reports no errors, TypeScript and Vite production build succeed.

- [x] **Step 2: Inspect the corrected browser layout**

Open the document composer and inspect widths 375px, 768px, and 1280px. Confirm both labels remain visible, committed participants look like separate bounded cards rather than selector fields, active input/actions align after the cards, reference remains on the next row, and there is no page-level horizontal overflow. Test one whole-stage delete and confirm renumbering. Enter a long body and confirm the modal scroll and editor natural height still work.

- [x] **Step 3: Capture corrected screenshots and record actual measurements**

Save captures under `docs/result/20261007/document-write-approval-card-row/screenshots/` and record viewport/document widths, approval content overflow, modal scroll, test counts, lint, and build results in the corrected report.

- [x] **Step 4: Review the final diff**

Run `git diff --check` and inspect `git status --short`. Ensure the implementation is limited to the document composer/shared selector regression and related docs; do not modify routes, API, backend, or database. Do not stage or commit unrelated pending changes.
