# 협업공간 메뉴 변경 이력

- 변경일: 2026-11-26
- 대상 테이블: `tb_menu`, `tb_menu_permission` (데이터)
- 변경 항목: `GW_WORKSPACE`(협업공간, `/groupware/community/workspace`, 정렬 44) 메뉴를 `GW_INFO_CENTER`(커뮤니티) 아래에 추가하고 READ/CREATE/UPDATE/DELETE 메뉴 권한 항목을 등록한다. 역할별 권한(`tb_role_menu_permission`)은 메뉴 등록 후 관리자 화면에서 부여한다.
- 화면 연결: 페이지 키는 메뉴 URL의 마지막 구간 `workspace`이며 프론트엔드 `DashboardContent`의 `groupware` + `workspace` 분기와 일치한다.
- 대상 테넌트: SQL의 `v_tenant_id`에 승인된 테넌트 ID를 지정해야 실행된다(미지정 시 예외).
- 영향: 신규 메뉴만 추가한다. 테이블 구조 변경 없음. 기존 메뉴는 변경하지 않는다.
- MCP 확인: `s-erp-postgresql-readonly`로 `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` 구조와 그룹웨어 모듈(`/groupware`)의 메뉴 코드·URL·정렬(커뮤니티 `GW_INFO_CENTER`, 공지 11, 게시판 22, 자료실 33)을 확인했다. 테넌트 ID와 사용자 데이터는 조회하지 않았다.
- 적용 상태: 스크립트 작성 시점에는 DB에 적용하지 않았다(작성 도구는 읽기 전용 MCP뿐이다). 이후 읽기 전용 조회로 `GW_WORKSPACE` 행이 이미 존재함을 확인했다(`use_at = 'Y'`, 생성 2026-11-26 05:09 UTC, `tb_menu_permission` 4행, `tb_role_menu_permission` 3행). 적용 주체와 사용한 스크립트는 확인하지 못했다. 이 seed를 같은 테넌트에 다시 실행해도 `ON CONFLICT DO NOTHING`이라 중복 등록되지 않는다.
- 롤백 여부: 제공함. 협업공간 메뉴를 `use_at = 'N'`으로 바꾼다. 권한 행은 삭제하지 않는다.

적용 SQL: `20261126_001_seed_workspace_menu.sql`

롤백 SQL: `20261126_001_rollback_workspace_menu.sql`
