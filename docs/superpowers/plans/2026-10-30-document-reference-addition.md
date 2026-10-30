# Document Reference Addition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user who can read a submitted document add references, immediately grant each new reference the existing participant-based document access, and record the addition in the shared SYSTEM timeline.

**Architecture:** Extend the existing approval interaction API/service and participant-line mapper instead of creating a separate sharing model. Add each new `REFERENCE` participant and one `REFERENCE_ADDED` SYSTEM event atomically; reuse the current active-user lookup, reference-confirmation/list behavior, and document detail refresh. Add a reference picker to the existing detail actions menu and group sharing/reference actions apart from edit/delete with a conditional divider.

**Tech Stack:** React, TypeScript, MUI, Vitest, Spring Boot/eGovFrame, MyBatis, PostgreSQL, JUnit 5, Mockito.

**Approved design:** [Document Reference Addition Design](../specs/2026-10-30-document-reference-addition-design.md)

---

## File map

### Backend

- Modify `backend/src/main/java/egovframework/let/groupware/approval/shared/controller/DocumentApprovalInteractionApiController.java` to expose the add-reference endpoint using the existing authenticated `LoginVO` and `ResultVO` conventions.
- Modify `backend/src/main/java/egovframework/let/groupware/approval/shared/service/DocumentApprovalInteractionService.java` and `.../shared/service/impl/DocumentApprovalInteractionServiceImpl.java` to validate read access/submitted state, resolve eligible users, avoid existing participants, insert new lines, and write the SYSTEM event in one transaction.
- Create `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalReferenceAddRequestVO.java` for the submitted participant user IDs; do not accept actor, tenant, stage, timestamp, or participant name from the client.
- Reuse `DocumentApprovalDAO.selectActiveParticipants`, `selectApprovalLines`, `selectDocumentApprovalForUpdate`, and `insertDocumentApprovalLine` and their existing mapper statements. Modify the DAO/mapper only if a focused test proves an existing query cannot support the approved contract.
- Reuse `DocumentApprovalAccessService` and `DocumentApprovalDraftSupportService.insertSystemEvent`; if the SYSTEM event CHECK constraint rejects `REFERENCE_ADDED`, add matching dated SQL/history/rollback files under `backend/DATABASE/20261030` and `docs/database/20261030`, and update `docs/database/db-schema.md`.
- Extend `backend/src/test/java/egovframework/let/groupware/approval/shared/service/impl/DocumentApprovalInteractionServiceImplTest.java`, `.../shared/controller/DocumentApprovalInteractionApiControllerTest.java`, and `.../domain/repository/DocumentApprovalMapperTest.java` for authorization, validation, transaction intent, line insertion, and SYSTEM event behavior.

### Frontend

