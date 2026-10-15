# 업무작성 자주 쓰는 결재선 Implementation Plan

> **For agentic workers:** Use this plan task-by-task. Keep each step focused, test-first, and commit only the files for this feature.

**Goal:** Add user-owned, server-persisted approval-line templates, separated by `eabus_no` (`001`, `008`, `004`, `031`), to the document approval settings dialog.

**Architecture:** Add dedicated template header/detail tables and a focused Spring service/controller/DAO instead of reusing document-bound approval rows. Add a frontend API module and extend the existing settings dialog so saving, loading, renaming, and deleting templates never bypasses its draft/apply/cancel boundary.

**Tech Stack:** React, TypeScript, MUI, Vitest, Spring Boot/eGovFrame, MyBatis, PostgreSQL, JUnit 5, Mockito.

---

## File map

### Database and backend

- Create `backend/DATABASE/20261015/20261015_002_create_approval_line_template_schema.sql` and the matching change-history and rollback files.
- Create the exact same three migration files under `docs/database/20261015/`.
- Modify `docs/database/db-schema.md` with both template tables and their keys/checks.
- Create `backend/src/main/java/egovframework/let/groupware/approval/domain/model/ApprovalLineTemplateVO.java` for template response data.
- Create `backend/src/main/java/egovframework/let/groupware/approval/domain/model/ApprovalLineTemplateSaveRequestVO.java` for create/update requests and participant rows.
- Create `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/ApprovalLineTemplateDAO.java`.
- Create `backend/src/main/resources/egovframework/mapper/let/groupware/approval/ApprovalLineTemplate_SQL_postgresql.xml`.
- Create `backend/src/main/java/egovframework/let/groupware/approval/service/ApprovalLineTemplateService.java` and `backend/src/main/java/egovframework/let/groupware/approval/service/impl/ApprovalLineTemplateServiceImpl.java`.
- Create `backend/src/main/java/egovframework/let/groupware/approval/controller/ApprovalLineTemplateApiController.java` under `/api/v1/groupware/approvals/line-templates`.
- Create `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/ApprovalLineTemplateMapperTest.java`.
- Create `backend/src/test/java/egovframework/let/groupware/approval/service/impl/ApprovalLineTemplateServiceImplTest.java`.
- Create `backend/src/test/java/egovframework/let/groupware/approval/controller/ApprovalLineTemplateApiControllerTest.java`.

### Frontend

- Modify `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts` with template and line-item types.
- Create `frontend/src/pages/groupware/documents/write/services/approvalLineTemplate.service.ts` for strict API calls and response validation.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx` to enable and handle favorite save/load/rename/delete while preserving its existing draft state.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx` to pass the selected document code and retain the existing `onApply` state boundary.
- Create `frontend/tests/approval-line-template-service.test.ts`.
- Extend `frontend/tests/document-approval-settings-dialog.test.tsx` for user flows, error preservation, and apply/cancel behavior.
- Extend `frontend/tests/document-write-page.test.tsx` only for the active document-code wiring if a page-level integration assertion is needed.

### Required project documents

- Work order: `docs/directions/20261015/20261015_002_업무작성_자주쓰는결재선_작업지시서.md`.
- Detailed spec: `docs/spec/20261015/20261015_002_업무작성_자주쓰는결재선_상세사양서.md`.
- Project plan summary: `docs/plan/20261015/20261015_002_업무작성_자주쓰는결재선_계획서.md`.
- Approved design: `docs/superpowers/specs/2026-10-15-document-approval-line-favorites-design.md`.
- Result and screenshots: `docs/result/20261015/document-approval-line-favorites/`.

## API contract

Use the authenticated `LoginVO` for tenant and owner identity; never accept an owner ID from a request body.

