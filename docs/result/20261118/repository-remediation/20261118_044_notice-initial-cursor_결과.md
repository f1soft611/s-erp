# 공지 이전 댓글 초기 커서 결과

[작업지시서](../../../directions/20261118/20261118_044_notice-initial-cursor_작업지시서.md) → [계획서](../../../plan/20261118/20261118_044_notice-initial-cursor_계획서.md) → [상세사양](../../../spec/20261118/20261118_044_notice-initial-cursor_상세사양서.md) 순서로 진행했다. [043](20261118_043_notice-list-deps_결과.md)의 변경 전 기준선에서 발견한 첫 커서 경합을 별도 수정했다.

## 원인과 최소 수정

서버 nextBeforeCommentId가 7이어도 effect가 커서 map을 초기화하기 전에는 버튼의 fallback이 첫 표시 댓글 10이었다. 일반 테스트는 effect 타이밍에 따라 7 또는 10을 관찰할 수 있었다. 첫 commit에서 버튼을 누르는 Profiler 회귀로 10을 결정적으로 재현했다.

이전 댓글 이벤트의 커서 계산만 수정했다. map에 own entry가 아직 없으면 서버 nextBeforeCommentId를 사용한다. entry가 있으면 기존 로컬 커서 값을 사용하고, nullish 값은 원래처럼 첫 표시 댓글로 fallback한다. 소유 entry의 undefined도 구분해 서버 prop을 임의 복원하지 않는다.

운영 diff는 해당 순수 값 계산뿐이다. 기존 effect 4개·state 초기값·ref·댓글 merge/추가/수정/삭제·중복 요청 방지·완료 판단·서버 reset·공개 props·JSX 마크업·스타일을 바꾸지 않았다. API 인자 수/필드/경로·응답/DB 계약도 변경하지 않았다.

## 회귀와 정적 검증

| 항목 | 실제 결과 |
| --- | --- |
| RED | local-updates **40 통과/1 실패**; 새 첫 commit 회귀만 기대 7/실제 10으로 실패 |
| GREEN | 관련 **5파일·83개 통과**, 실패·대기 0 |
| 신규 runtime | 첫 commit 서버 커서와 이미 초기화한 undefined fallback 보존 2개 |
| 범위 | notice-list, notice-page, notice-page-local-updates, notice-comments, notice-interactions |
| 보존 확인 | 기존 test 선언 38개/runtime 39개 유지, 기존 effect 4개 동일 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 전체 lint | **98 → 98**, 진단 multiset 동일; 새 진단 0 |
| 소스 비교 | 환경 파일 제외 frontend 890파일 root/소유 검증 workspace byte 일치 |

UTC/threads/worker 2로 실행했다. 기존의 비결정적 테스트 통과만으로 해결을 주장하지 않고, 수정 전 실패한 결정적 첫 commit 회귀가 통과하는 것으로 확인했다. 일반 초기화 뒤 서버 커서 메타데이터만 달라져도 이미 소유한 undefined fallback을 유지하는 보존 회귀도 통과했다. 관련 JSON/log와 [scope audit](screenshots/notice-initial-cursor/scope-audit.json), [브라우저 수치](screenshots/notice-initial-cursor/verification.json)를 보관했다.

## 실제 브라우저

실제 NoticeFeedList·테마에 합성 댓글과 수동 완료하는 로컬 callback Promise를 제공했다. native mouse로 제품의 이전 댓글 버튼과 fixture의 응답/메타데이터 버튼을 조작했다. 네트워크는 차단했고 탭의 Storage는 메모리 대체해 실제 저장 값을 읽거나 쓰지 않았다. 폭 사이 reset/remount는 test fixture 격리용이며 운영 코드에 remount를 추가하지 않았다.

| 폭 | 첫 조회/중복 방지 | 메타데이터 이후 이어 조회 | 완료 |
| --- | --- | --- | --- |
| 375 | 커서 7, 로딩 중 클릭해도 1회; [대기](screenshots/notice-initial-cursor/pending-375.png), [5개 댓글](screenshots/notice-initial-cursor/loaded-375.png) | 서버 메타데이터 99 대신 로컬 4 유지 | [7개 댓글/이전 버튼 숨김](screenshots/notice-initial-cursor/complete-375.png) |
| 768 | 커서 7, 중복 요청 없음; [5개 댓글](screenshots/notice-initial-cursor/loaded-768.png) | 기존 댓글과 로컬 4 유지 | [7개 댓글/이전 버튼 숨김](screenshots/notice-initial-cursor/complete-768.png) |
| 1280 | 커서 7, 중복 요청 없음; [5개 댓글](screenshots/notice-initial-cursor/loaded-1280.png) | 기존 댓글과 로컬 4 유지 | [7개 댓글/이전 버튼 숨김](screenshots/notice-initial-cursor/complete-1280.png) |

세 폭 모두 실제 callback 인자는 순서대로 `(1, 7)`, `(1, 4)`였고 네트워크 호출은 0개다. 문서 가로 넘침은 없다. PNG 7개/JSON 2개를 보관하고 소유 탭만 닫았다. 공유 서버는 변경·종료하지 않았다.

브라우저의 일반 native 흐름은 로딩/병합/메타데이터/완료의 보존 검증이다. effect 이전의 첫 commit 시점은 자동 Profiler 회귀로 검증했으며 두 근거를 같은 시점 검증이라고 확대하지 않는다.

## 잔여와 커밋

이번 단위는 발견한 초기 상호작용 버그 복구이며 lint 수를 줄이는 변경이 아니다. **98개 경고**와 다른 댓글/이미지 effect 동기화는 후속 처리한다. 공식 호환 수정 경로가 없는 의존성 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. API/DB 변경이 없어 DB MCP·SQL 대상이 아니다.

```text
fix(frontend): 이전 댓글 첫 요청 커서 복구

- 미초기화 커서는 서버 nextBeforeCommentId 사용
- 소유한 로컬/undefined 커서와 기존 댓글 흐름 보존
- 결정적 RED/GREEN·관련 83개·실제 3폭 검증
```
