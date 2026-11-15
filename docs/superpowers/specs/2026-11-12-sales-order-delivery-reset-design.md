# Sales Order and Delivery Data Reset Design

## Goal

Provide a tenant-scoped PostgreSQL script to clear the existing order-to-delivery business flow so it can be entered again from the beginning. The script must not be applied to the database by this task.

## Scope

- Require an explicit target `tenant_id`; do not infer a tenant from an available MCP server or existing rows.
- Delete the target tenant's sales delivery statements connected to deliveries, then delivery details and headers, plan details and headers, and sales orders. Order details are removed through the existing header cascade.
- If any purchase request detail references a target-tenant sales order, delete its entire purchase request document, including sibling details. Delete an associated purchase-confirmation header only if no remaining request detail references it.
- Preserve tenant, customer, material, warehouse, and other master data.
- Preserve primary-key and business-document number sequences to avoid ID or number reuse.
- Do not alter unrelated tenant data or unrelated purchase requests and confirmations.

## Approaches considered

1. **Tenant-scoped FK-ordered deletes (selected):** precisely clears the flow while preserving master data and unrelated tenant records.
2. **Table-wide `TRUNCATE`:** rejected because it can affect all tenants and dependent tables.
3. **Soft-disable records:** rejected because the old transaction rows and references would remain, preventing a clean re-entry.

## Execution and safety

- The operator supplies a positive tenant ID explicitly; a missing or invalid value aborts before deletion.
- The SQL reports the affected-row counts before committing, performs all deletes in one transaction, and uses child-before-parent order.
- Any FK conflict or other SQL error aborts the transaction. No sequence reset is performed.
- This task uses PostgreSQL MCP only for read-only schema metadata and does not read business rows or apply the script.

## Confirmed schema relationships

Read-only PostgreSQL MCP metadata confirmed the order, plan, delivery, statement, purchase-request, and purchase-confirmation columns and foreign-key relationships. In particular:

- Delivery details reference delivery headers, plan details, and order details; all observed delete rules are `NO ACTION`.
- Plan details reference plan headers and order details; the plan header no longer contains a sales-order foreign key.
- Purchase-request details reference order headers/details and purchase-request headers; deleting a request header cascades to its details.
- Sales-statement details reference statement headers; statement headers reference delivery headers, with `NO ACTION`.
- Purchase-confirmation headers are referenced by request details. They must only be removed when no surviving detail references them.

No schema changes, application changes, live data edits, or sequence changes are included.
