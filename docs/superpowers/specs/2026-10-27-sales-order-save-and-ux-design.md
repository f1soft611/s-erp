# Sales Order Save API and Entry UX Design

## Status

- Extends the approved create-only design in
  [2026-10-26-sales-order-entry-design.md](2026-10-26-sales-order-entry-design.md).
- The user's follow-up authorizes sequential UX improvements, requires the
  existing eGovFrame backend pattern, and leaves table creation to the user.
- This addendum supersedes the earlier exclusions of the sales-order save API
  and automatic order numbering. It does not authorize creating or applying
  database tables.

## Context

The existing order-entry screen edits a header and detail rows in browser state,
but saving is disabled. The original task direction and schema contract define
`tb_sales_order_hd` and `tb_sales_order_dt`, while the existing design explicitly
deferred persistence and order-number generation.

The read-only `s-erp-postgresql-readonly` MCP was used for this design:

- `list_tables` confirmed that `tb_sales_order_hd` and `tb_sales_order_dt` do
  not currently exist in the default database.
- `describe_table` confirmed the customer/material tenant keys and the
  `tb_id_sequence` key/value columns.
- No business rows or tenant records were queried. No DDL was run.

The codebase already has `IdSequenceService`, `IdSequenceDAO`, and a
PostgreSQL MyBatis mapper using an atomic `INSERT ... ON CONFLICT ... RETURNING`
sequence operation. Existing eGovFrame API examples use
`Controller → Service interface/implementation → DAO/EgovAbstractMapper →
MyBatis XML`, authenticated `LoginVO`, and `ResultVoHelper`.

## Approaches considered

1. **Sequential vertical slices (recommended).** Implement the transactional
   create API first, then connect it to the form with validation and clear
   pending/error/success states, then address unsaved-change protection and
   remaining item/mobile usability. Each stage has its own focused tests and
   documentation. This follows the user's requested order and makes the save
   contract verifiable before the UI depends on it.
2. **Frontend-first.** Improve validation and layout while leaving save
   disabled until later. This improves entry but does not resolve the primary
   workflow gap.
3. **Single broad change.** Build API, form behavior, navigation protection,
   and mobile adjustments together. This gives fewer interim states but raises
   regression risk and makes failures harder to isolate.

## Design

### 1. Create API

- Add `POST /api/v1/sales/orders`.
- Require an authenticated `LoginVO`. Derive `tenantId` and audit user from
  that principal; ignore or reject tenant/audit fields supplied by the client.
- Keep the eGovFrame layers and conventions:
  - REST controller returning the established `ResultVO`/`ResultVoHelper`
    response and HTTP `201 Created`.
  - Service interface and `EgovAbstractServiceImpl` implementation with
    transaction management.
  - DAO extending `EgovAbstractMapper` and PostgreSQL MyBatis mapper XML.
- Persist the header and all detail rows in one transaction. Any validation or
  insert failure must fail the request and roll back the whole order.
- Use the existing `IdSequenceService` for business order numbers. Generate
  `SO-YYYYMMDD-NNNN`, where the date is the submitted order date, the sequence
  is tenant-and-date scoped, and `NNNN` is a minimum four-digit width. Reject
  generation if the final value cannot fit `order_no VARCHAR(30)`.
- Do not add a sequence table or alter the approved order schema.

### 2. Request and persistence contract

The request contains only user-editable fields:

```json
{
  "orderDt": "2026-10-27",
  "customerId": 1,
  "quotNo": null,
  "deliveryDt": null,
  "deliveryPlace": null,
  "deliveryMethod": null,
  "remark": null,
  "details": [
    {
      "materialId": 1,
      "orderQty": 2.00,
      "unitPrice": 100.00,
      "vatAmt": 20.00,
      "deliveryDt": null
    }
  ]
}
```

- Do not accept `tenantId`, generated IDs, `orderNo`, status, audit fields,
  shipped quantity, line status, supply amount, or line/header total as
  authoritative request data.
- Require order date, a tenant-owned customer, at least one detail line, and a
  tenant-owned material on every line.
- Require quantity greater than zero; unit price and VAT must be nonnegative.
  Reject non-finite/out-of-range values and values that cannot be represented
  by the schema's `NUMERIC(15,2)` columns.
- Preserve the screen's editable VAT behavior. The request may supply `vatAmt`;
  when absent, derive 10% of supply amount using two-decimal `HALF_UP` rounding.
- Recalculate `supply_amt = order_qty × unit_price` and
  `total_amt = supply_amt + vat_amt` on the server with `BigDecimal` and
  two-decimal `HALF_UP` rounding. Recalculate header `total_amt` from the saved
  detail totals.
- Assign `line_no` consecutively in submitted order. Set the initial header
  status to `수주등록`, line status to `대기`, shipped quantity to zero, and
  `use_at` to its schema default. These are not client-controlled.
- Verify customer and material ownership using `(id, tenant_id)` in the
  database. Composite foreign keys remain the final integrity guard.
- Return the created order, including generated header/detail IDs, order
  number, line numbers, and persisted totals using the existing API response
  envelope.

### 3. Frontend save flow

- Replace the disabled save action only after the create endpoint is available.
- Validate the required customer, order date, at least one detail line, item
  selection, quantity, unit price, and VAT before sending.
- Disable duplicate submissions while saving. On success, show the returned
  order number and retain the saved order state; on failure, show an actionable
  error and preserve every entered value.
- Do not report success until the API confirms the transaction committed.
- Keep tenant/audit/generated values out of the frontend request.

### 4. Sequential follow-up UX

After save integration, improve the remaining identified usability issues in
separate focused steps:

1. Warn before navigating away from a changed unsaved order. React Router 7's
   `useBlocker` requires a data router, so the app root must use
   `createBrowserRouter`/`createMemoryRouter` while preserving the existing
   route tree. Pair the in-app blocker with browser `beforeunload`.
2. Make item selection discoverable next to the detail grid, keep its button
   keyboard-accessible, and apply the selected master ID/code/name atomically to
   the chosen row. Keep the existing code-cell picker available.
3. Keep narrow-screen detail entry inside the grid's horizontal scroll region
   and prevent page-level horizontal overflow.

Do not add draft persistence, order search/edit, quote conversion, new menu
configuration, or unrelated form features in this work.

## Testing and rollout constraints

- Backend: unit-test request validation, order-number formatting/scope, amount
  recalculation, transactional header/detail persistence, tenant scoping, and
  rollback behavior using existing project test conventions.
- Frontend: test validation, request payload mapping, pending/success/error
  states, duplicate-submit prevention, and input preservation on failure.
- Run the focused backend tests and frontend tests/build after each relevant
  slice.
- The user owns order-table creation. Even if those tables later appear in the
  database, tests in this task must not write to the database; record whether
  an authorized integration test was performed separately.
- Do not create, migrate, or apply order tables. Do not change the existing
  schema contract without a separate user-approved requirement.
