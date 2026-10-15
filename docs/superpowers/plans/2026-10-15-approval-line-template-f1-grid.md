# 결재선 템플릿 F1-Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 업무작성 결재선 설정의 템플릿 관리 목록을 F1-Grid 인라인 편집 화면으로 바꾸고, 행별 불러오기/삭제와 하단 일괄 저장을 제공한다.

**Architecture:** 기존 `DocumentApprovalSettingsDialog` 안의 템플릿 관리 `CommonDialog`를 F1-Grid 목록으로 교체한다. 기존 목록·상세·이름 변경·삭제 API를 재사용하며, Grid `getChanges()`로 이름 변경을 모아 저장하고 부분 실패 시 실패 편집을 유지한다. 미저장 변경을 폐기하는 행 액션/닫기는 확인을 거친다.

**Tech Stack:** React, TypeScript, MUI, F1-Grid, Vitest, React Testing Library

---

## Files and responsibilities

- Created `docs/directions/20261015/20261015_011_업무작성_자주쓰는결재선_F1Grid_작업지시서.md`: approved task direction.
- Created `docs/plan/20261015/20261015_011_업무작성_자주쓰는결재선_F1Grid_계획서.md`: dated project plan and verification commands.
- Created `docs/spec/20261015/20261015_011_업무작성_자주쓰는결재선_F1Grid_상세사양서.md`: accepted screen, persistence, discard-confirmation and failure contract.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx`: F1-Grid columns, row actions, edit tracking, save/validation and discard confirmation.
- Modify `frontend/tests/document-approval-settings-dialog.test.tsx`: assert list, per-row actions, inline edits, batch save, partial failure and discard behavior.
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`: document the approval-template screen’s use of editable name and row action columns, without changing the shared Grid contract.
- Modify `docs/result/20261015/document-approval-line-favorites/20261015_002_업무작성_자주쓰는결재선_결과보고서.md` and add updated screenshots beneath its `screenshots` directory.

## Task 1: Verify the dated screen contract

**Files:** Review the dated plan and detailed spec listed above.

- [x] **Step 1: Write the dated plan from the task direction**

  Record the target files, test-first sequence, frontend-only scope, browser sizes, and exact project test/build commands. Link to the approved design at `docs/superpowers/specs/2026-10-15-document-approval-template-grid-design.md`.

- [x] **Step 2: Write the detailed screen specification from the approved design**

  Specify the two visible columns (`결재선명`, `액션`), row-level `불러오기` and `삭제`, the bottom `저장`, name constraints, partial API failure behavior, and the accepted discard confirmation cases. State that existing API and database contracts remain unchanged.

- [x] **Step 3: Check the three dated documents for consistent terminology**

  Confirm the direction, plan, and detailed spec agree that name edits are staged until `저장`, load applies only to modal draft state, and unsaved edits require discard confirmation before row actions or closing.

## Task 2: Add failing F1-Grid interaction tests

**Files:** Modify `frontend/tests/document-approval-settings-dialog.test.tsx`.

- [x] **Step 1: Replace button-list assertions with F1-Grid contract assertions**

  Open the template manager and assert that the accessible grid contains the `결재선명` and `액션` headers and the expected template names. Assert that the old selection buttons and common footer `불러오기` action are absent.

- [x] **Step 2: Add an inline-edit and batch-save test**

  Edit two grid name cells through the rendered F1-Grid editor. Click the manager footer `저장`; assert the mocked rename API is called with each edited template ID and its trimmed name. Assert no call occurs for unchanged rows and the grid becomes clean after complete success.

  Match the established F1-Grid interaction used in `frontend/tests/f1-grid.test.tsx`:

  ```tsx
  const nameCell = screen.getByRole('gridcell', { name: '기본 결재선' });
  fireEvent.doubleClick(nameCell);
  fireEvent.change(screen.getByDisplayValue('기본 결재선'), {
    target: { value: ' 변경된 결재선 ' },
  });
  fireEvent.keyDown(screen.getByDisplayValue(' 변경된 결재선 '), {
    key: 'Enter',
  });
  fireEvent.click(
    within(
      screen.getByRole('dialog', { name: '자주 쓰는 결재선 불러오기' }),
    ).getByRole('button', { name: '저장' }),
  );
  ```

