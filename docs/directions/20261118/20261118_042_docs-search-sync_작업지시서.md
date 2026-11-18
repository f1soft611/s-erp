# Grid 문서 검색 선택 동기화 작업지시서

- 근거: 잔여 lint 순차 처리 요청과 [문서 포털 사양 §3](../../spec/20261014/20261014_002_f1_grid_docs_overhaul_사양서.md).
- 범위: F1GridDocsPage의 filteredDocs/selectedId 선택 보정 effect 1개다. 결과가 있고 현재 문서가 제외된 경우에만 첫 결과로 선택을 맞춘다.
- 결과 0개는 현재 문서/Playground를 보존하고, 현재 문서가 결과에 포함되면 사용자 선택을 유지한다.
- DOM scroll 후 pendingApiAnchor를 비우는 다른 effect는 UI active class에도 연결돼 있으므로 단순 ref 치환·render DOM 접근으로 경고를 숨기지 않는다. 이 단위에서 수정하지 않는다.
- 계획 → 사양 → 첫 commit 회귀 RED → 최소 구현 → 관련 검사 → 실제 포털 3폭/검색·API 앵커 → F1-GRID·결과/이미지 → 별도 커밋·푸시 순서다.
- 공개 Grid/Tree/runtime/API/DB/의존성/문서 데이터/JSX·CSS는 변경하지 않는다.
