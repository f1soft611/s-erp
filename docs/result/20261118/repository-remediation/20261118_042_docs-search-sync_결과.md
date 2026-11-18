# Grid 문서 검색 선택 동기화 결과

[작업지시서](../../../directions/20261118/20261118_042_docs-search-sync_작업지시서.md) → [계획서](../../../plan/20261118/20261118_042_docs-search-sync_계획서.md) → [상세사양](../../../spec/20261118/20261118_042_docs-search-sync_상세사양서.md) 순서로 진행했다. [F1-GRID](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)에 검색·선택·예제 상태 유지 조건도 추가했다.

## 원인과 최소 변경

현재 문서가 검색 결과에서 제외돼도 첫 commit에는 이전 문서를 표시하고 passive effect 이후 첫 결과로 이동했다. 결과가 있고 현재 문서가 제외됐을 때만 같은 setter로 첫 결과를 선택하는 guarded own-state 조정으로 대체했다.

사용자가 고른 문서가 결과에 포함되면 유지한다. 결과 0개나 검색 해제에서는 현재 문서와 Playground를 보존한다. 검색 알고리즘·별칭·문서 데이터·JSX·CSS·공개 props·state 초기값·이벤트는 변경하지 않았다. remount, render의 ref/DOM 접근, lint disable도 추가하지 않았다.

API 앵커의 scrollIntoView와 pendingApiAnchor 소비 effect는 그대로다. pendingApiAnchor는 API 결과 버튼의 active class에도 연결돼 있어 단순 ref 치환으로 경고를 숨기지 않았다. 이 effect의 경고 1개는 미해결로 남는다. Grid/Tree 운영 코드·서비스·권한·API/DB·의존성은 이번 범위가 아니다.

## 회귀와 정적 검증

| 항목 | 실제 결과 |
| --- | --- |
| RED | 기존 30개와 신규 보존 2개 통과, 첫 commit 회귀 1개만 실패 |
| GREEN | docs/render-performance **2파일·49개 통과**, 실패·대기 0 |
| 신규 runtime | 첫 commit의 API 문서, 현재 일치 문서 유지, 결과 0개/해제의 48px 예제 유지 3개 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 전체 lint | **101 → 100**; effect-state 84 → 83, deps 9/refs 8 동일 |
| 진단 비교 | 대상 effect-state 1개만 제거, 새 진단 0 |
| 보존 확인 | 대상 effect 이외 컴포넌트 문장 17개·파일 문장·기존 test 30개 그대로 |
| 소스 비교 | 환경 파일 제외 frontend 890파일 root/소유 검증 workspace byte 일치 |

UTC/threads/worker 2로 실행했다. 최초 RED 관찰자는 실제 제목 '행 높이'를 영어 별칭으로 기대해 불필요한 실패가 있었다. 운영 변경 전에 실제 문서 데이터의 title을 사용하도록 관찰자만 바로잡고 위의 **32 통과/의도한 1 실패**를 다시 확인했다.

관련 JSON/log와 [scope audit](screenshots/docs-search-sync/scope-audit.json), [브라우저 수치](screenshots/docs-search-sync/verification.json)를 보관했다. 이전 041의 정확한 SHA 전체 CI **226파일/2,673개**는 [041 결과](20261118_041_tree-expansion-sync_결과.md)에 구분했으며 이번 소스의 전체 결과로 재사용하지 않는다.

## 실제 브라우저

실제 F1GridDocsPage·문서 데이터·테마·Row Height Playground를 사용했다. AppSettingsContext의 테마 값만 fixture의 로컬 state로 제공했다. native click/fill/mouse로 조작했으며 eval은 fixture 구성·DOM 관찰·애니메이션 대기에만 사용했다. 개인 설정 저장·API·운영 데이터·백엔드 호출은 하지 않았다.

| 폭 | 예제/검색 상태 | 테마 | API 결과/반복 앵커 |
| --- | --- | --- | --- |
| 375 | [48px 예제](screenshots/docs-search-sync/playground-375.png), [빈 검색](screenshots/docs-search-sync/empty-375.png) 후 해제해도 유지 | [dark](screenshots/docs-search-sync/dark-375.png)/light 모두 확인 | [동일 항목 두 번 이동](screenshots/docs-search-sync/api-375.png), 모바일 메뉴 닫힘 |
| 768 | [48px 예제](screenshots/docs-search-sync/playground-768.png), 결과 0개/해제 유지 | [dark](screenshots/docs-search-sync/dark-768.png)/light 모두 확인 | [동일 항목 두 번 이동](screenshots/docs-search-sync/api-768.png) |
| 1280 | [48px 예제](screenshots/docs-search-sync/playground-1280.png), 결과 0개/해제 유지 | [dark](screenshots/docs-search-sync/dark-1280.png)/light 모두 확인 | [동일 항목 두 번 이동](screenshots/docs-search-sync/api-1280.png) |

세 폭 모두 F1GridUserOption.positionName 검색은 API 참조를 선택했다. 현재 API 문서가 rowHeight 검색과 일치하면 다른 첫 결과로 바꾸지 않는다. API 결과를 두 번 선택하면 각각 정확히 한 번씩, 총 6회 같은 API 행으로 이동하고 기존 임시 active class를 소비한다. 목차 접기/펼침과 메뉴를 통한 행 높이 문서 복귀도 확인했다.

API 행의 기존 `scroll-margin-top: 20px`를 반영한 중앙 오차는 각 2px 미만이었다. 최초 관찰자가 이를 반영하지 않아 대기했지만 제품 CSS/스크롤은 수정하지 않고 관찰만 보정한 뒤 새 소유 탭에서 전체 흐름을 다시 통과했다. 세 폭의 문서 폭은 뷰포트와 같고 API 표시 중 main의 client/scroll 폭이 같았다. 넓은 표/그리드는 기존 내부 가로 스크롤을 유지한다.

PNG 10개/JSON 2개를 보관했다. 소유 탭만 닫았으며 공유 4173 서버를 변경·종료하지 않았다.

## 잔여와 커밋

최초 lint 206개 중 106개를 제거했고 **100개는 순차 처리 중**이다. 공식 호환 수정 경로가 없는 고유 의존성 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. 041에서 분리한 기존 3단계 TreeProjection 관찰도 이 수정으로 해결됐다고 주장하지 않는다. API/DB 변경이 없어 DB MCP·SQL 대상이 아니다.

```text
fix(frontend): 문서 검색 선택 동기화 정리

- 첫 검색 결과 선택을 commit 전에 일치
- 현재 문서·빈 검색·예제·API 앵커 계약 보존
- 관련 49개·실제 3폭/양 테마 검증, lint 101→100
```
