# 전자결재 문서번호 발급 및 표시 Implementation Plan

> **For agentic workers:** Follow the repository's direction → plan → detailed specification → implementation → result-document order. Execute each test before its implementation and preserve unrelated worktree changes.

**Goal:** Issue stable server-generated EA numbers when a document is first saved, display/search them as business document numbers, and label the sales-order detail number.

**Architecture:** Keep `electronicApprovalId` as the internal database key and add `documentNo`/`document_no` as a separate tenant-unique business value. Use the existing `IdSequenceService` scoped by tenant and local business date; backfill existing rows and seed that sequence in a paired SQL migration. Pass the new field through draft, detail, and status contracts; only presentation/search use it.

**Tech Stack:** React, TypeScript, MUI, Vitest, Spring Boot/eGovFrame, MyBatis, PostgreSQL, Maven.

---

## File map

- `backend/src/main/java/egovframework/let/groupware/approval/write/service/impl/DocumentApprovalWriteServiceImpl.java`: allocate a number only for a new draft, inside the existing transaction.
- `backend/src/main/java/egovframework/let/groupware/approval/common/service/impl/DocumentApprovalDraftSupportServiceImpl.java` and related VO/DAO: return the persisted number on draft save and workflow responses.
- `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalDraftVO.java`, `DocumentApprovalDetailVO.java`, `DocumentApprovalListItemVO.java`, and status query VO: add typed API fields.
- `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`: persist and select the field; filter/sort status by it without changing access predicates.
- `backend/src/main/java/egovframework/let/groupware/approval/status/service/impl/DocumentApprovalStatusServiceImpl.java` and status API query model/controller: validate and pass exact `documentNo` filter/sort.
- `backend/src/test/java/egovframework/let/groupware/approval/write/service/impl/DocumentApprovalWriteServiceImplTest.java`, `approval/status/service/impl/DocumentApprovalStatusServiceImplTest.java`, `approval/domain/repository/DocumentApprovalMapperTest.java`: cover issuance, retention, validation, and SQL mappings.
- `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts` and `services/documentApproval.service.ts`: carry and validate `documentNo`.
- `frontend/src/pages/groupware/documents/status/types/documentStatus.types.ts`, `services/documentStatus.service.ts`, `data/documentStatusColumns.tsx`, and search helpers: display, sort, filter, and search by the actual number while retaining the internal ID for row identity/detail calls.
- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: show `문서번호: {documentNo}` below the detail title.
- `frontend/src/pages/sales/order/status/components/SalesOrderStatusDetailPanel.tsx`: show `수주번호: {orderNo}`.
- `frontend/tests/document-status-page.test.tsx`, `document-status-service.test.ts`, and `sales-order-status-page.test.tsx`: verify rendered numbers, request mapping, internal ID detail routing, and the label.
- Add paired forward/change/rollback files under `docs/database/20261028` and `backend/DATABASE/20261028`; update `docs/database/db-schema.md`.
- Add final evidence under `docs/result/20261028/electronic-approval-number/`.

### Task 1: Specify the persisted-number contract

**Files:**
- Create: `docs/directions/20261028/20261028_017_electronic-approval-document-number_작업지시서.md`
- Create: `docs/plan/20261028/20261028_010_electronic-approval-document-number_계획서.md`
- Create: `docs/spec/20261028/20261028_010_electronic-approval-document-number_상세사양서.md`
- Create: `docs/superpowers/specs/2026-10-28-electronic-approval-document-number-design.md`

- [x] Record issuance timing, format, database/API contracts, screens, tests, and rollback scope from the user request and inspected schema.
- [x] Review the detailed specification against the design and this plan before implementation.

### Task 2: Add backend issuance and regression tests

**Files:**
- Modify: `backend/src/test/java/egovframework/let/groupware/approval/write/service/impl/DocumentApprovalWriteServiceImplTest.java`
- Modify: `backend/src/test/java/egovframework/let/groupware/approval/status/service/impl/DocumentApprovalStatusServiceImplTest.java`
- Modify: `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`
- Modify: matching write/status request and response VO files only where required by a failing compile/test.