- [x] **Step 3: Add row-specific load and deletion tests**

  Click the `불러오기` action whose accessible label includes a specific template name and assert `getApprovalLineTemplate` receives that row’s ID without selecting a row or using a shared footer load action. Verify the existing `적용` boundary and fixed drafter. Click a row’s `삭제`, verify the existing confirmation, and assert only that row ID is deleted.

- [x] **Step 4: Add validation and partial-failure tests**

  Assert blank/over-100-character names and duplicate normalized names display an error and do not call rename. Make one rename succeed and another reject; assert the successful server name is reflected, the failed draft remains editable, an explicit error appears, and retry completes without losing the draft.

- [x] **Step 5: Add unsaved-edit discard-confirmation tests**

  With one edited name, trigger row load, row delete, and manager close separately. For each action, assert the discard confirmation appears. Cancel and verify the edit remains and no action API is called; confirm and verify the pending edit is discarded before the requested action proceeds.

- [x] **Step 6: Run the focused tests and confirm the new assertions fail**

  Run from `frontend`:

  ```powershell
  npm run test -- tests/document-approval-settings-dialog.test.tsx
  ```

  Expected before implementation: failures show the manager is still a button list with a common footer load action and has no inline editable Grid or discard confirmation.

## Task 3: Implement the F1-Grid template manager

**Files:** Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx`.

- [x] **Step 1: Add the Grid row type and column definitions**

  Use a local row type extending `ApprovalLineTemplateSummary` with a dedicated action field. Use `F1Grid<ApprovalLineTemplateGridRow>` with `rowKey="templateId"`, an editable required `name` column, and a right-pinned non-editable `actions` column. Use `renderCell` buttons that include the row name in their accessible labels and stop propagation before calling row-specific handlers.

  ```tsx
  type ApprovalLineTemplateGridRow = ApprovalLineTemplateSummary & {
    actions: string;
  };

  const favoriteColumns: F1GridColumn<ApprovalLineTemplateGridRow>[] = [
    {
      field: 'name',
      headerName: '결재선명',
      flex: 1,
      editable: true,
      required: true,
      validate: (value) => {
        const name = String(value ?? '').trim();
        return (
          (name.length > 0 && name.length <= 100) ||
          '결재선 템플릿 이름은 1~100자여야 합니다.'
        );
      },
    },
    {
      field: 'actions',
      headerName: '액션',
      width: 190,
      pinned: 'right',
      editable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            aria-label={`결재선 불러오기 ${row.name}`}
            onClick={(event) => {
              event.stopPropagation();
              requestManagerAction({ type: 'load', templateId: row.templateId });
            }}
          >
            불러오기
          </Button>
          <Button
            aria-label={`결재선 삭제 ${row.name}`}
            onClick={(event) => {
              event.stopPropagation();
              requestManagerAction({ type: 'delete', templateId: row.templateId });
            }}
          >
            삭제
          </Button>
        </Box>
      ),
    },
  ];
  ```

- [x] **Step 2: Track Grid changes and manager operation state**

  Keep an `F1GridRef<ApprovalLineTemplateGridRow>`, a Grid reset key, the dirty flag reported by `onChangesChange`, and a pending action describing the exact row operation or close. Clear these states when opening/reloading the manager. Keep existing API state and loading/error feedback patterns.

  ```tsx
  <F1Grid
    key={managerGridKey}
    ref={templateGridRef}
    rows={templates.map((template) => ({ ...template, actions: '' }))}
    columns={favoriteColumns}
    rowKey="templateId"
    ariaLabel="자주 쓰는 결재선 목록"
    loading={favoriteOperation === 'list'}
    disableSorting
    disableFiltering
    onChangesChange={(changes) =>
      setHasTemplateNameChanges(changes.updatedRows.length > 0)
    }
  />
  ```

- [x] **Step 3: Implement row-specific load**

  Move the existing detail request/apply logic behind a handler receiving `templateId`. Keep the document-code check, participant validation, fixed drafter, and error behavior. On successful load close the manager; do not call the parent `onApply`.

- [x] **Step 4: Implement row-specific delete**

  Store the pending delete row ID, preserve the existing confirmation step, and call the existing delete API only for that row. On success remove it from server-backed rows and reset the Grid baseline; on failure keep it visible and show the error.

- [x] **Step 5: Implement staged batch rename saving**

  Read `updatedRows` from `gridRef.current.getChanges()`. Trim every changed name, reject blank/over-100 names, and check the final active name set for duplicates before sending any request. Call `renameApprovalLineTemplate(row.templateId, normalizedName)` only where the name differs from the latest server-backed row. Collect individual successes and failures explicitly. Update server-backed rows for successes; keep the Grid draft values for failures. On complete success, remount the Grid from the updated rows to clear dirty state. On partial failure, show an error and leave failed edits available for retry.

  ```tsx
  const changes = templateGridRef.current?.getChanges();
  const activeRows = templateGridRef.current?.getActiveRows() ?? [];
  const normalizedNames = activeRows.map((row) => row.name.trim());
  if (normalizedNames.some((name) => !name || name.length > 100)) {
    setTemplateError('결재선 템플릿 이름은 1~100자여야 합니다.');
    return;
  }
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    setTemplateError('같은 이름의 결재선 템플릿이 이미 있습니다.');
    return;
  }

  const successes: ApprovalLineTemplateSummary[] = [];
  const failures: string[] = [];
  for (const row of changes?.updatedRows ?? []) {
    const name = row.name.trim();
    const current = templates.find(
      (template) => template.templateId === row.templateId,
    );
    if (!current || current.name === name) continue;
    try {
      successes.push(await renameApprovalLineTemplate(row.templateId, name));
    } catch (error) {
      failures.push(
        error instanceof Error ? `${name}: ${error.message}` : name,
      );
    }
  }
  ```

- [x] **Step 6: Add the discard guard for row actions and closing**

  If `onChangesChange` indicates pending edits, store the requested load/delete/close action and open a discard confirmation. Cancel clears only the pending action and leaves the Grid untouched. Confirm remounts from the latest server-backed rows to discard edits, then performs the stored action. If there are no pending edits, execute the action immediately.

- [x] **Step 7: Replace the manager body and footer**

  Render the F1-Grid in the existing manager dialog with an accessible label, loading state, a clear empty state, and existing errors. Remove the selected-template and separate rename form UI. Replace the footer `불러오기` action with `저장`, disabled when there are no changes or a favorite operation is running; retain the close action and disable conflicting operations during requests.

- [x] **Step 8: Run the focused tests**

  ```powershell
  npm run test -- tests/document-approval-settings-dialog.test.tsx
  ```

  Expected: all manager behavior tests pass, including partial failure/retry and existing modal draft/apply behavior.

## Task 4: Update F1-Grid and task documentation

**Files:** Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md` and `docs/result/20261015/document-approval-line-favorites/20261015_002_업무작성_자주쓰는결재선_결과보고서.md`; add browser captures.

