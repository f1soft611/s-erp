# Item and Partner Pricing Design

## Status

- Approved by the user on 2026-10-29 after reviewing the design document.
- Scope: tenant-aware item/partner price schema and a frontend-first
  maintenance screen with manual and Excel-assisted entry.
- Database DDL is a reviewable draft only; it must not be applied through the
  read-only MCP or represented as deployed.

## Context and evidence

The supplied `smart_haccp_schema_2.sql` defines
`tb_item_partner_price` with item code, partner code, trade type, unit price,
currency, effective dates, MOQ, use flag, and audit fields. Its item and
partner code references target the source file's master tables, not S-ERP's
current master tables.

The central S-ERP PostgreSQL MCP confirmed:

- The current table list has `tb_material_info`, `tb_customer_info`,
  `tb_sales_order_hd`, and `tb_sales_order_dt`, but no
  `tb_item_partner_price`.
- `tb_material_info(material_id, tenant_id)` and
  `tb_customer_info(customer_id, tenant_id)` each have unique keys suitable
  for tenant-aware composite foreign keys. The master IDs are `BIGINT`.
- S-ERP's sales detail already uses `unit_price NUMERIC(15,2)`.
- Current masters use tenant IDs, `created_by`/`created_at` and
  `updated_by`/`updated_at` audit columns. The existing sales header uses
  `use_at CHAR(1)` with `Y` as the default.
- The frontend already uses F1-Grid row forms for item/customer maintenance.
  F1-Grid exposes `addRow`, and ExcelJS is already used for export. ExcelJS
  can be loaded dynamically; the frontend avoids the separate `xlsx` package.

Only table metadata, constraints, and column definitions were inspected.
Business rows and tenant data were not queried. No DDL was applied.

## Approaches considered

1. **F1-Grid list plus row-form entry and staged Excel import (selected).**
   Reuses the existing master-data page pattern for small edits, while the
   upload path handles bulk entry with a preview and validation before the
   rows join the page's normal save set. It supports both workflows without
   making every user edit a wide spreadsheet.
2. **Editable grid as the only entry surface.** Fast for keyboard-heavy
   repeated entry, but cross-selecting item and partner masters and handling
   effective dates in narrow columns makes occasional registration harder.
3. **Item/partner master split view with a detail panel.** Convenient when
   maintaining many prices for one selected master, but less direct for
   searching across trade type, item, partner, and effective date.

## Proposed design

### Database design

Create `public.tb_item_partner_price` with:

- `price_id BIGSERIAL` primary key and `tenant_id BIGINT NOT NULL`.
- `material_id BIGINT NOT NULL` and `customer_id BIGINT NOT NULL`, each
  tenant-scoped through composite foreign keys to the existing item and
  customer masters.
- `trade_type VARCHAR(10) NOT NULL`, constrained to `매입` or `매출`.
- `unit_price NUMERIC(15,2) NOT NULL`, `currency VARCHAR(10) NOT NULL
  DEFAULT 'KRW'`, `start_dt DATE NOT NULL`, nullable `end_dt DATE`, nullable
  `moq NUMERIC(15,2)`, and `use_at CHAR(1) NOT NULL DEFAULT 'Y'`.
