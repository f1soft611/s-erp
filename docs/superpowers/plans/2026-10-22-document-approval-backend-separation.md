# Electronic Approval Backend Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate document writing, document status search, and shared document interaction into eGovFrame-style backend layers while preserving every existing API and authorization contract.

**Architecture:** Keep the current `/api/v1/groupware/approvals` URL space and partition its non-overlapping routes among writing, status, and shared-interaction controllers. Extract the matching service interfaces and implementations, add a small shared access service for the tenant/user and document-ownership checks used across the new services, and retain the existing DAO/MyBatis mapper as the single persistence layer.

**Tech Stack:** Java 17, Spring Boot, eGovFrame (`EgovAbstractServiceImpl`), MyBatis, PostgreSQL, JUnit 5, Mockito, Maven, Vitest.

---

## Required Documents and Constraints

- Approved design: [`2026-10-22-document-approval-backend-separation-design.md`](../specs/2026-10-22-document-approval-backend-separation-design.md)
- Work instruction: [`20261022_001_electronic_document_backend_separation_work_instruction.md`](../../directions/20261022/20261022_001_electronic_document_backend_separation_work_instruction.md)
- Dated implementation plan: [`20261022_001_electronic_document_backend_layer_separation_plan.md`](../../plan/20261022/20261022_001_electronic_document_backend_layer_separation_plan.md)
- Dated API/architecture specification: [`20261022_001_electronic_document_backend_layer_separation_spec.md`](../../spec/20261022/20261022_001_electronic_document_backend_layer_separation_spec.md)
- Do not overwrite or revert the pre-existing status-related edits in `DocumentApprovalServiceImpl.java`, `DocumentApproval_SQL_postgresql.xml`, the mapper/service tests, the status frontend, the F1-Grid guide, or the dated 20261021 documents.
- Do not change routes, DTO fields, response envelopes, database schema, tenant/user constraints, or frontend behavior.
- Preserve the unpaged status query behavior: when both `offset` and `limit` are absent, status search omits SQL `LIMIT/OFFSET`; when paging values are supplied, validate and pass them as before.

## File Map

### Backend production files

- Create `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalWriteApiController.java`: draft endpoints, writing lists/feed, pins, summary, and temporary embedded-image endpoints.
- Create `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalStatusApiController.java`: `/documents/search` endpoint and its existing `ResultVO` response envelope.
- Create `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalInteractionApiController.java`: detail, workflow actions, related files, comments, attachments, and stable embedded-image streaming endpoints.
- Create matching `DocumentApprovalWriteService.java`, `DocumentApprovalStatusService.java`, and `DocumentApprovalInteractionService.java` interfaces under `approval/service/`.
- Create matching `DocumentApprovalWriteServiceImpl.java`, `DocumentApprovalStatusServiceImpl.java`, and `DocumentApprovalInteractionServiceImpl.java` under `approval/service/impl/`. Each implementation extends `EgovAbstractServiceImpl`, uses constructor injection, and retains transaction boundaries for mutations.
- Create `DocumentApprovalAccessService.java` and `DocumentApprovalAccessServiceImpl.java` under `approval/service/` and `approval/service/impl/` for authenticated-user validation, actor parameters, draft ownership, and related-document access checks shared across feature services.
- Keep `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java` and `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml` as the shared persistence contract. Preserve the existing pending status SQL change; do not redesign SQL.
- Delete the old combined `DocumentApprovalApiController.java`, `DocumentApprovalService.java`, and `DocumentApprovalServiceImpl.java` only after all endpoint and service test references have moved and the application compiles.

### Tests and documentation

