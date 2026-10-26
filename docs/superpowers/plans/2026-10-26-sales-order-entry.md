# Sales Order Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tenant-safe sales-order header/detail DDL and a user-friendly F1-Grid order creation page at `/sales/order/create`, with reusable customer and material pickers.

**Architecture:** Keep the sales-order page and local draft calculations in a feature folder. Put reusable, data-source-injected picker UI in `shared/components`, while the sales-order feature adapts existing customer/material list services. Preserve the existing dashboard menu/permission path and add only the page-key rendering branch; defer order CRUD APIs and database application.

**Tech Stack:** React, TypeScript, MUI, F1-Grid, Vitest, PostgreSQL DDL, Node.js built-in test assertions.

---

## Approved design and scope

- Design: [2026-10-26 Sales Order Entry Design](../specs/2026-10-26-sales-order-entry-design.md)
- User-approved route and menu hierarchy: `/sales/order/create`, 영업관리 > 수주관리 > 수주등록. The menu is already registered; do not add/change menu data.
- Header key: internal `sales_order_id BIGSERIAL` plus tenant-unique `order_no`.
- Detail key: distinct internal `sales_order_detail_id BIGSERIAL`; also unique `(sales_order_id, line_no)`.
- Master references: composite tenant-safe FKs to current customer/material master identifiers. Do not add a quotation FK because no quotation table exists.
- UI scope: create-only, local draft interaction and calculation; no order search/save API and no sample order data.
- Existing customer/material lookup services are used through reusable picker components that receive typed search functions.
- VAT defaults to 10% of supply amount, rounded to two decimals; changing quantity or unit price recalculates VAT. VAT can then be edited; line/header totals are recalculated.
- The order number is read-only pending a separate numbering/API decision. Order date defaults to today; status defaults to `수주등록`.
- Do not apply DDL through MCP or claim the database was changed.

## File map

### Project workflow documents

- Create `docs/directions/20261026/20261026_008_수주등록_페이지_및_DDL_작업지시서.md` with the approved scope, database evidence, implementation steps, and completion conditions.
- Create `docs/plan/20261026/20261026_008_수주등록_페이지_및_DDL_계획서.md` with this implementation order and dependencies.
- Create `docs/spec/20261026/20261026_008_수주등록_페이지_및_DDL_상세사양서.md` with field contracts, calculations, picker API, route and error behavior.

### Database

- Create identical DDL in `docs/database/20261026/20261026_008_create_sales_order_schema.sql` and `backend/DATABASE/20261026/20261026_008_create_sales_order_schema.sql`.
- Create identical guarded rollback in `docs/database/20261026/20261026_008_rollback_sales_order_schema.sql` and `backend/DATABASE/20261026/20261026_008_rollback_sales_order_schema.sql`.
- Create identical change history in `docs/database/20261026/20261026_008_change_sales_order_schema.md` and `backend/DATABASE/20261026/20261026_008_change_sales_order_schema.md`.
- Append the schema contract and migration links to `docs/database/db-schema.md`.
- Add `tools/tests/test_sales_order_schema.cjs` to validate SQL copy equality and required columns, keys, and tenant-safe references without connecting to a database.

### Frontend