- `GET /api/v1/groupware/approvals/line-templates?eabusNo=001` returns `resultList`, limited to the authenticated owner and requested code.
- `GET /api/v1/groupware/approvals/line-templates/{templateId}` returns the selected owned template and its ordered participants.
- `POST /api/v1/groupware/approvals/line-templates` creates `{ eabusNo, name, approvalLines }` and returns `201` with `item`.
- `PUT /api/v1/groupware/approvals/line-templates/{templateId}` renames the owned template with `{ name }`.
- `DELETE /api/v1/groupware/approvals/line-templates/{templateId}` deletes the owned template.
- Each `approvalLines` element uses the existing draft contract: `stageOrder`, `participantOrder`, `participantType` (`APPROVAL`, `AGREEMENT`, `REFERENCE`), and `participantUserId`.
- Keep stages in the existing draft ordering convention: the fixed drafter is not persisted; mutable approval/agreement stages retain their relative positions after the fixed stage; references use the final stage position and their own participant order.
- Reject blank names, duplicate names for the same owner/code, unknown codes, repeated users, invalid ordering, and users that are not active in the authenticated tenant. Use a transaction for create/delete of master and detail rows. Return `409 Conflict` when a previously stored template contains an inactive participant.
- Names are trimmed and limited to 1–100 characters in both API validation and the database column.

## Task 0: Finalize the dated detailed specification before implementation

**Files:** `docs/spec/20261015/20261015_002_업무작성_자주쓰는결재선_상세사양서.md`.

- [ ] **Step 1: Write the detailed spec from the approved design and this plan.** Include the four exact `eabus_no` mappings, schema keys/checks, list/detail/create/rename/delete API contracts, auth ownership rules, stage/reference ordering, draft/apply/cancel semantics, explicit errors, and the full test/browser acceptance criteria.
- [ ] **Step 2: Self-review the spec.** Verify all approved behavior is covered, every API payload and response is unambiguous, no unknown participant state can silently overwrite the dialog, and the DB changes follow the inspected schema.
- [ ] **Step 3: Proceed to implementation only after the detailed spec is complete.**

## Task 1: Persist templates with scoped relational rows

**Files:** Migration pair, `db-schema.md`, `ApprovalLineTemplateDAO.java`, MyBatis XML, `ApprovalLineTemplateMapperTest.java`.

- [ ] **Step 1: Add a mapper contract test before adding the mapper.** Parse `ApprovalLineTemplate_SQL_postgresql.xml` and assert mappings exist for `selectOwnedTemplates`, `selectOwnedTemplate`, `insertTemplate`, `insertTemplateLine`, `updateOwnedTemplateName`, `deleteOwnedTemplateLines`, and `deleteOwnedTemplate`. Also inspect generated SQL to ensure every select/update/delete filters by both `tenant_id` and `owner_user_id`.
- [ ] **Step 2: Run the focused mapper test and observe failure.** Run `mvn -f backend/pom.xml -Dtest=ApprovalLineTemplateMapperTest test`. Expected: FAIL because the new mapper resource/statements are absent.
- [ ] **Step 3: Add matching dated DDL and rollback files.** Create `tb_electronic_approval_line_template` with `template_id`, `tenant_id`, `owner_user_id`, `eabus_no`, `template_name`, `created_at`, and `updated_at`; constrain codes to `001/008/004/031`; add a unique key on tenant/template ID and tenant/owner/code/name. Create `tb_electronic_approval_line_template_info` with template identity, stage/participant order, type and participant user ID; enforce positive order, allowed types, unique positions and no repeated participant per template; cascade child deletion from its parent. Reference tenant consistently with existing schema. Include rollback drops in child-before-parent order. Copy byte-identical change-history and SQL/rollback content to `docs/database/20261015` and `backend/DATABASE/20261015`.
- [ ] **Step 4: Add MyBatis statements and DAO methods.** Implement owner/code-scoped list, generated-key master insertion, ordered detail insertion, owner-scoped name update, detail deletion and owner-scoped master deletion. Use `#{...}` bindings for every request value and `<foreach>` for batch detail insertion.
- [ ] **Step 5: Update `db-schema.md` and pass mapper tests.** Document both tables, ownership, code and ordering constraints. Run `mvn -f backend/pom.xml -Dtest=ApprovalLineTemplateMapperTest test`; expected: PASS.
- [ ] **Step 6: Commit only this task's migration, schema, DAO, mapper and test files.**

