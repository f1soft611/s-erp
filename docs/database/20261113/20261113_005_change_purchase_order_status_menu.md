# 발주현황 메뉴 변경 이력

- 변경일: 2026-11-13
- 대상 테이블: `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (데이터)
- 변경 항목: `MATERIALS_ORDER_STATUS`(발주현황, `/materials/order/order-status`, 정렬 20, 발주관리 그룹 아래) 메뉴를 추가하고 READ/EXCEL 권한 부여. 역할 권한은 `ORDER_STATUS`(수주현황)에서 READ/EXCEL만 복사.
- 대상 테넌트: 1
- 선행: `20261113_004_restructure_materials_menu_groups.sql`(발주관리 그룹)
- 영향: 신규 메뉴만 추가한다. 테이블 구조 변경 없음. 발주 수정·취소 권한은 `MATERIALS_ORDER_CREATE`(발주등록)의 UPDATE 권한을 쓴다.
- MCP 확인: `s-erp-postgresql-readonly`로 테넌트 1의 `MATERIALS_*` 메뉴와 구성(구매요청 3개, 발주등록)을 확인했다.
- 적용 상태: SQL 스크립트만 작성했으며 실제 DB에는 적용하지 않았다.
- 롤백 여부: 제공함. 추가한 역할 권한·메뉴 권한·즐겨찾기·메뉴를 삭제한다.

적용 SQL: `20261113_004_seed_purchase_order_status_menu.sql`

롤백 SQL: `20261113_004_rollback_purchase_order_status_menu.sql`
