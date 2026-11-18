# 자료실 초기 필터 setter 바인딩 작업지시서

- 근거: 잔여 lint 순차 처리 요청과 ArchiveBoardPage의 archiveList 의존성 경고다.
- 범위: 초기 검색 기본값 effect에서 useArchiveList의 raw setFilters를 명시적 지역 binding으로 사용한다. fresh archiveList 객체 전체를 dependency로 추가하지 않는다.
- [올린 날짜 사양](../../spec/20261023/20261023_011_커뮤니티_자료실_올린날짜_기본값_상세사양서.md)과 [로딩 사양](../../spec/20261026/20261026_003_archive_loading_상세사양서.md)의 서버 날짜 대기·최근 1년·검색 복원·로딩/오류 정책을 보존한다.
- 기존 effect의 guard·조건·setter 인자와 다른 검색/폴더/파일 작업, hook 구현, JSX/CSS·공개 props·API/DB 계약은 변경하지 않는다.
- 계획 → 사양 → 기존 회귀/대상 lint RED → 최소 binding 수정 → 같은 회귀/정적 비교 → 실제 격리 화면/결과 → 별도 커밋·푸시 순서다.