- Modify `frontend/src/pages/groupware/documents/write/components/DocumentActionsMenu.tsx` to accept the add-reference callback and render `문서 공유하기`, `참조자 추가하기`, a conditional `Divider`, then existing edit/delete items.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx` to open/submit the picker, pass existing reference participant IDs and active user options, display errors, and refresh the detail/timeline after success.
- Create `frontend/src/pages/groupware/documents/write/components/DocumentReferenceAddDialog.tsx` using MUI `Dialog` and the existing multi-user `UserSelectEditor`; filter current document participants from selectable options.
- Modify `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts` and `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts` for the validated API request/response.
- Reuse the active user directory already fetched in `DocumentApprovalDetailFeed` with `fetchDraftFormUsers`; map that same result to both mention and reference-picker options rather than issuing a duplicate user lookup.
- Modify `frontend/src/pages/groupware/documents/write/data/documentPresentation.ts` to render `REFERENCE_ADDED` SYSTEM messages with the existing timeline treatment and unmodified server-provided content.
- Extend `frontend/tests/document-link-sharing.test.tsx`, `frontend/tests/document-approval-service.test.ts`, and `frontend/tests/document-write-page.test.tsx`; add `frontend/tests/document-reference-add-dialog.test.tsx` if the dialog has independent selection/loading/error behavior worth isolating.

### Dated project documents

- Create the dated work instruction `docs/directions/20261030/20261030_006_문서_참조자_추가_작업지시서.md` before implementation, based on the approved design.
- Create the dated detailed specification `docs/spec/20261030/20261030_006_문서_참조자_추가_상세사양서.md` before implementation, resolving API/DB details from MCP metadata and code contracts.
- Create `docs/result/20261030/document-reference-addition/` with an implementation result and screenshots captured using non-sensitive/synthetic documents.
- Create `docs/plan/20261030/20261030_006_문서_참조자_추가_계획서.md` as the dated project-plan index linking to this full plan and its approved design.

## Implementation tasks

### Task 1: Confirm database and authorization contracts; write dated direction, plan index, and detailed specification

**Files:**
- Create: `docs/directions/20261030/20261030_006_문서_참조자_추가_작업지시서.md`
- Create: `docs/plan/20261030/20261030_006_문서_참조자_추가_계획서.md`
- Create: `docs/spec/20261030/20261030_006_문서_참조자_추가_상세사양서.md`
- Reference: `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`

- [x] Call the registered `s-erp-postgresql-readonly` `list_tables`, then `describe_table` for the approval main, approval line, SYSTEM comment/event, and active-user tables. Read only metadata; do not query user/document rows.
- [x] Confirm the actual participant uniqueness/order constraints and the SYSTEM event type constraint. Confirm whether `REFERENCE_ADDED` can be used without a migration. If rejected by a DB CHECK constraint, document the exact minimal constraint change and prepare paired SQL/history/rollback changes in Task 3; do not run DDL through MCP.
- [x] Trace the existing `documentReadAccess`, document participant check, active-user query, approval-line insert, and SYSTEM-event insert paths. Record the exact read-access validation helper and user identity fields in the detailed specification.
- [x] Write the dated work instruction with scope, approved behavior, atomicity requirement, DB MCP gate, tests, browser validation, result path, and completion conditions.
- [x] Write the dated plan index linking this plan and the approved design.
- [x] Write the dated detailed specification with the exact request DTO, endpoint, response, duplicate behavior, `REFERENCE_ADDED` message format, DB outcome, authorization boundaries, tests, and menu visibility rules. Keep it consistent with the approved design; do not broaden the feature.
- [x] Record that existing active-user, access check, document lock, participant-line, and system-event queries support the feature; do not add DAO/mapper SQL unless implementation tests show a gap.
- [x] Run `git diff --check` and inspect the three dated documents before starting implementation.

### Task 2: Add failing backend service and API tests

**Files:**
- Test: `backend/src/test/java/egovframework/let/groupware/approval/shared/service/impl/DocumentApprovalInteractionServiceImplTest.java`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/shared/controller/DocumentApprovalInteractionApiControllerTest.java`

- [x] Add service tests proving an authorized reader can add active same-tenant users, new participants are `REFERENCE` lines with null action fields, and one `REFERENCE_ADDED` SYSTEM event is written for the actual new names.
- [x] Add tests proving unauthenticated/invalid document IDs, inaccessible or deleted documents, `DRAFT` documents, missing/inactive/cross-tenant users are rejected before writes.
- [x] Add tests proving an existing participant is not inserted again, existing references are not reset, and an all-duplicate request creates no new SYSTEM event.
- [x] Add a test proving SYSTEM-event insertion failure propagates from the transactional service and does not return a success response; verify participant insert and event invocation use the same service transaction boundary.
- [x] Add a controller test for the authenticated POST route, body binding, service delegation, and success `ResultVO` item/message.
- [x] Run `mvn -Dtest=DocumentApprovalInteractionServiceImplTest,DocumentApprovalInteractionApiControllerTest test` from `backend`; confirm the new cases fail because the endpoint/service behavior is not yet implemented.

### Task 3: Implement atomic participant and SYSTEM-event addition

