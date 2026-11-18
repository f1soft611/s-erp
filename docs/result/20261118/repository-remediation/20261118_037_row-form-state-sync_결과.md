# 행 폼 상태 동기화 결과

[작업지시서](../../../directions/20261118/20261118_037_row-form-state-sync_작업지시서.md) → [계획서](../../../plan/20261118/20261118_037_row-form-state-sync_계획서.md) → [상세사양](../../../spec/20261118/20261118_037_row-form-state-sync_상세사양서.md) 순서로 진행했다.

## 원인과 변경

F1GridFormModal의 open/row 복사 effect 때문에 열린 row 교체와 재개방에서 이전 초안·local 오류가 먼저 commit됐다. Profiler 첫 commit 회귀 2개를 추가했고 운영 코드 수정 전에는 기존 58개가 통과하고 새 2개만 실패했다.

draft는 입력 이벤트가 소유하므로 유지한다. 이전 open/row를 하나의 state로 기록하고 이 입력 그룹이 바뀐 render가 open일 때만 기존 세 setter로 현재 row 복사·빈 validationErrors·빈 focusRequest를 반영한다. 닫힐 때도 입력 key는 갱신하지만 draft를 건드리지 않아, 닫힌 row 변경은 재개방 때 반영된다.

같은 row/open과 columns/plugin/mode/externalErrors만 바뀐 재렌더는 초안을 초기화하지 않는다. 외부 오류의 merge, 입력 수정 콜백, 검증·focus·plugin veto·적용·취소는 기존 본문 그대로다. prop 초기화가 onDraftChange를 추가 호출하지 않으며 원본 row를 수정하지 않는 회귀도 확인했다.

## 보존과 검증

JSX·스타일·props·기존 state/ref 초기값·helper/이벤트/검증 콜백과 실제 DOM 포커스 effect를 AST로 비교했다. guard의 세 초기화 문장은 기존 effect와 같고 render에서 ref current를 접근하지 않는다. 기존 테스트 본문도 유지했다. F1-GRID 문서에 동일 초기화 계약을 추가했다. 호출자·서비스·backend·API·DB·manifest·lock 변경은 없다.

| 항목 | 실제 결과 |
| --- | --- |
| RED | 기존 58개 통과, 첫 commit 회귀 2개 실패 |
| 최종 관련 회귀 | **6파일/351개 통과**, 실패·대기 0; 새 회귀 2개 포함 |
| 실행 조건 | UTC, Vitest threads, worker 2 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 전체 lint | **110 → 109**; effect-state 88 → 87, deps 14·refs 8 동일 |
| 진단 비교 | F1GridFormModal의 effect-state 1개만 제거, 새 진단 0 |
| 검증 source | frontend 890파일 root/소유 검증 workspace byte 일치; 환경 파일 제외 |

대상은 `f1-grid-form-modal`, `f1-tree`, `material-management`, `f1-grid-unique-validation`, `f1-grid-docs`, `f1-grid`다. raw 증거는 세션의 `lint037-red.json`, `lint037-related.json`, `lint037-oxlint.json`, `lint037-typecheck.log`, `lint037-build.log`에 있다. 저장소에는 [scope audit](screenshots/row-form-state-sync/scope-audit.json)과 [실제 화면·콜백 검증](screenshots/row-form-state-sync/verification.json)을 보관했다. 이전 036의 전체 226파일/2,655개 CI는 이번 행 폼 소스의 전체 검증으로 재사용하지 않는다.

## 실제 브라우저

실제 F1GridFormModal/CommonDialog/GridFormField와 앱 light 테마를 합성 행 A/B로 mount했다. 각 draft 변경 콜백이 부모를 다시 렌더하고 새 columns 배열을 전달하므로 metadata-only 재렌더에서도 입력이 보존되는 실제 흐름이다. 업무 API·테넌트 데이터는 사용하지 않았다. 공유 4173 서버를 변경하지 않았고 검증 후 소유 탭만 닫았다.

| 폭 | paper 좌우/폭 | 폼 열 | 문서 scrollWidth | 캡처 |
| --- | --- | --- | --- | --- |
| 375 | 0–375 / 375px, full-screen | 1 | 375 | [열린 폼](screenshots/row-form-state-sync/open-375.png) |
| 768 | 32–736 / 704px | 2 | 768 | [열린 폼](screenshots/row-form-state-sync/open-768.png) |
| 1280 | 145–1135 / 990px | 3 | 1280 | [열린 폼](screenshots/row-form-state-sync/open-1280.png) |

모두 ancestor opacity 1이고 paper 내부 scrollWidth도 clientWidth를 넘지 않는다. 열린 상태로 폭을 변경해도 draft는 alpha를 유지한다. 수치는 현재 공통 셸의 실제 값이며 이 작업에서 폭·테마·레이아웃을 바꾸지 않았다.

375px에서 native 입력으로 이름을 비우고 적용하면 [필수 오류와 해당 입력 포커스](screenshots/row-form-state-sync/invalid-375.png)를 확인한다. [이름 수정](screenshots/row-form-state-sync/edited-375.png)은 오류를 없애고 부모 metadata 재렌더에도 edited-alpha를 유지한다. 취소는 적용 결과를 만들지 않으며 재개방하면 원본 alpha로 돌아온다. 다른 행을 열면 beta이고 [이름/숫자 수정](screenshots/row-form-state-sync/next-row-375.png) 후 적용 콜백은 `{ id: 'B', name: 'edited-beta', quantity: 3.5 }`를 받는다. 원본 A/B는 각각 alpha/1.5, beta/2로 그대로다.

열린 row 교체와 재개방의 **첫 commit**은 앞서 명시한 Profiler 회귀가 검증한다. 브라우저 흐름은 합성 프론트엔드 범위이며 실제 업무 저장/서버 계약이나 모든 업무 화면 무영향을 검증했다고 표현하지 않는다.

## 잔여와 커밋

최초 lint 206개 중 97개를 제거했고 **109개는 계속 처리한다**. 공식 호환 수정 경로가 없는 의존성 고유 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. DB/API 변경이 없어 DB MCP·SQL 변경 대상이 아니다.

```text
fix(frontend): 행 폼 초안 동기화 경계 정리

- open/row 변경의 첫 commit 초기화와 metadata 편집 보존
- 기존 검증·포커스·적용·취소와 원본 행 격리 유지
- 관련 351개와 실제 반응형 폼 검증, lint 110→109
```
