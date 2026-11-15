# Sales Flow Data Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe PostgreSQL script that clears one explicitly selected tenant's existing sales-order-to-delivery flow for re-entry.

**Architecture:** Keep this as an operator-run SQL utility, not an application feature or schema migration. The SQL validates an explicit tenant, snapshots the affected document IDs, reports impact, deletes dependent rows in FK order inside one transaction, and defaults to rollback; operators review counts and explicitly commit. Preserve master data, unrelated tenant records, and all ID/document-number sequences.

**Tech Stack:** PostgreSQL, Markdown, PowerShell for static validation.

---

## Files and responsibilities

- `docs/directions/20261112/20261112_010_수주_출하흐름_데이터_초기화_작업지시서.md`: approved scope and completion requirements.
- `docs/plan/20261112/20261112_010_수주_출하흐름_데이터_초기화_계획서.md`: project-level execution and validation plan.
- `docs/spec/20261112/20261112_010_수주_출하흐름_데이터_초기화_상세사양서.md`: exact SQL contract and FK-aware deletion order.
- `docs/database/20261112/20261112_010_reset_sales_order_delivery_flow.sql`: canonical reset SQL.
- `backend/DATABASE/20261112/20261112_010_reset_sales_order_delivery_flow.sql`: byte-identical SQL copy.
- `docs/database/20261112/20261112_010_change_sales_order_delivery_flow_reset.md` and matching `backend/DATABASE` file: scope and irreversibility record; state explicitly that schema is unchanged.
- `docs/result/20261112/sales-flow-data-reset/20261112_010_수주_출하흐름_초기화_작업결과.md`: final validation evidence and no-live-application statement.

## Task 1: Detail the reset contract

**Files:**
- Create: `docs/spec/20261112/20261112_010_수주_출하흐름_데이터_초기화_상세사양서.md`

- [x] Record explicit tenant selection, target and excluded tables, purchase-request whole-document behavior, shared purchase-confirmation protection, sequence preservation, rollback-default execution, backup warning, and confirmed schema evidence.
- [x] Check that the spec matches the approved design and direction; do not introduce unspecified data domains.

## Task 2: Create the operator SQL

**Files:**
- Create: `docs/database/20261112/20261112_010_reset_sales_order_delivery_flow.sql`

- [x] Require a positive tenant ID supplied by the operator and abort before deletion if it is absent or not a tenant.
- [x] In one transaction, identify target orders and deliveries by tenant; identify statements linked to target deliveries and complete purchase-request documents with detail rows whose `sales_order_id` or `sales_order_detail_id` belongs to the target tenant's orders.
- [x] Record the purchase-confirmation IDs referenced by those purchase requests before removing the request documents.
- [x] Report target counts, then delete statement details/headers, delivery details/headers, plan details/headers, full linked purchase-request headers (letting their FK cascade remove details), orphaned linked purchase-confirmation headers, and order headers (letting their FK cascade remove details), in that order.
- [x] Do not reset sequences or alter master data. Leave the script ending in `ROLLBACK`; document that an operator must review the counts and replace that terminal statement with `COMMIT` to apply the reset.
- [x] Verify that any FK error aborts the transaction and that every direct delete is tenant-scoped or uses IDs captured from tenant-scoped parent rows.

## Task 3: Mirror and explain the SQL

**Files:**
- Create: `backend/DATABASE/20261112/20261112_010_reset_sales_order_delivery_flow.sql`
- Create: `docs/database/20261112/20261112_010_change_sales_order_delivery_flow_reset.md`
- Create: `backend/DATABASE/20261112/20261112_010_change_sales_order_delivery_flow_reset.md`

- [x] Copy the canonical SQL without edits and verify both SQL files have the same SHA-256 hash.
- [x] Record date, purpose, affected tables, tenant isolation, preserved data/sequences, execution/rollback limitations, and “no schema change” in the paired change records.
- [x] Do not add a schema rollback SQL or edit `db-schema.md`, because this is an operator data-reset script and not a schema migration.

## Task 4: Validate and document

**Files:**
- Create: `docs/result/20261112/sales-flow-data-reset/20261112_010_수주_출하흐름_초기화_작업결과.md`

- [x] Static-review the SQL for tenant-scoped selection, child-before-parent deletes, default `ROLLBACK`, and absence of sequence resets or live `COMMIT`.
- [x] Compare the paired SQL and change-record files byte-for-byte; run `git diff --check`.
- [x] Record that PostgreSQL MCP metadata was used for table/column/FK evidence only, no business rows were read, no screenshot applies, and the script was not run against any database.
- [x] Document that committed deletion is not reversible by SQL and requires restoring a backup.

## Validation commands

```powershell
Get-FileHash docs\database\20261112\20261112_010_reset_sales_order_delivery_flow.sql -Algorithm SHA256
Get-FileHash backend\DATABASE\20261112\20261112_010_reset_sales_order_delivery_flow.sql -Algorithm SHA256
git diff --check
```

Expected: matching hashes and no whitespace errors. Do not execute this reset script as a validation step.
