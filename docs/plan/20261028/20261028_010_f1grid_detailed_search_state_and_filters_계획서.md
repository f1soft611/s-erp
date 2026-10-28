# F1-Grid 상세검색 조회 상태 및 필터 제거 Implementation Plan

> **For agentic workers:** Work through this plan task by task. Follow the repository's existing Vitest and dated-document conventions.

**Goal:** Show applied detailed-search criteria, allow removing one criterion without losing other filters, and restore the last executed query on detailed-search pages missing tab-session persistence.

**Architecture:** `PageSearchArea` receives the applied detail-value snapshot separately from the editable form state. Page-specific search handlers remain responsible for converting conditions and applying queries. The four missing pages persist validated, versioned query snapshots with `usePageSessionState` and initialize their existing list hooks with restored filters.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File map

- `frontend/src/shared/components/PageSearchArea.tsx`: applied criteria count/state and removable active-filter chips.
- `frontend/tests/page-search-area-detail.test.tsx`: shared UI behavior and required-field validation regressions.
- `frontend/src/shared/components/f1-grid/types/grid.types.ts` and `frontend/src/shared/components/page-search/searchFields.ts`: optional required-search metadata and its UI projection.
- `frontend/src/pages/sales/order/status/data/salesOrderStatusColumns.tsx`: require both order-date endpoints.
- `frontend/src/pages/co/master/materials/`: page session snapshot, restored initial filters, applied-value projection, and tests.
- `frontend/src/pages/co/master/customers/`: page session snapshot, restored initial filters, applied-value projection, and tests.
- `frontend/src/pages/co/workflow/form/`: page session snapshot, restored initial filters, applied-value projection, and tests.
- `frontend/src/pages/groupware/community/archive/`: search session, defaults-first restoration, folder scope, and tests.
- Existing common-code, sales-order-status, and document-status search page/hook files: pass their already-applied session values to `PageSearchArea`.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: document applied-vs-draft behavior, active indication, chip removal, and tab session behavior.
- `docs/result/20261028/f1grid-detailed-search-state-and-filters/`: implementation outcome, validation, and responsive screenshots.

## Task 1: Add failing `PageSearchArea` behavior tests

**Files:**
- Modify: `frontend/tests/page-search-area-detail.test.tsx`

- [ ] Add a test rendering two detail fields with `appliedDetailValues` and assert the toggle label reports two active conditions and both chips include their field labels and values.
- [ ] Add a test where `detailValues` contains an unsubmitted value but `appliedDetailValues` is empty; assert the toggle remains inactive and no chips render.
- [ ] Add a test clicking the first chip's accessible remove button; assert the callback receives the first field cleared, the second value preserved, and `onDetailSearch` receives the same values.
- [ ] Run `npm run test -- tests/page-search-area-detail.test.tsx` from `frontend`; confirm the new cases fail because `appliedDetailValues` and chips are not implemented.

## Task 2: Implement shared applied-condition UI

**Files:**
- Modify: `frontend/src/shared/components/PageSearchArea.tsx`
- Test: `frontend/tests/page-search-area-detail.test.tsx`

- [ ] Add optional prop `appliedDetailValues?: Record<string, PageSearchFieldValue>`.
- [ ] Add helpers that identify meaningful applied values, display field values (resolve option labels; format date endpoints), and return an empty value by field type.
- [ ] Use only applied values to derive the toggle active style, accessible description count, and chips; keep the existing toggle accessible name and do not infer applied state from `draftValues`.
- [ ] On chip removal, create `next` from current controlled values plus the field's empty value; call `onDetailValuesChange(next)` and `onDetailSearch(next)`. Leave the existing reset, query, and close actions intact.
- [ ] Validate fields marked `required` on detailed-search submit; required date fields need both valid endpoints. Keep the dialog open, show errors on missing/invalid endpoints, and do not call the search callback on failure.
- [ ] Set the search-area stacking level above the F1-Grid loading overlay (z-index 12) while detail search is open, but below modal dialogs.
- [ ] Place chips in a wrapping lower-left row so the existing action buttons remain aligned to the right on desktop and wrap without horizontal overflow on narrow screens.
- [ ] Run `npm run test -- tests/page-search-area-detail.test.tsx`; expect all component cases to pass.

## Task 3: Connect already-persisted page sessions to applied UI

**Files:**
- Modify: `frontend/src/pages/co/master/common-code/CommonCodeManagementPage.tsx`
- Modify: `frontend/src/pages/sales/order/status/components/SalesOrderStatusSearchArea.tsx` and its caller as needed
- Modify: `frontend/src/pages/groupware/documents/status/components/DocumentStatusSearchArea.tsx` and its caller as needed
- Tests: existing common-code, sales-order-status, and document-status page tests

