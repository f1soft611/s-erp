# 구매요청현황 메뉴 변경 이력

- 변경일: 2026-11-12
- 대상 테이블: `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (데이터)
- 변경 항목: `MATERIALS_REQUEST_STATUS`(구매요청현황, `/materials/request/request-status`, 정렬 20) 메뉴를 `MATERIALS_PURCHASE` 아래에 추가하고 READ/EXCEL 권한 부여. 역할 권한은 `ORDER_STATUS`에서 READ/EXCEL만 복사.
- 대상 테넌트: 1
- 선행: `20261112_002_seed_purchase_request_menu.sql`
- 영향: 신규 메뉴만 추가한다. 테이블 구조 변경 없음.
- MCP 확인: `s-erp-postgresql-readonly`로 `tb_menu` 구조, 영업관리 메뉴 코드(`ORDER_STATUS`), 메뉴 권한 테이블 PK를 확인했다.
- 적용 상태: SQL 스크립트만 작성했으며 실제 DB에는 적용하지 않았다.
- 롤백 여부: 제공함. 추가한 역할 권한·메뉴 권한·즐겨찾기·메뉴를 삭제한다.

적용 SQL: `20261112_003_seed_purchase_request_status_menu.sql`

롤백 SQL: `20261112_003_rollback_purchase_request_status_menu.sql`
