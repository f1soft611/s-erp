# 구매요청 테이블 및 구매요청등록 메뉴 변경 이력

- 변경일: 2026-11-12
- 대상 테이블: 신규 `public.tb_purchase_request_hd`, `public.tb_purchase_request_dt` / 데이터 `tb_module`, `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission`
- 원본 MES: TMA103(요청 메인), TMA103A(확정 메인, 헤더에 통합), TMA104(요청 상세)
- 변경 항목:
  - 구매요청 헤더/상세 테이블 생성. 확정 정보(확정일·확정자, 확정수량·납기·구매처·창고·발주구분·단가·통화·금액·확정비고, 발주대기 마감)를 같은 테이블에 둔다. 확정번호는 없다.
  - 상태는 영문 코드 `REQUESTED`/`CONFIRMED`로 저장한다.
  - 수주 연계 컬럼 `sales_order_id`, `sales_order_detail_id`(nullable). 값이 없으면 직접 요청.
  - 헤더·상세 모두 감사 컬럼(`created_by/at`, `updated_by/at`, `VARCHAR(100)`/`TIMESTAMP`).
  - `MATERIALS` 모듈(구매자재, `/materials`, `ShoppingCart`, 정렬 3), `MATERIALS_PURCHASE`(구매관리), `MATERIALS_REQUEST_CREATE`(구매요청등록, `/materials/request/request-create`) 메뉴와 READ/CREATE/UPDATE/DELETE 권한. 역할 권한은 `ORDER_CREATE`에서 복사.
- 제거한 MES 컬럼: PLANT_CODE, CF_*, DELETE_FLAG, CLOSING_FLAG, EMERGENCY_FLAG, DRAWING_NO, ESTIMATE_COMPANY, ESTIMATE_UPRICE, 외화 단가/금액, 재고 스냅샷, BOMAUTO_GBN, FIRST_ARTICLE, FLOWINOUT, INPUT_GBN, OUT_GBN, T_ORDER_GBN, T_ITEM_*/T_PART_NO/T_SERIAL_NO/T_ORDER_INFO, T_ORDER_HISTNO, PURCHASE_CNFRM_NO/SEQNO, OPMAN_CODE3/4·OPTIME3/4.
- 대상 테넌트(메뉴): 1
- 영향: 신규 테이블과 신규 메뉴만 추가한다. 기존 테이블 구조는 변경하지 않는다. `tb_warehouse`에 `(warehouse_id, tenant_id)` 유니크가 없어 창고는 단일 FK로 두고 테넌트 일치는 서비스에서 검증한다.
- MCP 확인: `s-erp-postgresql-readonly`로 `list_tables`(구매요청 테이블 부재), 수주·출하 테이블 컬럼 타입, 참조 테이블 PK/UNIQUE, `tb_module`·`tb_menu` 구조와 영업관리 메뉴 코드, 메뉴 권한 테이블 PK를 확인했다. 업무 데이터 행은 조회하지 않았다.
- 적용 상태: SQL 스크립트만 작성했으며 실제 DB에는 적용하지 않았다.
- 롤백 여부: 제공함. 테이블 롤백은 데이터가 있으면 중단한다. 메뉴 롤백은 추가한 권한·메뉴를 지우고, 하위 메뉴가 없을 때만 상위 메뉴·모듈을 지운다.

적용 순서: `20261112_002_create_purchase_request_schema.sql` → `20261112_002_seed_purchase_request_menu.sql`

롤백 순서: `20261112_002_rollback_purchase_request_menu.sql` → `20261112_002_rollback_purchase_request_schema.sql`
