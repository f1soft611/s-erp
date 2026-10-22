# F1Grid Excel Permission Gating Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every production screen that offers F1Grid Excel export displays the export action only when that screen's Excel permission is granted.

**Architecture:** Keep the shared `canExportExcel` prop and its false default as the single context-menu visibility gate. Correct only page-to-grid permission wiring for document status, draft-form management, and the archive file tree; leave screens already wired, disabled screens, and the interactive F1Grid documentation demo unchanged.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## Files and responsibilities

- `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx`: forward the selected menu's Excel permission to its grid.
- `frontend/src/pages/groupware/documents/status/components/DocumentStatusGrid.tsx`: accept the boolean and pass it to F1Grid instead of granting export unconditionally.
- `frontend/src/pages/co/workflow/form/components/DraftFormGrid.tsx`: forward its existing `canExportExcel` prop to F1Grid.
- `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`: forward the selected menu's Excel permission to the archive file tree.
- `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx`: accept and pass the permission to F1Tree.
- `frontend/tests/document-status-page.test.tsx`, `frontend/tests/draft-form-management.test.tsx`, `frontend/tests/archive-page.test.tsx`: prove allowed and denied menu visibility.
- `docs/directions/20261022/20261022_010_F1Grid_엑셀_내보내기_권한_공통처리_작업지시서.md`, `docs/plan/20261022/20261022_010_F1Grid_엑셀_내보내기_권한_공통처리_계획서.md`, `docs/spec/20261022/20261022_010_F1Grid_엑셀_내보내기_권한_공통처리_상세사양서.md`: the approved work direction, plan, and behavior contract.
- `docs/result/20261022/f1-grid-excel-permission/`: implementation result and screenshots.

## Task 1: Add permission regression tests

**Files:**
- Modify: `frontend/tests/document-status-page.test.tsx`
- Modify: `frontend/tests/draft-form-management.test.tsx`
- Modify: `frontend/tests/archive-page.test.tsx`

- [x] Update the document-status test helper to pass an explicit `excel` permission and add a denied-permission assertion for the context-menu item.
- [x] Add integration assertions for the draft-form grid showing no `엑셀 내보내기` menu item when its `canExportExcel` input is false and showing the item when true.
- [x] Set the archive allowed-permission fixture to `excel: true`; add a denied case with `excel: false`.
- [x] Run focused tests before implementation:

```powershell
Set-Location frontend
npm run test -- tests\document-status-page.test.tsx tests\draft-form-management.test.tsx tests\archive-page.test.tsx
```

Expected: existing unconditional exports fail the denied-permission assertions; any unrelated baseline failure must be noted separately.

## Task 2: Wire existing page permissions to grids

**Files:**
- Modify: `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx`
- Modify: `frontend/src/pages/groupware/documents/status/components/DocumentStatusGrid.tsx`
- Modify: `frontend/src/pages/co/workflow/form/components/DraftFormGrid.tsx`
- Modify: `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`
- Modify: `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx`

- [x] Add `canExportExcel: boolean` to `DocumentStatusGrid` props, pass it to F1Grid, and provide it from the page as `selectedMenuPermissions?.excel ?? false`.
- [x] Replace the draft-form grid's constant `canExportExcel={true}` with its existing `canExportExcel` prop.
- [x] Add `canExportExcel: boolean` to `ArchiveFileGrid` props, pass it to F1Tree, and provide `selectedMenuPermissions?.excel ?? false` from `ArchiveBoardPage`.
- [x] Keep F1Grid's menu implementation and false default unchanged.

## Task 3: Run regressions and record results

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md` only if inspection confirms its existing permission contract needs clarification.
- Create: `docs/result/20261022/f1-grid-excel-permission/20261022_010_F1Grid_엑셀_내보내기_권한_공통처리_결과.md`
- Create: browser screenshots under `docs/result/20261022/f1-grid-excel-permission/screenshots/`

- [x] Rerun the three focused tests; the four new permission assertions passed. The complete files retained the same five draft-form failures seen at baseline.

```powershell
Set-Location frontend
npm run test -- tests\document-status-page.test.tsx tests\draft-form-management.test.tsx tests\archive-page.test.tsx
```

- [x] Run Excel context-menu and export regressions; Excel export passed, while two unrelated F1Tree context-menu tests remained failing as documented by the prior context-menu result.

```powershell
npm run test -- tests\f1-grid-context-menu.test.tsx tests\f1-grid-excel-export.test.ts
```

- [x] Run `npm run build` from `frontend`; one run passed with the existing large-chunk warning. A later rerun failed on a TypeScript error in the unrelated, already-modified `GridFormField.tsx` at `handleFormattedChange(event)`.
- [x] Verify allowed and denied menu visibility in the page/component tests; capture the shared F1Grid context menu with synthetic demo data in the browser.
- [x] Record the root cause, changed permission wiring, test/build results, browser evidence, and unrelated baseline failures in the result document.
- [x] Run `git diff --check`; no commit was created.
