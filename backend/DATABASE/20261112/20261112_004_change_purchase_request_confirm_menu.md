# 구매요청확정 메뉴 변경 이력

- 변경일: 2026-11-12
- 대상 테이블: `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (데이터)
- 변경 항목: `MATERIALS_REQUEST_CONFIRM`(구매요청확정, `/materials/request/request-confirm`, 정렬 15) 메뉴를 `MATERIALS_PURCHASE` 아래에 추가하고 READ/UPDATE 권한 부여. 역할 권한은 `ORDER_CREATE`(수주등록)에서 READ/UPDATE만 복사.
- 대상 테넌트: 1
- 선행: `20261112_002_seed_purchase_request_menu.sql`
- 영향: 신규 메뉴만 추가한다. 테이블 구조 변경 없음(확정 컬럼은 20261112_002에서 생성).
- MCP 확인: `s-erp-postgresql-readonly`로 20261112_002·003 메뉴 등록 결과와 `ORDER_CREATE` 역할 권한 구조를 확인했다.
- 적용 상태: SQL 스크립트만 작성했으며 실제 DB에는 적용하지 않았다.
- 롤백 여부: 제공함. 추가한 역할 권한·메뉴 권한·즐겨찾기·메뉴를 삭제한다.

적용 SQL: `20261112_004_seed_purchase_request_confirm_menu.sql`

롤백 SQL: `20261112_004_rollback_purchase_request_confirm_menu.sql`