- Create `DocumentApprovalWriteApiControllerTest.java`, `DocumentApprovalStatusApiControllerTest.java`, and `DocumentApprovalInteractionApiControllerTest.java`; remove `DocumentApprovalApiControllerTest.java` after its assertions are relocated.
- Create `DocumentApprovalWriteServiceImplTest.java`, `DocumentApprovalStatusServiceImplTest.java`, `DocumentApprovalInteractionServiceImplTest.java`, and `DocumentApprovalAccessServiceImplTest.java`; move the corresponding existing characterization tests and helpers from `DocumentApprovalServiceImplTest.java`, then remove the old test once all assertions are retained.
- Keep `DocumentApprovalMapperTest.java`; its current no-limit SQL assertion remains and is extended only if statement loading needs a regression check.
- Run the existing frontend tests `frontend/tests/document-write-page.test.tsx`, `frontend/tests/document-status-page.test.tsx`, `frontend/tests/document-status-service.test.ts`, and `frontend/tests/document-approval-service.test.ts` without modifying frontend sources.
- Create `docs/result/20261022/document-approval-backend-separation/README.md` and `docs/result/20261022/document-approval-backend-separation/screenshots/` with the implementation summary, database MCP evidence, exact validation outcomes, and browser captures of the unchanged writing/status pages.

## Route and Method Ownership

### Writing

`POST /drafts`, `PUT /drafts/{electronicApprovalId}`, `GET /documents`, `PUT /documents/{electronicApprovalId}/pin`, `DELETE /documents/{electronicApprovalId}/pin`, `GET /documents/pinned`, `GET /summary`, `POST /embedded-images/temp`, and `DELETE /embedded-images/temp/{uploadToken}`.

Move the existing service operations `saveDraft` (both overloads), `listDocuments`, `searchWriteDocuments`, `searchWriteFeedDocuments`, `listFeedDocuments`, `listPinnedDocuments`, `listPinnedFeedDocuments`, `pinDocument`, `unpinDocument`, `getSummary`, `uploadTemporaryEmbeddedImage`, and `deleteTemporaryEmbeddedImage` to `DocumentApprovalWriteService`.

### Status

`GET /documents/search`.

Move `searchDocuments` and its status-specific filter/date/sort validation into `DocumentApprovalStatusService`. Keep the current query VO and page response VO unchanged.

### Shared interaction

Move `submit`, `processAction`, `cancelSubmission`, `cancelApproval`, `deleteDocumentApproval`, `listFiles`, `getDetail`, all approval-comment operations, all document-attachment operations, and `streamEmbeddedImage` to `DocumentApprovalInteractionService`.

Keep shared ownership/authentication checks in `DocumentApprovalAccessService`; do not reimplement or relax them in each feature service. Keep the existing `toStableUrl` and `resolveOwnedImage` callbacks with the writing implementation where temporary draft image processing uses them.

## Implementation Tasks

### Task 1: Establish the behavior baseline

**Files:** No production changes.

- [ ] Run the current approval controller, service, and mapper tests:

```powershell
cd backend
mvn -Dtest=DocumentApprovalApiControllerTest,DocumentApprovalServiceImplTest,DocumentApprovalMapperTest test
```

Expected: the existing approval tests pass, including the unpaged status SQL and service tests already present in the worktree. If a test fails, record the exact existing failure and fix or isolate it before extraction; do not rewrite user changes.

- [ ] Run the frontend contract tests:

```powershell
cd frontend
npm run test -- tests/document-write-page.test.tsx tests/document-status-page.test.tsx tests/document-status-service.test.ts tests/document-approval-service.test.ts
```

Expected: the existing frontend write/status API contracts pass before backend restructuring.

### Task 2: Characterize and extract status access and search

**Files:**
- Create the status and access service interfaces/implementations listed in the file map.
- Create `DocumentApprovalStatusApiController.java` and its test.
- Create `DocumentApprovalStatusServiceImplTest.java` and `DocumentApprovalAccessServiceImplTest.java`.
- Modify then delete the old combined controller/service/test only after replacement assertions pass.

- [ ] Add direct `DocumentApprovalStatusService` tests for: unpaged status search with no `limit` or `offset` DAO parameters; paged search with validated range; tenant, drafter, and participant identity parameters; allowed sort and direction; invalid date range, invalid sort, invalid status, and invalid paging rejection.
- [ ] Add `DocumentApprovalStatusApiControllerTest` asserting `GET /documents/search`, the authenticated `LoginVO` passed to the service, and exact `resultList`/`totalRowCount` response keys.
- [ ] Run only the new status/access tests and confirm they fail because the new service/controller types do not yet exist.
- [ ] Define the status service contract with the existing query and page VOs:

