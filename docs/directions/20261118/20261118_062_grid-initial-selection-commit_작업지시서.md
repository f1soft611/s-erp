# 그리드 초기 행 선택 commit 작업지시서

- 근거: 기존 화면 기능과 공개 계약을 보존하며 잔여 lint를 순차 해결한다는 사용자 요청.
- 대상은 initialSelectedRowIds 복원 effect의 행 선택 setter 진단 1개다.
- 유효한 초기 행 ID가 있으면 해당 commit에 checkbox/ref/선택 callback이 같은 선택을 사용한다. 단일/다중 선택·표시 순서·문자열 ID 정규화·같은 복원 key를 한 번만 적용하는 계약을 유지한다.
- 복원 key를 ref 대신 state로 추적하고 동일한 유효성/ID 정책을 bounded render guard로 적용한다. 사용자 선택 해제 후 동일 값 배열로 render해도 복원하지 않는다.
- 계획 → 사양 → 실제 layout commit RED → 최소 구현 → 회귀·정적·3폭 native → 결과/스크린샷 → 선행 CI 성공 뒤 별도 커밋·푸시 순서다.
