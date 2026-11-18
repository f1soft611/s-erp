# F1Grid 로컬 레이아웃 callback 의존성 결과

[작업지시서](../../../directions/20261118/20261118_040_grid-layout-deps_작업지시서.md) → [계획서](../../../plan/20261118/20261118_040_grid-layout-deps_계획서.md) → [상세사양](../../../spec/20261118/20261118_040_grid-layout-deps_상세사양서.md) 순서로 진행했다. [F1-GRID](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)의 선택·가상화 계약도 함께 갱신했다.

## 원인과 최소 변경

드래그의 window pointer listener는 rowIndexById/rowKey/visibleRows를 관찰하지만, 호출하는 resolvePointerCell은 visibleColumns.length도 읽는다. 동일 표시 행에서 컬럼만 1→2로 늘리면 기존 listener의 경계 fallback이 길이 1을 계속 사용했다.

기존 hoisted helper를 실행하지 않고 `useCallback(resolvePointerCell, [rowIndexById, rowKey, visibleColumns.length, visibleRows])`로 전달해 listener에 사용한다. 전체 컬럼 배열을 dependency로 잡지 않아 같은 표시 행 참조·행 키·컬럼 수의 metadata 재렌더가 pending frame을 취소하지 않는다.

updateRangeOverlay는 본문 그대로 useCallback으로 감싸고 두 effect에 dependency를 추가했다. rowVirtualState에는 이미 파생 rowHeightsById로 반영되던 rowHeights를 직접 명시했다. 행 높이 계산식·임계값·window·padding과 overlay의 DOM/ref/geometry/equality/setter는 그대로다.

운영 파일은 F1Grid.tsx 한 개다. JSX·공개 props/exports·기존 state/변수·helper 51개 본문과 effect 24개를 AST로 비교했다. 바뀐 effect는 3개의 callback 연결/의존성뿐이다. render의 DOM/ref 실행, lint disable, callback 우회, remount, microtask는 추가하지 않았다. datasource load 및 기존 state effect, 서비스·권한·API·DB·manifest·lock은 변경하지 않았다.

## 회귀와 정적 검증

| 항목 | 실제 결과 |
| --- | --- |
| 수정 전 RED | 기존 199개와 신규 동일 수 보존 1개 통과, 신규 컬럼 증가 경계 회귀 1개만 실패 |
| 수정 후 관련 회귀 | **7파일/303개 통과**, 실패·대기 0; 신규 runtime 회귀 2개 |
| 범위 | grid, tree, render-performance, pinned-column-range, row-selection, grid-docs, virtualization |
| 실행 조건 | UTC, Vitest threads, worker 2 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 전체 lint | **107 → 103**; effect-state 85·refs 8 동일, exhaustive-deps 14 → 10 |
| 진단 비교 | 대상 deps 4개만 제거, 새 진단 0 |
| 보존 확인 | 기존 test 선언 181개 그대로, it.each 선언 1개/runtime 2개 추가 |
| 소스 비교 | 환경 파일 제외 frontend 890파일 root/소유 검증 workspace byte 일치 |

회귀는 실제 window listener와 제어한 RAF를 사용한다. 컬럼 증가 시 현재 경계 fallback과 동일 수 metadata 갱신 시 대기 frame 보존을 함께 확인한다. 첫 RED에서 MUI sx의 폭을 inline style로 잘못 읽은 observer를 getComputedStyle로 고쳤으며, 운영 수정 전에 의도한 단일 RED를 다시 확인했다.

세션의 lint040-red/related/oxlint JSON과 typecheck/build 로그, [scope audit](screenshots/grid-layout-deps/scope-audit.json), [브라우저 수치](screenshots/grid-layout-deps/verification.json)를 보관했다. 이전 039의 정확한 SHA 전체 CI **226파일/2,667개**는 039 결과에 별도로 기록했고 이 040 소스의 전체 CI로 재사용하지 않는다.