- Add `frontend/src/pages/sales/order/create/SalesOrderCreatePage.tsx` for screen composition and action state.
- Compose order date, read-only order number, customer selection, optional quote number, delivery fields, status, and remark in the page.
- Add `frontend/src/pages/sales/order/create/components/SalesOrderDetailGrid.tsx` and `data/salesOrderDetail.ts` for F1-Grid detail columns, item selection, row edits, and unsaved row operations.
- Add `frontend/src/pages/sales/order/create/data/salesOrderAmounts.ts` for deterministic amount calculation and recalculation helpers.
- Add `frontend/src/pages/sales/order/create/services/salesOrderMaster.service.ts` to adapt existing `fetchCustomers`/`fetchMaterials` records to picker options.
- Add reusable `frontend/src/shared/components/master-picker/MasterPicker.tsx`, `MasterPickerDialog.tsx`, `MasterPickers.tsx`, and `masterPicker.types.ts`. The shared UI receives typed search functions and must not import feature-page services.
- Modify `frontend/src/pages/dashboard/components/DashboardContent.tsx` to render the sales page only for `selectedModule.id === 'sales'` and `currentPageKey === 'create'`. The existing route is already authenticated at `/sales/*`; do not modify `AppRouter.tsx`.
- Add focused picker, amount, detail-grid, master-adapter, and page-route tests under `frontend/tests/`.
- Add F1-Grid usage guidance to `frontend/src/pages/f1-grid-docs/F1-GRID.md`.

### Result

- Create `docs/result/20261026/sales-order-entry/20261026_008_sales_order_entry_result.md` and screenshots for 375px, 768px, and 1280px.

## Task 1: Record approved task documents

**Files:**
- Create: `docs/directions/20261026/20261026_008_수주등록_페이지_및_DDL_작업지시서.md`
- Create: `docs/plan/20261026/20261026_008_수주등록_페이지_및_DDL_계획서.md`
- Create: `docs/spec/20261026/20261026_008_수주등록_페이지_및_DDL_상세사양서.md`
- Reference: `docs/superpowers/specs/2026-10-26-sales-order-entry-design.md`

- [ ] **Step 1: Write the work direction from the approved design**

Include the specified route and menu hierarchy, two-table scope, both internal IDs, approved amount behavior, reusable picker requirement, absent order APIs, no DB apply, and required verification/results. Record the read-only MCP metadata basis and state that no business rows were queried.

- [ ] **Step 2: Write the dated project plan**

Use the exact file map and task order in this implementation plan. Keep dependencies explicit: documents precede code; DDL validation precedes SQL acceptance; picker UI precedes sales-page integration; result documentation follows browser verification.

- [ ] **Step 3: Write the detailed feature specification**

Specify every header/detail column, null/default behavior, PK/unique/FK/check/index rules, picker callback contracts, exact amount formulas, route key, disabled save behavior, and responsive/error expectations. Use relative links to the direction and dated plan.

- [ ] **Step 4: Review the three documents**

Check that no document implies a working order API, new menu row, quotation FK, DB application, or automatically generated order number. Confirm all three documents link to the approved design.

## Task 2: Add failing schema-copy and contract test

**Files:**
- Create: `tools/tests/test_sales_order_schema.cjs`
- Test inputs: the two planned `20261026_008_create_sales_order_schema.sql` paths

- [ ] **Step 1: Write the static schema test before DDL**

Use only Node built-ins (`node:assert/strict`, `node:fs`, `node:path`). Assert that both DDL files exist and are byte-identical. Assert that the DDL contains:

```js
[
  'sales_order_id BIGSERIAL',
  'sales_order_detail_id BIGSERIAL',
  'UNIQUE (tenant_id, order_no)',
  'UNIQUE (sales_order_id, tenant_id)',
  'UNIQUE (sales_order_id, line_no)',
  'FOREIGN KEY (customer_id, tenant_id)',
  'FOREIGN KEY (material_id, tenant_id)',
  'NUMERIC(15,2)',
]
```

Also assert the source business columns, status values, `use_at` check, customer/material target names, `quot_no` column, and absence of an FK referencing quotation tables.

- [ ] **Step 2: Run the test and verify the expected failure**

Run from the repository root:

```powershell
node tools\tests\test_sales_order_schema.cjs
```

Expected: fail because the DDL copies do not exist yet.

## Task 3: Create tenant-safe header/detail DDL and rollback

