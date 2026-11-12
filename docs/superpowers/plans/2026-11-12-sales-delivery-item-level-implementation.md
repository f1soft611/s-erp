# Sales Delivery Item-Level Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Use checkbox (`- [ ]`) steps and verify each task before committing.

**Goal:** Make manual planning, delivery registration, and plan status operate on individual order/plan detail items with accurate remaining quantities.

**Architecture:** A plan header becomes a document that can contain detail rows from multiple sales orders; each plan detail retains its source order and order-detail IDs. Each order-delivery detail continues to retain its plan-detail ID, allowing a delivery to select individual rows from multiple plans and update quantity balances transactionally. AUTO remains one order per generated plan; transaction statements and direct-delivery behavior are unchanged.

**Tech Stack:** Java 8, Spring/MyBatis, PostgreSQL, React, TypeScript, MUI/F1Grid, Vitest, Playwright.

---

## Approved references and execution constraints

- Approved design: `docs/superpowers/specs/2026-11-12-sales-delivery-item-level-design.md`.
- Work order: `docs/directions/20261112/20261112_009_출하계획_품목기준_연계_작업지시서.md`.
- Existing planning contract to supersede only where it assumes one plan header per order: `docs/spec/20261105/20261105_002_납품계획_연계_납품흐름_개편_상세사양서.md`.
- Existing header-oriented multi-order delivery behavior to replace at the picker boundary: `docs/spec/20261112/20261112_008_출하등록_다중수주_상세사양서.md`.
- The current source worktree contains unrelated modified and untracked work. Before implementation, invoke `using-git-worktrees` and create an isolated worktree from the current committed branch. Do not stage, copy, or revert those unrelated changes.
- Before any DB/API implementation, call the read-only `s-erp-postgresql-readonly` MCP in order: `list_tables`, then `describe_table` for `tb_tenant`, `tb_customer_info`, `tb_material_info`, `tb_sales_order_hd`, `tb_sales_order_dt`, `tb_sales_delivery_plan_hd`, `tb_sales_delivery_plan_dt`, `tb_sales_delivery_hd`, and `tb_sales_delivery_dt`. Query no business rows. Do not apply DDL through MCP.
- Follow the project sequence: this implementation plan → dated detailed spec → implementation. Keep production Java 8 compatible.

## File map

| Area | Files and responsibility |
|---|---|
| Project spec and plan | Create `docs/spec/20261112/20261112_009_출하계획_품목기준_연계_상세사양서.md` before code; keep `docs/plan/20261112/20261112_009_출하계획_품목기준_연계_계획서.md` as the dated project plan linking to this checklist. |
| Plan request and response models | Modify `backend/src/main/java/egovframework/let/sales/deliveryplan/domain/model/SalesDeliveryPlanRequestVO.java`, `SalesDeliveryPlanDetailRequestVO.java`, `SalesDeliveryPlanVO.java`, and `SalesDeliveryPlanDetailVO.java`; add `SalesDeliveryPlanSourceVO.java` and `SalesDeliveryPlanStatusVO.java` for line-level source and status contracts. |
| Plan persistence and rules | Modify `backend/src/main/java/egovframework/let/sales/deliveryplan/service/impl/SalesDeliveryPlanServiceImpl.java`, `domain/repository/SalesDeliveryPlanDAO.java`, and `backend/src/main/resources/egovframework/mapper/let/sales/deliveryplan/EgovSalesDeliveryPlan_SQL_postgresql.xml`. Update AUTO request construction in `backend/src/main/java/egovframework/let/sales/order/create/service/impl/SalesOrderServiceImpl.java`. |
| Delivery source validation | Modify `backend/src/main/java/egovframework/let/sales/delivery/service/impl/SalesDeliveryServiceImpl.java` only if line-level source validation needs adjustment, plus `backend/src/main/resources/egovframework/mapper/let/sales/delivery/EgovSalesDelivery_SQL_postgresql.xml` and `backend/src/main/java/egovframework/let/sales/delivery/domain/model/SalesDeliverySourceOrderVO.java` as required by the plan-header relation removal. |
| Plan frontend | Modify `frontend/src/pages/sales/delivery-plan/types/salesDeliveryPlan.types.ts`, `services/salesDeliveryPlan.service.ts`, `create/SalesDeliveryPlanCreatePage.tsx`, `components/DeliveryPlanForm.tsx`, and `status/SalesDeliveryPlanStatusPage.tsx`. Keep the current form and status detail-panel patterns. |
| Delivery frontend | Modify `frontend/src/pages/sales/delivery/create/components/SourceOrderPicker.tsx`, `services/salesDelivery.service.ts`, and `types/salesDelivery.types.ts`. |
| Tests | Extend `backend/src/test/java/egovframework/let/sales/deliveryplan/service/impl/SalesDeliveryPlanServiceImplTest.java`, `deliveryplan/mapper/SalesDeliveryPlanMapperTest.java`, `backend/src/test/java/egovframework/let/sales/order/create/service/impl/SalesOrderServiceImplTest.java`, `backend/src/test/java/egovframework/let/sales/delivery/service/impl/SalesDeliveryServiceImplTest.java`, `delivery/mapper/SalesDeliveryMapperTest.java`, and `delivery/mapper/SalesDeliveryPlanningSchemaContractTest.java`. Extend `frontend/tests/sales-delivery-plan-page.test.tsx`, `sales-delivery-plan-api.test.ts`, `sales-delivery-page.test.tsx`, and `sales-delivery-api.test.ts`. |
| Schema and results | Add paired migration files under `docs/database/20261112` and `backend/DATABASE/20261112`; update `docs/database/db-schema.md`. Add browser validation in `frontend/tests/sales-delivery-item-flow.browser.mjs` and synthetic fixture support in `frontend/tests/fixtures/sales-delivery.browser-fixtures.mjs`. Write results/screenshots under `docs/result/20261112/sales-delivery-item-flow/`. |

