# Splitter 비율 상태 동기화 결과

[작업지시서](../../../directions/20261118/20261118_036_splitter-ratio-sync_작업지시서.md) → [계획서](../../../plan/20261118/20261118_036_splitter-ratio-sync_계획서.md) → [상세사양](../../../spec/20261118/20261118_036_splitter-ratio-sync_상세사양서.md) 순서로 진행했다.

## 원인과 최소 변경

Splitter의 leftFlex/rightFlex 복사 effect가 외부 비율 변경 시 이전 비율을 먼저 commit했다. 비율 state는 드래그가 수정하므로 제거하지 않았다. 이전 두 prop을 하나의 state로 기록하고 Object.is 기준 변경 때만 기존 숫자 조건으로 두 비율을 조정한다. state 조정은 같은 컴포넌트의 commit 전 재시도로 끝나며 guard에 ref 접근이 없다.

어느 한 prop만 바뀌어도 숫자로 제공된 두 prop을 모두 다시 적용하는 기존 그룹 dependency 의미를 유지한다. 같은 prop 재렌더는 드래그 값을 유지하고, undefined인 쪽은 마지막 ratio를 보존한다. NaN 반복은 입력 변경이 아니며 0→-0은 변경이다. `!==`는 이 두 경계에서 기존 React dependency 의미와 달라 사용하지 않았다.

두 prop을 제거하면 기존 사용자가 조정한 픽셀 size로 돌아간다. initialSize를 매 전환마다 초기화하거나 새 controlled 값으로 바꾸지 않았다. JSX·props·기존 state/ref 초기값·스타일·clamp/pointer 콜백·resize/pointer effect와 cleanup·모바일 stacked 정리를 AST로 비교해 그대로임을 확인했다. 기존 테스트 본문도 유지했다. 호출자·F1Grid/F1Tree 자체·서비스·backend·API·DB·manifest·lock 변경은 없다.

## 검증

| 항목 | 실제 결과 |
| --- | --- |
| RED | 33개 중 기존 30개와 새 보존 사례 1개 통과, 첫 commit 회귀 2개만 실패 |
| 최종 관련 회귀 | **3파일/99개 통과**, 실패·대기 0; 새 회귀 3개 포함 |
| 실행 조건 | UTC, Vitest threads, worker 2 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 전체 lint | **111 → 110**; effect-state 89 → 88, deps 14·refs 8 동일 |
| 진단 비교 | Splitter의 effect-state 1개만 제거, 새 진단 0 |
| 검증 source | frontend 890파일 root/소유 검증 workspace byte 일치; 환경 파일 제외 |

대상은 `common-code-management-page`, `role-management-notification`, `material-receipt-closing`이다. 새 회귀는 드래그 후 같은 prop 유지/외부 비율 첫 commit, 미지정 비율과 픽셀 복귀/재진입, 0/-0 첫 commit 및 NaN 반복을 확인한다.

raw 증거는 세션의 `lint036-red.json`, `lint036-related.json`, `lint036-oxlint.json`, `lint036-typecheck.log`, `lint036-build.log`에 있다. 저장소에는 [범위 검증](screenshots/splitter-ratio-sync/scope-audit.json)과 [실제 브라우저 검증](screenshots/splitter-ratio-sync/verification.json)을 보관했다. 앞선 035의 전체 226파일/2,652개 CI는 다른 SHA의 근거이며 이 단위의 전체 검증으로 재사용하지 않는다.

커밋 후 이 단위 `0a804615f0bf367597e75aad57075f06b3e3c343`의 [원격 CI 44299260146](https://github.com/f1soft611/s-erp/actions/runs/44299260146)를 source SHA와 raw log로 확인했다. **226파일/2,655개 전체 통과**, build/lint/tests/required 네 job 모두 success다. [원격 증거](screenshots/splitter-ratio-sync/remote-ci.json)를 추가했다. 후속 037 행 폼 변경의 전체 결과로 재사용하지 않는다.

## 실제 브라우저

실제 Splitter를 합성 좌우 패널과 부모 제어 버튼으로 mount했다. 운영 JSX·스타일을 바꾸지 않았으며 업무 API·테넌트 데이터를 사용하지 않았다. 공유 4173 서버를 변경하지 않았고 검증 후 소유 탭만 닫았다.

| 폭 | 초기 배치/핸들 | root 폭 | 문서 scrollWidth | 캡처 |
| --- | --- | --- | --- | --- |
| 375 | column/없음 | 343px | 375 | [stacked](screenshots/splitter-ratio-sync/equal-375.png) |
| 768 | row/표시 | 736px | 768 | [1:1](screenshots/splitter-ratio-sync/equal-768.png) |
| 1280 | row/표시 | 928px | 1280 | [1:1](screenshots/splitter-ratio-sync/equal-1280.png) |

768px에서 native 드래그 후 왼쪽 폭은 363→546.47px이고 부모만 재렌더해도 546.47px을 유지한다. 외부 2:1 reset은 [484px](screenshots/splitter-ratio-sync/reset-768.png)이다. 1280px에서는 459→690.47px을 유지하고 reset은 [612px](screenshots/splitter-ratio-sync/reset-1280.png)이다.

픽셀 모드에서도 실제 드래그와 onSizeChange의 마지막 값이 실제 폭과 1px 이내로 일치한다([768](screenshots/splitter-ratio-sync/pixel-768.png), [1280](screenshots/splitter-ratio-sync/pixel-1280.png)). 768px에서 저장한 611.25px은 ratio 모드를 거쳐 1280px의 픽셀 모드로 돌아와도 유지되고, 다시 드래그하면 약 769.12px을 저장한다. 수직 모드도 native 드래그 후 높이 155→174.86px을 부모 재렌더에서 유지하며 [외부 2:1 reset](screenshots/splitter-ratio-sync/vertical-1280.png)은 206.67px이다. 각 드래그 종료 후 body cursor가 해제된다.

첫 브라우저 스크립트는 두 번째 폭에서도 픽셀 모드가 항상 초기 240px이어야 한다고 잘못 기대했다. 실제 계약은 이전 사용자 픽셀 크기 보존이므로, 검증 기대를 마지막 실제 저장 콜백과 비교하도록 고쳤다. 운영 코드는 추가 변경하지 않았다. 첫 commit·NaN 경계는 위 Profiler 단위 회귀가 검증하며 합성 브라우저 흐름만으로 모든 업무 화면 무영향을 보증하지 않는다.

## 잔여와 커밋

최초 lint 206개 중 96개를 제거했고 **110개는 계속 처리한다**. 공식 호환 수정 경로가 없는 의존성 고유 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. DB/API 변경이 없어 DB MCP·SQL 변경 대상이 아니다.

```text
fix(frontend): 분리기 비율 상태 동기화 경계 정리

- 드래그 비율과 픽셀 크기의 사용자 소유 유지
- Object.is 입력 경계 및 외부 비율 첫 commit 회귀 추가
- 관련 99개와 실제 드래그 검증, lint 111→110
```