- S-ERP audit columns: nullable `created_by VARCHAR(10)`,
  `created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  nullable `updated_by VARCHAR(10)`, and nullable
  `updated_at TIMESTAMP WITHOUT TIME ZONE`.
- A unique key on `(tenant_id, material_id, customer_id, trade_type,
  start_dt)`, corresponding to the source key while enforcing tenant scope.
- Checks for `trade_type`, `use_at IN ('Y','N')`, and `end_dt IS NULL OR
  end_dt >= start_dt`.
- Tenant-aware composite foreign keys and indexes supporting tenant/item,
  tenant/customer, and tenant/trade/effective-date lookup.

The exact same item/partner/trade/start-date key is rejected; it is never
silently overwritten by manual save or Excel import. Overlapping effective
periods with different start dates are not prohibited because the supplied
schema does not define an overlap rule. Use soft deactivation through
`use_at`; do not physically delete rows.

The migration must follow the repository's date-based schema history format,
include a guarded rollback that does not use `CASCADE`, keep matching copies
under `docs/database` and `backend/DATABASE`, and update
`docs/database/db-schema.md`. It must not be executed against the database.

### Maintenance page

- Place the page under the existing co/master area and follow the current
  item/customer page composition: `PageHeader`, `PageSearchArea`,
  `PageMessageArea`, and F1-Grid.
- Use F1-Grid for the searchable list and row-form plugin for individual
  registration/edit. The visible columns are row number, trade type, item
  code/name, partner code/name, unit price, currency, start/end dates, MOQ,
  and use status.
- Search by trade type, item/partner code or name, effective date, and use
  status. Keep the table's horizontal scrolling within the grid.
- Group the row form into trade pairing (trade type, item, partner) and price
  terms (price, currency, effective dates, MOQ, use status). Reuse existing
  item/customer picker patterns rather than requiring users to type internal
  IDs.
- Preserve current unsaved-change, permission, error, and save-state patterns.
  No API success or empty-list fallback may hide a failure.

### Excel upload and validation

- Provide a downloadable `.xlsx` template and accept `.xlsx` files only.
- The template columns are trade type, item code, partner code, unit price,
  currency, effective start date, effective end date, MOQ, and use status.
  Codes are text cells so leading zeroes survive. Dates use Excel date cells
  or ISO `YYYY-MM-DD` text.
- Load ExcelJS only when the user selects an upload action. Parse the first
  worksheet and require the expected header names; reject unsupported files,
  missing headers, malformed dates/numbers, and empty workbooks explicitly.
- Show parsed rows in an import-preview dialog before they alter the page's
  dirty grid. Highlight row-numbered format issues and duplicate keys within
  the uploaded file. The user can correct editable preview values and
  revalidate.
- A tenant-scoped, read-only validation request resolves item/partner codes
  and checks existing exact-key conflicts without writing data. Rows with
  validation errors cannot be staged.
- After successful validation and user confirmation, stage all preview rows
  as new F1-Grid rows. The normal page Save action persists manual and staged
  edits together through one atomic batch-save request. The save endpoint
  must repeat validation and rely on the unique constraint to handle races;
  any invalid row rejects the whole batch and leaves user changes intact.
- Existing keys are reported as conflicts, not updated. This keeps uploads
  additive and prevents accidental bulk replacement.

### Data flow and error handling

Manual entry follows the existing row-form flow: select masters, validate,
save the current F1-Grid change set, then accept the server-returned rows.

Excel import follows: download template or choose file -> parse -> preview ->
client format and within-file duplicate checks -> tenant-scoped server
preflight -> user confirmation -> stage valid rows -> page-level batch save.
If preflight fails, errors stay attached to their spreadsheet row and no row
is staged. If the final batch save fails, preserve all staged and manual
changes; never clear the grid or show success.

### Responsive and validation requirements

- At 1280px, keep search controls and page actions on one compact row when
  space permits; the grid uses the available page height.
- At 768px and 375px, allow search/actions to wrap and keep the preview form
  vertically arranged. Wide grids scroll internally without page-level
  horizontal overflow.
- Test file parsing, header/date/number handling, duplicate rows, tenant
  preflight results, staging, atomic-save error preservation, permissions,
  and the 375px/768px/1280px browser layouts.
- Update F1-GRID documentation for any visible grid behavior introduced.

## Out of scope

- Applying the DDL to any database.
- Import-driven updates or upserts to existing price rows.
- Rejecting different-start-date records solely because their effective
  periods overlap.
- New currency management or exchange-rate conversion.
- Replacing existing item/customer master maintenance screens.
