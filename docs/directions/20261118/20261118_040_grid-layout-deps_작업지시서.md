# F1Grid 로컬 레이아웃 callback 의존성 작업지시서

- 근거: 잔여 lint 순차 처리 요청과 [F1-GRID 선택·렌더 계약](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md).
- 범위: F1Grid의 로컬 행 높이 memo 1개, 드래그 hit-test effect 1개, 범위 overlay effect 2개의 exhaustive-deps 경고다.
- 드래그 helper가 읽는 가시 컬럼 수 변경이 기존 listener 의존성에서 빠져 있었다. 이를 재현하고 같은 컬럼 수의 부모 재렌더는 pending frame을 취소하지 않게 한다.
- helper/이벤트/JSX/공개 API/가상화·편집·선택 기본값을 보존한다. datasource load 및 기존 state effect는 이번 단위에 섞지 않는다.
- 계획 → 사양 → 실패 회귀 → 최소 구현 → 테스트/정적 검사 → 실제 그리드 3폭/이벤트 → F1-GRID·결과/이미지 → 별도 커밋·푸시 순서다.
- backend/API/DB/의존성은 변경하지 않으며 lint disable/규칙 완화/ref render 접근으로 우회하지 않는다.
