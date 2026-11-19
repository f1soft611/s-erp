# F1Grid 사용자 편집 anchor 게시 작업지시서

- 근거: 잔여 lint를 숨기지 않고 기존 화면 기능을 보존하며 순차 해결한다는 사용자 요청.
- 대상: GridCell의 render 중 DOM ref 읽기 1개만. Row/Cell 이벤트 latestProps 대입은 child commit 순서가 달라 이번 범위에서 제외한다.
- 기존 UserSelectEditor는 anchor DOM의 위치로 popup 폭과 inset을 계산한다. DOM 연결 결과를 render 입력으로 게시하고 편집 중 최초 연결에도 실제 셀 기준 폭을 사용한다.
- 순서: 계획 → 상세 사양 → 실패 재현 → 최소 구현 → 관련 회귀/정적/3폭 실제 브라우저 → 결과/스크린샷 → 선행 CI 확인 뒤 별도 커밋·푸시.
- 콜백 전달, 실제 DOM 등록/해제, 저장/API/DB, 일반 셀의 memo 계약은 유지한다. ref 진단을 suppress하거나 DOM getter를 render 함수 뒤에 숨기지 않는다.
