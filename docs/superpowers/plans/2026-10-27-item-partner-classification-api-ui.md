# Item and Partner Classification API/UI Implementation Plan

> **For agentic workers:** Implement the tasks in order. Steps use checkbox syntax for tracking.

**Goal:** Deliver tenant-isolated classification CRUD APIs and responsive settings dialogs on item and customer management pages without applying the pending database migration.

**Architecture:** Add a classification-specific Spring Controller/Service/DAO/Mapper whose tenant scope always comes from `LoginVO`. Reuse one typed frontend service and one responsive dialog for item (3 levels) and partner (2 levels), connected through each page's existing header action groups.

**Tech Stack:** Java 17, Spring Boot/eGovFrame, MyBatis XML, React, TypeScript, MUI, JUnit/Mockito/MockMvc, Vitest.

---

## Files and responsibilities

- Create `backend/src/main/java/egovframework/let/co/master/classification/controller/ClassificationApiController.java`: routes, authenticated tenant extraction, write-role enforcement, `ResultVO`.
- Create `backend/src/main/java/egovframework/let/co/master/classification/domain/model/ClassificationKind.java`: fixed ITEM/PARTNER schema mapping.
- Create `backend/src/main/java/egovframework/let/co/master/classification/domain/model/ClassificationVO.java` and `ClassificationSaveRequestVO.java`: API/mapper data contracts.
- Create `backend/src/main/java/egovframework/let/co/master/classification/domain/repository/ClassificationDAO.java`: mapper access.
- Create `backend/src/main/java/egovframework/let/co/master/classification/service/ClassificationService.java` and `service/impl/ClassificationServiceImpl.java`: tenant-safe reads and hierarchy/input rules.
- Create `backend/src/main/resources/egovframework/mapper/let/co/master/classification/Classification_SQL_postgresql.xml`: fixed-table PostgreSQL statements.
- Create backend controller/service tests under `backend/src/test/java/egovframework/let/co/master/classification/`.
- Create `frontend/src/pages/co/master/classification/types/classification.types.ts`, `services/classification.service.ts`, and `components/ClassificationSettingsDialog.tsx`: shared contracts, API calls and settings UI.
- Modify `frontend/src/pages/co/master/materials/MaterialManagementPage.tsx` and `frontend/src/pages/co/master/customers/CustomerManagementPage.tsx`: permission-gated header actions.
- Add focused tests in `frontend/tests/classification.service.test.ts`, `frontend/tests/classification-settings-dialog.test.tsx`, and the existing item/customer page tests.
- Record outcome in `docs/result/20261027/item-partner-classification-api-ui/`.

## Task 1: Backend contracts and service behavior

- [ ] Add failing service tests for valid root/child creation, tenant-scoped parent lookup, maximum level, inactive parent, invalid name/sort/useAt, active children preventing deactivation, and update that cannot change parent/level.
- [ ] Run `cd backend; mvn -Dtest=ClassificationServiceImplTest test` and confirm the new tests fail because the service does not exist.
- [ ] Implement `ClassificationKind` with only ITEM and PARTNER constants and fixed table-column mapping; never accept table names from request data.
- [ ] Implement DAO/service contracts and mapper queries with mandatory tenant predicates on select-by-ID, parent validation, child count, insert, and update. Use `RETURNING` for generated IDs and use DB audit columns as specified by `20261027_003`.
- [ ] Implement root/child level derivation and validation. Reject invalid or inactive parents and child creation below maximum level. Reject `useAt=N` for a node that has active children. Keep parent and level immutable on update.
- [ ] Run the focused service tests and confirm they pass.

## Task 2: Backend routes and authorization

- [ ] Add controller tests for GET/POST/PUT on both paths, service calls receiving the authenticated `LoginVO.tenantId`, admin writes, non-admin 403, validation 400, and missing/foreign IDs 404.
- [ ] Run `cd backend; mvn -Dtest=ClassificationApiControllerTest test` and confirm the route tests fail before implementation.
- [ ] Implement `GET/POST /api/v1/co/master/classifications/{items|partners}` and `PUT /api/v1/co/master/classifications/{items|partners}/{id}`. GET requires authentication; POST/PUT call `EgovAccessControlHelper.isTenantAdmin`.
- [ ] Return existing `ResultVO` conventions with `resultList` for GET and `item` for writes. Translate `IllegalArgumentException` to the project's standard 400 envelope without hiding unexpected errors.
- [ ] Run `cd backend; mvn -Dtest=ClassificationApiControllerTest,ClassificationServiceImplTest test` and confirm all focused tests pass.

## Task 3: Frontend service and settings dialog

- [ ] Add Vitest cases for item/partner paths, DTO conversion, API errors, root/child create payloads, and update payloads.
- [ ] Run `cd frontend; npm run test -- tests/classification.service.test.ts` and confirm the new cases fail before implementation.
- [ ] Implement typed `fetchClassifications(kind)`, `createClassification(kind, payload)`, and `updateClassification(kind, id, payload)` using `apiGet`, `apiPost`, `apiPut`.
- [ ] Add dialog tests for loading, fetch failure/retry, tree rows, create root/child, edit name/sort/use status, save then reload, read-only controls, and per-kind max depth.
- [ ] Implement `ClassificationSettingsDialog` using MUI Dialog, responsive full-screen layout below 600px, parent-first tree rows, form validation, explicit API error messages, retry, and reload after save. Do not expose physical delete or parent reassignment.
- [ ] Run `cd frontend; npm run test -- tests/classification.service.test.ts tests/classification-settings-dialog.test.tsx`.

## Task 4: Connect page actions and verify responsive behavior

- [ ] Add tests proving each management page displays its correctly named settings action only when tenant-admin write permission exists.
- [ ] Add `Classifications` action and dialog state to `MaterialManagementPage.tsx` and `CustomerManagementPage.tsx`, passing `item` and `partner` respectively and preserving all existing actions.
- [ ] Run the focused service/dialog/page tests, then `cd frontend; npm run build`.
- [ ] If the required browser tooling is available, check the dialog at 375px, 768px and 1280px on port 4173; ensure no viewport-level horizontal overflow and capture screenshots in the result directory. Stop any server started for this check.

## Task 5: Complete documentation and final checks

- [ ] Update `docs/database/db-schema.md` only if no longer accurate; explicitly leave the classification DDL labeled unapplied.
- [ ] Write `docs/result/20261027/item-partner-classification-api-ui/20261027_003_품목_거래처_분류관리_API_UI_결과.md` with scope, endpoint behavior, checks, screenshots if obtained, DB migration status, and DB integration test limitation.
- [ ] Run `cd backend; mvn test`, `cd frontend; npm run test`, `cd frontend; npm run build`, and `git diff --check`.
- [ ] Review the final diff and confirm no unrelated pre-existing working-tree changes were modified or staged.

## Operational boundary

The classification tables are not present in the unapplied `20261027_002` state. Do not execute DDL, use writable MCP access, or claim DB integration validation. API deployment/use requires a separately approved database migration first.
