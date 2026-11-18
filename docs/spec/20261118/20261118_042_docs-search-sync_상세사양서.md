# Grid 문서 검색 선택 동기화 상세사양서

[작업지시서](../../directions/20261118/20261118_042_docs-search-sync_작업지시서.md)와 [계획서](../../plan/20261118/20261118_042_docs-search-sync_계획서.md)에 따른 선택 보정 변경이다.

| 조건 | 기대 동작 |
| --- | --- |
| 검색 결과 있음 + 현재 문서 제외 | 첫 일치 문서로 보정; 첫 commit부터 현재 heading/목차/예제 사용 |
| 현재 문서가 결과에 포함 | 사용자 문서 선택 유지; 무조건 첫 결과로 이동하지 않음 |
| 검색 결과 0개 | 빈 결과 안내와 현재 문서/Playground state 유지 |
| 검색 해제 | 현재 문서가 전체 결과에 포함되므로 선택/예제 state 유지 |
| API 결과 선택/다시 선택 | 기존 scroll/active class/pending 소비 동작 유지 |
| initialDocumentId prop만 교체 | 기존처럼 초기값이며 현재 선택을 reset하지 않음 |

순수 조건의 own-state 조정만 render에서 수행한다. DOM/scrollIntoView/pending anchor 소비는 기존 effect에 유지한다. 검색 알고리즘/별칭/그룹/문서·API 데이터/JSX·CSS·테마/공개 컴포넌트는 변경하지 않는다. 결과가 0개일 때 임의 overview fallback이나 remount를 만들지 않는다.

프론트 로컬 포털만 변경해 API/DB MCP·SQL 대상이 아니다. 기존 3단계 TreeProjection 별도 관찰이나 다른 경고는 이번 범위가 아니다.