**Files:**
- Create: `docs/database/20261026/20261026_008_create_sales_order_schema.sql`
- Create: `backend/DATABASE/20261026/20261026_008_create_sales_order_schema.sql`
- Create: `docs/database/20261026/20261026_008_rollback_sales_order_schema.sql`
- Create: `backend/DATABASE/20261026/20261026_008_rollback_sales_order_schema.sql`
- Create: `docs/database/20261026/20261026_008_change_sales_order_schema.md`
- Create: `backend/DATABASE/20261026/20261026_008_change_sales_order_schema.md`
- Modify: `docs/database/db-schema.md`
- Test: `tools/tests/test_sales_order_schema.cjs`

- [ ] **Step 1: Define the header table**

Create `public.tb_sales_order_hd` with:

```sql
sales_order_id BIGSERIAL PRIMARY KEY,
tenant_id BIGINT NOT NULL REFERENCES public.tb_tenant (tenant_id),
order_no VARCHAR(30) NOT NULL,
order_dt DATE NOT NULL,
customer_id BIGINT NOT NULL,
quot_no VARCHAR(30),
delivery_dt DATE,
delivery_place VARCHAR(200),
delivery_method VARCHAR(50),
status VARCHAR(20) NOT NULL DEFAULT '수주등록',
total_amt NUMERIC(15,2) DEFAULT 0,
remark VARCHAR(500),
use_at CHAR(1) NOT NULL DEFAULT 'Y',
created_by VARCHAR(10),
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_by VARCHAR(10),
updated_at TIMESTAMP
```

Add unique `(tenant_id, order_no)` and `(sales_order_id, tenant_id)`, a composite FK `(customer_id, tenant_id)` to `public.tb_customer_info`, a check for the five approved order statuses, and a `Y`/`N` check for `use_at`. `quot_no` is deliberately not an FK.

- [ ] **Step 2: Define the detail table**

Create `public.tb_sales_order_dt` with `sales_order_detail_id BIGSERIAL PRIMARY KEY`, non-null `sales_order_id`, `tenant_id`, `line_no`, and `material_id`; the source amount/date/shipment fields at their specified sizes; and `line_status VARCHAR(20) DEFAULT '대기'`.

Add unique `(sales_order_id, line_no)`, composite FK `(sales_order_id, tenant_id)` to the header with `ON DELETE CASCADE`, and composite FK `(material_id, tenant_id)` to `public.tb_material_info`. Add an index for material lookup. Do not add quotation tables or undocumented business constraints.

- [ ] **Step 3: Add comments and transaction boundaries**

Add table/column comments for all business columns and IDs. Wrap table creation in a transaction. Header and detail IDs are independent BIGSERIAL sequences.

- [ ] **Step 4: Write guarded rollback**

In a transaction, lock detail/header tables in a consistent order, refuse rollback if either has rows, then drop detail before header. Never apply rollback to populated tables.

- [ ] **Step 5: Duplicate SQL and change-history files**

Copy the approved create SQL, rollback, and change history byte-for-byte to `backend/DATABASE/20261026`. The history records date, table names, scope, application status (“not applied”), and rollback safety.

- [ ] **Step 6: Update the cumulative schema**

Append both tables, exact key/FK/check/index contracts, and links to the date-based SQL/history in `docs/database/db-schema.md`. State explicitly that DDL has not been applied.

- [ ] **Step 7: Run the static test**

Run:

```powershell
node tools\tests\test_sales_order_schema.cjs
```

Expected: PASS for both file equality and schema contract assertions.

## Task 4: Implement reusable master picker UI with failing tests first

**Files:**
- Create: `frontend/src/shared/components/master-picker/masterPicker.types.ts`
- Create: `frontend/src/shared/components/master-picker/MasterPickerDialog.tsx`
- Create: `frontend/src/shared/components/master-picker/CustomerPicker.tsx`
- Create: `frontend/src/shared/components/master-picker/MaterialPicker.tsx`
- Create: `frontend/tests/master-picker.test.tsx`

- [ ] **Step 1: Define the shared type contracts**

Use the same normalized option fields for both masters:

```ts
export type MasterPickerOption = {
  id: number;
  code: string;
  name: string;
};

export type MasterPickerSearch = (
  keyword: string,
) => Promise<MasterPickerOption[]>;
```

Each selector accepts `value: MasterPickerOption | null`, a typed `search` callback, `onChange`, and optional `disabled`. The dialog accepts a title, search function, and `onSelect`.

- [ ] **Step 2: Add failing picker tests**

Test that the dialog opens, submits a keyword to the injected search callback, renders and returns the chosen ID/code/name, distinguishes empty results from request errors, and shows loading while a deferred search promise is pending. Test that closing without selection does not call `onChange`.

- [ ] **Step 3: Run picker tests and verify failure**

Run:

```powershell
Push-Location frontend
npm run test -- tests\master-picker.test.tsx
Pop-Location
```

Expected: FAIL because the picker contracts/components do not exist.

- [ ] **Step 4: Implement the shared dialog**

Implement a MUI dialog with a search field, explicit search action/Enter behavior, result list with selectable rows, loading indicator, no-result message, and visible request-error message with retry. Prevent stale responses from replacing results for a newer submitted keyword. Do not import feature-page services from this shared layer.

- [ ] **Step 5: Implement the typed customer/material selectors**

Implement small controlled wrappers that display the selected code/name, open the shared dialog, and call `onChange` only after a selection. Use distinct accessible labels and titles for 거래처 and 품목.

- [ ] **Step 6: Run picker tests**

Repeat the focused Vitest command. Expected: PASS for loading, empty, error, search, selection, close, and stale-response behavior.

## Task 5: Add sales draft models and exact amount helpers with failing tests first

**Files:**
- Create: `frontend/src/pages/sales/order/create/types/salesOrder.types.ts`
- Create: `frontend/src/pages/sales/order/create/utils/salesOrderAmounts.ts`
- Create: `frontend/tests/sales-order-create.test.tsx`

- [ ] **Step 1: Define local draft types**

Define a header draft for read-only empty `orderNo`, local `orderDt`, selected customer, delivery date/place/method, `status`, and remark. Define each detail row with a temporary string-or-number row key, nullable persisted `salesOrderDetailId`, `lineNo`, selected `materialId`/code/name, and numeric quantity/price/amount/date/shipment/status fields. Do not include client-supplied tenant or audit values.

- [ ] **Step 2: Add failing calculation tests**

Test:

```ts
expect(calculateSalesOrderAmounts({
  orderQty: 3,
  unitPrice: 12.34,
  vatAmt: 0,
})).toMatchObject({
  supplyAmt: 37.02,
  vatAmt: 3.7,
  totalAmt: 40.72,
});
```

Also test VAT half-cent rounding, zero quantity, invalid/non-finite input rejection, VAT override updating line total, quantity/price edits recalculating VAT at 10%, and header totals summing rows to two decimal places.

- [ ] **Step 3: Run the focused test and verify failure**

Run:

```powershell
Push-Location frontend
npm run test -- tests\sales-order-create.test.tsx
Pop-Location
```

Expected: FAIL because calculation helpers are not implemented.

- [ ] **Step 4: Implement pure calculation helpers**

Implement pure functions that normalize input to finite non-negative decimal amounts, round monetary values to two places, calculate supply from quantity times unit price, calculate default VAT as 10% of supply, calculate line total from supply plus VAT, and sum header totals. Quantity/unit-price updates call the default-VAT calculation; direct VAT edits update only VAT and line total.

- [ ] **Step 5: Run calculation tests**

Repeat the focused test command. Expected: PASS, including decimal rounding and recalculation cases.

## Task 6: Connect lookup adapters, header form, and detail F1-Grid