- [x] Add a test proving first draft creation requests `ELECTRONIC_APPROVAL_NO` with authenticated tenant and date and stores/returns the padded value.
- [x] Add tests proving sequence failure aborts creation and draft edits/submission preserve the stored number rather than requesting another sequence.
- [x] Add status-service tests for exact document-number filtering and sorting while retaining internal-ID validation for detail routes.
- [x] Add mapper assertions for insert and select mappings of `document_no`.
- [x] Run backend tests; the final `mvn test -q` completed with 628 tests, 0 failures, and 0 errors.

### Task 3: Persist numbers and expose backend contracts

**Files:**
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/write/service/impl/DocumentApprovalWriteServiceImpl.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/common/service/DocumentApprovalDraftSupportService.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/common/service/impl/DocumentApprovalDraftSupportServiceImpl.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalDraftVO.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalDetailVO.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalListItemVO.java`
- Modify: status list query VO, status service/controller, and `DocumentApproval_SQL_postgresql.xml`.

- [x] Inject the existing `IdSequenceService`; generate `EA-` + `yyyyMMdd` + `-` + `String.format(Locale.ROOT, "%04d", sequence)` for a new draft only.
- [x] Add `documentNo` to insert parameters and map it to `document_no`; return the generated number in the first-save response and fetch the stored number for later draft/workflow responses.
- [x] Select the value in detail and status/list result maps while keeping `electronicApprovalId` unchanged.
- [x] Add exact status filtering and approved sort mapping for `documentNo`; keep tenant/user access and existing ID-based routes intact.
- [x] Run `mvn test -q` and `mvn "-Dmaven.test.skip=true" package -q` from `backend`. A regular `-DskipTests package` is blocked by an unrelated syntax error in the untracked document-sharing test; details are in the result document.

### Task 4: Add migration, backfill, and schema documentation

**Files:**
- Create: paired SQL, change-history, and rollback files named `20261028_010_*` under `docs/database/20261028` and `backend/DATABASE/20261028`.
- Modify: `docs/database/db-schema.md`.

- [x] Add nullable `document_no`, backfill every existing row by tenant and `created_at` date ordered by `created_at, electronic_approval_id`, and format with `EA-YYYYMMDD-` plus at least four sequence digits.
- [x] Seed/update `tb_id_sequence` for `ELECTRONIC_APPROVAL_NO` using the greatest backfilled number for each tenant/date, then apply NOT NULL and tenant-scoped uniqueness.
- [x] Create a rollback that removes only this generator's rows and the new constraint/column; document the loss of assigned display numbers if rolled back.
- [x] Keep docs/backend migration copies byte-identical and update the cumulative schema entry.
- [x] Validate SQL structure and file-copy equality without connecting to or modifying the database.

### Task 5: Display and search actual document numbers

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Modify: `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Modify: document-status types, service/search helpers, `data/documentStatusColumns.tsx`, and `DocumentStatusPage.tsx` only as needed for changed field names.
- Modify: `frontend/src/pages/sales/order/status/components/SalesOrderStatusDetailPanel.tsx`
- Modify: `frontend/tests/document-status-page.test.tsx`, `document-status-service.test.ts`, and `sales-order-status-page.test.tsx`.

- [x] Add frontend regression tests for the document number cell/header, exact filter serialization, detail subtitle, internal-ID detail request, and sales-order label.
- [x] Run the focused frontend tests; status page/service tests passed, and isolated detail/sales-order subtitle tests passed.
- [x] Require non-empty `documentNo` in relevant server response validators and expose it as the rendered/sort/filter field.
- [x] Keep row keys and detail callbacks on `electronicApprovalId`; show `문서번호: {documentNo}` and `수주번호: {orderNo}` in the respective subtitles.
- [x] Run focused frontend tests and `npm run build`.

### Task 6: Verify browser behavior and record results

**Files:**
- Create: screenshots and `docs/result/20261028/electronic-approval-number/result.md`.

- [x] Run backend/frontend regression checks and build; record outcomes in the result document.
- [x] Verify document number cells and detail subtitles at 375px, 768px, and 1280px in Chromium.
- [x] Save screenshots under `docs/result/20261028/electronic-approval-number/screenshots/` using lowercase ASCII names and synthetic fixtures.
- [x] Record migration SQL as prepared but not applied, MCP metadata inspected without reading table rows, and the unrelated package test-compile limitation.
- [x] Preserve unrelated dirty worktree changes; only feature-specific document-number fixtures/assertions were added to the already-modified composer test file.