**Files:**
- Create: `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalReferenceAddRequestVO.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/shared/controller/DocumentApprovalInteractionApiController.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/shared/service/DocumentApprovalInteractionService.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/shared/service/impl/DocumentApprovalInteractionServiceImpl.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java`
- Modify: `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`
- Conditional DB change: `backend/DATABASE/20261030/*`, `docs/database/20261030/*`, `docs/database/db-schema.md`

- [x] Define a request DTO containing only `List<String> participantUserIds`; reject null/empty lists, blank IDs, and duplicate IDs at the service boundary with repository-standard `ResponseStatusException` handling.
- [x] Add `POST /api/v1/groupware/approvals/{electronicApprovalId}/references`. Use the authenticated principal for actor and tenant; never accept those values or names/timestamps from request JSON.
- [x] In a `@Transactional(rollbackFor = Exception.class)` service method, validate the authenticated user and positive document ID, call the existing document-read access validator, lock the tenant-scoped non-deleted document row, and reject `DRAFT`.
- [x] Resolve all requested IDs with the existing active-user/tenant query before any writes. Reject the entire request if any target is missing, inactive, or outside the current tenant.
- [x] Load existing approval lines under the locked document and compute the set of genuinely new users. Preserve every existing participant and action state. If there are no new users, return the existing success-shaped operation result without inserting lines or an event.
- [x] Insert the new `REFERENCE` line rows at the existing reference stage (or immediately after the final action stage when there is no reference stage), using the active participant name/department values returned by the trusted server-side query and the next free participant order. Leave `action_status`, `pending_at`, `action_at`, and `action_comment` null. Verify each insert count is exactly one; throw on any mismatch.
- [x] Add one shared SYSTEM event with event type `REFERENCE_ADDED` and content naming the actual new reference users; use the existing `insertSystemEvent` so actor identity/time and common timeline fields are preserved. Any failure must propagate and roll back every line insert.
- [x] If Task 1 proves `REFERENCE_ADDED` violates the current DB check, add matching migration, change-history, and rollback files under both dated DB directories and update `docs/database/db-schema.md`. Do not apply migration to a database.
- [x] Run `mvn -Dtest=DocumentApprovalInteractionServiceImplTest,DocumentApprovalInteractionApiControllerTest,DocumentApprovalMapperTest test` from `backend`; expect the authorization, duplicate, validation, and event failure cases to pass.

### Task 4: Add failing frontend API, menu, and picker tests

**Files:**
- Test: `frontend/tests/document-link-sharing.test.tsx`
- Test: `frontend/tests/document-approval-service.test.ts`
- Test: `frontend/tests/document-write-page.test.tsx`
- Optional test: `frontend/tests/document-reference-add-dialog.test.tsx`

- [x] Test that `DocumentActionsMenu` displays `문서 공유하기`, `참조자 추가하기`, a divider, then available edit/delete entries; assert no orphan divider appears when edit/delete are hidden.
- [x] Test that selecting `참조자 추가하기` closes the menu before invoking its callback and does not invoke share/edit/delete callbacks.
- [x] Test request serialization to `POST /api/v1/groupware/approvals/{id}/references`, response validation, and explicit handling of malformed/server-error responses.
- [x] Test the dialog's multi-user selection, exclusion of current participants, disabled state while submitting, successful close, and visible error with retained selection on failure.
- [x] Test detail refresh after successful add so the reference participants and system timeline are reloaded; test that failed additions do not show success or refresh as if saved.
- [x] Run the focused Vitest selectors from `frontend`; confirm new assertions fail before implementation.

### Task 5: Implement reference picker, menu grouping, and timeline presentation

