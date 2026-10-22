# Document Approval Favorite Action Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center the row-level `적용`/`삭제` button group in the favorite approval-line manager's action column.

**Architecture:** Keep the change local to the `renderCell` in `DocumentApprovalSettingsDialog`. The cell is already centered, but two default 64px MUI buttons exceed the 110px action column. Reduce only the row buttons' minimum width and horizontal padding, then center their group in the full-width cell wrapper. Add a focused component regression test and update the F1-Grid guidance and date-based result record.

**Tech Stack:** React, TypeScript, MUI, F1-Grid, Vitest, React Testing Library, Vite

---

## Files and responsibilities

- `docs/directions/20261022/20261022_007_문서작성_자주쓰는결재선_액션버튼_가운데정렬_작업지시서.md`: approved scope and completion criteria
- `docs/plan/20261022/20261022_007_문서작성_자주쓰는결재선_액션버튼_가운데정렬_계획서.md`: project plan and validation commands
- `docs/spec/20261022/20261022_007_문서작성_자주쓰는결재선_액션버튼_가운데정렬_상세사양서.md`: exact layout contract
- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx`: local action-group layout
- `frontend/tests/document-approval-settings-dialog.test.tsx`: alignment regression coverage
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: guidance for rendered action cells
- `docs/result/20261022/document-approval-favorite-action-alignment/`: result report and responsive screenshots

## Task 1: Add the focused alignment regression test (RED)

**Files:** Modify `frontend/tests/document-approval-settings-dialog.test.tsx`.

- [ ] **Step 1: Add a test for the action group container**

Add this case alongside the existing template-manager tests:

```tsx
it('centers favorite row action buttons in the action column', async () => {
  templateApi.list.mockResolvedValue([
    { templateId: 9, name: '기본 결재선', eabusNo: '001' },
  ]);
  renderSettings();
  await openTemplateManagerGrid();

  const grid = getTemplateGrid();
  const applyButton = within(grid).getByRole('button', {
    name: '결재선 적용 기본 결재선',
  });
  const deleteButton = within(grid).getByRole('button', {
    name: '결재선 삭제 기본 결재선',
  });
  const actionGroup = applyButton.parentElement;

  expect(actionGroup).not.toBeNull();
  if (!actionGroup) {
    throw new Error('Expected the row actions to share a container.');
  }
  expect(actionGroup).toContainElement(deleteButton);
  expect(actionGroup).toHaveStyle({
    display: 'flex',
    width: '100%',
    justifyContent: 'center',
    gap: '4px',
  });
  expect(applyButton).toHaveStyle({
    minWidth: '0px',
    paddingLeft: '6px',
    paddingRight: '6px',
  });
  expect(deleteButton).toHaveStyle({
    minWidth: '0px',
    paddingLeft: '6px',
    paddingRight: '6px',
  });
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run from `frontend`:

```powershell
npx vitest run --testTimeout=15000 tests/document-approval-settings-dialog.test.tsx -t "centers favorite row action buttons in the action column"
```

Expected before implementation: the assertion fails because the current group lacks the full-width gap and the buttons keep their default 64px minimum width and horizontal padding.

## Task 2: Center the action group (GREEN)

**Files:** Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx`.

- [ ] **Step 1: Make the action group fill and center its cell**

In the existing `actions` column `renderCell`, use this complete action group, retaining the current handlers:

```tsx
renderCell: ({ row }) => (
  <Box
    sx={{
      display: 'flex',
      width: '100%',
      justifyContent: 'center',
      gap: 0.5,
    }}
  >
    <Button
      size="small"
      sx={{ minWidth: 0, px: 0.75 }}
      aria-label={`결재선 적용 ${row.name}`}
      disabled={favoriteOperation !== null}
      onClick={(event) => {
        event.stopPropagation();
        requestManagerAction({
          type: 'load',
          templateId: row.templateId,
        });
      }}
    >
      적용
    </Button>
    <Button
      size="small"
      color="error"
      sx={{ minWidth: 0, px: 0.75 }}
      aria-label={`결재선 삭제 ${row.name}`}
      disabled={favoriteOperation !== null}
      onClick={(event) => {
        event.stopPropagation();
        requestManagerAction({
          type: 'delete',
          templateId: row.templateId,
        });
      }}
    >
      삭제
    </Button>
  </Box>
),
```

- [ ] **Step 2: Run the focused test and confirm GREEN**

Run:

```powershell
npx vitest run --testTimeout=15000 tests/document-approval-settings-dialog.test.tsx -t "centers favorite row action buttons in the action column"
```

Expected: the new alignment case passes.

- [ ] **Step 3: Run the full related dialog test**

Run:

```powershell
npx vitest run --testTimeout=15000 tests/document-approval-settings-dialog.test.tsx
```

Expected: all tests in the settings dialog file pass, including existing action behavior.

## Task 3: Update guidance, verify browser layout, and report

**Files:** Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`; create `docs/result/20261022/document-approval-favorite-action-alignment/20261022_007_문서작성_자주쓰는결재선_액션버튼_결과보고서.md` and screenshots in its `screenshots` folder.

- [ ] **Step 1: Document the local renderCell layout**

In the existing `업무작성 결재선 템플릿 관리` section, state that grouped row actions can be centered by giving their renderCell flex wrapper the full cell width and `justifyContent: 'center'`; make clear this is a page-level presentation choice and does not change F1-Grid core behavior.

- [ ] **Step 2: Build the frontend**

Run from `frontend`:

```powershell
npm run build
```

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 3: Verify actual browser layout**

Use the existing S-ERP browser on port `4173` when available; otherwise start it with `npm run dev -- --strictPort` and stop only the server started for this check. Open the document-writing approval settings and favorite-line manager with synthetic template names. Verify the action group is centered and neither its buttons nor the page overflow at widths `375px`, `768px`, and `1280px`. Save one screenshot at each viewport under:

```text
docs/result/20261022/document-approval-favorite-action-alignment/screenshots/favorite-actions-375.png
docs/result/20261022/document-approval-favorite-action-alignment/screenshots/favorite-actions-768.png
docs/result/20261022/document-approval-favorite-action-alignment/screenshots/favorite-actions-1280.png
```

- [ ] **Step 4: Write the result report**

Record the changed component, the unchanged button behavior/column configuration, test and build results, browser viewport observations, and relative links to all three screenshots in the date-based result report. Explicitly record any browser verification limitation instead of describing an unverified viewport as passing.

- [ ] **Step 5: Check whitespace**

Run from the repository root:

```powershell
git diff --check
```

Expected: no whitespace errors. Do not stage or alter pre-existing unrelated worktree changes.