- [x] **Step 1: Document the existing F1-Grid APIs used by this screen**

  Add a focused integration example/reference for an editable text column, a `renderCell` row-action column, `getChanges()`/`onChangesChange` dirty tracking, and `stopPropagation()`. State that no shared Grid core behavior was added.

- [x] **Step 2: Update the feature result report**

  Record the new row-based management flow, batch rename and discard confirmation behavior, implementation files, focused tests/build, and any known unrelated test failures. Link the dated direction, plan, and detailed spec.

- [x] **Step 3: Capture and inspect the manager at 375px, 768px, and 1280px**

  Save only the approval-template manager and test template names under:

  ```text
  docs/result/20261015/document-approval-line-favorites/screenshots/
  ```

  Confirm Grid action buttons remain accessible, dialog content does not overflow the page, and no user/document data appears in screenshots.

## Task 5: Final verification

- [x] **Step 1: Run all related frontend tests**

  ```powershell
  npm run test -- tests/document-approval-settings-dialog.test.tsx tests/approval-line-template-service.test.ts
  ```

  Expected: all template UI/service tests pass.

- [x] **Step 2: Run the frontend build**

  ```powershell
  npm run build
  ```

  Result: command ran but failed on TypeScript errors in out-of-scope concurrent community archive files `ArchiveComposerDialog.tsx` and `ArchivePostDetail.tsx`; recorded in the result report.

- [x] **Step 3: Run final whitespace and scope checks**

  ```powershell
  git diff --check
  git status --short
  ```

  Result: `git diff --check` reported no whitespace errors. The shared worktree contains unrelated concurrent changes; they were preserved and not attributed to this task.

  Focused verification: both targeted test files passed (27 tests total). Browser captures were saved at all three requested viewport widths with synthetic template data only.
