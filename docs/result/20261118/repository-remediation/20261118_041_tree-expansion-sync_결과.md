# F1Tree 펼침 상태 동기화 결과

[작업지시서](../../../directions/20261118/20261118_041_tree-expansion-sync_작업지시서.md) → [계획서](../../../plan/20261118/20261118_041_tree-expansion-sync_계획서.md) → [상세사양](../../../spec/20261118/20261118_041_tree-expansion-sync_상세사양서.md) 순서로 진행했다. [F1-GRID](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)에도 펼침/변경 콜백의 기존 계약을 명시했다.

## 원인과 최소 변경

defaultExpandAll 활성화나 allParentIds 참조 변경의 첫 commit에 이전 사용자 접기 상태가 남고 passive effect 이후 펼쳐졌다. 사용자 소유 expandedIds는 유지한다. 이전 allParentIds/defaultExpandAll을 state에 기록하고 정확한 기존 key가 바뀐 경우에만 원래 Set 합집합 setter를 적용한다. 초기 defaultExpanded 계산과 빈 부모/false flag에서 집합을 보존하는 의미는 바꾸지 않았다.

변경 callback은 rest gridProps 객체를 읽으면서 dependency에 그 프로퍼티만 명시했다. onChangesChange를 props에서 분리해 함수형 callback 호출과 dependency가 같은 값을 참조하게 했다. gridProps 전체를 dependency로 추가하지 않아 metadata 렌더 때마다 callback을 새로 만들지 않는다. JSX에서는 원래처럼 rest spread 뒤의 명시적 handleChangesChange가 전달된다.

운영 파일은 F1Tree.tsx 한 개다. JSX·공개 props/exports·기존 state 초기값·helper·projection/cache·pending insert·ref API·checkbox effect를 AST로 비교했다. 바뀐 것은 이전 입력 guard와 callback binding뿐이다. render의 ref 접근, lint disable, remount, microtask를 추가하지 않았다. 정렬/필터 보호, 서비스·권한·API·DB·의존성은 변경하지 않았다.

## 회귀와 정적 검증

| 항목 | 실제 결과 |
| --- | --- |
| RED | 기존 29개와 신규 보존 2개 통과, 첫 commit 회귀 2개만 실패 |
| GREEN | **6파일/173개 통과**, 실패·대기 0; 신규 runtime 회귀 4개 |
| 범위 | tree, tree-projection, context-menu, form-modal, grid-docs, render-performance |
| 실행 조건 | UTC, Vitest threads, worker 2 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 전체 lint | **103 → 101**; effect-state 85 → 84, deps 10 → 9, refs 8 동일 |
| 진단 비교 | 대상 effect-state/dependency 각 1개만 제거, 새 진단 0 |
| 보존 확인 | 기존 test 선언 29개 그대로, 선언 3개/runtime 4개 추가 |
| 소스 비교 | 환경 파일 제외 frontend 890파일 root/소유 검증 workspace byte 일치 |

Profiler 회귀는 flag 활성화 및 동일 내용 새 rows 참조에서 기존 Child DOM이 첫 commit부터 보이는지 확인한다. 같은 입력의 metadata 변경은 사용자 접기/콜백 identity를 유지하고 셀 수정은 최신 콜백에 전달된다. 부모가 없거나 flag가 꺼져도 기존 집합을 지우지 않으며 defaultExpanded만 바꿔 reset하지 않는다. F1Grid 자체의 새 rows 데이터 교체까지 모두 동기화했다고 주장하지 않는다.

세션의 lint041-red/related/oxlint JSON과 typecheck/build 로그, [scope audit](screenshots/tree-expansion-sync/scope-audit.json), [브라우저 수치·payload](screenshots/tree-expansion-sync/verification.json)를 보관했다. 이전 040의 정확한 SHA 전체 CI **226파일/2,669개**는 040 결과에 구분했으며 이 041 소스의 전체 결과로 재사용하지 않는다.

## 실제 브라우저

실제 F1Tree/행 폼/CommonDialog/앱 light 테마를 부모 Root, 자식 Child/Sibling, 별도 루트 Other의 합성 4행으로 mount했다. native mouse/keypress/fill로 조작했다. fixture 키는 부모 metadata/콜백/flag/rows 참조를 바꾸며 내부 펼침·선택 state를 직접 변경하지 않는다. 하위 추가 버튼은 실제 공개 addChildRow API를 호출한다. API·운영 데이터·서버 저장은 사용하지 않았다.

