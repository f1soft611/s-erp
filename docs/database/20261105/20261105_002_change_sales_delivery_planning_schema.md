# 20261105_002 납품계획 스키마 변경 이력

## 변경일·적용 대상·영향 범위

- 변경일: 2026-11-05.
- 변경 대상: `tb_tenant`, 신규 `tb_sales_delivery_plan_hd`, 신규 `tb_sales_delivery_plan_dt`, 기존 `tb_sales_delivery_dt`.
- 테넌트별 납품계획 운영모드 `AUTO`/`MANUAL`을 추가하며 기본값은 `AUTO`.
- 수주당 하나의 계획 헤더와 수주 상세별 분할 계획행을 둔다. 실제 납품 상세는 계획 상세를 참조하고 계획 납품 누계와 수주 출하 누계를 함께 관리한다.
- 기존 모든 수주를 초기 계획으로 변환하고 기존 수주납품 상세를 초기 계획행에 연결한다. 계획 `delivered_qty`는 기존 수주 상세의 현재 `shipped_qty`를 사용해 중복 집계를 방지한다.
- 납품 상세의 수주상세 unique를 계획상세 단위 unique로 대체하여 동일 수주 상세의 여러 계획 분할을 한 납품서에 포함할 수 있다.
- SQL은 작성만 했으며 실제 DB에 적용하지 않았다.

## MCP 확인 근거

- 기본 `s-erp-postgresql-readonly`에서 `list_tables`, `describe_table(tb_tenant)`, `describe_table(tb_sales_order_hd)`, `describe_table(tb_sales_order_dt)`를 읽기 전용 호출했다.
- 현재 tenant 모드 컬럼과 납품계획 테이블은 없고, 수주 헤더·상세는 계획일 fallback 및 테넌트/품목 복합키에 필요한 필드를 제공한다. 기존 납품 테이블은 이전 20261104 스크립트 이후 적용 대상이다.
- 업무 데이터 행이나 개인·계정 정보를 조회하지 않았다.

## 적용 순서

1. DB 백업 및 20261104 납품 스키마/수주 감사 컬럼 선행 적용 상태 확인.
2. `20261105_002_add_sales_delivery_planning.sql` 사전 조건 확인: 기존 shipped_qty는 0 이상이며 주문수량을 넘지 않아야 하고, 기존 ORDER 상세는 같은 tenant/order/material 수주상세를 참조해야 한다.
3. 운영 승인 후 DDL+backfill migration을 한 번 적용한다. 어느 사전 조건이라도 위반하면 전체 transaction을 중단하고 별도 데이터 정합성 작업 후 재검토한다.
4. 메뉴 저장 DB에서 `20261105_002_seed_sales_delivery_plan_menu.sql`의 `v_tenant_id`를 승인된 테넌트로 설정하고 실행한다. 기존 노드/권한 충돌과 미승인 tenant 설정은 실패 처리한다.
5. 앱 배포 후 합성 데이터로 AUTO/MANUAL, 분할계획, 계획 잔량/실납품/수정/삭제 동작을 점검한다.

## 제약 및 rollback

- tenant, order header/detail, material 및 plan header/detail에 tenant-composite FK를 둔다.
- `AUTO` 생성계획일은 상세 납기→헤더 납기 순서이며 둘 다 없으면 NULL이다.
- 계획 저장/납품 CRUD는 수주 헤더 lock 아래 계획 및 shipped 수량을 트랜잭션으로 보정한다.
- 메뉴 rollback은 이 작업에서 만든 계획 메뉴만 제거하며 추가 하위 노드가 있으면 중단한다.
- 스키마 rollback은 실제 납품 이력, migration 이후 생성된 계획, 수정된 plan detail이 있으면 중단한다. 값이 있는 납품계획을 자동 삭제하지 않는다.

## 파일

- [변경 SQL](20261105_002_add_sales_delivery_planning.sql)
- [스키마 rollback](20261105_002_rollback_sales_delivery_planning.sql)
- [메뉴 seed](20261105_002_seed_sales_delivery_plan_menu.sql)
- [메뉴 rollback](20261105_002_rollback_sales_delivery_plan_menu.sql)
- 전체 스키마 목록: `docs/database/db-schema.md`.
