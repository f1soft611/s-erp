# 그리드 소수점 컨텍스트 해제 상세 사양

## 기존 계약과 변경

- 기존 [소수점 사양](../20261117/20261117_010_그리드소수점관리_상세사양서.md)의 모듈별 정책·컬럼 override·실패 fallback·cache와 현재 service 구현을 유지한다.
- GridDecimalModuleProvider는 공백 moduleCode를 null로 정규화한다. null인 commit에는 `usePolicyDecimalRule`의 이전 rule을 노출하지 않는다.
- 모듈 부재이고 rule이 정의된 경우에만 render에서 state를 undefined로 갱신한다. React는 같은 컴포넌트를 다시 render한 뒤 commit하므로 이 갱신은 bounded하며 effect 지연이나 ref 변경이 아니다.
- 모듈 해제 시 state도 비워 재진입 pending 상태에 이전 rule이 재노출되지 않도록 한다. null이면 조회하지 않고 이전 요청의 active cleanup으로 늦은 응답을 무시한다.
- 다른 두 비어 있지 않은 moduleCode 사이의 기존 전환 동작, service cache/API 계약과 숫자 계산/입력/반올림은 변경하지 않는다.

## 검증

- 실제 hook/Provider의 layout commit 관찰자로 해제 commit의 이전 rule 노출을 RED로 확인한다. DOM 최종 값만 확인해 effect 뒤 정상 상태와 혼동하지 않는다.
- 재진입 pending과 재해제 뒤 늦은 응답 취소를 같은 회귀에서 확인한다.
- 실제 브라우저 3폭은 합성 정책의 기존 응답 구조만 제공하고 전체 F1Grid 표시·Provider 해제/재진입·hook commit 값을 확인한다. 실제 정책/테넌트 데이터나 저장 요청은 사용하지 않는다.
- 백엔드/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect 81개와 의존성 권고 2건은 별도 작업이다.