| 폭 | grid 좌우/폭 | 문서 폭 | body client/scroll 폭 | 캡처 |
| --- | --- | --- | --- | --- |
| 375 | 16–359 / 343px | 375 | 341/412px | [펼침](screenshots/tree-expansion-sync/open-375.png) |
| 768 | 16–752 / 736px | 768 | 734/734px | [펼침](screenshots/tree-expansion-sync/open-768.png) |
| 1280 | 16–1264 / 1248px | 1280 | 1246/1246px | [펼침](screenshots/tree-expansion-sync/open-1280.png) |

모바일은 그리드 내부 가로 스크롤을 사용하고 문서 넘침은 없다. 세 폭 모두 [사용자 접기](screenshots/tree-expansion-sync/collapsed-375.png) 후 metadata 변경은 Root/Other만 표시하고 변경 callback 횟수도 그대로다. 동일 내용 새 rows 참조는 네 행을 다시 펼친다. flag 해제는 접기 상태를 유지하고 재활성화는 부모를 펼친다.

콜백을 교체한 뒤 [Root 트리 checkbox](screenshots/tree-expansion-sync/checkbox-1280.png)는 Root/Child/Sibling의 allowed를 true로 바꾸고 Other는 그대로다. 이 수정의 새 callback들은 모두 현재 version 1에만 전달된다. 새 행이 앞으로 자동으로 체크를 상속한다는 의미로 확대하지 않는다.

Root를 접고 [하위 draft](screenshots/tree-expansion-sync/draft-375.png)를 열어도 접기/insertedRows 0을 유지한다. 375px에서는 기존 행 폼의 full-screen 셸과 내부 필드를 사용한다. 취소는 부모를 펼치거나 삽입하지 않는다. 다시 열어 native로 이름을 바꾸고 [적용](screenshots/tree-expansion-sync/applied-375.png)하면 `{id: 'owned-child', parentId: 'root', name: 'Applied child', order: 2, allowed: false}` 한 행을 삽입하고 부모를 펼친다. 의도적으로 전달한 wrong-parent는 기존 공개 API가 root로 덮어쓰며 현재 callback 1로 전달된다. 화면 내 변경 추적 검증이지 서버 저장 검증은 아니다.

PNG 7개/JSON 2개를 보관했다. console error는 없고 소유 탭만 닫았으며 공유 4173 서버를 변경·종료하지 않았다.

## 정확한 커밋의 전체 CI

커밋 `f61613e2e2b0f8d260383969e53a1dd9ba54bbaa`의 [실행 44311742103](https://github.com/f1soft611/s-erp/actions/runs/44311742103)은 completed/success다. frontend-lint, frontend-build, frontend-tests, frontend-required 네 job의 성공과 원본 로그의 마지막 **226파일/2,673개 통과** 집계를 확인했다. [원격 CI 증거](screenshots/tree-expansion-sync/remote-ci.json)를 보관했다. 후속 문서 검색 변경의 전체 CI 결과와 혼동하지 않는다.

## 별도 기존 관찰 — 미해결

최초 3단계 fixture에서는 Root를 접어도 Grandchild가 루트 수준에 재노출됐다. Root→Child→Grandchild와 Other, expandedIds=['child']의 기존 TreeProjection은 `['root', 'other', 'grandchild']`를 반환한다. 숨겨진 Child에서 visit을 일찍 반환한 뒤 미방문 손자를 orphan fallback이 다시 방문하는 경로다.

TreeProjection.ts가 기준 SHA `7eedc6a2b81392a01d3fe080de4d74ae5103b1a0`와 동일함을 비교하고 보조 진단 1개로 같은 출력을 확인했다. 이 진단은 위 173개와 별도이며 임시 테스트는 제거했다. 이번 변경은 projection을 수정하지 않았고 이 현상을 해결했다고 주장하지 않는다. 기본 동기화 흐름의 native 검증은 2단계 fixture로 분리했으며 3단계 접기 전체가 정상이라고 확대하지 않는다.

## 잔여와 커밋

최초 lint 206개 중 105개를 제거했고 **101개는 순차 처리 중**이다. 공식 호환 수정 경로가 없는 고유 의존성 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. API/DB 변경이 없어 DB MCP·SQL 대상이 아니다.

```text
fix(frontend): 트리 펼침 상태 동기화 정리

- 기존 입력 key와 사용자 펼침 집합 유지
- 현재 변경 콜백과 하위 행 폼 계약 보존
- 관련 173개·실제 3폭/checkbox/폼 검증, lint 103→101
```