```java
public interface DocumentApprovalStatusService {
    DocumentApprovalListPageVO searchDocuments(
            LoginVO user, String scope, DocumentApprovalListQueryVO query) throws Exception;
}
```

- [ ] Move the existing `searchDocuments` body and only its status-specific validation/date/sort helpers from `DocumentApprovalServiceImpl` into `DocumentApprovalStatusServiceImpl`. Retain the current allow-list and status query parameters.
- [ ] Move the shared `validateAuthenticatedUser`, `actorParams`, `authenticatedUserId`, `requireDraftOwner`, and `requireRelatedDocument` behavior into `DocumentApprovalAccessServiceImpl`; make feature services call this shared access service rather than copying ownership SQL.
- [ ] Implement the status endpoint with the same `@GetMapping("/documents/search")`, `@ModelAttribute DocumentApprovalListQueryVO`, `@AuthenticationPrincipal LoginVO`, and `ResultVoHelper` result construction as the old controller.

```java
@GetMapping("/documents/search")
public ResultVO searchDocuments(
        @RequestParam(required = false, defaultValue = "ALL") String scope,
        @ModelAttribute DocumentApprovalListQueryVO query,
        @AuthenticationPrincipal LoginVO user) throws Exception {
    DocumentApprovalListPageVO page = statusService.searchDocuments(user, scope, query);
    HashMap<String, Object> resultMap = new HashMap<>();
    resultMap.put("resultList", page.getResultList());
    resultMap.put("totalRowCount", page.getTotalRowCount());
    return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
}
```

- [ ] Run `mvn -Dtest=DocumentApprovalStatusApiControllerTest,DocumentApprovalStatusServiceImplTest,DocumentApprovalAccessServiceImplTest,DocumentApprovalMapperTest test` from `backend`; expected result is PASS, including the pending no-`LIMIT/OFFSET` assertion.

### Task 3: Extract writing endpoints and service

**Files:**
- Create `DocumentApprovalWriteApiController.java`, `DocumentApprovalWriteService.java`, `DocumentApprovalWriteServiceImpl.java`, and their tests.
- Modify `DocumentApprovalDAO.java` only if a moved method requires a compile-time signature relocation; do not alter its SQL semantics.

- [ ] Add direct writing service tests for both `saveDraft` overloads, draft validation and ownership, lightweight list response, detailed feed response, pinned list and pin state, summary, and temporary embedded-image upload/delete.
- [ ] Add controller tests for `POST /drafts`, `PUT /drafts/{id}`, `GET /documents`, `GET /documents/pinned`, pin/unpin, summary, and temporary image routes. Assert all current response keys and HTTP status codes.
- [ ] Run the new writing tests and confirm they fail before the new types are implemented.
- [ ] Move the corresponding methods and their draft/image/list helper methods from `DocumentApprovalServiceImpl` into `DocumentApprovalWriteServiceImpl`; inject the existing DAO, comment/file/image services, sanitizer, and `DocumentApprovalAccessService` required by those methods.
- [ ] Preserve `@Transactional(rollbackFor = Exception.class)` on mutating draft operations and keep embedded-image ownership and completion behavior intact.
- [ ] Implement the writing controller routes with the current mappings and result envelopes; do not add `totalRowCount` to the ordinary unpaged list response.
- [ ] Run `mvn -Dtest=DocumentApprovalWriteApiControllerTest,DocumentApprovalWriteServiceImplTest test` from `backend`; expected result is PASS.

### Task 4: Extract shared detail and interaction endpoints

**Files:**
- Create `DocumentApprovalInteractionApiController.java`, `DocumentApprovalInteractionService.java`, `DocumentApprovalInteractionServiceImpl.java`, and their tests.