**Files:**
- Create: `frontend/src/pages/sales/order/create/services/salesOrderMasterLookup.service.ts`
- Create: `frontend/src/pages/sales/order/create/components/SalesOrderHeaderForm.tsx`
- Create: `frontend/src/pages/sales/order/create/components/SalesOrderDetailGrid.tsx`
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Test: `frontend/tests/sales-order-create.test.tsx`
- Reference: `frontend/src/pages/co/master/customers/services/customerManagement.service.ts`
- Reference: `frontend/src/pages/co/master/materials/services/materialManagement.service.ts`

- [ ] **Step 1: Add failing lookup-adapter tests**

Verify customer search calls `fetchCustomers({ keyword, useAt: 'Y' })` and maps the validated response to `{ id, code, name }`. Verify material search calls the existing material list service with the keyword and maps material ID/code/name. Reject malformed IDs or names with visible errors; do not return a success-shaped empty list on request failure.

- [ ] **Step 2: Run adapter tests and verify failure**

Run the focused `sales-order-create.test.tsx` command. Expected: FAIL because the lookup adapter is missing.

- [ ] **Step 3: Implement master lookup adapters**

Use existing services; do not add new backend endpoints. Keep data conversion in the sales feature service so shared picker components remain transport-agnostic.

- [ ] **Step 4: Build the header form**

Use MUI form controls for date, delivery information, optional manually entered `quot_no` (there is no quote picker in this scope), status, and remark. Display the order number as read-only with “저장 연동 단계에서 채번 기준 확정” guidance. Default date using local calendar date without UTC day shifts; default status to `수주등록`. Use the shared `CustomerPicker` and show the selected customer code/name.

- [ ] **Step 5: Build the detail F1-Grid**

Use `F1Grid` with a hidden temporary/persisted detail key, row-number display, item code/name, quantity, unit price, supply, VAT, total, delivery date, shipped quantity, and line status. Configure monetary values with two decimal places. Use the existing `type: 'code'` and `onOpenCodePicker` column contract to open `MaterialPicker`; retain its `applyPatch` callback while the dialog is open and apply the chosen material ID/code/name to that row. Quantity and price edits call the approved calculator; VAT edits recalculate only the row total. Default `shipped_qty` to zero and `line_status` to `대기`; keep both read-only during initial registration. Permit adding and deleting unsaved detail lines; do not add physical order deletion behavior.

- [ ] **Step 6: Document F1-Grid usage**

Append a focused “Sales order detail grid” section in `F1-GRID.md`: numeric precision, row addition/removal, row-level async master selection through `onOpenCodePicker` and `applyPatch`, derived amount updates, and the local-only/no-save boundary. Preserve and integrate the worktree’s existing edits in this file.

- [ ] **Step 7: Verify focused frontend tests**

Run:

```powershell
Push-Location frontend
npm run test -- tests\master-picker.test.tsx tests\sales-order-create.test.tsx
Pop-Location
```

Expected: PASS for adapter mapping, header selection, item assignment, row edits, totals, validation, and visible lookup failures.

## Task 7: Connect the page to the registered sales menu route

**Files:**
- Create: `frontend/src/pages/sales/order/create/SalesOrderCreatePage.tsx`
- Modify: `frontend/src/pages/dashboard/components/DashboardContent.tsx`
- Test: `frontend/tests/sales-order-create.test.tsx`
- Test: `frontend/tests/dashboard-data.test.tsx`
- Reference: `frontend/src/routes/AppRouter.tsx` (already protects `/sales/*`; do not change)
- Reference: `frontend/src/pages/dashboard/services/menuService.ts` (`toNodeId` maps `/sales/order/create` to `create`)

- [ ] **Step 1: Add failing route/page integration assertions**

Assert a menu leaf with path `/sales/order/create` resolves to module `sales`, menu/page key `create`, and that `DashboardContent` renders the order page for exactly that module/key while leaving other pages on existing branches.

- [ ] **Step 2: Run the route test and verify failure**

Run:

```powershell
Push-Location frontend
npm run test -- tests\dashboard-data.test.tsx -t "sales order menu path"
npm run test -- tests\sales-order-create.test.tsx
Pop-Location
```