## Task 1: Write the dated detailed specification

**Files:**
- Create: `docs/spec/20261112/20261112_009_출하계획_품목기준_연계_상세사양서.md`
- Modify: `docs/plan/20261112/20261112_009_출하계획_품목기준_연계_계획서.md`

- [ ] **Step 1: Record the approved API and user-flow contracts.** Specify that MANUAL plan requests carry `salesOrderId` on each detail, AUTO remains one order per plan, delivery requests continue to carry `salesDeliveryPlanDetailId` per detail, the plan status endpoint returns one item row per plan detail, and statements are excluded.
- [ ] **Step 2: Record quantity formulas and WARN boundary.** Use `orderQty - SUM(active plannedQty)` for plan availability and `plannedQty - deliveredQty` for delivery availability. Only positive delivery-balance rows appear in the source picker, including WARN tenants; WARN may still require confirmation when a selected row's requested quantity exceeds its current positive balance.
- [ ] **Step 3: Record UI, validation, migration, and test acceptance criteria.** Specify exact-row selection (never all sibling rows), one-customer-per-delivery validation, same-row plan splitting, atomic quantity-counter updates, and preservation of DIRECT/AUTO behavior.
- [ ] **Step 4: Self-review and commit the project spec.** Check that every approved design requirement has an API/UI/data rule and that the spec does not include transaction statements.