## Task 2: Add authenticated CRUD and server validation

**Files:** New template model/request, service interface/implementation, controller, service/controller tests.

- [ ] **Step 1: Add failing service tests.** Cover a successful ordered create/list/detail round trip; all four allowed and an unknown `eabusNo`; blank, 101-character and duplicate names; repeated participants, invalid order/type; active-participant lookup scoped to `user.getTenantId()`; inaccessible template detail/update/delete returning the repository-standard not-found response; and rollback/no partial master when detail insertion fails.
- [ ] **Step 2: Run `mvn -f backend/pom.xml -Dtest=ApprovalLineTemplateServiceImplTest test`.** Expected: FAIL because the template service/models are absent.
- [ ] **Step 3: Implement request/response types and validation.** Model template ID, name, code, timestamps and ordered participant rows. Require a non-null authenticated `LoginVO`, supported code, trimmed name of 1–100 characters, positive order values, allowed participant types, unique user IDs and active participants from the same tenant. Reuse `DocumentApprovalDAO.selectActiveParticipants` with the authenticated tenant and compare returned IDs with requested IDs. Set tenant/owner only from `LoginVO`.
- [ ] **Step 4: Implement transactional service methods and controller routes.** Expose list/create/rename/delete with `GET`, `POST`, `PUT`, and `DELETE` under `/api/v1/groupware/approvals/line-templates`. Use `ResultVO` `resultList`/`item` conventions. Owner filters must apply to every lookup and mutation; return no cross-owner information when the requested template does not belong to the caller.
- [ ] **Step 5: Add controller route/response tests and verify failure paths.** Assert authenticated user delegation, response status and payload keys; assert validation/ownership errors surface rather than returning success-shaped empty values.
- [ ] **Step 6: Run `mvn -f backend/pom.xml -Dtest=ApprovalLineTemplateServiceImplTest,ApprovalLineTemplateApiControllerTest,ApprovalLineTemplateMapperTest test`.** Expected: PASS.
- [ ] **Step 7: Commit only the template backend source and test files.**

## Task 3: Add a typed frontend template API client

**Files:** `documentWrite.types.ts`, new `approvalLineTemplate.service.ts`, new service tests.

- [ ] **Step 1: Write service tests for list/detail/create/rename/delete.** Assert exact `eabusNo` query serialization, detail uses the selected template ID, create request includes name/code/ordered line rows but no owner ID, rename body contains only `name`, delete uses the template ID route, and malformed `resultList`/`item` responses reject.
- [ ] **Step 2: Run `cd frontend; npm run test -- tests/approval-line-template-service.test.ts`.** Expected: FAIL because the service module and types do not exist.
- [ ] **Step 3: Add exported TypeScript types.** Define `ApprovalLineTemplateParticipant` from the existing participant fields and `ApprovalLineTemplate` with `templateId`, `name`, `eabusNo`, and ordered `approvalLines`.
- [ ] **Step 4: Implement the service through the existing `apiGet`, `apiPost`, `apiPut`, and `apiDelete` client.** Validate positive template IDs, supported code values, required names, and response object shapes; throw a descriptive error for invalid responses.
- [ ] **Step 5: Rerun the focused service test.** Expected: PASS with no unchecked casts.
- [ ] **Step 6: Commit only the frontend types, service and service tests.**

## Task 4: Integrate save, load, rename and delete into the settings dialog

**Files:** `DocumentApprovalSettingsDialog.tsx`, `DocumentComposerDialog.tsx`, settings dialog tests, optional page integration test.

