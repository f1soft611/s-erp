# F1-Grid 서버 조회 의존성 상세사양서

[작업지시서](../../directions/20261118/20261118_048_grid-source-deps_작업지시서.md)와 [계획서](../../plan/20261118/20261118_048_grid-source-deps_계획서.md)에 따른 의존성 정합성 변경이다.

기준은 [F1-GRID 서버 조회](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md#server-side-data-source)다. useCallback의 의존성은 `dataSource`, `filterState`, `onDataSourceError`, `sortState`이며 기존 초기 조회 effect의 값과 정확히 같다. 나머지 캡처는 raw setter/ref다. callback은 effect와 스크롤 양쪽에서 같은 본문을 사용한다.

| 항목 | 보존 기준 |
| --- | --- |
| 첫 조회/무관한 렌더 | offset 0/기존 pageSize, 테마 등 쿼리 밖 갱신으로 추가 요청 없음 |
| 정렬/필터 | 기존 현재 조건, 첫 페이지 재조회·이전 signal 취소·오래된 응답 차단 |
| 스크롤 | 기존 하단 기준과 실제 로드 건수 offset으로 append |
| 결과/오류 | 최신 요청만 행/총건수/로딩 갱신, 기존 오류 callback 유지 |
| 로컬 모드 | dataSource 없으면 요청 없음, 로컬 정렬/필터/편집/선택 유지 |
| 기타 | controller dispose/guard, dirty patch, ref 접근 시점, API·공개 props·JSX/CSS 보존 |

매 렌더마다 새 함수를 그대로 dependency로 추가하거나 controller/event를 복제하지 않는다. ref mirror·lint disable·microtask/helper 우회를 만들지 않는다. 남은 F1Grid effect-state/ref 경고는 별도 검토 대상으로 남긴다. 변경은 프런트의 callback binding뿐이며 데이터/백엔드 API/DB 계약 변경이 없어 DB MCP·SQL 대상이 아니다.
