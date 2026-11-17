# 입고관리 그룹·가입고등록 메뉴 변경 이력

- 변경일: 2026-11-16
- 대상 테이블: `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (데이터)
- 변경 항목:
  - `MATERIALS_RECEIPT`(입고관리, `/materials/receipt`, 정렬 30) 그룹을 구매자재 모듈 최상위에 추가
  - `MATERIALS_ARRIVAL_CREATE`(가입고등록, `/materials/arrival/arrival-create`, 정렬 10)를 입고관리 아래에 추가하고 READ/UPDATE 권한 부여
  - 역할 권한은 `ORDER_CREATE`(수주등록)에서 READ/UPDATE만 복사
- 대상 테넌트: 1
- 선행: `20261113_004_restructure_materials_menu_groups.sql`
- 영향: 신규 메뉴만 추가한다. 테이블 구조 변경 없음. 기존 구매요청관리(10)·발주관리(20)와 정렬이 겹치지 않는다.
- MCP 확인: `s-erp-postgresql-readonly`로 테넌트 1의 `MATERIALS_*` 메뉴(구매요청관리, 발주관리와 하위 메뉴)와 정렬·부모를 확인했고 입고관리 그룹이 아직 없음을 확인했다.
- 적용 상태: SQL 스크립트만 작성했으며 실제 DB에는 적용하지 않았다.
- 롤백 여부: 제공함. 가입고등록 메뉴의 역할 권한·메뉴 권한·즐겨찾기·메뉴를 삭제하고, 그룹 아래 다른 메뉴가 없을 때만 입고관리 그룹도 삭제한다.

적용 SQL: `20261116_003_seed_material_arrival_menu.sql`

롤백 SQL: `20261116_003_rollback_material_arrival_menu.sql`