- [ ] **Step 1: Add failing UI tests.** Assert both favorite actions are enabled when document code and user options are available; saving prompts for a required name and serializes draft stages/references in their current order; loading lists only matching `eabusNo` items and replaces only temporary stages/references; fixed drafter remains in place; rename and confirmed delete call the service; API errors preserve existing temporary data; `적용` commits loaded state and `취소`/close discards it.
- [ ] **Step 2: Run `cd frontend; npm run test -- tests/document-approval-settings-dialog.test.tsx`.** Expected: FAIL because buttons are disabled and template actions are not wired.
- [ ] **Step 3: Pass the active document code into `DocumentApprovalSettingsDialog`.** Map active document type to `001`, `008`, `004`, or `031` at the composer boundary, keeping the backend document type and document numbering code distinct.
- [ ] **Step 4: Implement favorite list/create/rename/delete UI.** Keep asynchronous loading/error state explicit; trim names and block blank, over-100-character and duplicate names; require confirmation before deletion. Keep persistence calls in `approvalLineTemplate.service.ts`.
- [ ] **Step 5: Implement safe load conversion.** Resolve every returned participant ID against active `userOptions` before changing state. If any ID is unavailable, show an explicit error and do not modify draft state. Build the loaded draft from the current fixed drafter stage plus the returned mutable approval/agreement stages, and restore references in their saved order.
- [ ] **Step 6: Keep the existing `onApply` as the only parent-state mutation path.** Saving leaves the composer untouched; loading only changes the settings dialog's draft; closing discards it.
- [ ] **Step 7: Run focused settings and write-page tests.** Run `cd frontend; npm run test -- tests/document-approval-settings-dialog.test.tsx tests/document-write-page.test.tsx`; expected: PASS.
- [ ] **Step 8: Commit only the settings/composer and related tests.**

## Task 5: Verify, document, and capture the completed behavior

**Files:** Detailed spec, result report, screenshot directory, all feature files.

- [ ] **Step 1: Run frontend focused tests and build.** Run `cd frontend; npm run test -- tests/approval-line-template-service.test.ts tests/document-approval-settings-dialog.test.tsx tests/document-write-page.test.tsx`, then `cd frontend; npm run build`. Expected: all focused tests pass and TypeScript/Vite build succeeds.
- [ ] **Step 2: Run backend focused tests and build.** Run `mvn -f backend/pom.xml -Dtest=ApprovalLineTemplateServiceImplTest,ApprovalLineTemplateApiControllerTest,ApprovalLineTemplateMapperTest test`, then `mvn -f backend/pom.xml -DskipTests package`. Expected: tests and package succeed.
- [ ] **Step 3: Verify real browser layouts.** Use the existing S-ERP app at `http://127.0.0.1:4173` and verify the save dialog, template list, rename, delete confirmation, load/apply, and cancel at 375px, 768px and 1280px. Save screenshots only under `docs/result/20261015/document-approval-line-favorites/screenshots/`; reuse an existing verified server and do not stop a server that was not started for this task.
- [ ] **Step 4: Write the result report.** Record implemented behavior, test/build outcomes, browser widths and screenshot paths, DB MCP tables/columns inspected, and the migration locations.
- [ ] **Step 5: Verify migration parity and final scope.** Compare corresponding SQL/change/rollback files in `docs/database/20261015` and `backend/DATABASE/20261015`; verify `db-schema.md`; run `git diff --check` and inspect `git status --short` so unrelated pre-existing work remains untouched.
- [ ] **Step 6: Commit only the result artifacts and feature files after verification.**

## Execution commands

Run from repository root unless a frontend command explicitly changes directory:

```powershell
mvn -f backend/pom.xml -Dtest=ApprovalLineTemplateServiceImplTest,ApprovalLineTemplateApiControllerTest,ApprovalLineTemplateMapperTest test
mvn -f backend/pom.xml -DskipTests package
```

Run from `frontend`:

```powershell
npm run test -- tests/approval-line-template-service.test.ts tests/document-approval-settings-dialog.test.tsx tests/document-write-page.test.tsx
npm run build
```
