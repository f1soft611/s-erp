# 20261102_002 메뉴 즐겨찾기 표시명 스키마 변경 이력

- 변경일: 2026-11-02
- 변경 내용: 사용자별 즐겨찾기 표시명을 저장하는 nullable `favorite_nm` 컬럼 추가
- 적용 대상: `tb_user_menu_favorite`
- 영향 범위: 사용자가 메뉴 즐겨찾기 표시명을 개인화할 수 있다. 기존 행은 NULL로 유지되며 현재 권한 메뉴명을 표시한다.
- 제약: 표시명은 trim 후 1~100자이며 실제 적용 전 애플리케이션 버전과 migration 순서를 확인한다.
- 롤백 여부: 대응 롤백 스크립트를 제공한다. custom favorite name이 하나라도 있으면 롤백은 중단된다.
- 적용 상태: 이 작업에서는 실제 DB에 DDL을 적용하지 않았다.
- 확인 근거: 읽기 전용 PostgreSQL MCP의 `list_tables` 및 `describe_table(tb_user_menu_favorite)` 확인 결과 기존 테이블에 `favorite_nm` 컬럼은 없었고 nullable `VARCHAR(100)` 추가가 가능하다. 행 데이터는 조회하지 않았다.
