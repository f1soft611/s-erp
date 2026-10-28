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

- [ ] Add a test that clicks each metric button and expects `/groupware/doc/write?dashboardScope=MY_PENDING`, `/groupware/doc/write?dashboardScope=DRAFT`, or `/groupware/doc/write?dashboardScope=REVISION_REQUESTED`, using `approvalPath` from the fixture.
- [ ] Run `npm run test -- tests/overview-page.test.tsx`; confirm the new URL assertions fail because all cards currently navigate to the bare path.
- [ ] Add a local navigation helper that builds the path with `new URLSearchParams({ dashboardScope })`; wire each card to its matching scope.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Seed the write-page scope

**Files:**
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/pages/dashboard/components/DashboardContent.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`
- Modify: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Modify: `frontend/tests/use-document-write-page.test.tsx`

- [ ] Extend the hook to accept an optional `DocumentApprovalScope` initial value, defaulting to `ALL`; initialize the existing `scope` state from that argument.
- [ ] In `DashboardPage`, parse the search query with `parseDocumentApprovalScope`; pass it and a URL-update callback through `DashboardContent` into the write page.
- [ ] Let `DocumentWritePage` pass `dashboardScope ?? 'ALL'` to the hook. The existing active scope chip and summary selection use the callback so clearing/selecting also updates the query.
- [ ] Add a test with an initial `DRAFT` scope that waits for loading, then verifies `result.current.scope`, the active scope chip, and the `listDocumentApprovals('DRAFT', ...)` request.
- [ ] Run the focused hook test before implementation to observe the missing argument behavior, then run it again after implementation.

### Task 3: Apply scope in read-only status search

**Files:**
- Modify: `frontend/src/pages/groupware/documents/status/types/documentStatus.types.ts`
- Modify: `frontend/src/pages/groupware/documents/status/services/documentStatus.service.ts`
- Modify: `frontend/src/pages/groupware/documents/status/types/documentStatusPage.types.ts`
- Modify: `frontend/src/pages/groupware/documents/status/hooks/useDocumentStatusSearch.ts`
- Modify: `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx`
- Modify: `frontend/tests/document-status-service.test.ts`
- Modify: `frontend/tests/document-status-page.test.tsx`

- [ ] Add an optional `scope: DocumentApprovalScope` filter and include it in the serialized search query, defaulting to `ALL`.
- [ ] Add focused tests proving `MY_PENDING`, `DRAFT`, and `REVISION_REQUESTED` serialize into the search request as `scope`, and that absent scope remains `ALL`.
- [ ] Pass the validated scope and query-update callback from `DashboardPage` through `DashboardContent`; seed the status search hook while retaining session keyword/detail values.
- [ ] Display the current scope as a removable chip; removing it deletes only `scope` and retains other search filters.
- [ ] Run the focused tests red before the changes, then green afterward.

### Task 4: Validate and document

**Files:**
- Create: `docs/result/20261028/overview-approval-card-filter/20261028_008_overview-approval-card-filter_결과.md`
- Create: `docs/result/20261028/overview-approval-card-filter/screenshots/`

- [ ] Run `npm run test -- tests/overview-page.test.tsx tests/use-document-write-page.test.tsx tests/document-status-search.test.ts`.
- [ ] Run `npm run lint -- src/pages/groupware/OverviewPage.tsx src/pages/groupware/documents/write/DocumentWritePage.tsx src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts src/pages/groupware/documents/status/DocumentStatusPage.tsx src/pages/groupware/documents/status/hooks/useDocumentStatusSearch.ts src/pages/groupware/documents/status/services/documentStatusSearch.ts src/pages/groupware/documents/status/services/documentStatus.service.ts tests/overview-page.test.tsx tests/use-document-write-page.test.tsx tests/document-status-search.test.ts`.
- [ ] Run `npm run build`.
- [ ] Verify desktop/mobile browser behavior at 1280px and 375px using available S-ERP test setup; capture focused scope-chip states without real user data.
- [ ] Record test results, path variants, browser widths, screenshots, and unchanged backend/DB scope in the result document.
