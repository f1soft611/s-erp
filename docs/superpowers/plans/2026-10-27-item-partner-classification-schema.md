# Item and Partner Classification Schema Implementation Plan

> **For agentic workers:** Follow this plan task-by-task. Keep every generated DDL unapplied. Steps use checkbox syntax for tracking.

**Goal:** Prepare tenant-scoped item/partner classification tables and safe central-DB master links matching S-ERP conventions.

**Architecture:** Add two self-referencing classification masters with BIGINT surrogate IDs and tenant-composite keys. Link item classification through a new nullable ID; reuse central customer `business_kind1/2` as nullable BIGINT IDs with data-preserving guards, tenant FKs, and a composite child-parent FK.

**Tech Stack:** PostgreSQL, dated SQL history under `docs/database` and `backend/DATABASE`, Markdown specifications.

---

## Files and responsibilities

- `docs/directions/20261027/20261027_002_품목_거래처_분류스키마_작업지시서.md`: approved scope and safety invariants.
- `docs/plan/20261027/20261027_002_품목_거래처_분류스키마_계획서.md`: file ownership and verification sequence.
- `docs/spec/20261027/20261027_002_품목_거래처_분류스키마_상세사양서.md`: exact column, constraint, migration, and rollback contract.
- `docs/database/20261027/20261027_002_create_item_partner_classification_schema.sql`: central DB migration draft.
- `docs/database/20261027/20261027_002_rollback_item_partner_classification_schema.sql`: guarded rollback draft.
- `docs/database/20261027/20261027_002_change_item_partner_classification_schema.md`: date, impact, MCP evidence, and unapplied status.
- `backend/DATABASE/20261027/`: byte-identical copies of the three dated database artifacts.
- `docs/database/db-schema.md`: clearly separated proposal entry; current applied schema stays unchanged.
- `docs/result/20261027/item-partner-classification-review/20261027_001_품목_거래처_분류설정_구현검토.md`: findings and outcome.

## Task 1: Lock the verified schema contract

- [x] Read the approved design and dated work instruction.
- [x] Use the basic `s-erp-postgresql-readonly` MCP for `public.tb_tenant`, `public.tb_material_info`, and `public.tb_customer_info`; confirm `(id, tenant_id)` unique targets and the current `business_kind1/2` types.
- [x] Use only a limited aggregate to check whether `business_kind1/2` contain nonblank values; never select the values themselves.
- [x] Do not use tenant MCP metadata as a substitute for central DB.

Expected evidence: central business-kind columns are nullable varchar, the masters expose tenant-composite unique targets, and a nonblank-value count is recorded without exposing rows.

## Task 2: Draft guarded migration

- [x] Create `tb_cls_item` with `item_cls_id BIGSERIAL`, `tenant_id BIGINT`, `item_cls_nm VARCHAR(50)`, `item_cls_lvl SMALLINT`, `upper_item_cls_id BIGINT`, `sort_seq INT DEFAULT 0`, `use_at CHAR(1) DEFAULT 'Y'`, and S-ERP audit fields.
- [x] Create `tb_cls_partner` with the corresponding partner fields and level range 1–2.
- [x] For both tables add a surrogate PK, `(id, tenant_id)` unique target, tenant FK, same-tenant self-parent FK, level/root shape CHECK, `use_at IN ('Y','N')`, lookup indexes, and column comments. No code string PK, user-supplied classification code, cascade delete, or duplicate-name rule is introduced.
- [x] Add `tb_material_info.item_cls_id BIGINT NULL`, its `(item_cls_id, tenant_id)` FK and `(tenant_id, item_cls_id)` index. Preserve `mat_cata_type`.
- [x] Before converting `tb_customer_info.business_kind1/2`, assert both are nullable varchar columns without defaults and have no values other than NULL/whitespace. Raise an exception if any nonblank value exists.
- [x] Convert blank values to NULL and both columns to BIGINT. Add `business_kind1` tenant FK and a composite `(business_kind2, business_kind1, tenant_id)` FK to partner `(partner_cls_id, upper_partner_cls_id, tenant_id)` so the selected child is directly under the selected parent.
- [x] Add a CHECK requiring `business_kind1` whenever `business_kind2` is present, supporting indexes and comments. Preserve `business_kind3`.
- [x] Enclose migration in a transaction, acquire locks before inspection/conversion, fail if the classification tables already exist, and never execute the source SQL containing `DROP TABLE ... CASCADE`.

## Task 3: Draft guarded rollback and history

- [x] Lock both master tables and both classification tables.
- [x] Raise an exception if either classification table contains a row, if a new master classification ID is non-NULL, or if any dependent object prevents the expected named drops.
- [x] On an empty schema only, drop named master FKs/CHECKs, change the empty nullable business-kind columns back to VARCHAR, remove the new item column, then drop indexes and partner/item tables in dependency order. Do not use `CASCADE`.
- [x] Write the dated change record with affected objects, tenant impact, central-MCP evidence, unapplied status, and rollback guard.
- [x] Copy all three artifacts to `backend/DATABASE/20261027` without content changes.

## Task 4: Update schema tracking and verify

- [x] Add a separate `미적용 설계안` section to `docs/database/db-schema.md`; do not present proposed columns as current deployed schema.
- [x] Compare each docs/backend file pair using PowerShell `Get-FileHash`.
- [x] Run `git diff --check`.
- [x] Review all constraint target column order against central MCP metadata and verify rollback refuses populated or referenced classification data.
- [x] Do not run PostgreSQL DDL or claim runtime SQL validation because this task has no writable/test database.

Verification commands:

```powershell
Get-FileHash docs\database\20261027\20261027_002_create_item_partner_classification_schema.sql, backend\DATABASE\20261027\20261027_002_create_item_partner_classification_schema.sql
Get-FileHash docs\database\20261027\20261027_002_rollback_item_partner_classification_schema.sql, backend\DATABASE\20261027\20261027_002_rollback_item_partner_classification_schema.sql
Get-FileHash docs\database\20261027\20261027_002_change_item_partner_classification_schema.md, backend\DATABASE\20261027\20261027_002_change_item_partner_classification_schema.md
git diff --check
```

Expected: each same-name pair has matching SHA-256; `git diff --check` exits 0. No database changes occur.
