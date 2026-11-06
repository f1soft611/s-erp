# 20261105_001 창고 스키마 변경 이력

## 변경 일자

2026-11-05

## 변경 내용

- `tb_warehouse` 테이블을 실무 운영 구조로 재생성 (`20261105_001_create_warehouse_schema.sql`)
- 2026-09-09에 생성했던 테스트용 구조(`warehouse_nm`, `use_at` 등, `20260909_001_create_warehouse_schema.sql`)는 폐기되었으며, 더 이상 유효하지 않음
- 신규 컬럼: `warehouse_code`, `warehouse_name`, `warehouse_type`, `delete_lock_at`, `disuse_at`, `stock_qty_disp_at`, `stock_io_at`, `safety_stock_alert_at`, `stock_default_at`, `plant_id`, `customer_id`, `manager_user_id`, `department_id`, `tel_no`, `fax_no`, `address`, `remark`, `created_by`, `created_at`, `updated_by`, `updated_at`
- 제약조건: `pk_tb_warehouse`, `uq_tb_warehouse_tenant_code(tenant_id, warehouse_code)`, `fk_tb_warehouse_tenant`, `fk_tb_warehouse_customer(customer_id, tenant_id)`, `fk_tb_warehouse_manager_user`, `fk_tb_warehouse_department`, `ck_tb_warehouse_yn`
- 인덱스: `ix_tb_warehouse_tenant_id`

## 적용 대상 테이블

- `tb_warehouse` (재생성)

## 영향 범위

- 기존 테스트용 창고 화면(`frontend/src/pages/settings/system/warehouses`, `backend .../let/system/warehouses`, `EgovSystemWarehouse_SQL_postgresql.xml`)은 메뉴 미등록 상태였고 옛 컬럼 구조(`warehouse_nm`, `use_at`) 기준이라 신규 구조와 맞지 않음. 해당 화면/코드는 별도 작업에서 삭제 후 `co/master` 패턴으로 재구축 예정.
- `tb_tenant`, `tb_customer_info`, `tb_user`, `tb_department`는 FK 참조 대상이며 컬럼 변경 없음.
- 현재 `tb_warehouse`를 참조하는 다른 테이블의 FK는 없음 (2026-11-05 MCP 조회 기준).

## 롤백 여부

- 가능. `20261105_001_rollback.sql` 실행 시 `tb_warehouse` 테이블을 DROP 한다.

## DB MCP 확인 근거

- `s-erp-postgresql-readonly` MCP로 재생성 이후 구조 확인 완료 (2026-11-05):
  - `list_tables` → `tb_warehouse` 존재, 코멘트 `창고`
  - `describe_table tb_warehouse` → 스크립트와 동일한 컬럼 구조
  - `information_schema.table_constraints` 조회 → `pk_tb_warehouse`, `uq_tb_warehouse_tenant_code`, `fk_tb_warehouse_tenant`, `fk_tb_warehouse_customer`, `fk_tb_warehouse_manager_user`, `fk_tb_warehouse_department` 모두 생성 확인
  - FK 대상 테이블(`tb_tenant`, `tb_customer_info`, `tb_user`, `tb_department`)의 PK/UNIQUE 제약 사전 확인 완료

## 관련 문서

- (작업지시서 미정)
