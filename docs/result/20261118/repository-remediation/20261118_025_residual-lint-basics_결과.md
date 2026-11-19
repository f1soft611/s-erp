# 잔여 lint 저위험 11개 정리 결과

- [작업지시서](../../../directions/20261118/20261118_025_residual-lint-basics_작업지시서.md)
- [계획서](../../../plan/20261118/20261118_025_residual-lint-basics_계획서.md)
- [상세사양](../../../spec/20261118/20261118_025_residual-lint-basics_상세사양서.md)

## 결과

| 검증 | 결과 |
| --- | --- |
| 수정 전 네 규칙 gate | 진단 11개, exit 1 |
| 수정 후 같은 gate | 진단 0개. 전체 경고 **206 → 195** |
| 실제 관련 UTC 테스트 | **7파일/195개 통과**, 실패 0/제외 0 |
| 앱/Vite TypeScript 검사 | exit 0 |
| 두 브라우저 스크립트 node --check | 모두 exit 0 |

대상은 duplicate key 1, unused vars 8, extra boolean cast 1, constant binary expression 1이다. 경고 195개와 관련 테스트 195개는 우연히 같은 수이며 다른 지표다.

## 변경과 동작 보존

운영 파일 두 곳에서 조건의 중복 Boolean 변환, 미사용 catch 인수, 항상 비어 있지 않은 경로 문자열의 도달 불가능한 fallback만 정리했다. 결과값·예외 안내·실제 메뉴 URL은 같다.

테스트에서는 중복 fixture의 마지막 `'Y'` 값과 render/비동기 DOM 준비 대기를 모두 유지했다. 미사용 grid binding 제거 뒤에도 `await screen.findByRole('grid', ...)`는 그대로다. 캡처 스크립트는 미사용 locator/측정 변수만 정리했고 실행해 공유 서버의 데이터를 수정하지 않았다.

관련 실제 실행은 notice adapter 2, pinned range 1, 결재선 41, Grid form 58, 메뉴 55, 공통코드 30, router 8개다. 기존 case/단언을 삭제하지 않았고 skip/retry/timeout·lint 규칙/설정·manifest/lock 변경이 없다.

API/DB/권한·상태 초기화 시점·Hook 의존성·Grid 동작과 화면 레이아웃은 수정하지 않았다. 시각 동작 변경이 없는 정리이므로 새 스크린샷 대상이 아니며 기존 화면 증거를 보존한다. 이 단위에서 backend 검증을 재실행할 변경은 없다.

## 후속

남은 경고 195개는 export 경계 56, effect state 97, Hook dependency 28, refs 10, immutability 2, memoization 2다. 각 소유 흐름별 별도 단위로 계속한다. 의존성 두 권고도 이 변경으로 해결됐다고 표시하지 않는다.

```text
chore(frontend): remove behavior-neutral lint findings

- 중복 fixture와 미사용 import/binding 정리, 기존 준비 대기 보존
- 동일한 조건·경로·오류 안내를 유지하며 경고 11개 제거
- 관련 195개 테스트와 typecheck·스크립트 구문 확인
```