- [ ] Add service tests for document-detail access by drafter and participant, rejection of unrelated/other-tenant access, action authorization, submission/cancellation behavior, comment pagination and ownership, comment attachment ownership, document attachment ownership, and embedded-image streaming.
- [ ] Add controller tests for all remaining original routes: submit/cancel/action/delete, `/files`, document detail, comment routes, comment attachment routes, document attachment routes, and embedded-image stream. Assert unchanged mapping annotations, response envelope keys, and `201 Created` responses for creation/upload operations.
- [ ] Run the new interaction tests and confirm they fail before the new service/controller implementation exists.
- [ ] Move the remaining interaction methods and their helper methods from the old implementation into `DocumentApprovalInteractionServiceImpl`. Use `DocumentApprovalAccessService` for related-document and draft-owner checks.
- [ ] Preserve method-level transaction boundaries and do not catch existing validation, authorization, storage, or DAO exceptions into success-shaped results.
- [ ] Implement the remaining routes with their exact prior paths, HTTP methods, and `ResultVO`/download behavior.
- [ ] Run `mvn -Dtest=DocumentApprovalInteractionApiControllerTest,DocumentApprovalInteractionServiceImplTest test` from `backend`; expected result is PASS.

### Task 5: Remove the monolith and verify wiring

**Files:**
- Delete `DocumentApprovalApiController.java`, `DocumentApprovalService.java`, `DocumentApprovalServiceImpl.java`, `DocumentApprovalApiControllerTest.java`, and `DocumentApprovalServiceImplTest.java` after every method and assertion has a new owner.
- Keep `DocumentApprovalDAO.java`, `DocumentApproval_SQL_postgresql.xml`, and `DocumentApprovalMapperTest.java`.

- [ ] Search `backend/src/main/java` and `backend/src/test/java` for `DocumentApprovalApiController`, `DocumentApprovalService`, and `DocumentApprovalServiceImpl`; expected result is no stale references.
- [ ] Verify all four new ServiceImpls extend `EgovAbstractServiceImpl`, use explicit constructor injection, and are discoverable as uniquely named Spring services.
- [ ] Verify all controllers have the same `/api/v1/groupware/approvals` base path and no duplicate `(HTTP method, route)` mappings.
- [ ] Run `mvn -Dtest=DocumentApprovalWriteApiControllerTest,DocumentApprovalStatusApiControllerTest,DocumentApprovalInteractionApiControllerTest,DocumentApprovalWriteServiceImplTest,DocumentApprovalStatusServiceImplTest,DocumentApprovalInteractionServiceImplTest,DocumentApprovalAccessServiceImplTest,DocumentApprovalMapperTest test` from `backend`; expected result is PASS.

### Task 6: End-to-end regression and result record

**Files:**
- Create `docs/result/20261022/document-approval-backend-separation/README.md`.
- Do not modify frontend source files or database schema artifacts.

- [ ] Run full backend test suite:

```powershell
cd backend
mvn test
```

Expected: `BUILD SUCCESS` and all tests pass.

- [ ] Run the four frontend contract/page tests from Task 1; expected result is PASS with no frontend source changes.
- [ ] Open the unchanged writing and status pages in the browser at 375px, 768px, and 1280px and save screenshots under `docs/result/20261022/document-approval-backend-separation/screenshots/`; report any unavailable runtime or backend dependency explicitly rather than fabricating a screenshot.
- [ ] Record the DB MCP list/describe metadata confirmation, unchanged API/schema scope, the preserved unpaged status change, exact test commands/results, and the fact that only the backend structure changed.
- [ ] Inspect `git status --short` and the final diff. Confirm existing user changes remain present and no unrelated files, generated output, or schema migration files were added.

## Commit Safety

The worktree contains pre-existing, uncommitted status/frontend/documentation changes, including edits to files that will be refactored. Do not stage or commit those changes as part of this work. The design document has its own commit; implementation commits must not be created unless the relevant changes can be staged without including the pre-existing edits.
