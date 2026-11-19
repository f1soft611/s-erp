# 자료실 초기 필터 setter 바인딩 상세사양서

[작업지시서](../../directions/20261118/20261118_045_archive-filter-deps_작업지시서.md)와 [계획서](../../plan/20261118/20261118_045_archive-filter-deps_계획서.md)에 따른 의존성 정합성 변경이다.

useArchiveList의 `const [filters, setFilters] = useState(...)`와 `return { ..., setFilters, ... }`를 확인했다. 지역 binding도 같은 안정적 함수다. 초기 effect가 객체를 메서드 receiver로 참조하지 않고 실제 callback을 명시하도록 바꾼다. hook·객체 반환 구조를 수정하거나 새 wrapper를 만들지 않는다.

| 항목 | 보존 기준 |
| --- | --- |
| 날짜 대기 | 서버 기본값 이전에 파일 조회하지 않음 |
| 서버 날짜 2024-02-29 | 최초 범위 2023-02-28–2024-02-29와 유형 ALL |
| 검색 복원/초기화 | 기존 세션/상세조건/폴더 의미 그대로 |
| 초기화 완료 | 다른 렌더가 사용자 검색 조건을 다시 덮어쓰지 않음 |
| 요청/상태 | useArchiveList의 enabled/abort/sequence/오류/재시도 그대로 |
| 화면 | 로딩 배너 추가 없이 기존 Grid·검색·메시지 레이아웃 유지 |

운영 diff는 지역 destructuring, 초기 setter 호출 대상, dependency binding 3곳뿐이어야 한다. 초기화 effect-state 경고는 별도 소유권 검토 대상이며 이 단위에서 우회하거나 숨기지 않는다. API/DB·서비스·Grid/Tree 구현·권한·스타일은 변경하지 않아 DB MCP·SQL 대상이 아니다.
