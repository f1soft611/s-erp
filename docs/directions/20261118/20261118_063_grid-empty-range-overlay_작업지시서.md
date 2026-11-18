# 그리드 빈 범위 표시 초기화 작업지시서

- 근거: 기존 화면 기능을 보존하며 잔여 lint를 순차 해결한다는 사용자 요청.
- 대상은 범위가 없을 때 effect에서 rangeOverlay를 비우는 진단 1개다.
- Escape 등으로 셀/복사 범위가 없어지면 해당 commit부터 이전 overlay를 표시하지 않는다. 유효 범위의 DOM 기하 측정·scroll/resize 갱신, 행 선택과 편집 데이터는 유지한다.
- 범위 부재와 정의된 overlay를 함께 확인하는 bounded render reset을 검증한다. 기존 effect는 범위 부재에서 setter 없이 return하고 나머지 측정 경로는 그대로 둔다.
- 계획 → 사양 → 실제 Profiler commit RED → 최소 구현 → 회귀·정적·3폭 native → 결과/스크린샷 → 선행 CI 성공 뒤 별도 커밋·푸시 순서다.
