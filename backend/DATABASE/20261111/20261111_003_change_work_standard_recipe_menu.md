# 20261111_003 작업표준서 등록(레시피) 메뉴 변경 이력

- 날짜: 2026-11-11
- 대상 테이블: `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission`
- 내용
  - 기준정보 모듈에 루트 메뉴 `CO_WORK_STD`(작업표준서 관리, `/co/work-standard`, sort 2)를 추가한다.
  - 하위 메뉴 `CO_WORK_STD_RECIPE`(작업표준서 등록(레시피), `/co/work-standard/work-standard-recipe`, sort 10)를 추가하고 READ/CREATE/UPDATE/DELETE 권한을 연결한다.
  - 기존 `CO_WORKFLOW`(전자결재 관리)의 sort_order가 2이면 3으로 옮겨 샘플 순서(기준정보 관리 → 작업표준서 관리 → 전자결재 관리)를 맞춘다.
- 영향 범위: 승인된 테넌트의 `CO_MATERIAL`(품목 관리) 역할 권한을 신규 메뉴에 복사한다. 경로·부모 충돌 시 전체 트랜잭션을 중단한다. 신규 업무 테이블은 없다(백엔드 미구현).
- MCP 확인(읽기 전용): `tb_menu` 컬럼 구조, 기준정보 모듈 메뉴 목록(코드·경로·정렬), `tb_permission` 코드, `CO_WORK_STD*`/`/co/work-standard*` 미존재(0건)를 확인했다.
- 롤백: [rollback](20261111_003_rollback_work_standard_recipe_menu.sql) — 추가 하위 메뉴가 없을 때만 두 메뉴와 권한을 삭제하고 `CO_WORKFLOW` 정렬을 2로 되돌린다.
- 실제 DB 적용은 수행하지 않았다.
