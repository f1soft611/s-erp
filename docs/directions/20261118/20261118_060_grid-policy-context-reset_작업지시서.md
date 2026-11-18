# 그리드 소수점 컨텍스트 해제 작업지시서

- 근거: 잔여 lint를 숨기지 않고 기존 화면 기능을 보존하며 순차 해결한다는 사용자 요청.
- 대상은 `usePolicyDecimalRule`의 컨텍스트 부재 분기에서 동기적으로 setRule하는 state-in-effect 진단 1개다.
- 모듈이 없으면 기존 정책 rule을 commit에 노출하지 않고 기본값을 사용한다. 해제 후 재진입 시 기존처럼 비어 있는 상태에서 정책을 조회하며 active cleanup과 서비스 cache/API는 유지한다.
- guarded render reset을 사용하고 async 지연·lint 억제로 경고를 숨기지 않는다. 다른 모듈 간 전환이나 정책 계산·반올림·저장 계약은 변경하지 않는다.
- 계획 → 상세 사양 → 실제 commit 관찰 RED → 최소 구현 → 정책/그리드 회귀·정적·3폭 native → 결과/스크린샷 → 선행 CI 성공 뒤 별도 커밋·푸시 순서를 유지한다.