```powershell
git diff --check
git add -- docs/spec/20261112/20261112_009_출하계획_품목기준_연계_상세사양서.md docs/plan/20261112/20261112_009_출하계획_품목기준_연계_계획서.md
git commit -m "docs: 품목 기준 출하 흐름 상세사양" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit contains only the dated spec and project-plan link; `git diff --check` reports no whitespace errors.

## Task 2: Add the plan-header migration and schema contract tests

**Files:**
- Modify: `backend/src/test/java/egovframework/let/sales/delivery/mapper/SalesDeliveryPlanningSchemaContractTest.java`
- Create in both DB trees: `20261112_009_allow_multi_order_sales_delivery_plan.sql`, `20261112_009_rollback_multi_order_sales_delivery_plan.sql`, and `20261112_009_change_multi_order_sales_delivery_plan_schema.md`
- Modify: `docs/database/db-schema.md`

- [ ] **Step 1: Add a failing schema contract test.** Assert that forward, rollback, and history files exist in both trees and are byte-identical; assert that forward SQL removes the header's singular order constraints/column, establishes a `(sales_delivery_plan_id, tenant_id)` header reference, and replaces the detail FK; assert rollback checks for multi-order plans before restoring a singular order relationship.
- [ ] **Step 2: Run the focused contract test and verify the missing migration failure.**

```powershell
Set-Location backend
mvn -q "-Dtest=SalesDeliveryPlanningSchemaContractTest" test
```

Expected before migration creation: FAIL because the 20261112_009 paired migration files do not exist.

- [ ] **Step 3: Write the forward migration.** In one transaction, lock the affected plan tables, add a unique `(sales_delivery_plan_id, tenant_id)` key, drop `fk_sales_delivery_plan_dt_hd`, the header-order unique/reference constraints, the header-order FK and index, then drop `tb_sales_delivery_plan_hd.sales_order_id`. Recreate the plan-detail header FK using only plan ID and tenant ID. Keep the existing detail-to-order-detail FK and delivery-to-plan-detail FK unchanged.
- [ ] **Step 4: Write a guarded rollback and history.** Before restoring the old header column/FKs, abort if any active or inactive plan has more than one distinct source order among its details. For single-order plans, derive the header order ID from plan details, then restore the prior unique/FK/index contract. Record date, constraints, affected tables, apply order, and rollback guard.
- [ ] **Step 5: Update the cumulative schema and mirror files.** Update the plan header/detail descriptions in `docs/database/db-schema.md`; copy the three migration/history files byte-for-byte into `backend/DATABASE/20261112`.
- [ ] **Step 6: Run the focused contract test and commit.**

```powershell
Set-Location backend
mvn -q "-Dtest=SalesDeliveryPlanningSchemaContractTest" test
```

Expected: PASS, including byte equality for all three paired files. Commit only migration, history, cumulative schema, and contract test changes with message `feat: 다중수주 출하계획 스키마 지원`.

## Task 3: Change plan persistence to use source detail ownership

**Files:**
- Modify: `backend/src/main/java/egovframework/let/sales/deliveryplan/domain/model/SalesDeliveryPlanRequestVO.java`
- Modify: `backend/src/main/java/egovframework/let/sales/deliveryplan/domain/model/SalesDeliveryPlanDetailRequestVO.java`
- Modify: `backend/src/main/java/egovframework/let/sales/deliveryplan/domain/model/SalesDeliveryPlanVO.java`
- Modify: `backend/src/main/java/egovframework/let/sales/deliveryplan/domain/model/SalesDeliveryPlanDetailVO.java`
- Create: `backend/src/main/java/egovframework/let/sales/deliveryplan/domain/model/SalesDeliveryPlanSourceVO.java`
- Modify: `backend/src/main/java/egovframework/let/sales/deliveryplan/domain/repository/SalesDeliveryPlanDAO.java`
- Modify: `backend/src/main/java/egovframework/let/sales/deliveryplan/service/impl/SalesDeliveryPlanServiceImpl.java`
- Modify: `backend/src/main/resources/egovframework/mapper/let/sales/deliveryplan/EgovSalesDeliveryPlan_SQL_postgresql.xml`
- Modify: `backend/src/main/java/egovframework/let/sales/order/create/service/impl/SalesOrderServiceImpl.java`
- Tests: plan service and order service tests listed in the file map.

- [ ] **Step 1: Add failing service tests.** Cover one MANUAL plan with detail rows from two orders, lock order IDs in ascending order before writing, an invalid order/detail pair, aggregate plan quantity exceeding one order-detail balance across existing plans, and AUTO synchronization producing a plan whose detail rows all belong to its one order. Update test request factories to set source order ID per detail.
- [ ] **Step 2: Run the focused service tests and verify failure.**

```powershell
Set-Location backend
mvn -q "-Dtest=SalesDeliveryPlanServiceImplTest,SalesOrderServiceImplTest" test
```

Expected before implementation: FAIL because source ownership is still read from `SalesDeliveryPlanRequestVO.salesOrderId`.

- [ ] **Step 3: Move order ownership to each plan detail.** The request shape becomes:

```java
public class SalesDeliveryPlanRequestVO implements Serializable {
    private List<SalesDeliveryPlanDetailRequestVO> details;
}

