# Sales Order Entry Design

## Status

- Design approved in conversation on 2026-10-26.
- Scope: tenant-aware sales-order header/detail DDL and the first frontend registration screen.
- The original design deferred the sales-order API. The authorized scope
  extension and create-only API contract are documented in
  [2026-10-27-sales-order-save-and-ux-design.md](2026-10-27-sales-order-save-and-ux-design.md).

## Context and evidence

The supplied `smart_haccp_schema_2.sql` defines `tb_sales_order_hd` and
`tb_sales_order_dt` with business order number, customer/item codes, amounts,
delivery information, status, and shipment fields. Its original foreign-key
targets (`tb_partner_master`, `tb_item_master`, and `tb_quotation_hd`) are not
the current S-ERP master tables.

The read-only S-ERP PostgreSQL MCP confirmed:

- `public.tb_customer_info` has `customer_id` and a unique `(customer_id,
  tenant_id)` key.
- `public.tb_material_info` has `material_id` and a unique `(material_id,
  tenant_id)` key.
- The current database table list does not contain a quotation table.
- The existing frontend exposes customer and material list services.

No business rows or tenant records were queried. The MCP is a read-only
metadata source; no DDL will be applied through it.

The frontend already routes `/sales/*` through the authenticated dashboard.
The user confirmed that the menu has already been registered with the
breadcrumb hierarchy **영업관리 > 수주관리 > 수주등록** and designated
`/sales/order/create` as this page's URL. The implementation must use that
existing menu configuration rather than creating another module or menu.

## Approaches considered

1. **Create-focused page with reusable pickers (selected).** Keep this screen
   focused on entering one order, reuse existing master list services for
   customer/item selection, and defer order persistence. This follows the
   requested create route and avoids pretending that unavailable order APIs
   exist.
2. **Combined order list and editor.** Search existing orders in a split
   list/detail view. This provides convenient order switching but requires an
   order-list API that is not part of this scope and does not match the
   `/sales/order/create` route.
3. **Directly enter master IDs.** This avoids lookup UI but makes order entry
   harder and is less reusable than master selection controls.

## Approved design

### Database schema

Create only the order header and detail tables, adapted to existing S-ERP
tenant and master-data contracts.

`public.tb_sales_order_hd`:

- `sales_order_id BIGSERIAL NOT NULL` primary key.
- `tenant_id BIGINT NOT NULL`.
- `order_no VARCHAR(30) NOT NULL`, unique with `tenant_id`.
- `order_dt DATE NOT NULL`.
- `customer_id BIGINT NOT NULL`, referencing
  `tb_customer_info(customer_id, tenant_id)` through a composite foreign key.
- `quot_no VARCHAR(30)`, `delivery_dt DATE`, `delivery_place VARCHAR(200)`,
  and `delivery_method VARCHAR(50)`. `quot_no` is nullable and has no foreign
  key because the current database has no quotation table.
- `status VARCHAR(20) NOT NULL DEFAULT '수주등록'` with the source status
  values: `수주등록`, `생산대기`, `생산중`, `출하완료`, and `취소`.
- `total_amt NUMERIC(15,2) DEFAULT 0`, `remark VARCHAR(500)`, and
  `use_at CHAR(1) NOT NULL DEFAULT 'Y'`; constrain `use_at` to `Y` or `N`.
- `created_by VARCHAR(10)`, `created_at TIMESTAMP NOT NULL DEFAULT
  CURRENT_TIMESTAMP`, `updated_by VARCHAR(10)`, and `updated_at TIMESTAMP`
  follow the current S-ERP master audit naming and types.
- A composite unique key on `(sales_order_id, tenant_id)` supports safe
  tenant-aware detail references.

`public.tb_sales_order_dt`:

- `sales_order_detail_id BIGSERIAL NOT NULL` primary key (a distinct internal
  ID for every detail row, as requested).
- `sales_order_id BIGINT NOT NULL`, `tenant_id BIGINT NOT NULL`, and
  `line_no INT NOT NULL`.
- Unique `(sales_order_id, line_no)` and a composite foreign key
  `(sales_order_id, tenant_id)` to the header.
- `material_id BIGINT NOT NULL` referencing
  `tb_material_info(material_id, tenant_id)` through a composite foreign key.
- `order_qty NUMERIC(15,2) NOT NULL`, `unit_price NUMERIC(15,2) NOT NULL`,
  `supply_amt NUMERIC(15,2) NOT NULL`, `vat_amt NUMERIC(15,2) DEFAULT 0`,
  `total_amt NUMERIC(15,2) NOT NULL`, `delivery_dt DATE`,
  `shipped_qty NUMERIC(15,2) DEFAULT 0`, and
  `line_status VARCHAR(20) DEFAULT '대기'`.

