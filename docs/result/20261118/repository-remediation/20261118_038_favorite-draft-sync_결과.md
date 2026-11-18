# 즐겨찾기 편집 초안 동기화 결과

[작업지시서](../../../directions/20261118/20261118_038_favorite-draft-sync_작업지시서.md) → [계획서](../../../plan/20261118/20261118_038_favorite-draft-sync_계획서.md) → [상세사양](../../../spec/20261118/20261118_038_favorite-draft-sync_상세사양서.md) 순서로 진행했다.

## 원인과 최소 변경

열린 즐겨찾기 대상 key가 바뀌면 passive effect가 실행되기 전 이전 입력과 오류가 먼저 commit됐다. 기존 다섯 dependency(`favoriteId`, 원문 `favoriteName`, `folderId`, `menuName`, `open`)를 같은 순서의 primitive tuple로 유지하고 `Object.is` 비교에 의한 own-state 조정으로 옮겼다. 첫 열린 render의 이름/폴더 초기값도 같은 trim/fallback/nullable-folder 식으로 맞췄다.

사용자가 수정하는 이름/폴더 state는 유지한다. 닫힐 때는 key만 기록하며 재개방하면 현재 대상 값으로 초기화한다. 새 favorite 객체라도 primitive가 같거나 menuId/URL/폴더 목록/콜백만 바뀌면 초안과 오류를 보존한다. prop 초기화가 저장/삭제를 호출하지 않는다.

운영 파일은 `MenuFavoriteEditDialog.tsx` 한 개다. CommonDialog/JSX/스타일/공개 props와 close/save/remove 함수 본문, submitting/error 초기값을 AST로 비교했다. 초기화 세 문장과 dependency 순서도 원래 effect와 같다. render의 ref 접근, lint disable, layout effect, remount, microtask는 없다. 호출자·서비스·타입·권한·API·DB·manifest·lock은 변경하지 않았다.

## 회귀와 정적 검증

| 항목 | 실제 결과 |
| --- | --- |
| RED | 기존 13개 + 신규 mount/reopen 2개 통과, 열린 key 교체 4개만 의도한 stale-commit 실패 |
| 최종 관련 회귀 | **4파일/54개 통과**, 실패·대기 0; 신규 runtime 회귀 6개 |
| 회귀 범위 | menu-favorites, dashboard-sidebar, common-dialog, common-dialog-usage |
| 실행 조건 | UTC, Vitest threads, worker 2 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 전체 lint | **109 → 108**; effect-state 87 → 86, deps 14·refs 8 동일 |
| 진단 비교 | 대상 effect-state 1개만 제거, 새 진단 0 |
| 검증 source | frontend 890파일 root/소유 검증 workspace byte 일치; 환경 파일 제외 |

열린 상태의 key 교체는 Profiler 첫 commit에서 이전 입력/오류가 보이지 않는지 검증한다. mount/reopen은 portal에 실제 dialog가 존재하는 첫 관찰 가능한 commit을 확인하는 보존 회귀이며, 기존 코드에서도 이 두 회귀는 통과했다. DOM이 아직 없는 내부 commit을 관찰했다고 표현하지 않는다.

raw 증거는 세션의 `lint038-red.json`, `lint038-related.json`, `lint038-oxlint.json`, `lint038-typecheck.log`, `lint038-build.log`다. [scope audit](screenshots/favorite-draft-sync/scope-audit.json)과 [브라우저 수치·콜백](screenshots/favorite-draft-sync/verification.json)을 저장소에 보관했다. 이전 037 SHA의 전체 CI **226파일/2,657개** 성공은 해당 결과에 구분했으며 이번 038 소스의 전체 CI 결과로 재사용하지 않는다.

## 실제 브라우저

실제 MenuFavoriteEditDialog/CommonDialog와 앱 light 테마를 합성 A/B 대상으로 mount했다. native fill/click/keypress로 조작했으며 fixture의 native 키는 metadata 갱신/대상 교체/실패 콜백 전환만 제어한다. 실제 API/사용자 데이터/업무 서버 저장을 사용하지 않았다.

| 폭 | paper 좌우/폭 | 문서 scrollWidth | 캡처 |
| --- | --- | --- | --- |
| 375 | 32–343 / 311px | 375 | [열린 편집창](screenshots/favorite-draft-sync/open-375.png) |
| 768 | 144–624 / 480px | 768 | [열린 편집창](screenshots/favorite-draft-sync/open-768.png) |
| 1280 | 400–880 / 480px | 1280 | [열린 편집창](screenshots/favorite-draft-sync/open-1280.png) |

모두 ancestor opacity 1, 내부 scrollWidth≤clientWidth이며 입력/버튼 겹침·잘림이 없다. 이 모달의 기존 xs 크기를 그대로 사용하며 375px에서도 임의로 full-screen으로 변경하지 않았다. 열린 상태로 폭을 변경해도 edited-alpha를 유지했고 URL readOnly도 확인했다.

375px에서 [빈 이름 검증](screenshots/favorite-draft-sync/invalid-375.png)은 저장을 호출하지 않는다. 이름/폴더 수정 후 [저장 실패](screenshots/favorite-draft-sync/failed-375.png)는 모달과 raw 입력을 유지한다. metadata만 새 객체/목록/URL/menuId로 갱신해도 입력·오류가 남는다. [대상 B 교체](screenshots/favorite-draft-sync/next-row-375.png)는 공백 표시명 대신 Menu B와 루트 폴더로 바꾸고 오류를 제거한다.

성공 저장은 trim된 `saved-beta`와 숫자 폴더 `12`를 한 번 전달하고 닫았다. 재개방은 현재 props인 Menu B/루트를 사용한다. 제거·더보기·헤더 닫기·Escape·취소 후 A 재개방도 확인했다. 최종 콜백은 save 2회(실패/성공), remove 1회, more 1회, close 4회이며 불필요한 저장이 없다. fixture는 저장값을 서버에 영속화하지 않으므로 재개방을 서버 연동 회귀라고 표현하지 않는다.

초기 browser harness의 CJS 모듈 import에 default 정규화가 빠져 mount 전에 실패했다. fixture만 수정 후 모든 검증을 수행했으며 운영 코드 추가 수정은 없었다. 실제 PNG 6개/JSON 2개를 보관하고 소유 탭을 닫았다. 기존 공유 4173 서버는 변경·종료하지 않았다.

## 잔여와 커밋

최초 lint 206개 중 98개를 제거했고 **108개는 순차 처리 중**이다. 공식 호환 수정 경로가 없는 의존성 고유 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. DB/API 변경이 없어 DB MCP·SQL 대상이 아니다.

```text
fix(frontend): 즐겨찾기 편집 초안 동기화 정리

- 기존 primitive key와 편집/오류 보존 유지
- 열린 대상 변경의 첫 commit 초기화 회귀
- 관련 54개·실제 3폭/이벤트 검증, lint 109→108
```
