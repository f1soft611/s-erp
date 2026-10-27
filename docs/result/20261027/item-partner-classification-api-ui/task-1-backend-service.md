# Task 1 — Backend classification contracts and service

## Scope and source

- Implements Task 1 of the [implementation plan](../../../superpowers/plans/2026-10-27-item-partner-classification-api-ui.md).
- Contracts follow the [API/UI specification](../../../spec/20261027/20261027_003_품목_거래처_분류관리_API_UI_상세사양서.md) and [unapplied schema specification](../../../spec/20261027/20261027_002_품목_거래처_분류스키마_상세사양서.md).
- No controller, authorization, frontend, master-data integration, DDL, or database writes were implemented/executed. Menu permissions remain Task 2; no tenant-admin checks were added.

## Implementation

- `ClassificationKind` exposes only ITEM (maximum level 3) and PARTNER (maximum level 2). Enum-selected statement prefixes map to fixed table/column SQL, without request-supplied SQL identifiers.
- Service signatures receive explicit `tenantId` and write `actorId` (supplied from authenticated `LoginVO.getUniqId()` in Task 2, consistent with the audit column contract).
- `ClassificationVO` contains only `id`, `name`, `level`, `parentId`, `sortSeq`, and `useAt`.
- `ClassificationSaveRequestVO` is the update contract (`name`, `sortSeq`, `useAt`). `ClassificationCreateRequestVO` extends it with `parentId` for creation only. Neither request accepts level, tenant, or audit fields.
- Names are trimmed and validated at 1–50 characters; sort is nonnegative with default 0. Creation defaults useAt to Y; update requires explicit Y/N. No duplicate-name rule is introduced.
- Root level is 1; children derive their level from an active same-tenant parent below the maximum depth.
- Every DAO call receives tenant scope. Inserts bind the tenant and return the generated ID with PostgreSQL `RETURNING`. Updates and all row/parent/child reads include tenant predicates.
- Create locks its parent with `FOR UPDATE`; update locks its target before counting active children. Reactivation also locks and validates its parent. Writes and checks share a Spring transaction with rollback for checked exceptions.
- Locking selects bypass second-level cache and flush the local cache, avoiding cached reads in place of row locks.
- Active children prevent deactivation. Parent and level never appear in update assignments. No master-reference checks prevent deactivation.
- Inserts write `created_by` and DB `CURRENT_TIMESTAMP`; updates write `updated_by` and DB `CURRENT_TIMESTAMP`. The database retains nullable modification audit columns until modification.

## Test evidence

1. Tests were added before production code. `mvn -Dtest=ClassificationServiceImplTest test --quiet` exited 1 because the classification service and model/DAO classes did not yet exist.
2. The same focused service command passed after implementation: **26 tests, 0 failures/errors**.
3. Mapper tests initially failed in two cases because locking selects used cache defaults. After explicitly disabling cache and flushing locking reads, both cases passed.
4. Final targeted regression command:

   ```powershell
   cd backend
   mvn -Dtest=ClassificationServiceImplTest,ClassificationMapperTest,CommonCodeItemServiceImplTest,CommonCodeMapperJdbcTypeTest test --quiet
   ```

   **39 tests, 0 failures/errors**: 26 classification service, 6 parsed-MyBatis mapper contract, 4 common-code service, 3 common-code mapper.

Tests cover both classification kinds, derived levels, missing/foreign-tenant parents, maximum depth, inactive parents, invalid inputs, active-child blocking, immutable update hierarchy, reactivation, missing targets/zero-row updates, audit parameters, SQL tenant predicates, lock order/cache configuration, and DB error propagation.

## MCP and deployment limitations

- Direct read-only MCP `list_tables` succeeded: classification tables were absent. `describe_table(tb_tenant)` confirmed the central tenant key is BIGINT. No data rows or credentials were queried.
- Since target classification tables do not exist, their column contracts are based on the explicitly unapplied `20261027_002` specification, not claimed as live metadata.
- No migration or PostgreSQL integration/concurrent transaction execution was performed. Mapper tests parse/render SQL without connecting to a database. Applying the separately approved migration is a deployment prerequisite.
- The supplied baseline had two unrelated configuration errors in `MinioStorageConfigTest` and `SecurityConfigTest`; those tests/configuration were not changed and the full suite was not rerun for this bounded task.
- Screenshots are not applicable to this backend-only task; UI/browser evidence belongs to subsequent tasks.
- Existing modified planning/specification files and `backend/backend` were left untouched and excluded from this task's commit.