Expected: FAIL because the sales order page branch is not connected.

- [ ] **Step 3: Compose the page from existing shared patterns**

Use `PageHeader`, `PageMessageArea`, and the header/detail components. Provide the registered breadcrumb labels from dashboard props. Include a “저장” action that is disabled and an explicit `PageMessageArea`/helper explanation that order persistence is not connected. Do not display a fake saved state or clear the draft.

- [ ] **Step 4: Add the narrow DashboardContent branch**

Add a branch for `selectedModule.id === 'sales' && currentPageKey === 'create'`. Do not add `sales` to hard-coded module data, do not change menu APIs/permissions, and do not alter `AppRouter.tsx`.

- [ ] **Step 5: Run focused route and page tests**

Repeat the two commands from Step 2. Expected: PASS for the new route and page tests. Do not run the entire `dashboard-data.test.tsx` suite as a green baseline: its pre-existing `keeps dashboard module icons lightweight for fast login route startup` case fails because `moduleItems` is empty. Record that known baseline separately; do not change unrelated menu initialization.

## Task 8: Final verification, browser screenshots, and result report

**Files:**
- Modify: `docs/database/db-schema.md`
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261026/sales-order-entry/20261026_008_sales_order_entry_result.md`
- Create: `docs/result/20261026/sales-order-entry/screenshots/sales-order-entry-375px.png`
- Create: `docs/result/20261026/sales-order-entry/screenshots/sales-order-entry-768px.png`
- Create: `docs/result/20261026/sales-order-entry/screenshots/sales-order-entry-1280px.png`

- [x] **Step 1: Run all targeted frontend tests and build**

From `frontend` Run the focused suites from `frontend`:

```powershell
npm run test -- tests\master-picker.test.tsx tests\sales-order-calculations.test.ts tests\sales-order-grid.test.ts tests\sales-order-master.service.test.ts tests\sales-order-create-page.test.tsx tests\sales-order-scroll.test.tsx
npm run build
```

Result: all 17 focused tests across six files passed, including viewport scrolling and edited-cell amount recalculation; the TypeScript/Vite build exited successfully. The known pre-existing dashboard icon test is not selected.

- [x] **Step 2: Run the static DDL test and inspect the final diff**

From repository root run:

```powershell
node tools\tests\test_sales_order_schema.cjs
git --no-pager diff --check
```

Expected: DDL copies match, approved constraints/columns are present, and no whitespace errors are reported. Review `git status` and ensure unrelated pre-existing changes remain untouched.

- [x] **Step 3: Verify the authenticated route in the browser**

Reuse the existing S-ERP server at `http://127.0.0.1:4173`; do not start a second server if it is already serving S-ERP. Visit `/sales/order/create` with the existing authenticated browser session. Confirm the breadcrumb, customer picker, item picker, detail row editing, VAT recalculation/override, and disabled save notice. Capture screenshots at widths 375, 768, and 1280 pixels. If authentication or the route menu is unavailable, record the blocker and do not claim the route was verified.

- [x] **Step 4: Write the result report**

Record modified files, SQL contract, test/build output, browser viewport results, picker behavior, and the explicit facts that order search/save APIs are deferred and DDL was not applied. Link the three screenshots.

## Self-review checklist

- [x] Both IDs are separate primary keys; detail rows also retain order/line uniqueness.
- [x] Customer/material composite FKs include `tenant_id`; no nonexistent quote FK is added.
- [x] Exact registered route and breadcrumb are preserved without menu changes.
- [x] Shared picker UI has no dependency on page-specific APIs; only the sales adapter calls existing list services.
- [x] No sample orders or success-shaped local save behavior are introduced.
- [x] VAT recalculation and manual VAT override match the approved rule.
- [x] Both DDL and history copies are byte-identical; SQL is not run against a database.
- [x] All unrelated pre-existing worktree changes are preserved; inspect each touched file before editing it.
