# Overview Approval Card Filter Implementation Plan

> **For agentic workers:** execute inline in this session with test-first steps. Preserve pre-existing workspace edits and do not commit unrelated files.

**Goal:** Make each personal approval card open the matching filtered document list.

**Architecture:** Add `dashboardScope` to the current permission-selected approval URL. `DashboardPage` validates and passes it through `DashboardContent`; the write page seeds its existing scope state and the read-only status page forwards it through the existing approval search API and exposes a removable scope chip. User scope changes update the URL. Invalid values are ignored and server/API authorization stays unchanged.

**Tech Stack:** React, TypeScript, React Router, Vitest, MUI.

---

### Task 1: Verify card-specific dashboard navigation

**Files:**
- Modify: `frontend/tests/overview-page.test.tsx`
- Modify: `frontend/src/pages/groupware/OverviewPage.tsx`

- [x] Add a test that clicks each metric button and expects `/groupware/doc/write?dashboardScope=MY_PENDING`, `/groupware/doc/write?dashboardScope=DRAFT`, or `/groupware/doc/write?dashboardScope=REVISION_REQUESTED`, using `approvalPath` from the fixture.
- [x] Run `npm run test -- tests/overview-page.test.tsx`; confirm the new URL assertions fail because all cards currently navigate to the bare path.
- [x] Add a local navigation helper that builds the path with `new URLSearchParams({ dashboardScope })`; wire each card to its matching scope.
- [x] Re-run the focused test and confirm it passes.

### Task 2: Seed the write-page scope

**Files:**
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/pages/dashboard/components/DashboardContent.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`
- Modify: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Modify: `frontend/tests/use-document-write-page.test.tsx`

- [x] Extend the hook to accept an optional `DocumentApprovalScope` initial value, defaulting to `ALL`; initialize the existing `scope` state from that argument.
- [x] In `DashboardPage`, parse the search query with `parseDocumentApprovalScope`; pass it and a URL-update callback through `DashboardContent` into the write page.
- [x] Let `DocumentWritePage` pass `dashboardScope ?? 'ALL'` to the hook. Scope chip changes and notice selection synchronize the URL.
- [x] Add tests for initial `DRAFT` loading/request behavior and clearing the dashboard scope when selecting a notice.
- [x] Run the focused hook tests red before implementation, then green afterward.

### Task 3: Apply scope in read-only status search

**Files:**
- Modify: `frontend/src/pages/groupware/documents/status/types/documentStatus.types.ts`
- Modify: `frontend/src/pages/groupware/documents/status/services/documentStatus.service.ts`
- Modify: `frontend/src/pages/groupware/documents/status/types/documentStatusPage.types.ts`
- Modify: `frontend/src/pages/groupware/documents/status/hooks/useDocumentStatusSearch.ts`
- Modify: `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx`
- Modify: `frontend/tests/document-status-service.test.ts`
- Modify: `frontend/tests/document-status-page.test.tsx`

- [x] Add an optional `scope: DocumentApprovalScope` filter and include it in the serialized search query, defaulting to `ALL`.
- [x] Add focused tests proving `MY_PENDING`, `DRAFT`, and `REVISION_REQUESTED` serialize into the search request as `scope`, and that absent scope remains `ALL`.
- [x] Pass the validated scope and query-update callback from `DashboardPage` through `DashboardContent`; seed the status search hook while retaining session keyword/detail values.
- [x] Display the current scope as a removable chip; removing it deletes only `scope` and retains other search filters.
- [x] Run the focused tests red before the changes, then green afterward.

### Task 4: Validate and document

**Files:**
- Create: `docs/result/20261028/overview-approval-card-filter/20261028_008_overview-approval-card-filter_결과.md`
- Create: `docs/result/20261028/overview-approval-card-filter/screenshots/`

- [x] Run the focused Vitest files for overview navigation, write-page scope, read-only status scope, service serialization, and scope presentation.
- [x] Run targeted frontend lint.
- [x] Run `npm run build`.
- [x] Verify write/read-only browser behavior with synthetic API responses. Check read-only layout at 375/768/1280px and capture scope chips; verify filter clear returns to `ALL`.
- [x] Record test results, path variants, browser widths, screenshots, and unchanged backend/DB scope in the result document.
