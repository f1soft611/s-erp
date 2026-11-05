# Sales Delivery Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tenant-specific manual/automatic delivery planning, plan-backed order deliveries, migration SQL, and matching sales screens.

**Architecture:** Add one delivery-plan header per order and split-capable plan detail rows. MANUAL tenants explicitly save plans; AUTO order creation writes a plan transactionally. Both order-delivery modes consume the same plan detail balance, while direct delivery remains independent.

**Tech Stack:** PostgreSQL, Java 8 Spring/eGovFrame, MyBatis, React/TypeScript, MUI, F1-Grid, Vitest, Maven.

---

## File map

- `docs/directions/20261105/20261105_002_납품계획_연계_납품흐름_개편_작업지시서.md`, `docs/plan/20261105/20261105_002_납품계획_연계_납품흐름_개편_계획서.md`, `docs/spec/20261105/20261105_002_납품계획_연계_납품흐름_개편_상세사양서.md`: product requirements, execution outline, exact contract.
- `docs/database/20261105/` and `backend/DATABASE/20261105/`: migration, rollback, menu seed/rollback, change record, mirrored copies.
- `docs/database/db-schema.md`: cumulative tenant/plan/delivery schema.
- `backend/src/main/java/egovframework/let/sales/deliveryplan/**`: plan API models/controller/service/DAO.
- `backend/src/main/java/egovframework/let/sales/order/create/**` and its MyBatis mapper: automatic plan creation and stable order-detail synchronization.
- `backend/src/main/java/egovframework/let/sales/delivery/**` and mapper: mode-aware plan source selection and atomic planned/shipped balances.
- `backend/src/main/resources/egovframework/mapper/let/sales/deliveryplan/**`: plan queries and writes.
- `backend/src/test/java/egovframework/let/sales/{deliveryplan,delivery,order}/**`: service, mapper, and controller regressions.
- `frontend/src/pages/sales/delivery/plan/**`: plan registration/status screens, typed API, form and grid.
- `frontend/src/pages/sales/delivery/create/**`: replace source-order picker with plan picker and add plan-detail IDs to payload.
- `frontend/src/pages/dashboard/{components/DashboardContent.tsx,services/dashboardData.tsx,services/menuService.ts,types/dashboard.ts}`: tenant mode-based plan menu/page filtering.
- `frontend/tests/sales-delivery-plan*.test.tsx`, `sales-delivery-page.test.tsx`, `sales-delivery-api.test.ts`: screen and delivery regressions.
- `docs/result/20261105/sales-delivery-planning/`: SQL/test/browser evidence and screenshots.

## Task 1: Schema and menu migration

- [ ] Write SQL checks that assert tenant mode, plan HD/DT keys/checks, delivery reference checks, legacy row backfill, and SQL-copy equality.
- [ ] Create the DDL/migration in `docs/database/20261105/20261105_001_add_sales_delivery_planning.sql`: add mode default/check; preflight legacy shipped qty; create plan header/detail; create plans for existing orders; associate existing ORDER detail rows; initialize delivered quantities from existing shipped qty; replace per-source delivery uniqueness; add tenant-safe composite FKs/checks/indexes; add plan menu nodes and permissions as a separate tenant-scoped seed transaction.
- [ ] Create rollback scripts that stop if plan or delivery history exists; drop menu only when no dependent nodes exist; preserve used plan/delivery sequence state.
- [ ] Copy all numbered SQL and change-history artifacts byte-for-byte into `backend/DATABASE/20261105`.
- [ ] Update `docs/database/db-schema.md` tenant, delivery, and new plan sections.
- [ ] Run the SQL contract/copy test and review the migration for the exact existing DDL names before any runtime code changes.

## Task 2: Plan backend contract (TDD)

- [ ] Add failing service/controller tests for MANUAL-only create/update, plan source tenant scoping, plan detail split, order total cap, delivered minimum, and AUTO mode API rejection.
- [ ] Add typed `DeliveryPlan`, `DeliveryPlanDetail`, request, status/search VOs and `SalesDeliveryPlanDAO` methods.
- [ ] Implement `/api/v1/sales/delivery-plans` create/get/update/status/source-order endpoints using authenticated tenant/user and existing ResultVO conventions.
- [ ] Lock the order header before plan header/details; reject canceled/closed orders, foreign source detail, duplicated/invalid IDs, planned sum greater than order qty, and reducing below delivered qty.
- [ ] Run targeted plan service/controller/mapper tests.

