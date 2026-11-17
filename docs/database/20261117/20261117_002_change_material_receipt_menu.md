# 입고등록 메뉴 변경 이력

- 변경일: 2026-11-17
- 대상 테이블: `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (데이터)
- 변경 항목: `MATERIALS_RECEIPT_CREATE`(입고등록, `/materials/receipt/receipt-create`, 정렬 30) 메뉴를 `MATERIALS_RECEIPT`(입고관리) 아래에 추가하고 READ/UPDATE 권한 부여. 역할 권한은 `MATERIALS_ARRIVAL_CREATE`(가입고등록)에서 READ/UPDATE만 복사.
- 대상 테넌트: 1
- 선행: `20261116_003_seed_material_arrival_menu.sql`, `20261116_004_seed_material_arrival_status_menu.sql`
- 영향: 신규 메뉴만 추가한다. 테이블 구조 변경 없음. 가입고현황(20) 다음 정렬(30)이다.
- MCP 확인: 적용 전 테넌트 1의 `MATERIALS_*` 메뉴 구성을 조회로 확인한다(적용 후 재확인).
- 적용 상태: SQL 스크립트만 작성했으며 실제 DB에는 적용하지 않았다.
- 롤백 여부: 제공함. 추가한 역할 권한·메뉴 권한·즐겨찾기·메뉴를 삭제한다.

적용 SQL: `20261117_002_seed_material_receipt_menu.sql`

롤백 SQL: `20261117_002_rollback_material_receipt_menu.sql`
