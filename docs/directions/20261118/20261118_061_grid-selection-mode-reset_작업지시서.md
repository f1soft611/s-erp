# 그리드 선택 모드 전환 작업지시서

- 근거: 기존 화면 기능을 보존하며 잔여 lint를 순차 해결한다는 사용자 요청.
- 대상은 F1Grid의 selectionMode 변경 effect에서 셀 선택·복사·드래그 state를 비우는 진단 1개다.
- cell/row 모드가 바뀐 commit에 이전 셀/복사 범위를 노출하지 않는다. 같은 모드의 일반 render에는 범위를 유지하고 행 checkbox·행 데이터·편집 변경은 보존한다.
- effect의 state 초기화를 bounded render guard로 옮기고 기존 이벤트 ref/드래그 ref 정리는 effect에 유지한다. API·편집·선택 계산·레이아웃 CSS는 변경하지 않는다.
- 계획 → 사양 → 실제 layout commit RED → 최소 구현 → 관련 회귀·정적·3폭 native → 결과/스크린샷 → 선행 CI 성공 뒤 별도 커밋·푸시 순서다.