## 실제 브라우저

실제 F1Grid/앱 light 테마를 합성 행 80개와 고정 Code 컬럼으로 mount했다. native mouse/keypress/wheel로 조작했다. fixture의 Alt+C/M은 부모 컬럼 수/metadata만 바꾸며 내부 선택·높이·스크롤 state를 직접 조작하지 않는다. API/운영 데이터/서버 저장은 사용하지 않았다.

| 폭 | grid 좌우/폭 | 문서 폭 | body client/scroll 폭 | 범위 |
| --- | --- | --- | --- | --- |
| 375 | 16–359 / 343px | 375 | 341/534px | [선택](screenshots/grid-layout-deps/range-375.png) |
| 768 | 16–752 / 736px | 768 | 734/734px | [선택](screenshots/grid-layout-deps/range-768.png) |
| 1280 | 16–1264 / 1248px | 1280 | 1246/1246px | [선택](screenshots/grid-layout-deps/range-1280.png) |

모두 80개 중 12개 행을 렌더링한다. 모바일은 그리드 내부에서만 가로 스크롤하며 문서 넘침은 없다. 고정 Code부터 Name까지 3행/2컬럼의 셀 6개가 선택된다. 기존 1px inset을 포함한 테두리는 378×106px다. native Ctrl+C의 copy event에서 합성 3행 TSV와 [점선 copy 테두리](screenshots/grid-layout-deps/copy-375.png)를 확인했고 Escape는 세 폭 모두 테두리를 해제했다. OS 클립보드의 기존 내용을 읽은 검증은 아니다.

[행 높이 조절](screenshots/grid-layout-deps/height-1280.png)은 실제 셀 높이 36→108px, 가상 전체 높이 2880→2952px로 같은 72px 증가를 반영한다. 범위 높이는 178px가 된다. native 72px 스크롤은 overlay도 72px 이동시킨다. [900px 스크롤](screenshots/grid-layout-deps/scroll-1280.png) 시 첫 렌더 행은 CODE-24, 렌더 행 수는 12개이며 복귀 후 변경한 높이도 유지된다.

포인터를 누른 상태로 컬럼 1→3 증가 후 두 번째 컬럼으로 드래그하고, 같은 수 metadata를 바꾼 뒤 세 번째 행까지 계속 [범위를 확장](screenshots/grid-layout-deps/columns-1280.png)했다. 이는 정상 DOM의 native 동작 보존 검증이다. 합성 DOM의 경계 fallback RED 및 소비 전 pending RAF 검증과 동일한 실패 조건을 브라우저에서 재현했다고 주장하지 않는다.

초기 browser observer는 border inset을 빼지 않았고 display:contents인 row의 rect를 높이로 사용했다. 실제 셀 geometry/기존 inset으로 observer만 수정했다. 첫 높이 조작도 sticky checkbox에 가린 좌측 대신 실제 hit-test로 확인한 중앙 handle을 사용했다. 운영 CSS/높이 동작을 바꾼 것이 아니다. 새 fixture에서 전체 흐름을 다시 통과했고 console error는 없었다.

PNG 7개/JSON 2개를 보관하고 소유 탭만 닫았다. 공유 4173 서버를 변경·종료하지 않았다.

## 잔여와 커밋

최초 lint 206개 중 103개를 제거했고 **103개는 순차 처리 중**이다. F1Grid의 기존 state effect 6개와 datasource dependency 1개는 이 단위에 섞지 않았다. 공식 호환 수정 경로가 없는 고유 의존성 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. API/DB 변경이 없어 DB MCP·SQL 대상이 아니다.

```text
fix(frontend): 그리드 레이아웃 callback 의존성 정리

- 현재 컬럼 수로 드래그 경계 계산 및 pending frame 보존
- overlay/행 높이 계산과 공개 API 유지
- 관련 303개·실제 3폭/높이/스크롤 검증, lint 107→103
```
