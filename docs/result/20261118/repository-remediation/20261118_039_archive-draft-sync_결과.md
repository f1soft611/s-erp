# 자료실 파일 편집 초안 동기화 결과

[작업지시서](../../../directions/20261118/20261118_039_archive-draft-sync_작업지시서.md) → [계획서](../../../plan/20261118/20261118_039_archive-draft-sync_계획서.md) → [상세사양](../../../spec/20261118/20261118_039_archive-draft-sync_상세사양서.md) 순서로 진행했다.

## 원인과 최소 변경

파일 참조가 바뀐 뒤 passive effect가 실행되기 전 이전 파일명/선택/오류가 먼저 commit됐다. 사용자 편집 state는 유지하고 이전 file 참조를 state로 기록한다. 참조가 변경되면 기존 세 setter로 현재 파일명/폴더/null-fallback/빈 오류를 같은 render에서 맞춘다. 초기 이름/폴더 state도 같은 식으로 초기화한다.

기존 `[file]`와 동일하게 **필드가 같은 새 객체도 초기화**한다. 동일 file 참조의 categories/saving/콜백 변경은 편집값과 오류를 보존한다. null 전환은 이름·폴더·오류를 비우며 재개방은 현재 file을 사용한다. ID나 필드별 비교로 의미를 바꾸지 않았다.

운영 파일은 `ArchiveFileEditDialog.tsx` 한 개다. 공개 props, CommonDialog/JSX/스타일/활성 폴더 필터/버튼, handleSave 전체와 saving의 닫기 guard를 AST로 비교했다. 초기화 세 문장도 기존 effect와 같다. render의 ref 접근, lint disable, layout effect, remount, microtask는 없다. 호출자·서비스·타입·권한·API·DB·manifest·lock은 변경하지 않았다.

## 회귀와 정적 검증

| 항목 | 실제 결과 |
| --- | --- |
| RED | 기존 22개 + 신규 재개방 1개 통과, 열린 새 참조/다른 파일/null 폴더의 첫 commit 3개만 실패 |
| 최종 관련 회귀 | **4파일/49개 통과**, 실패·대기 0; 신규 runtime 회귀 4개 |
| 회귀 범위 | archive-page, archive-board-service, common-dialog, common-dialog-usage |
| 실행 조건 | UTC, Vitest threads, worker 2 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 전체 lint | **108 → 107**; effect-state 86 → 85, deps 14·refs 8 동일 |
| 진단 비교 | 대상 effect-state 1개만 제거, 새 진단 0 |
| 검증 source | frontend 890파일 root/소유 검증 workspace byte 일치; 환경 파일 제외 |

열린 교체는 Profiler 첫 commit을 확인한다. 재개방은 실제 portal dialog가 존재하는 첫 관찰 가능한 commit의 보존 회귀로, 기존 코드에서도 통과했다. 초기 테스트는 빈 값의 Select가 닫혔을 때도 `루트`라는 표시 문자열을 보여야 한다고 잘못 기대했다. 실제 빈 value를 관찰하도록 observer만 수정한 뒤 운영 수정 전에 의도한 RED 3개를 다시 확인했다.

raw 증거는 세션의 `lint039-red.json`, `lint039-related.json`, `lint039-oxlint.json`, `lint039-typecheck.log`, `lint039-build.log`다. [scope audit](screenshots/archive-draft-sync/scope-audit.json)과 [실제 브라우저 수치·콜백](screenshots/archive-draft-sync/verification.json)을 보관했다. 이전 038 정확한 SHA의 전체 CI **226파일/2,663개**는 038 결과에 구분했으며 이번 039 소스의 전체 CI로 재사용하지 않는다.

## 실제 브라우저

실제 ArchiveFileEditDialog/CommonDialog/AppSaveButton과 앱 light 테마를 합성 파일 A/B로 mount했다. native fill/click/keypress로 조작하고 fixture의 키는 metadata/참조 교체/합성 비동기 콜백의 성공·실패와 완료 시점만 제어한다. 실제 API/테넌트 데이터/서버 저장은 사용하지 않았다.

| 폭 | paper 좌우/폭 | 문서 scrollWidth | 캡처 |
| --- | --- | --- | --- |
| 375 | 32–343 / 311px | 375 | [열린 편집창](screenshots/archive-draft-sync/open-375.png) |
| 768 | 84–684 / 600px | 768 | [열린 편집창](screenshots/archive-draft-sync/open-768.png) |
| 1280 | 340–940 / 600px | 1280 | [열린 편집창](screenshots/archive-draft-sync/open-1280.png) |

모두 ancestor opacity 1, 내부 scrollWidth≤clientWidth이며 입력/버튼 겹침·잘림이 없다. 열린 상태로 폭을 변경해도 edited.pdf/폴더 A가 유지된다. 기존 sm 셸과 레이아웃은 변경하지 않았다.

375px의 [빈 이름 검증](screenshots/archive-draft-sync/invalid-375.png)은 저장을 호출하지 않는다. 활성 폴더만 제시되며 루트 선택은 빈 값→null payload다. [요청을 보류한 상태](screenshots/archive-draft-sync/pending-375.png)에서 이름/폴더/저장/취소 비활성화와 저장 중 progress를 확인했고, 헤더 닫기·Escape를 시도해도 닫히지 않았다. categories metadata 갱신도 초안을 보존한다. 기존 handleSave는 요청 시작 시 이전 오류를 지우지 않으므로 pending 동안 이전 검증 메시지가 남는 동작도 그대로다.

합성 실패 완료 후 [오류/원래 raw 입력 보존](screenshots/archive-draft-sync/failed-375.png)과 입력 재활성화를 확인했다. 동일 file의 새 categories 목록은 입력·오류를 보존하지만 같은 필드의 새 file 참조는 alpha.pdf/폴더 A/빈 오류로 초기화한다. [파일 B 교체](screenshots/archive-draft-sync/next-file-375.png)는 beta.pdf/루트 값으로 초기화한다. 루트 선택의 닫힌 Select 표시가 빈 칸인 기존 동작도 변경하지 않았다.

성공 콜백은 원래 파일 ID 2와 `{postId: 12, fileName: 'saved-beta.pdf', folderCode: 'A'}`를 받는다. 요청 완료 후 한 번 닫히며 재개방은 현재 props인 beta.pdf/루트를 사용한다. 취소는 추가 저장 없이 닫힌다. 최종 save 2회(실패/성공), close 2회이며 pending 닫기 시도는 close 콜백을 만들지 않았다. fixture는 저장값을 서버에 영속화하지 않으므로 서버 연동 회귀라고 표현하지 않는다.

PNG 7개/JSON 2개를 보관하고 소유 탭만 닫았다. 공유 4173 서버를 변경·종료하지 않았다.

## 잔여와 커밋

최초 lint 206개 중 99개를 제거했고 **107개는 순차 처리 중**이다. 공식 호환 수정 경로가 없는 의존성 고유 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. DB/API 변경이 없어 DB MCP·SQL 대상이 아니다.

```text
fix(frontend): 자료실 파일 초안 동기화 정리

- file 참조와 null 초기화 계약 유지
- metadata 편집 보존과 첫 commit 회귀
- 관련 49개·실제 3폭/저장 차단 검증, lint 108→107
```