## Task 3: Preserve order-line identity and create AUTO plans (TDD)

- [ ] Add failing order-service tests proving AUTO create writes plan header/details, detail date falls back to header date then remains null, MANUAL create does not write plans, and the plan transaction rolls back on failure.
- [ ] Add order-detail update tests proving retained line IDs survive edits and a line with plan/delivery references cannot be deleted, change material, or shrink below allocated/shipped quantities.
- [ ] Implement tenant-mode lookup and AUTO plan creation in the same order transaction.
- [ ] Replace order-detail delete/reinsert update with stable `line_no` UPDATE/INSERT/DELETE synchronization. AUTO updates the single initial plan row per line; MANUAL preserves plan rows; reject mutations that invalidate plan/delivery references.
- [ ] Run focused order service/controller/mapper tests and `javac --release 8` on compiled main sources.

## Task 4: Plan-backed delivery accounting (TDD)

- [ ] Add failing tests that ORDER requires a plan detail in both modes, cannot exceed plan remainder, and DIRECT has no plan interaction.
- [ ] Add update/delete tests for exact plan delivered quantity and order shipped quantity reversal, including duplicate/split plan details per order line.
- [ ] Add plan detail identity to delivery request/response/status models and plan-backed source query; check requested row belongs to selected tenant/order/order line.
- [ ] In delivery create/update/delete, lock order then plan detail; atomically update `delivered_qty` and `shipped_qty`; permit multiple plan rows for one order detail in a delivery only when plan detail IDs differ.
- [ ] Remove order-only delivery source picker semantics and make APIs reject missing/mode-inappropriate plan references.
- [ ] Run all sales order/delivery backend tests.

## Task 5: Plan screens and mode-aware navigation

- [ ] Add failing Vitest tests for plan-mode menu filtering, plan form quantity validation/split rows, plan source order submission, and plan selection identity in delivery registration.
- [ ] Extend existing dashboard menu data using tenant mode from the authenticated dashboard/API response; hide plan nodes in AUTO and keep backend mode checks authoritative.
- [ ] Build `DeliveryPlanCreatePage` with order picker, immutable customer/order lines, editable plan date/quantity rows, split-line support, existing-plan load/update, and order/planned/delivered/remaining totals.
- [ ] Build `DeliveryPlanStatusPage` with required period/search defaults, planned/delivered/remaining values, permissions, and open-registration action.
- [ ] Update menu seed descriptions/parenting and dashboard page content for `delivery-plan-create`/`delivery-plan-status`.
- [ ] Replace `SourceOrderPicker` with a plan picker. Preserve plan detail IDs in rows, allow several plan rows from the same source order line, and keep direct-delivery mode unchanged.
- [ ] Run new and existing delivery/order page tests, `npm run build`, and lint only changed frontend files.

## Task 6: Integrated verification and result

- [ ] Run `cd backend; mvn test`; verify Java 8 APIs with `javac --release 8` or the repository's existing compatibility check.
- [ ] Run `cd frontend; npm run test -- <sales planning/order/delivery tests>; npm run build; npm run lint -- <changed files>`.
- [ ] Verify docs/backend SQL are identical and `git diff --check` passes.
- [ ] Use the existing S-ERP browser server on port 4173; verify AUTO/MANUAL navigation, plan split and plan-backed delivery at 375, 768, and 1280px; save screenshots under the result `screenshots` directory.
- [ ] Record all checks, MCP table metadata evidence, migration preconditions, no-live-DB-application statement, and screenshots in the dated result report.
- [ ] Re-read the scoped diff and preserve unrelated worktree changes.

## Self-review

- Every design section has a task: tenant modes/order lifecycle (Tasks 2-3), schema/backfill/menus (Task 1), delivery counters (Task 4), screen flows (Task 5), verification/result (Task 6).
- No database row data is required; the migration operates on schema and current order/delivery rows only when a DBA later applies it.
- The order-line identity in API requests remains based on stable `line_no`; the service obtains current source IDs and never trusts client-supplied tenant/source identity.