The source partner/item codes are replaced by S-ERP's numeric customer and
material identifiers. Composite foreign keys prevent cross-tenant master
references. Do not add quotation or other absent master tables.

Add date-based create SQL, a guarded rollback for the newly created tables,
and a change-history document under matching `docs/database` and
`backend/DATABASE` date folders. Update `docs/database/db-schema.md`. The two
SQL/document copies must match. Do not execute the DDL against a database.

### Frontend route and page

- Connect `/sales/order/create` through the existing authenticated
  `DashboardPage` and `DashboardContent` flow for the existing sales menu.
- Preserve the registered breadcrumb path and permissions; do not add or
  modify menu data.
- Follow the latest feature-page structure under
  `frontend/src/pages/sales/order/create/`, keeping page composition, detail
  grid, types, and order-specific state separated according to complexity.
- Reuse the existing `PageHeader`, `PageMessageArea`, and F1-Grid patterns.
- This is a create-only screen. Do not show a fake order search or seed sample
  orders.
- The order number remains read-only with a message that numbering will be
  defined when the save API is designed. The order date defaults to the
  current date; status defaults to `수주등록`.
- Order save and order lookup are unavailable in this phase. A save action
  must remain disabled and explain that the order API is not connected; it
  must not report success or silently clear edits.

### Reusable customer and material pickers

- Add reusable `CustomerPicker` and `MaterialPicker` UI under
  `frontend/src/shared/components/`. The shared components own search,
  loading, empty-result, error, and selection presentation, but receive typed
  search functions as props so they do not depend on page-specific APIs.
- The sales-order page supplies adapters backed by the existing
  `fetchCustomers` and `fetchMaterials` services.
- A selected customer returns its ID, code, and display name. A selected
  material returns its ID, code, and display name.
- The order header displays the selected customer. The detail grid uses
  selected materials and persists their IDs in row data while presenting
  human-readable code/name columns.
- Search errors remain visible; they must not be converted into an empty
  result or successful selection.
- Picker layouts and the page must work at 375px, 768px, and 1280px without
  page-level horizontal overflow.

### Detail-grid interaction and amounts

- Use F1-Grid for order lines with row number, item code/name, order quantity,
  unit price, supply amount, VAT amount, line total, delivery date,
  shipped quantity, and line status. Hide internal database IDs from display.
- Allow adding/removing unsaved detail rows and editing the business amounts
  in the grid. Newly selected master IDs stay attached to their detail rows.
- Store/display monetary values at two decimal places, consistent with
  `NUMERIC(15,2)`.
- Calculate supply amount as quantity multiplied by unit price.
- Calculate VAT as 10% of supply amount, rounded to two decimal places. If
  quantity or unit price changes, recalculate VAT at 10%; the user may then
  edit VAT for that row. Every subsequent quantity or unit-price change also
  recalculates VAT at 10%.
- Calculate each line total as supply amount plus VAT. Show header summary
  totals by summing detail supply, VAT, and line totals.
- No tax-rate or tax-category column is added: only the source `vat_amt` is
  persisted by the future order API.

### Error handling and validation

- Show picker loading, no-result, and request-error states separately.
- Validate required header fields and order-line numeric values before any
  future save attempt. In this phase, keep the user-entered rows intact when
  the unavailable save action is invoked or when master lookup fails.
- Do not catch and hide API, malformed response, or calculation errors.
- The frontend must not imply that a local edit has been persisted.

### Validation and documentation

- Add focused frontend tests for amount calculations and rounding,
  recalculation after quantity/price edits, row add/remove and ID preservation,
  picker search/selection/loading/empty/error states, and the exact route/menu
  page connection.
- Add a static DDL verification that checks both SQL copies are identical and
  contain the approved keys, tenant-aware references, and source business
  columns. No backend API tests are in scope because no backend code is added.
- Run the focused Vitest tests and frontend build.
- Verify the authenticated route in a real browser at 375px, 768px, and
  1280px. Save screenshots and a result report under
  `docs/result/20261026/sales-order-entry/`.
- Update `frontend/src/pages/f1-grid-docs/F1-GRID.md` because this feature uses
  F1-Grid for user-visible order-line behavior.

## Out of scope

- Sales-order list/search, update, and cancellation. The create API is in scope
  only as defined by the 2026-10-27 addendum.
- Quote conversion and a quotation table.
- Creating or changing the existing sales menu/module configuration.
- Applying SQL to the database.
- The automatic order-number format or sequence was deferred by this original
  design; the 2026-10-27 addendum defines it for the create API.
- Tax category/rate storage or a configurable VAT calculation.
