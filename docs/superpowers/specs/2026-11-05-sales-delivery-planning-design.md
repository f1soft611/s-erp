# Sales Delivery Planning Design

## Approved direction

Support both tenant workflows with one shared delivery-plan data model:

- `MANUAL`: users create and maintain plans between order registration and delivery registration.
- `AUTO`: saving an order creates its plan in the same transaction; plan screens are hidden, while delivery registration still consumes plan quantities.
- Direct deliveries remain available in either mode and do not require a plan.
- New and existing tenants default to `AUTO`, preserving the current direct order-to-delivery workflow.

## Data model

Add `tb_tenant.delivery_plan_mode` (`AUTO` or `MANUAL`). Add one plan header per sales order and plan details for each scheduled quantity. A plan detail references a sales-order detail, has an optional planned date, planned quantity, and delivered quantity. Multiple plan details can represent split dates or quantities for the same order line. Plan details retain created/updated audit fields.

Delivery details for `ORDER` deliveries must reference a plan detail belonging to the same tenant, order, and order line. `DIRECT` delivery details have no order or plan references. Existing order deliveries are backfilled to a plan and linked to their matching plan detail before the new constraints are installed. Plan delivered quantities are initialized from the current `tb_sales_order_dt.shipped_qty`; the migration does not add historic quantities a second time.

Plan quantity sums must not exceed the source order quantity, and delivered quantity must not exceed planned quantity. Plan changes and delivery create/update/delete share the order-header lock and update delivered quantities and order shipped quantities atomically.

## Order lifecycle

In `AUTO`, order creation inserts the order and initial plan together. Initial plan date is the order-detail delivery date, falling back to the order-header delivery date; when neither exists, the plan date remains unset rather than inventing a date.

Order updates preserve existing order-detail IDs by synchronizing rows in line order instead of deleting and recreating them. They may not reduce an order line below its planned or delivered quantity or remove a line referenced by delivery history. In `AUTO`, eligible plan rows track order quantity changes; in `MANUAL`, existing plan allocations are preserved and any newly unplanned quantity remains visible for scheduling. Header-only edits remain possible.

## Screens and navigation

- Keep order registration/status.
- Add `Delivery Plan > Registration` and `Delivery Plan > Status`, available only in `MANUAL`.
- Keep delivery registration/status in both modes.
- Order-linked delivery registration selects a remaining plan detail in either mode and cannot exceed its remaining planned quantity. Direct delivery remains unchanged.
- Plan status shows planned and delivered quantities and supports opening registration/editing by permission.
- The backend enforces mode restrictions; hiding plan navigation is not an authorization boundary.

## Migration and compatibility

The dated SQL is provided, mirrored under `backend/DATABASE`, and not applied to a live database. Existing orders receive an initial plan and existing delivery details are associated with that plan. New orders in `AUTO` receive plans automatically; new orders in `MANUAL` require explicit planning before order-linked delivery.

The plan-menu nodes are added under Sales and granted only by matching existing order/delivery menu permissions. Frontend dashboard routing uses the tenant's mode to suppress plan pages in `AUTO`.

## Verification

Verify DDL constraints and mirrored files; service tests for both modes, backfill-compatible plan links, partial/split plans, quantity limits, order edit stability, delivery adjustments and direct deliveries; frontend tests for mode-specific navigation and plan-backed delivery; then run Maven/Vitest/build/lint and browser checks at 375, 768, and 1280 pixels.
