# F1Grid 헤더 commit 이벤트 바인딩 작업지시서

- 잔여 ref 경고 4개 중 GridHeader의 render 중 latestProps 대입 1개만 이번 단위로 처리한다. GridRow/GridCell의 DOM ref 등록·사용자 편집 anchor는 별도 범위다.
- [F1-GRID 사용자 계약](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)의 헤더 전체 선택/정렬·필터/열 조절과 편집 중 헤더 렌더 격리를 유지한다.
- 기존 헤더는 지연 이벤트와 render용 getColumnCheckboxState를 같은 ref로 전달한다. 무조건 layout effect로 옮기면 헤더 render가 이전 getter를 읽으므로 금지한다.
- 단순 직접 callback 전달은 편집 중 헤더 memo를 깨므로 채택하지 않는다. 모든 헤더 함수를 commit ref로 옮기는 대안도 render getter 때문에 채택하지 않는다.
- 권장안은 실제 이벤트 ref만 매 commit layout effect로 갱신하고, 순수 getter는 현재 render prop으로 전달하는 것이다. comparator는 기존 shallow 비교와 같되 기존에도 안정적 wrapper였던 getter의 identity만 제외한다. getter 입력인 rows/columns와 다른 표시 props는 계속 비교한다.
- Suspense로 미commit된 callback이 기존 전체 선택 DOM에 누출되는지 먼저 실제 RED를 확인한다. 최신 render의 checkbox 값과 callback-only 갱신의 memo 보존도 함께 검증한다.
- directions → plan → spec → 기준선/RED → 최소 구현/F1-GRID 문서 → 관련 정적·실제 3폭 검증 → 결과/스크린샷 → 선행 CI 완료 후 별도 커밋·푸시 순서를 따른다.
- 공개 Grid API/JSX/CSS·GridRow/GridCell·서비스/API/DB/의존성과 다른 경고는 범위 밖이다.
