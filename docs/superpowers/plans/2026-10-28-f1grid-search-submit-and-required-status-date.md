# F1-Grid Search Submit and Required Status Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Defer detailed-filter chip removals until explicit search and require a date range on the existing document-status page.

**Architecture:** Keep `appliedDetailValues` as the snapshot used by the current grid and chips, while chip removal only edits the PageSearchArea draft and its page-owned form state. Validate the document-status date through existing `search.required` metadata and normalize legacy tab sessions from the already-loaded server defaults before the initial list request.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File map

- `frontend/tests/page-search-area-detail.test.tsx`: regressions for no-query optional-chip removal, required-chip protection, repeated removals, and pending feedback.
- `frontend/src/shared/components/PageSearchArea.tsx`: draft-only optional removal, required-filter protection, pending state, and disabled repeated removal.
- `frontend/tests/document-status-page.test.tsx`: required date validation and session migration coverage.
- `frontend/src/pages/groupware/documents/status/data/documentStatusColumns.tsx`: required date metadata.
- `frontend/src/pages/groupware/documents/status/hooks/useDocumentStatusSearch.ts`: restore required default date range for legacy sessions before first query.
- `frontend/AGENTS.md` and `frontend/src/pages/f1-grid-docs/F1-GRID.md`: future status-page rule and detailed search behavior.
- `docs/result/20261028/f1grid-search-submit-and-required-status-date/`: result report and viewport screenshots.

## Task 1: Prove chip removal is staged

**Files:**
- Test: `frontend/tests/page-search-area-detail.test.tsx`

- [ ] Add a test with two applied fields and controlled draft values; click the first chip's remove button and assert only `onDetailValuesChange` is called, with `onDetailSearch` untouched.
- [ ] Click the second removal before submitting; assert the last values contain both fields cleared and the keyword/other values remain unchanged.
- [ ] Assert applied chips remain visible, the pending hint is visible, and the removed fields' X controls are disabled.
- [ ] Assert a chip for a required date criterion has a disabled remove control and does not change draft or applied values.
- [ ] Run `npm run test -- tests/page-search-area-detail.test.tsx`; confirm the new no-immediate-query expectation fails against the old implementation.

## Task 2: Implement staged removals

**Files:**
- Modify: `frontend/src/shared/components/PageSearchArea.tsx`
- Test: `frontend/tests/page-search-area-detail.test.tsx`

- [ ] Build removal values from `draftValues`, clearing only the clicked optional field; call `setDraftValues` and `onDetailValuesChange`, but never call `onDetailSearch` from the chip X.
- [ ] Track pending-removal field names. Clear the pending mark when that field is edited again; clear all pending marks after a valid detail search or reset.
- [ ] Keep chips derived from `appliedDetailValues` so they continue to describe the current result. Disable required-field X controls and any optional remove button whose draft value is already empty.
- [ ] Render the accessible pending hint `조건 변경 내용은 조회 버튼을 눌러 적용하세요.` while at least one removal is pending.
- [ ] Run `npm run test -- tests/page-search-area-detail.test.tsx`; expect all component tests to pass.

## Task 3: Require the document-status date

**Files:**
- Modify: `frontend/tests/document-status-page.test.tsx`
- Modify: `frontend/src/pages/groupware/documents/status/data/documentStatusColumns.tsx`
- Modify: `frontend/src/pages/groupware/documents/status/hooks/useDocumentStatusSearch.ts`

- [ ] Update/add a page test that opens detail search, clears one `결재신청일` endpoint, submits, and asserts no list request runs and the required-field error is shown.
- [ ] Change the legacy-session test to omit the date; wait for default metadata initialization and assert the initial request and top-level search use both default date endpoints while preserving its keyword/title. Assert the required date chip cannot be removed.
- [ ] Run `npm run test -- tests/document-status-page.test.tsx`; confirm those cases fail before implementation.
- [ ] Mark `submittedAt.search.required = true`.
- [ ] When defaults load with a saved session, validate both `submittedAt` endpoints; if either is missing or invalid, merge the metadata-derived default date range into restored detail values, update the UI session snapshot and applied filters, then mark defaults initialized. Preserve all other session fields.
- [ ] Run `npm run test -- tests/document-status-page.test.tsx`; expect all page tests to pass.

## Task 4: Document the status-page rule and outcomes

**Files:**
- Modify: `frontend/AGENTS.md`
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261028/f1grid-search-submit-and-required-status-date/20261028_012_f1grid_search_submit_and_required_status_date_결과.md`
- Create screenshots in `docs/result/20261028/f1grid-search-submit-and-required-status-date/screenshots/`

- [ ] Add the contributor rule that every new status page requires a reference-date search criterion and a date range requires both valid endpoints.
- [ ] Update the F1-GRID search guide with draft-only chip removal, applied chips remaining until query, pending feedback, and required status reference dates.
- [ ] Run `npm run test -- tests/page-search-area-detail.test.tsx tests/document-status-page.test.tsx`.
- [ ] Run `npm run build`.
- [ ] Verify the existing app on `http://127.0.0.1:4173` at 375px, 768px, and 1280px; save screenshots and ensure the search panel has no horizontal overflow.
- [ ] Write the result report with commands and outcomes; run `git diff --check` and verify no unrelated files were changed.