**Files:**
- Create: `frontend/src/pages/groupware/documents/write/components/DocumentReferenceAddDialog.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentActionsMenu.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentFeedItem.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`
- Modify: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Modify: `frontend/src/pages/groupware/documents/write/data/documentPresentation.ts`
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx` and only the owning hook/component files needed to pass active user options

- [x] Add typed `addDocumentReferences(electronicApprovalId, participantUserIds)` service code with positive ID/nonempty unique ID validation, the approved endpoint/body, and response contract validation.
- [x] Build `DocumentReferenceAddDialog` with the existing MUI `Dialog` and multi-select `UserSelectEditor` patterns. Filter IDs already present in the document's approval/reference lines; support loading/error/submit state without swallowing errors.
- [x] Extend `DocumentActionsMenu` with `onAddReferences`; keep sharing and add-reference menu items in the first group, insert a MUI `Divider` only when at least one edit/delete action exists, and preserve the existing edit/delete eligibility rules and callbacks.
- [x] In `DocumentApprovalDetailFeed`, make add-reference available only for submitted, readable, non-deleted documents. On success, close the dialog, show success, reload detail/system events and trigger the existing page refresh callback; on failure, keep the dialog and show an explicit error.
- [x] Reuse the active users already returned by `fetchDraftFormUsers` in `DocumentApprovalDetailFeed` to build picker options. Do not issue another user directory request.
- [x] Add `REFERENCE_ADDED` to the existing SYSTEM event presentation mapping while preserving server-provided content and the common timeline layout.
- [x] Run the focused frontend tests; expect the menu grouping, API validation, duplicate exclusion, and timeline refresh tests to pass.

### Task 6: Mapper and end-to-end regression verification

**Files:**
- Test: `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`
- Test: `frontend/tests/document-write-page.test.tsx`
- Test: `frontend/tests/document-link-sharing.test.tsx`
- Test: `frontend/tests/document-approval-service.test.ts`

- [x] Add mapper-level assertions for the active tenant/user query, document lock/read boundary, existing participant lookup, reference insert column values, and any changed SYSTEM event constraint migration.
- [x] Verify a newly added target is immediately recognized by the existing document participant access check and `MY_REFERENCE_PENDING` query; do not modify those queries unless a focused regression demonstrates the insertion contract is insufficient.
- [x] Verify adding a reference does not alter document status, approval/action rows, approval counts, or existing reference confirmation state.
- [x] Run `mvn -Dtest=DocumentApprovalInteractionServiceImplTest,DocumentApprovalInteractionApiControllerTest,DocumentApprovalMapperTest test` from `backend`.
- [x] Run focused frontend API/menu/detail tests and `npm run build` from `frontend`. The broad three-file test command reports 44 unrelated failures in `document-write-page.test.tsx` (152 tests pass overall); the 54 API/menu tests and all four new detail regressions pass.
- [x] Investigate feature-related failures to root cause and rerun the focused checks; the browser exposed and verified a fix for the multi-select popper blocking the submit button.

### Task 7: Browser validation and dated result

**Files:**
- Create: `docs/result/20261030/document-reference-addition/20261030_006_document_reference_addition_result.md`
- Screenshots: `docs/result/20261030/document-reference-addition/screenshots/`

- [x] Verify that `http://127.0.0.1:4173` is serving this S-ERP Vite application and reuse it for browser validation.
- [x] Use a synthetic document and test users to exercise menu opening, multi-reference selection, successful refresh, added participants, and SYSTEM timeline content. Backend mapper tests verify that `REFERENCE` lines participate in existing read-access and pending-reference predicates.
- [x] Capture actual browser evidence at 375px, 768px, and 1280px; assert the dialog fits and page-level horizontal overflow is absent. Save synthetic content under the English lowercase screenshot directory.
- [x] Write the result document with exact tests/build/browser outcomes, screenshots, migration/MCP evidence, and the behavior of history insertion/rollback.
- [x] Run `git diff --check`; inspect task changes and preserve unrelated worktree changes.

## Self-review against approved design

- Permission and lifecycle boundaries, multi-selection, immediate access, duplicate preservation, and existing confirmation behavior: Tasks 1-3 and 6.
- Auditable `REFERENCE_ADDED` SYSTEM history, content identifying actor and actual new references, no event for all-duplicate requests, atomic rollback, and DB constraint handling: Tasks 1-3 and 6.
- Menu grouping, conditional divider, existing edit/delete authorization, and dialog feedback: Tasks 4-5.
- Explicit regression coverage, real browser viewport validation, and result documentation: Tasks 2, 4, 6, and 7.
- No new ACL, message/notification, reference removal, or draft reference-add flow is introduced.
