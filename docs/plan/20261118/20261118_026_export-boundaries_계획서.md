# React Refresh export 경계 정리 계획

## 목표

기준 JSON의 `react(only-export-components)` 56개 진단을 역할에 맞는 모듈 분리로 제거하고 기존 런타임 계약을 유지한다.

## 단계

- [x] 기준 진단 파일·라인과 56개 카운트를 확인하고 기존 export/import 소비자를 추적한다.
- [x] 계획된 유틸리티·데이터·컨텍스트/훅 모듈로 구현을 이동하고 컴포넌트 파일은 컴포넌트 및 타입만 export한다.
- [x] 모든 내부·테스트 import/re-export를 갱신한다. F1Grid 공개 API는 비-TSX barrel에서 유지하고 F1-GRID 문서의 import/module 경계를 갱신한다.
- [x] 실제 Oxlint JSON 진단은 대상 0건, 비대상 경고 139건이다. root 소스와 소유 검증 스냅샷의 128개 의도된 frontend 파일이 일치하며 `npm run typecheck`와 `npm run build`가 통과했다.
- [x] 소유 검증 스냅샷에서 전체 Vitest를 threads/2 workers로 검증했다(226개 실제 파일, 2641개 테스트 통과. describe 포함 suite 수 520과 구별).
- [x] 실제 결과·잔여 범주·UI 증거 범위·복사 가능한 커밋 제목을 [결과 문서](../../result/20261118/repository-remediation/20261118_026_export-boundaries_결과.md)에 기록한다.

## 범위 기준

- 대상 이외 lint 범주(상태 업데이트 97, Hook 의존성 28, refs 10, immutability 2, memoization 2)는 수정하지 않는다.
- manifest/lock, lint 설정, backend/API/DB, 화면 동작과 테스트 제외 설정은 변경하지 않는다.
- 최종 계획 체크박스는 실제 결과에 맞춰 갱신하며 커밋·push는 상위 작업 소유자가 수행한다.