- [ ] Pass the stored/executed detailed values to `appliedDetailValues`; do not pass the live field draft as the applied snapshot.
- [ ] For document status and sales-order status, use the existing session snapshot; for common-code management use the existing page session search values.
- [ ] Keep default keyword actions on sales-order/document status bound to applied detail snapshots rather than unsubmitted detail drafts.
- [ ] Mark sales-order `orderDt` search as required and verify both date endpoints on submit.
- [ ] Verify default/system-date conditions are included only when present in the executed snapshot.
- [ ] Run `npm run test -- tests/common-code-management-page.test.tsx tests/sales-order-status-page.test.tsx tests/document-status-page.test.tsx`.

## Task 4: Add session restoration to material, customer, and draft-form management

**Files:**
- Modify: `frontend/src/pages/co/master/materials/MaterialManagementPage.tsx`
- Modify: `frontend/src/pages/co/master/materials/hooks/useMaterialManagement.ts`
- Modify: `frontend/src/pages/co/master/customers/CustomerManagementPage.tsx`
- Modify: `frontend/src/pages/co/master/customers/hooks/useCustomerManagement.ts`
- Modify: `frontend/src/pages/co/workflow/form/DraftFormManagementPage.tsx`
- Modify: `frontend/src/pages/co/workflow/form/hooks/useDraftFormManagement.ts`
- Tests: `frontend/tests/material-management.test.tsx`, `frontend/tests/customer-management-page.test.tsx`, `frontend/tests/draft-form-management.test.tsx`

- [ ] Define a versioned session snapshot per page containing the executed keyword, detailed values, and API filter object. Validate primitive/date-range values and page filter fields before restoring.
- [ ] Initialize each management hook's `appliedFilters` from the restored snapshot and use that initial filter in its initial load effect instead of issuing an empty query first.
- [ ] Initialize the input controls from the stored snapshot, but do not write session storage from `onDetailValuesChange`.
- [ ] On default keyword search, combine the new keyword with the last executed detail snapshot. On detail search or chip removal, use the submitted detail values.
- [ ] When the page has unsaved Grid changes, keep the proposed filter and snapshot pending. Cancel keeps the old applied values/session; continue discards changes, applies the query, and stores the snapshot.
- [ ] Pass the executed snapshot values as `appliedDetailValues`.
- [ ] Add page tests for session query restoration, editing without searching not changing the stored snapshot, and unsaved confirmation cancel/continue behavior.
- [ ] Run the three focused page tests listed above.

## Task 5: Add session restoration to community archive

**Files:**
- Modify: `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`
- Modify: `frontend/src/pages/groupware/community/archive/hooks/useArchiveList.ts`
- Test: `frontend/tests/archive-page.test.tsx`

- [ ] Define a versioned, validated snapshot for executed keyword, current folder scope, date range, and file type.
- [ ] After server-backed search defaults load, initialize the form and archive list from the snapshot if valid; otherwise retain the current initial recent-year/default query.
- [ ] Persist only after the default search, detailed search, folder navigation, or active-chip removal has been accepted; field edits alone do not persist.
- [ ] Pass restored/executed date and file-type values to `appliedDetailValues`.
- [ ] Add tests for saved query restoration and for changing a detail field without searching not replacing the snapshot.
- [ ] Run `npm run test -- tests/archive-page.test.tsx`.

## Task 6: Documentation and final verification

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261028/f1grid-detailed-search-state-and-filters/20261028_010_f1grid_detailed_search_state_and_filters_결과.md`
- Create: responsive screenshots under the same result folder.

- [ ] Update the F1-GRID guide to explain applied snapshots vs form drafts, active-button state, per-field chip removal, tab-scoped query restoration, required search conditions, and loading-overlay stacking.
- [ ] Run focused tests:

```powershell
npm run test -- tests/page-search-area-detail.test.tsx tests/material-management.test.tsx tests/customer-management-page.test.tsx tests/draft-form-management.test.tsx tests/archive-page.test.tsx tests/common-code-management-page.test.tsx tests/sales-order-status-page.test.tsx tests/document-status-page.test.tsx
```

- [ ] Run `npm run build` from `frontend`.
- [ ] Run the existing Vite server only if it is S-ERP on `http://127.0.0.1:4173`; otherwise start with `npm run dev -- --strictPort`, verify desktop/tablet/mobile layouts at 1280px, 768px, and 375px, save screenshots, and stop only the server started for this check.
- [ ] Review `git diff --check` and the final changed-file list. Preserve unrelated staged and unstaged work.
