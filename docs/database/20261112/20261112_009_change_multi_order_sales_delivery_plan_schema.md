# 20261112_009 다중 수주 출하계획 스키마 변경 이력

## 변경일·변경 내용·적용 대상

- 변경일: 2026-11-12.
- 변경 대상: `tb_sales_delivery_plan_hd`, `tb_sales_delivery_plan_dt`.
- 계획 헤더의 단일 `sales_order_id` 컬럼과 수주당 헤더 단일성을 강제하던 관계를 제거한다. 계획상세는 각 행의 원 수주 및 수주상세를 계속 보유한다.
- 헤더에 `(sales_delivery_plan_id, tenant_id)` unique 키를 추가하고, 계획상세-헤더 FK를 해당 키로 교체한다.
- 원 수주상세를 검증하는 `fk_sales_delivery_plan_dt_order_line`과 출하상세-계획상세 FK `fk_sales_delivery_dt_plan_source`는 변경하지 않는다.
- 영향 범위는 출하계획 헤더의 수주 참조 및 계획상세의 헤더 참조 무결성으로 한정한다. 실제 DB에는 적용하지 않았다.

## 확인 근거

- 기본 `s-erp-postgresql-readonly` MCP의 `list_tables`, `describe_table` 및 제한된 `information_schema` 제약 조회로 테이블·컬럼·제약 메타데이터만 확인했다. 업무 데이터 행은 조회하지 않았다.
- 확인한 기존 헤더 수주 제약은 `uq_sales_delivery_plan_hd_order`, `uq_sales_delivery_plan_hd_reference`, `fk_sales_delivery_plan_hd_order`, `ix_sales_delivery_plan_hd_tenant_order`이다. `sales_order_id`의 보조 not-null check 제약명은 `tb_sales_delivery_plan_hd_sales_order_id_not_null`이다.
- 기존 계획상세 헤더 FK는 `fk_sales_delivery_plan_dt_hd`; 주문상세 FK는 `fk_sales_delivery_plan_dt_order_line`이다. 납품상세의 계획상세 FK `fk_sales_delivery_dt_plan_source`도 확인 후 유지 대상으로 정했다.
- 초기 DDL 이력 `20261105_002_add_sales_delivery_planning.sql`과 20261112_008 마이그레이션 형식을 대조했다. 별도 복합-key 메타데이터 조회는 제약 이름/컬럼 검토를 위한 읽기 전용 조회였으며 데이터 행을 조회하지 않았다.

## 적용 순서

1. 적용 전 백업 및 현재 계획 스키마/제약이 예상한 선행 상태인지 확인한다.
2. `20261112_009_allow_multi_order_sales_delivery_plan.sql`을 운영 승인 후 단일 트랜잭션으로 적용한다. 스크립트가 계획 헤더와 상세 테이블을 잠그고 새 tenant 복합 unique를 만든 다음 종전 관계를 교체한다.
3. 적용 후 계획 헤더에는 단일 수주 컬럼이 없고, 모든 계획상세는 `(sales_delivery_plan_id, tenant_id)` 헤더 FK와 개별 원 수주/수주상세 FK를 유지하는지 확인한다.
4. 배포 흐름 및 승인된 검증을 거친다. 이 작업에서는 DDL을 실행하거나 데이터 행을 조회하지 않는다.

## 영향 및 제약

- 계획 하나에 여러 수주의 계획상세가 연결될 수 있다. 상세별 원 수주 연결과 tenant 경계는 유지된다.
- 기존 계획상세 주문상세 FK와 납품상세 계획상세 FK는 보존되며, 주문·납품 데이터의 관계를 재작성하지 않는다.
- 헤더의 기존 수주 고유성/참조/FK/index와 not-null check 및 `sales_order_id` 컬럼을 제거한다. 실제 적용 전에 선행 스키마가 확인되지 않으면 적용하지 않는다.

## 롤백 guard 및 순서

- `20261112_009_rollback_multi_order_sales_delivery_plan.sql`은 변경을 시작하기 전에 모든 계획 헤더(활성·비활성 구분 없이)가 최소 한 상세를 보유하는지 검사한다.
- 각 헤더의 상세들이 참조하는 서로 다른 `sales_order_id` 개수가 정확히 1이어야 한다. 빈 계획 또는 다중 수주 계획이 하나라도 있으면 예외로 전체 트랜잭션을 중단하며 임의의 원 수주를 선택하지 않는다.
- 복구하려는 `(tenant_id, sales_order_id)` 조합을 여러 계획 헤더가 공유하는지도 확인한다. 기존 `uq_sales_delivery_plan_hd_order`를 다시 생성할 수 없는 경우 롤백을 중단한다.
- guard 통과 후에만 상세에서 단일 원 수주를 유일하게 도출해 헤더 컬럼을 채우고, 기존 NOT NULL 및 보조 check, unique/FK/index와 계획상세-헤더 FK를 복구한다.
- `fk_sales_delivery_plan_dt_order_line` 및 `fk_sales_delivery_dt_plan_source`는 롤백에서도 변경하지 않는다.
- 롤백은 다중수주 계획이 없는 경우에만 가능하며, 작업 승인/백업 없이 실제 DB에 수행하지 않는다.

## 파일

- [전방 마이그레이션](20261112_009_allow_multi_order_sales_delivery_plan.sql)
- [롤백](20261112_009_rollback_multi_order_sales_delivery_plan.sql)
- 누적 스키마: `docs/database/db-schema.md`.
