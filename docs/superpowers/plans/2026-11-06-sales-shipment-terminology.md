# Sales Shipment Terminology and Plan Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename sales delivery terminology to shipment in user-facing screens and policies, and make existing auto-generated plans editable without later order edits overwriting their schedule.

**Architecture:** Preserve established menu codes, URLs, frontend page keys, API contracts, policy codes, and DB identifiers. Allow plan reads and updates in both tenant modes, keep manual plan creation MANUAL-only, add a tenant-scoped order-to-plan read for the AUTO editor, and change AUTO order synchronization to insert only plans for newly added order lines while preserving existing plan detail values. Update existing tenant menu and policy display data through a guarded dated SQL update/rollback pair.

**Tech Stack:** React, TypeScript, Vitest, Java 8-compatible Spring Boot/eGovFrame, MyBatis, PostgreSQL, Maven, Vite, existing browser test setup.

---

## File map

### Work instruction, schema migration, and results

- Create `docs/directions/20261106/20261106_004_출하용어변경_및_계획편집_작업지시서.md` with scope, approved constraints, execution order, and completion conditions.
- Create identical `docs/database/20261106/20261106_004_change_sales_shipment_labels.sql` and `backend/DATABASE/20261106/20261106_004_change_sales_shipment_labels.sql` to update existing menu and built-in policy labels/descriptions.
- Create identical guarded `docs/database/20261106/20261106_004_rollback_sales_shipment_labels.sql` and `backend/DATABASE/20261106/20261106_004_rollback_sales_shipment_labels.sql`.
- Create identical change history `docs/database/20261106/20261106_004_change_sales_shipment_labels.md` and `backend/DATABASE/20261106/20261106_004_change_sales_shipment_labels.md`.
- Create `docs/result/20261106/sales-shipment-terminology/` with the result document and screenshots at 375, 768, and 1280px. Do not execute migration SQL against a database.
- Modify `docs/database/db-schema.md` only if a schema change is introduced; this plan has no table or column changes.
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md` to replace delivery terminology for affected grid examples/instructions without changing stable technical IDs.

### Frontend shipment labels and plan editor

- Modify `frontend/src/pages/dashboard/services/dashboardData.tsx` for dashboard fallback titles/descriptions of `delivery-create`, `delivery-status`, `delivery-plan-create`, and `delivery-plan-status`.
- Modify `frontend/src/pages/sales/delivery/create/SalesDeliveryCreatePage.tsx`, `frontend/src/pages/sales/delivery/create/components/DeliveryDetailGrid.tsx`, `frontend/src/pages/sales/delivery/create/components/SourceOrderPicker.tsx`, `frontend/src/pages/sales/delivery/create/services/salesDelivery.service.ts`, `frontend/src/pages/sales/delivery/status/SalesDeliveryStatusPage.tsx`, `frontend/src/pages/sales/delivery/status/components/DeliveryEditorDialog.tsx`, and `frontend/src/pages/sales/delivery/status/components/DeliveryStatusDetailPanel.tsx` for user-visible labels, helper text, and messages.
- Modify `frontend/src/pages/sales/delivery-plan/create/SalesDeliveryPlanCreatePage.tsx`, `frontend/src/pages/sales/delivery-plan/status/SalesDeliveryPlanStatusPage.tsx`, `frontend/src/pages/sales/delivery-plan/services/salesDeliveryPlan.service.ts`, and `frontend/src/pages/sales/delivery-plan/types/salesDeliveryPlan.types.ts` to support plan loading by order, mode-aware source selection, existing-plan editing in AUTO, and shipment labels. Keep TypeScript property/API names unchanged.
- Modify `frontend/src/pages/settings/system/policies/components/PolicyEditor.tsx` to use shipment wording in built-in policy guidance.
- Modify `frontend/tests/sales-delivery-plan-page.test.tsx`, `frontend/tests/sales-delivery-page.test.tsx`, and any focused tests added for policy display to assert shipment labels and mode-specific plan behavior.

### Backend plan edit access and order synchronization

- Modify `backend/src/main/java/egovframework/let/sales/deliveryplan/controller/SalesDeliveryPlanApiController.java`, `.../service/SalesDeliveryPlanService.java`, `.../service/impl/SalesDeliveryPlanServiceImpl.java`, `.../domain/repository/SalesDeliveryPlanDAO.java`, and `backend/src/main/resources/egovframework/mapper/let/sales/deliveryplan/EgovSalesDeliveryPlan_SQL_postgresql.xml` to permit plan GET/status/PUT in both modes, add tenant-scoped `GET /api/v1/sales/delivery-plans/by-order/{salesOrderId}`, and return source orders filtered for manual unplanned vs. auto planned editing.
- Modify `backend/src/main/java/egovframework/let/sales/order/create/service/impl/SalesOrderServiceImpl.java` so AUTO updates compare requested order quantity with the total existing plan quantity and preserve existing plan details. Continue to create plan rows for new order lines and retain existing header locking, reference checks, and transaction boundaries.
- Modify affected response strings in `backend/src/main/java/egovframework/let/sales/delivery/controller/SalesDeliveryApiController.java`, `.../service/impl/SalesDeliveryServiceImpl.java`, `backend/src/main/java/egovframework/let/sales/deliveryplan/controller/SalesDeliveryPlanApiController.java`, `.../service/impl/SalesDeliveryPlanServiceImpl.java`, and `SalesOrderServiceImpl.java` to say 출하 where the message refers to the business delivery workflow. Keep class, method, mapper, and DB names stable.
- Extend `backend/src/test/java/egovframework/let/sales/deliveryplan/service/impl/SalesDeliveryPlanServiceImplTest.java`, `backend/src/test/java/egovframework/let/sales/order/create/service/impl/SalesOrderServiceImplTest.java`, and add focused controller/mapper tests only where service tests cannot verify the contract.
- Add a static SQL contract test in `backend/src/test/java/egovframework/let/sales/delivery/mapper/SalesDeliveryPlanningSchemaContractTest.java` or a focused adjacent contract test for migration guardrails and byte-identical copies.

## Task 1: Add regression tests for editing auto plans

**Files:**
- Modify: `backend/src/test/java/egovframework/let/sales/deliveryplan/service/impl/SalesDeliveryPlanServiceImplTest.java`
- Modify: `backend/src/test/java/egovframework/let/sales/order/create/service/impl/SalesOrderServiceImplTest.java`

- [x] **Step 1: Add failing service tests for AUTO plan read, update, and source filtering**

Add tests that set the tenant mode to `AUTO`, configure existing plan/header/detail DAO responses, and assert that `get` and `update` work without invoking a manual-mode rejection. Add a source-list test asserting the AUTO mode is passed to the DAO query. Keep existing MANUAL tests asserting that a newly created plan is allowed only in MANUAL.

- [x] **Step 2: Run the targeted tests and verify the expected failures**

Run from `backend`:

```powershell
mvn -Dtest=SalesDeliveryPlanServiceImplTest test
```

Expected: new AUTO read/update cases fail because `requireManualMode` currently blocks them; source filtering assertion fails because the mode is not included in query parameters.

- [x] **Step 3: Add failing order-update tests for edited-plan preservation**

Add one AUTO order-update test where the persisted plan detail has a user-edited date and quantity different from the order defaults, then verify the synchronization path does not update that plan detail. Add another test asserting an order quantity below the sum of its plan details is rejected with HTTP 409 before the order header or details are updated. Add a test that a newly inserted order detail still receives an initial plan detail.

- [x] **Step 4: Run the targeted order tests and verify the expected failures**

Run:

```powershell
mvn -Dtest=SalesOrderServiceImplTest test
```

Expected: the current implementation either calls the auto-plan synchronization that overwrites existing details or fails to enforce the edited-plan total; confirm failure messages correspond to those behaviors.

## Task 2: Implement tenant-safe plan reading and AUTO editing

**Files:**
- Modify: `backend/src/main/java/egovframework/let/sales/deliveryplan/controller/SalesDeliveryPlanApiController.java`
- Modify: `backend/src/main/java/egovframework/let/sales/deliveryplan/service/SalesDeliveryPlanService.java`
- Modify: `backend/src/main/java/egovframework/let/sales/deliveryplan/service/impl/SalesDeliveryPlanServiceImpl.java`
- Modify: `backend/src/main/java/egovframework/let/sales/deliveryplan/domain/repository/SalesDeliveryPlanDAO.java`
- Modify: `backend/src/main/resources/egovframework/mapper/let/sales/deliveryplan/EgovSalesDeliveryPlan_SQL_postgresql.xml`
- Test: `backend/src/test/java/egovframework/let/sales/deliveryplan/service/impl/SalesDeliveryPlanServiceImplTest.java`

- [x] **Step 1: Pass the authenticated tenant's mode to source-order search**

In `listSourceOrders`, read and normalize the tenant mode, then include it as `deliveryPlanMode` in the DAO parameter map. In `selectPlanSourceOrders`, retain `NOT EXISTS` for `MANUAL`; for `AUTO`, require an existing active plan header with `EXISTS`. Do not accept tenant ID or mode from request input.

- [x] **Step 2: Add tenant-scoped lookup of the plan by order**

Add DAO `selectPlanByOrder` use through a new service method `getByOrder(tenantId, userId, salesOrderId)`. Validate principal and positive ID, read the plan header by both authenticated `tenantId` and `salesOrderId`, return 404 if absent, load its details with the same tenant and plan ID, and return the plan. Add `GET /api/v1/sales/delivery-plans/by-order/{salesOrderId}` that uses only `LoginVO` identity for tenant/user. Preserve every existing route and response field.

- [x] **Step 3: Restrict creation but allow reads and updates in both modes**

Keep `create` calling `requireManualMode`. Remove that guard from `get` and `listStatus`. In `update`, preserve all existing principal, plan ownership, order lock, plan lock, editable-order-status, quantity, delivered/reference, and tenant checks but do not require MANUAL mode. Do not relax POST authorization.

- [x] **Step 4: Preserve existing AUTO plan details during order edits**

Change `synchronizeAutomaticPlan` to leave existing plan detail date and planned quantity untouched. Verify each retained existing order detail still has its existing plan detail; insert an automatic plan detail only for a newly added order detail, using current order line date fallback and order quantity. Remove only orphan plan details that satisfy existing delivery-reference protections. Do not alter sequence or plan header.

- [x] **Step 5: Reject order quantity reductions below plan total in AUTO**

In `SalesOrderServiceImpl.updateOrder`, sum existing plan quantity for retained lines in both modes. Reject the order update with the existing HTTP 409 validation style when the new order quantity is less than the plan total. Preserve existing MANUAL checks and delivery-shipped checks. For AUTO, do not call a synchronization path that changes existing planned quantity.

- [x] **Step 6: Run plan and order service tests**

Run:

```powershell
mvn -Dtest=SalesDeliveryPlanServiceImplTest,SalesOrderServiceImplTest test
```

Expected: all new AUTO preservation/authorization cases and prior MANUAL/AUTO behavior tests pass.

## Task 3: Add frontend service and registration-page tests

**Files:**
- Modify: `frontend/tests/sales-delivery-plan-page.test.tsx`
- Modify: `frontend/src/pages/sales/delivery-plan/services/salesDeliveryPlan.service.ts`
- Modify: `frontend/src/pages/sales/delivery-plan/types/salesDeliveryPlan.types.ts`
- Modify: `frontend/src/pages/sales/delivery-plan/create/SalesDeliveryPlanCreatePage.tsx`

- [x] **Step 1: Add failing AUTO registration-page tests**

Add an AUTO fixture with an existing plan. Verify selecting its order loads the existing plan number and detail IDs/edited plan dates/quantities, the primary action is `수정`/shipment equivalent rather than new save, and save calls PUT with the existing plan ID. Verify MANUAL still lists an unplanned order and calls POST for first-time plan creation.

- [x] **Step 2: Run the frontend regression test to verify it fails**

Run from `frontend`:

```powershell
npm run test -- tests/sales-delivery-plan-page.test.tsx
```

Expected: the AUTO test cannot load a plan by order and the UI has only a POST create action.

- [x] **Step 3: Implement typed plan-by-order service and mode-aware source selection**

Add `getDeliveryPlanByOrder(salesOrderId)` using the new endpoint. Reuse existing `DeliveryPlanItem`, `DeliveryPlanRequest`, and page permission types; do not rename API fields or TypeScript identifiers. Read the current mode from the same existing dashboard/menu state used for tenant-specific navigation and pass a typed mode prop to the plan page only if that state is not already available via the page props.

- [x] **Step 4: Load and update existing plan from AUTO registration**

When an AUTO source order is selected, fetch its existing plan, populate `planNo`, existing detail IDs, dates, and planned quantities, then use `updateDeliveryPlan` on save. Keep AUTO unable to create a plan if lookup fails or returns no plan. In MANUAL, continue `createDeliveryPlan` and current validation. Disable duplicate selection while loading/saving and show errors through existing `PageMessageArea`.

- [x] **Step 5: Re-run the registration test**

Run:

```powershell
npm run test -- tests/sales-delivery-plan-page.test.tsx
```

Expected: AUTO saves with PUT and preserves edited detail values; MANUAL creates with POST; all test assertions pass.

## Task 4: Change user-facing shipment terminology

**Files:**
- Modify: `frontend/src/pages/dashboard/services/dashboardData.tsx`
- Modify: `frontend/src/pages/sales/delivery/create/SalesDeliveryCreatePage.tsx`
- Modify: `frontend/src/pages/sales/delivery/create/components/DeliveryDetailGrid.tsx`
- Modify: `frontend/src/pages/sales/delivery/create/components/SourceOrderPicker.tsx`
- Modify: `frontend/src/pages/sales/delivery/create/services/salesDelivery.service.ts`
- Modify: `frontend/src/pages/sales/delivery/status/SalesDeliveryStatusPage.tsx`
- Modify: `frontend/src/pages/sales/delivery/status/components/DeliveryEditorDialog.tsx`
- Modify: `frontend/src/pages/sales/delivery/status/components/DeliveryStatusDetailPanel.tsx`
- Modify: `frontend/src/pages/sales/delivery-plan/create/SalesDeliveryPlanCreatePage.tsx`
- Modify: `frontend/src/pages/sales/delivery-plan/status/SalesDeliveryPlanStatusPage.tsx`
- Modify: `frontend/src/pages/sales/delivery-plan/services/salesDeliveryPlan.service.ts`
- Modify: `frontend/src/pages/settings/system/policies/components/PolicyEditor.tsx`
- Modify: `frontend/tests/sales-delivery-page.test.tsx`
- Modify: `frontend/tests/sales-delivery-plan-page.test.tsx`
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Modify backend user-facing strings in the sales delivery/order/plan controllers and services.

- [x] **Step 1: Add failing assertions for the renamed page and policy labels**

Update focused page tests to expect `출하등록`, `출하현황`, `출하계획등록`, `출하계획현황`, and shipment terminology in status, errors, dialogs, and policy guidance. Keep tests for stable technical route keys and payload names unchanged.

- [x] **Step 2: Run focused frontend tests and confirm label failures**

Run:

```powershell
npm run test -- tests/sales-delivery-page.test.tsx tests/sales-delivery-plan-page.test.tsx
```

Expected: assertions fail only where current user-facing copy still says 납품.

- [x] **Step 3: Update all user-visible Korean delivery copy in the scoped files**

Use the approved glossary consistently: `납품관리` → `출하관리`, `납품등록` → `출하등록`, `납품현황` → `출하현황`, `납품계획` → `출하계획`, and “초과납품” → “초과출하”. Preserve natural wording in sentences and preserve the word 납품 only if it refers to a distinct non-sales concept (none is currently in the scoped delivery pages). Do not rename technical symbols, endpoint names, DB values, or stored codes.

- [x] **Step 4: Update backend response and validation messages**

Change user-facing API success/error strings that refer to the sales shipment workflow in `SalesDeliveryApiController`, `SalesDeliveryServiceImpl`, `SalesDeliveryPlanApiController`, `SalesDeliveryPlanServiceImpl`, and `SalesOrderServiceImpl`. Keep exception status codes and warning-prefix tokens exactly unchanged.

- [x] **Step 5: Run focused frontend tests, lint, and backend string-dependent tests**

Run:

```powershell
npm run test -- tests/sales-delivery-page.test.tsx tests/sales-delivery-plan-page.test.tsx
npx oxlint src/pages/dashboard/services/dashboardData.tsx src/pages/sales/delivery src/pages/sales/delivery-plan src/pages/settings/system/policies/components/PolicyEditor.tsx
```

Run the backend plan/order/delivery service and controller test selectors from `backend`:

```powershell
mvn -Dtest=SalesDeliveryPlanServiceImplTest,SalesOrderServiceImplTest,SalesDeliveryServiceImplTest,SalesDeliveryMapperTest test
```

Expected: focused tests pass and lint reports no new errors; existing unrelated lint warnings are recorded rather than broadened into cleanup.

## Task 5: Create guarded menu and policy label migration

**Files:**
- Create identical dated SQL, rollback, and change-history files under `docs/database/20261106/` and `backend/DATABASE/20261106/`.
- Test: add a static contract test alongside `SalesDeliveryPlanningSchemaContractTest`.

- [x] **Step 1: Write a failing SQL contract test**

Assert that migration SQL updates only the six named sales menu codes and the built-in policy codes `DELIVERY_PLAN_MODE` and `OVER_DELIVERY_POLICY`, only their display name/description columns, and never modifies permission tables, policy `value_json`, version, menu URLs, or identifiers. Assert rollback has the corresponding before-state guard and mirrors have identical bytes.

- [x] **Step 2: Run the SQL contract test and verify it fails**

Run:

```powershell
mvn -Dtest=SalesDeliveryPlanningSchemaContractTest test
```

Expected: the new test fails because the dated migration does not exist yet.

- [x] **Step 3: Write idempotent and guarded forward migration**

Use one transaction. Validate that the intended menu/policy codes have no conflicting duplicate state; update existing tenant menu rows by stable `menu_code`, and built-in policies by `policy_code` plus `system_policy_at='Y'`. Change only `menu_nm`, `menu_dc`, `policy_nm`, and `policy_dc`. Do not insert, delete, change values/options/version, or touch permission grants.

- [x] **Step 4: Write guarded rollback and history**

Rollback changes the exact new labels/descriptions back only when the current values match the migration's written values; otherwise it raises an exception instead of overwriting later administrator edits. Record date, target tenant-database model, affected rows, unchanged identifiers/permissions/policy values, and rollback behavior in the migration history.

- [x] **Step 5: Mirror and verify scripts**

Copy the exact SQL/history files to `backend/DATABASE/20261106/`, then run:

```powershell
mvn -Dtest=SalesDeliveryPlanningSchemaContractTest test
git diff --check
```

Expected: contract and byte-identity assertions pass. Do not execute these scripts on the live or tenant database.

## Task 6: Verify end-to-end UI and write result documents

**Files:**
- Create: `docs/result/20261106/sales-shipment-terminology/20261106_004_출하용어변경_및_계획편집_결과서.md`
- Create: `docs/result/20261106/sales-shipment-terminology/screenshots/`
- Modify: the dated task plan and checklist.

- [x] **Step 1: Run focused backend tests**

From `backend`, run:

```powershell
mvn -Dtest=SalesDeliveryPlanServiceImplTest,SalesOrderServiceImplTest,SalesDeliveryServiceImplTest,SalesDeliveryMapperTest,SalesDeliveryPlanningSchemaContractTest test
```

Expected: exit code 0. If a changed-area failure occurs, fix it before proceeding.

- [x] **Step 2: Run frontend focused tests, build, and changed-file lint**

From `frontend`, run:

```powershell
npm run test -- tests/sales-delivery-page.test.tsx tests/sales-delivery-plan-page.test.tsx
npm run build
npx oxlint src/pages/dashboard/services/dashboardData.tsx src/pages/sales/delivery src/pages/sales/delivery-plan src/pages/settings/system/policies/components/PolicyEditor.tsx
```

Expected: tests and build pass. Record pre-existing warnings without fixing unrelated code.

- [x] **Step 3: Inspect browser responsiveness and capture screenshots**

Use the existing S-ERP test server at `http://127.0.0.1:4173`; verify it is the S-ERP app before reuse and do not stop a server that was already running. With synthetic fixtures, confirm the renamed delivery/plan titles and successful AUTO existing-plan load/edit. Inspect at 375, 768, and 1280 pixels; save registration and status screenshots under the result `screenshots/` directory. Do not include real tenant/user data.