public class SalesDeliveryPlanDetailRequestVO implements Serializable {
    private Long salesDeliveryPlanDetailId;
    private Long salesOrderId;
    private Long salesOrderDetailId;
    private LocalDate planDt;
    private BigDecimal plannedQty;
}
```

Remove singular order/customer fields from the plan-header response where they cannot describe a multi-order plan; expose order/date/customer data on each detail response instead. Add a dedicated source-row VO with order, customer, material, plan date, ordered quantity, existing planned quantity, and remaining plan quantity.
- [ ] **Step 4: Update AUTO plan creation and persistence.** In `SalesOrderServiceImpl`, set `salesOrderId` on every generated detail request. In `SalesDeliveryPlanServiceImpl`, collect distinct order IDs from request details, lock all source order headers in ascending ID order, verify tenant/status, load source detail rows by `(salesOrderId, salesOrderDetailId)`, and insert one header followed by detail rows preserving each source order ID.
- [ ] **Step 5: Enforce item-level capacity during create/update.** Calculate other active plan totals by composite source key `(salesOrderId, salesOrderDetailId)`. On update, exclude the current plan's old quantities from the other-plan total and include the proposed current rows. Reject stale, foreign, or duplicate source identities and any total beyond the order quantity. Existing delivered amounts and referenced plan details remain protected.
- [ ] **Step 6: Update mapper/DAO and AUTO lookup.** Remove header-order insert/join predicates; link plan details to headers by plan ID and tenant. Change `selectPlanByOrder` to find the AUTO plan through its detail source order. Make manual source search return only order-detail rows with positive remaining plan quantity, aggregating all active plan details for each order detail.
- [ ] **Step 7: Run focused plan/order tests and commit.**

```powershell
Set-Location backend
mvn -q "-Dtest=SalesDeliveryPlanServiceImplTest,SalesDeliveryPlanMapperTest,SalesOrderServiceImplTest" test
```

Expected: PASS for multi-order persistence, per-item availability, AUTO one-order synchronization, and existing split behavior. Commit with message `feat: 다중수주 출하계획 저장 지원`.

## Task 4: Return plan status at detail-row granularity

**Files:**
- Create: `backend/src/main/java/egovframework/let/sales/deliveryplan/domain/model/SalesDeliveryPlanStatusVO.java`
- Modify: `backend/src/main/java/egovframework/let/sales/deliveryplan/domain/repository/SalesDeliveryPlanDAO.java`
- Modify: `backend/src/main/java/egovframework/let/sales/deliveryplan/service/SalesDeliveryPlanService.java`
- Modify: `backend/src/main/java/egovframework/let/sales/deliveryplan/service/impl/SalesDeliveryPlanServiceImpl.java`
- Modify: `backend/src/main/resources/egovframework/mapper/let/sales/deliveryplan/EgovSalesDeliveryPlan_SQL_postgresql.xml`
- Test: `backend/src/test/java/egovframework/let/sales/deliveryplan/mapper/SalesDeliveryPlanMapperTest.java` and `SalesDeliveryPlanServiceImplTest.java`

- [ ] **Step 1: Add a failing mapper test for multiple item rows under one plan.** Assert the status query selects plan-detail identity, per-detail order/customer/material fields and quantities, filters on the detail plan date, and has no grouping that collapses sibling detail rows.
- [ ] **Step 2: Return a dedicated status DTO.** Define `SalesDeliveryPlanStatusVO` with plan ID/number, plan-detail ID, source order ID/number/date, customer ID/code/name, item identity, plan date, ordered/planned/delivered quantities, and remaining quantity.
- [ ] **Step 3: Rewrite `selectPlanStatus` as a detail query.** Join each plan detail to its plan header, source order/detail, customer, and material; apply tenant, active-header, date, and keyword filters; sort by order date, plan ID, then detail line.
- [ ] **Step 4: Update DAO/service signatures and run the focused mapper/service tests.**

```powershell
Set-Location backend
mvn -q "-Dtest=SalesDeliveryPlanMapperTest,SalesDeliveryPlanServiceImplTest" test
```

Expected: PASS with one returned DTO per plan detail and all source order/customer values originating from that detail's order.

## Task 5: Implement item-row planning selection and per-item plan display

**Files:**
- Modify: `frontend/src/pages/sales/delivery-plan/types/salesDeliveryPlan.types.ts`
- Modify: `frontend/src/pages/sales/delivery-plan/services/salesDeliveryPlan.service.ts`
- Modify: `frontend/src/pages/sales/delivery-plan/create/SalesDeliveryPlanCreatePage.tsx`
- Modify: `frontend/src/pages/sales/delivery-plan/components/DeliveryPlanForm.tsx`
- Modify: `frontend/tests/sales-delivery-plan-page.test.tsx`
- Modify: `frontend/tests/sales-delivery-plan-api.test.ts`

- [ ] **Step 1: Add failing tests for MANUAL detail selection.** Select two order-detail rows from different orders and assert the save request contains only those rows, each with its own order/detail ID. Add an unselected sibling row and assert it is not included. Verify same-order split rows remain grouped by the composite `(salesOrderId, salesOrderDetailId)`.
- [ ] **Step 2: Add failing validation tests.** Reject a detail not in the selected source set and reject the sum of split plan rows above that source's available plan quantity. Verify a selected row carries its remaining quantity rather than treating full order quantity as newly available.
- [ ] **Step 3: Update TypeScript contracts and request builders.** Remove header-level `salesOrderId` from `DeliveryPlanRequest`; add `salesOrderId` to each `DeliveryPlanDetailRequest`. Add `remainingPlanQty` to source rows and source order/customer metadata to plan detail responses.
- [ ] **Step 4: Implement the MANUAL picker.** Add row checkboxes and a Select footer action to the plan-source dialog. Its callback filters the source rows by selected `salesOrderDetailId` plus `salesOrderId`; it never expands a selected row to every detail in that order. In AUTO mode retain single-order lookup of the existing generated plan through the order-number action; AUTO cannot create a multi-order plan.
- [ ] **Step 5: Update form mapping and validation.** Preserve source IDs on `PlanRow`, aggregate split totals by composite order/detail key, initialize selected quantities from `remainingPlanQty`, and display the selected order/customer identifiers in row-level details. Preserve date/quantity cell editing and split-row behavior.
- [ ] **Step 6: Run plan frontend tests and build.**

```powershell
Set-Location frontend
npm run test -- tests/sales-delivery-plan-page.test.tsx tests/sales-delivery-plan-api.test.ts
npm run build
```

Expected: PASS; the create request includes multiple source order IDs without adding unselected order rows.

## Task 6: Change plan status to one row per plan detail

**Files:**
- Modify: `frontend/src/pages/sales/delivery-plan/types/salesDeliveryPlan.types.ts`
- Modify: `frontend/src/pages/sales/delivery-plan/status/SalesDeliveryPlanStatusPage.tsx`
- Modify: `frontend/src/pages/sales/delivery-plan/services/salesDeliveryPlan.service.ts`
- Modify: `frontend/tests/sales-delivery-plan-page.test.tsx`

- [ ] **Step 1: Add a failing UI test with two status rows from one plan.** Provide two different plan-detail IDs and source orders; assert both item rows render, repeated plan number cells merge, and clicking either plan number opens the containing plan.
- [ ] **Step 2: Update the status response type and row key.** Make `DeliveryPlanStatusRow` line-level and use `salesDeliveryPlanDetailId` as the F1Grid key.
- [ ] **Step 3: Render item and quantity columns.** Show plan number, order number, customer, plan date, item code/name, ordered quantity, planned quantity, delivered quantity, and remaining delivery quantity. Apply `mergeRows` only to repeated plan-header values, matching `SalesDeliveryStatusPage`.
- [ ] **Step 4: Preserve detail/edit behavior.** Resolve the selected plan by `salesDeliveryPlanId`; keep the existing detail panel, permissions, native F1Grid editing, date filters, and update request behavior.
- [ ] **Step 5: Run the plan page/API tests.**

```powershell
Set-Location frontend
npm run test -- tests/sales-delivery-plan-page.test.tsx tests/sales-delivery-plan-api.test.ts
```

Expected: PASS with the main list count equal to the returned plan-detail row count, not the plan-header count.

## Task 7: Make backend delivery sources independent of plan headers

**Files:**
- Modify: `backend/src/main/resources/egovframework/mapper/let/sales/delivery/EgovSalesDelivery_SQL_postgresql.xml`
- Modify: `backend/src/main/java/egovframework/let/sales/delivery/domain/model/SalesDeliverySourceOrderVO.java` only for fields required by line-level source response
- Modify: `backend/src/main/java/egovframework/let/sales/delivery/service/impl/SalesDeliveryServiceImpl.java` only if the existing source identity checks still assume the plan header owns the order
- Modify: `backend/src/test/java/egovframework/let/sales/delivery/service/impl/SalesDeliveryServiceImplTest.java`
- Modify: `backend/src/test/java/egovframework/let/sales/delivery/mapper/SalesDeliveryMapperTest.java`

- [ ] **Step 1: Add failing mapper/source tests.** Cover two plan details from different plan headers and source orders in one result, exclusion of a detail with zero delivery balance, and the plan detail's own order/customer/material identity.
- [ ] **Step 2: Remove the header-order join.** Join `tb_sales_delivery_plan_hd` to `tb_sales_delivery_plan_dt` using plan ID and tenant only. Derive order, customer, and item from each plan detail's source order and source order detail.
- [ ] **Step 3: Filter only positive line balances.** The source query must require `pd.planned_qty > pd.delivered_qty` regardless of policy so fully delivered rows are not selectable. Retain the existing explicit WARN confirmation path when a currently eligible row is submitted above its available amount.
- [ ] **Step 4: Preserve transactional checks.** Keep order-header locks sorted by source order ID, plan-detail row locks, same-customer validation, and atomic adjustments to `tb_sales_delivery_plan_dt.delivered_qty` and `tb_sales_order_dt.shipped_qty` on create/update/delete.
- [ ] **Step 5: Run backend delivery and mapper tests.**

```powershell
Set-Location backend
mvn -q "-Dtest=SalesDeliveryServiceImplTest,SalesDeliveryMapperTest,SalesDeliveryApiControllerTest" test
```

Expected: PASS for cross-plan rows, partial delivery, positive-balance filtering, source ownership, same-customer rejection, WARN confirmation, and counter restoration.

## Task 8: Select exact plan-detail rows in the delivery picker

**Files:**
- Modify: `frontend/src/pages/sales/delivery/create/components/SourceOrderPicker.tsx`
- Modify: `frontend/src/pages/sales/delivery/create/services/salesDelivery.service.ts`
- Modify: `frontend/src/pages/sales/delivery/create/types/salesDelivery.types.ts`
- Modify: `frontend/tests/sales-delivery-page.test.tsx`
- Modify: `frontend/tests/sales-delivery-api.test.ts`

- [ ] **Step 1: Add failing tests for exact-row behavior.** Provide two eligible plan details for one order and one detail from another plan. Select only one first-order detail and assert only that row reaches the delivery form; then select rows from two plans for one customer and assert both selected rows are retained.
- [ ] **Step 2: Add tests for source guards.** Verify zero-balance rows are not shown/selectable, different-customer rows keep the picker open with an error, and direct delivery remains unchanged.
- [ ] **Step 3: Replace selected-order expansion with detail-ID filtering.** Track selected `salesDeliveryPlanDetailId` values and pass `rows.filter(row => selectedPlanDetailIds.has(row.salesDeliveryPlanDetailId))` to `onSelect`. Keep source IDs read-only in the delivery detail grid.
- [ ] **Step 4: Keep WARN flow for selectable rows.** Do not clamp a user's edited quantity to the displayed balance. Let the existing server warning and confirmation retry apply to a selected row that still had positive balance when source search ran.
- [ ] **Step 5: Run delivery frontend tests and build.**

```powershell
Set-Location frontend
npm run test -- tests/sales-delivery-page.test.tsx tests/sales-delivery-api.test.ts
npm run build
```

Expected: PASS; only explicitly checked plan-detail IDs are placed in the delivery payload.

## Task 9: Browser validation, result record, and final verification

**Files:**
- Create: `frontend/tests/sales-delivery-item-flow.browser.mjs`
- Modify: `frontend/tests/fixtures/sales-delivery.browser-fixtures.mjs`
- Create: `docs/result/20261112/sales-delivery-item-flow/20261112_009_출하계획_품목기준_연계_작업결과.md`
- Create screenshots under: `docs/result/20261112/sales-delivery-item-flow/screenshots/`
- Modify only the corresponding approved sections of `docs/database/db-schema.md` and the dated project spec if implementation reveals a tested contract correction.

- [ ] **Step 1: Add synthetic browser fixtures.** Extend the existing sales delivery fixture with plan-source rows, a plan containing multiple order details, item-level plan-status rows, and delivery-source rows from multiple plans. Keep all data synthetic and intercepted; do not call production APIs or DB.
- [ ] **Step 2: Add Playwright assertions.** Verify that a plan picker can choose two order-detail rows without selecting a sibling, plan status displays two detail rows for one plan, and a delivery picker selecting one row does not include unselected rows from its plan.
- [ ] **Step 3: Capture responsive screenshots.** In a separate terminal, start the app with `Set-Location frontend; npm run dev -- --host 127.0.0.1 --port 4173`. Check 375px, 768px, and 1280px; assert no page-level horizontal overflow and capture screenshots in the result `screenshots` directory. Stop the server with Ctrl+C after browser validation.
- [ ] **Step 4: Run final focused and broad checks.**

```powershell
Set-Location backend
mvn -q "-Dtest=SalesDeliveryPlanServiceImplTest,SalesDeliveryPlanMapperTest,SalesDeliveryPlanningSchemaContractTest,SalesDeliveryServiceImplTest,SalesDeliveryMapperTest,SalesDeliveryApiControllerTest,SalesOrderServiceImplTest" test
mvn -q test
Set-Location ..\frontend
npm run test -- tests/sales-delivery-plan-page.test.tsx tests/sales-delivery-plan-api.test.ts tests/sales-delivery-page.test.tsx tests/sales-delivery-api.test.ts
npm run build
npm run lint -- src/pages/sales/delivery-plan/create/SalesDeliveryPlanCreatePage.tsx src/pages/sales/delivery-plan/components/DeliveryPlanForm.tsx src/pages/sales/delivery-plan/status/SalesDeliveryPlanStatusPage.tsx src/pages/sales/delivery/create/components/SourceOrderPicker.tsx src/pages/sales/delivery-plan/types/salesDeliveryPlan.types.ts src/pages/sales/delivery/create/types/salesDelivery.types.ts
node tests/sales-delivery-item-flow.browser.mjs
```

Expected: all selected tests, Maven suite, build, changed-file lint, and browser assertions pass. Run `git diff --check`; confirm paired schema files are byte-identical; inspect `git status --short` and leave unrelated files untouched.
- [ ] **Step 5: Verify Java 8 source compatibility.** From `backend`, compile the changed production areas with the JDK's Java 8 API surface after Maven has compiled the project classes:

```powershell
Set-Location backend
mvn -q -DskipTests compile
mvn -q dependency:build-classpath "-Dmdep.outputFile=target/java8-classpath.txt"
$classpath = "target/classes;" + (Get-Content target/java8-classpath.txt -Raw).Trim()
$sources = Get-ChildItem src/main/java/egovframework/let/sales/deliveryplan, src/main/java/egovframework/let/sales/delivery, src/main/java/egovframework/let/sales/order/create -Recurse -Filter *.java | ForEach-Object FullName
New-Item -ItemType Directory -Force target/java8-compat | Out-Null
& javac --release 8 -cp $classpath -processorpath $classpath -processor 'lombok.launch.AnnotationProcessorHider$AnnotationProcessor' -d target/java8-compat $sources
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

Expected: `javac --release 8` exits 0. **Step 6: Record test evidence and commits.** In the result document, record changed behavior, migration/rollback references, MCP metadata evidence (not business rows), exact test results, Java 8 API verification method, screenshots, and commit subjects. Commit results separately as `docs: 출하 품목기준 흐름 작업 결과`.

## Coverage checklist

- MANUAL multi-order single-plan creation from explicitly selected order-detail rows: Tasks 3 and 5.
- AUTO remains one order per plan: Tasks 3 and 5.
- Multi-plan delivery from explicitly selected plan-detail rows: Tasks 7 and 8.
- Positive remaining-quantity rules and counter updates: Tasks 3 and 7.
- Per-item plan status grid: Tasks 4 and 6.
- Existing split plans, partial delivery, DIRECT, WARN confirmation, permissions, and tenant boundaries: Tasks 3, 5, 7, and 8.
- Schema migration/rollback and cumulative schema: Task 2.
- Transaction statements excluded: Tasks 1 and 9.
- Responsive browser evidence and result document: Task 9.
