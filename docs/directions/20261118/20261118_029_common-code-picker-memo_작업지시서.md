# 공통코드 상위 선택 callback 의존성 작업지시서

- 잔여 137개 중 CommonCodeManagementPanel의 memoization 두 진단만 정리한다.
- 상위 그룹 객체 전체가 아니라 callback이 실제 사용하는 동일한 문자열 ID와 null 존재 표지만 캡처한다.
- ID 0/빈 문자열은 존재하는 부모로 유지한다. 저장 잠금·현재 행 제외·오류·선택 반영·API 인수를 바꾸지 않는다.
- 이 지시서 → 계획 029 → 사양 029 → 최소 수정 → 공통코드 실제 회귀/typecheck/lint → 결과·작업별 커밋/push 순서다.
