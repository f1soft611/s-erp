# Sales Delivery Item-Level Flow Design

## Context

The existing flow treats an order or plan header as the selection unit. That can pull unrelated item rows into a plan or delivery and does not expose plan progress at the same granularity as delivery status. The approved change makes source selection and quantity control operate on detail rows.

## Goals and scope

- Keep AUTO planning at one sales order per automatically generated plan.
- In MANUAL mode, allow selected detail rows from multiple sales orders to form one plan document.
- In delivery registration, allow selected detail rows from multiple plans to form one delivery document.
- Show delivery-plan status as one row per plan detail, following the delivery-status grid pattern.
- Preserve plan splitting, partial delivery, direct delivery, tenant isolation, permissions, and existing over-delivery policy.
- Exclude transaction statements from this change.

## Approaches considered

1. **Select eligible detail rows (recommended).** Plan details retain their source order-detail identity; delivery details retain their plan-detail identity. This supports partial quantities, multi-order plans, multi-plan deliveries, and line-level remaining balances with referential integrity.
2. Select a header and automatically include all its eligible details. This is simpler but violates the requirement to choose only the intended items.
3. Store lists of order or plan IDs in document headers. This makes source relationships and quantity reconciliation difficult to validate.

## Data model and API

- A plan header represents a planning document, not a single sales order. Remove the header's singular order relationship and the per-order unique constraint. Keep the source order and order-detail IDs on each plan detail.
- Replace the plan-detail-to-header composite relationship that includes order ID with a header/tenant relationship. Preserve a separate tenant/order/order-detail relationship on each plan detail.
- Plan create/update requests carry `salesOrderId` on each detail row; they do not depend on one header-level order ID.
- The AUTO lookup-by-order operation resolves its plan through plan details. AUTO continues to create only one plan for that order.
- Delivery source search returns plan-detail rows with a positive undelivered balance. The delivery request continues to carry the plan-detail ID per detail; selection does not imply selection of sibling rows.
- A delivery header continues to have one customer. Selected delivery lines must therefore have the same customer. A plan itself may contain rows from different customers; customer and order information is returned per plan detail.

## Workflow and quantity invariants

### Planning

The source picker lists sales-order detail rows whose remaining plan quantity is positive:

`remaining plan quantity = ordered quantity - sum of active planned quantities for that order detail`

The user may select individual rows from multiple orders. Selected rows are loaded into one MANUAL plan, and existing split-row behavior remains available. When editing a plan, its own current quantities are included when calculating its available capacity. The server rechecks the balance transactionally before saving.

### Delivery

The source picker lists individual plan-detail rows whose remaining delivery quantity is positive:

`remaining delivery quantity = planned quantity - delivered quantity`

The user may select individual rows across multiple plans and enter partial quantities, but cannot exceed the remaining quantity on any selected row. Unselected plan details are not added. The server locks and validates source orders/details, then updates plan delivered quantities and order shipped quantities atomically for create, update, and delete. Direct deliveries remain unchanged.

### Plan status

The main status grid returns one row per plan detail, keyed by plan-detail ID. Each row includes plan/order identifiers, customer, plan date, item, ordered quantity, planned quantity, delivered quantity, and remaining delivery quantity. Repeated plan-header values are merged as in delivery status. Opening a row continues to show and edit its containing plan through the existing plan form.

## User experience and errors

- The planning picker uses checkboxes for eligible order-detail rows and a Select action. It never implicitly selects all rows from an order.
- The delivery picker uses the same item-row selection behavior for eligible plan-detail rows.
- If selected delivery rows belong to different customers, the selection is rejected without closing the picker.
- Quantity, source-identity, tenant, permission, and concurrency failures are reported through existing page error patterns; the server remains authoritative.
- Use existing F1Grid merge behavior and responsive layouts; do not modify shared grid behavior unless a focused requirement cannot be met with current capabilities.

## Migration and compatibility

- Add a dated migration and rollback script in both `docs/database` and `backend/DATABASE`.
- Preserve existing plan and delivery detail rows. The migration removes the plan header's single-order constraint and adjusts foreign keys to match the new detail-owned order relationship.
- Do not apply database changes through MCP. Update the cumulative schema document and record migration evidence from the read-only PostgreSQL MCP before implementation.
- Existing one-order plans remain valid. AUTO generation, delivery history, and direct delivery remain supported.

## Verification

- Backend: eligible source rows and remaining quantities; multi-order plan persistence; AUTO one-order behavior; plan edits; partial and multi-plan delivery; same-customer validation; transaction locking and counter restoration on update/delete; direct-delivery regression; tenant and permission checks.
- Frontend: individual line selection in both pickers; no implicit sibling selection; multi-order plan rows; multi-plan delivery rows; same-customer guard; per-detail status rows and merged plan values; responsive layout.
- Schema: migration/rollback safeguards, foreign-key and quantity invariants, and byte-identical paired SQL/history files.
- Run targeted frontend tests, frontend build, backend tests, Java 8 compatibility checks, SQL contract checks, and browser validation at 375px, 768px, and 1280px. Save result documentation and screenshots under an English-only path.
