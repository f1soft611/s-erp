# 공지 목록 의존성 선언 결과

[작업지시서](../../../directions/20261118/20261118_043_notice-list-deps_작업지시서.md) → [계획서](../../../plan/20261118/20261118_043_notice-list-deps_계획서.md) → [상세사양](../../../spec/20261118/20261118_043_notice-list-deps_상세사양서.md) 순서로 진행했다.

## 변경과 보존

운영 diff는 dependency array 2곳에 원소를 하나씩 추가한 것뿐이다.

- useNoticeList.loadNoticePosts에 selectedNoticeFilter를 직접 명시했다. 기존 loadAllPinnedPosts가 같은 필터 값을 이미 관찰하므로 실효 callback 갱신 조건은 늘리지 않는다.
- CommunityNoticePage의 분류명 동기화 effect에 setNoticeItems를 명시했다. useNoticeList가 useState에서 그대로 반환한 안정적인 setter이며 wrapper가 아니다.

전체 소스 비교로 이 두 선언 이외의 본문·상태·JSX·이벤트·다른 dependency가 같고, AST로 callback/effect 본문과 전이 필터·raw setter 반환을 확인했다. 일반/고정 목록 요청·요청 세대·중복 요청 보호·오류·페이징·로컬 댓글·보기 전환은 변경하지 않았다. API/DB·권한·공개 props·스타일·의존성도 바꾸지 않았다.

## 검증

| 항목 | 실제 결과 |
| --- | --- |
| 대상 lint RED | 두 파일의 exhaustive-deps가 0개라는 assertion이 기존 2개로 실패 |
| runtime 기준선 | **3파일·75 통과/1 실패**; 아래 기존 커서 관찰로 분리 |
| 수정 후 runtime | 동일 **3파일·76개 통과**, 실패·대기 0; 새 테스트 추가 없음 |
| 범위 | use-notice-list, notice-page, notice-page-local-updates |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 전체 lint | **100 → 98**, deps 9 → 7; effect-state 83/refs 8 동일 |
| 진단 비교 | 대상 deps 2개만 제거, 새 진단 0 |
| 소스 비교 | 환경 파일 제외 frontend 890파일 root/소유 검증 workspace byte 일치 |

UTC/threads/worker 2로 실행했다. 기존 동작을 바꾸지 않는 선언 수정이므로 소스 문자열/상수를 재진술하는 영구 테스트는 추가하지 않았다. 세션의 lint043 JSON/log와 [scope audit](screenshots/notice-list-deps/scope-audit.json), [브라우저 수치](screenshots/notice-list-deps/verification.json)를 보관했다.

## 실제 브라우저

실제 CommunityNoticePage·테마/알림 provider·공지/분류 hook·서비스 adapter를 사용했다. 소유 탭 안에서 Storage를 메모리 대체하고 fetch를 합성 응답으로 완전히 격리했다. 실제 저장된 세션/설정을 읽거나 쓰지 않았고 운영 API로 전달하는 fallback도 없다. 게시물 3개/분류 2개는 합성 데이터다.

| 폭 | Operations | Bulletin | 전체 복귀 | 캡처 |
| --- | --- | --- | --- | --- |
| 375 | 일반 1/고정 1 | 일반 1/고정 0 | 일반 2/고정 1 | [필터](screenshots/notice-list-deps/filter-375.png) |
| 768 | 일반 1/고정 1 | 일반 1/고정 0 | 일반 2/고정 1 | [필터](screenshots/notice-list-deps/filter-768.png) |
| 1280 | 일반 1/고정 1 | 일반 1/고정 0 | 일반 2/고정 1 | [필터](screenshots/notice-list-deps/filter-1280.png), [리스트](screenshots/notice-list-deps/list-1280.png) |

native mouse로 분류를 바꾸면 일반/고정 목록을 각각 한 번 조회한다. 같은 분류를 다시 선택하면 추가 조회는 0개다. 리스트→피드 왕복은 기존 handleViewModeChange의 명시적 loadNoticePosts를 유지해 각 목록을 다시 한 번 조회한다. 전체 합성 목록 요청은 24회, 알 수 없는 요청은 0개였다. 문서 폭은 세 뷰포트와 같았다.

관찰자는 기존 MUI Grow 전환이 끝난 뒤 메뉴 항목 좌표를 읽도록 보정했다. 전환 중 좌표로 다른 항목을 누른 초기 실행은 검증 결과에서 제외하고 새 소유 탭에서 세 폭 필터 흐름을 다시 통과했다. 보기 전환의 기존 명시적 새로고침도 소스에 맞춰 확인했으며, 요청을 없애도록 제품 코드를 수정하지 않았다. PNG 4개/JSON 2개를 보관하고 소유 탭만 닫았다. 공유 서버는 변경·종료하지 않았다.

## 별도 기존 커서 관찰 — 후속 처리

운영 변경 전 기준선의 이전 댓글 배치 테스트가 beforeCommentId 7 대신 10을 보내 한 번 실패했다. 같은 기존 테스트의 분리 실행은 통과했다. 변경하지 않은 NoticeFeedList의 첫 commit에서 이전 댓글 버튼을 누르는 별도 진단은 effect가 서버 커서 7을 초기화하기 전에 fallback 10을 사용하는 동작을 재현했다. 진단 1개는 위 76개와 별도이며 실행 후 임시 파일을 제거했다.

이번 선언 변경은 그 컴포넌트나 커서 계산을 수정하지 않았다. 수정 후 76개 통과를 이 경합의 해결 근거로 삼지 않는다. 후속 단위에서 초기 커서 소유권을 별도 RED로 고정하고 최소 수정한다. 다른 댓글/이미지 effect 경고도 이번에 해결했다고 주장하지 않는다.

후속 [044 결과](20261118_044_notice-initial-cursor_결과.md)에서 이 초기 상호작용만 결정적 RED/GREEN과 관련 83개로 복구했다. 이는 043의 선언 수정과 별도이며 전체 댓글 effect 재구성은 아니다.

## 잔여와 커밋

최초 lint 206개 중 108개를 제거했고 **98개는 순차 처리 중**이다. 공식 호환 수정 경로가 없는 의존성 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. API/DB 변경이 없어 DB MCP·SQL 대상이 아니다.

이전 042의 정확한 SHA 전체 CI **226파일/2,676개**는 [042 결과](20261118_042_docs-search-sync_결과.md)에 구분했으며 이번 소스의 전체 결과로 재사용하지 않는다.

```text
fix(frontend): 공지 목록 의존성 선언 보완

- 기존 전이 필터와 안정적 setter를 직접 명시
- 요청·댓글·화면 본문 변경 없이 deps 경고 2개 제거
- 관련 76개·실제 3폭 필터/보기 전환 검증, lint 100→98
```