- [x] **Step 4: Write the dated task instruction and result**

Create the direction document based on the approved spec. In the result document include the implementation behavior, stable identifiers retained, SQL files and explicit “not applied” status, test/build/lint evidence, browser viewport outcomes, and relative screenshot/spec/direction/plan links.

- [x] **Step 5: Perform final consistency checks**

Run:

```powershell
git diff --check
git status --short
Get-FileHash docs\database\20261106\20261106_004_change_sales_shipment_labels.sql,backend\DATABASE\20261106\20261106_004_change_sales_shipment_labels.sql
```

Expected: no whitespace errors, only in-scope changes plus pre-existing untracked logs, and matching SHA-256 values for mirrored SQL. Ensure no migration was applied and no temporary browser harness remains in the repository.

## Execution location

The user explicitly selected the current `socra710` branch for implementation. Continue in that branch; do not create or switch to an isolated worktree for this task.

## Required implementation details discovered during plan review

- `SystemMenuServiceImpl.getMyMenuTree` currently removes `/sales/delivery-plan*` menu rows for AUTO tenants. Remove only this mode-based filter and update `SystemMenuPermissionServiceTest.autoTenantReceivesModeButNotManualDeliveryPlanMenus` to assert that authorized plan leaves remain visible. Keep menu permission filtering and system-policy role restrictions unchanged.
- Pass the fetched `deliveryPlanMode` from `DashboardPage` through `DashboardContent` to `SalesDeliveryPlanCreatePage`; the frontend page props currently do not include the mode.
- Add `SalesDeliveryPlanVO getByOrder(Long tenantId, String userId, Long salesOrderId) throws Exception;` and authenticated `GET /api/v1/sales/delivery-plans/by-order/{salesOrderId}`. Both lookup predicates must include the authenticated tenant. Do not accept tenant/mode from request parameters.
- In the AUTO source-order query, require an existing plan header; in MANUAL, retain the current `NOT EXISTS` behavior. `listSourceOrders` must pass normalized tenant mode to the mapper.
- Keep plan `POST` creation MANUAL-only, but allow plan `GET`, status list, and `PUT` in either mode. The AUTO registration page loads the selected order's existing plan identity/details and calls `updateDeliveryPlan`, never POST.
- AUTO order updates preserve every existing plan detail date and planned quantity. They insert a plan detail only for a newly added order line. Before mutating the order, reject requested quantity less than its existing plan total with HTTP 409. Existing line/plan IDs, delivered quantities, header-before-plan locking, and reference checks remain.
- In the new migration SQL, update only `tb_menu.menu_nm/menu_dc` for the six stable `SALES_DELIVERY*` menu codes and `tb_system_policy.policy_nm/policy_dc` for the two built-in policy codes with `system_policy_at='Y'`. Do not change menu IDs/URLs/permissions, policy code/type/options/value/version, or custom policies. Rollback must guard on the exact new labels/descriptions so subsequent administrator edits are not overwritten.
- Relevant tests to extend include `backend/src/test/java/egovframework/let/system/menus/service/SystemMenuPermissionServiceTest.java`, `backend/src/test/java/egovframework/let/sales/deliveryplan/service/impl/SalesDeliveryPlanServiceImplTest.java`, `backend/src/test/java/egovframework/let/sales/order/create/service/impl/SalesOrderServiceImplTest.java`, `frontend/tests/sales-delivery-plan-page.test.tsx`, and `frontend/tests/sales-delivery-page.test.tsx`. Keep Java production changes Java 8 compatible.
