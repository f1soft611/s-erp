# 공지 서버 댓글 동기화 의존성 결과

## 범위와 원인

[작업지시서](../../../directions/20261118/20261118_051_comment-sync-deps_작업지시서.md) → [계획서](../../../plan/20261118/20261118_051_comment-sync-deps_계획서.md) → [상세사양](../../../spec/20261118/20261118_051_comment-sync-deps_상세사양서.md) 순서로 진행했다.

기존 서버 댓글 effect가 localCommentsByNoticeId를 읽지만 의존성에서 빠져 있었다. 이를 단순 추가하면 effect가 매번 만드는 새 map이 다시 effect를 실행한다. 서버 revision과 모든 댓글 snapshot이 같은 경우에만 기존 no-op map 복사/ref 동일값 재대입을 생략한 뒤 dependency를 완전하게 선언했다.

변경된 서버 snapshot 또는 revision에는 기존 본문 전체를 그대로 실행한다. 기존 setter/updater 4개·병합·커서/loaded/exhausted 조건과 순서·ref 접근을 유지하고 render로 옮기지 않았다. 다른 effect 3개·모든 이벤트/JSX/CSS/공개 props·테스트·API/백엔드/DB 계약은 그대로다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선 | 기존 댓글·병합·이전 댓글·044 첫 commit/명시적 fallback 회귀 5파일·83개 통과 |
| 실제 RED | local cache 누락 진단 0 assertion이 기존 1건으로 실패 |
| 수정 후 같은 회귀 | **5파일·83개 통과**, 테스트 코드 변경 없음 |
| 정적 검증 | typecheck/build exit 0, 기존 chunk 경고 유지 |
| 전체 lint | **91→90**, 제거 1/새 진단 0; **전체 exhaustive-deps 0** |
| source/AST | guard/dependency 1개 외 기존 본문 전체 동일, skip되는 updater 4개는 변경 snapshot이 있을 때만 entry 변경, frontend 890파일 byte 차이 0 |

기존 runtime 회귀는 기준선에서도 통과했다. 기능 오류를 새로 고쳤다는 의미가 아니라 무효한 복사를 차단하여 실제 의존성을 안전하게 선언한 변경이다. 추가 확인 pass는 setter 없이 종료한다.

[범위 근거](screenshots/comment-sync-deps/scope-audit.json) · [브라우저 근거](screenshots/comment-sync-deps/verification.json)

## 실제 브라우저

공유 4173 서버를 재사용하고 소유 탭에서 실제 NoticeFeedList를 메모리 fixture로 구동했다. 모든 fetch를 차단하고 이전 댓글 callback만 합성 응답을 반환했다. 운영 API·실제 저장소·공유 서버를 변경하지 않았다.

**375/768/1280px 각각** 아래를 확인했다.

- 첫 이전 댓글 요청은 cursor **7**, 보류 중 버튼 비활성화·중복 요청 0, 첫 페이지 병합 5개.
- metadata의 서버 cursor가 99로 바뀌어도 기존 5개와 로컬 cursor **4** 유지, 두 번째 페이지 뒤 7개와 exhaustion 유지.
- 서버 댓글 내용이 실제 바뀌면 최신 내용 반영과 기존 이전 댓글·exhaustion 유지.
- 새 payload/revision 초기화는 기존 이력 대신 새 댓글 30/29/28과 cursor **27** 적용, 새 이전 댓글 병합 후 5개·exhaustion.
- 네트워크 요청/가로 넘침 0. 소유 탭을 닫았고 공유 서버는 그대로다.

044의 첫 commit 경합 시점은 기존 집중 Vitest에서 검증했으며 일반 native 브라우저 시점과 동일하다고 확대하지 않는다. 같은 snapshot의 revision 분기도 guard에서 제외되도록 source/AST로 확인했으며, 브라우저에서는 새 payload와 함께 바뀐 revision 경로를 확인했다.

| 폭 | 이미지 |
| --- | --- |
| 375 | [첫 병합](screenshots/comment-sync-deps/loaded-375.png) · [기존 이력 완료](screenshots/comment-sync-deps/complete-375.png) · [revision 초기화](screenshots/comment-sync-deps/reset-375.png) |
| 768 | [첫 병합](screenshots/comment-sync-deps/loaded-768.png) · [기존 이력 완료](screenshots/comment-sync-deps/complete-768.png) · [revision 초기화](screenshots/comment-sync-deps/reset-768.png) |
| 1280 | [첫 병합](screenshots/comment-sync-deps/loaded-1280.png) · [기존 이력 완료](screenshots/comment-sync-deps/complete-1280.png) · [revision 초기화](screenshots/comment-sync-deps/reset-1280.png) |

## CI와 잔여

[050의 정확한 SHA 전체 CI](20261118_050_comment-image-deps_결과.md) **226파일·2,680개**를 원본 집계·네 job success로 확인했다. 그 실행 완료 뒤에만 다음 push를 진행한다. 이번 051 소스의 정확한 SHA 전체 CI는 별도로 확인하며 선행 결과를 재사용하지 않는다.

최초 206개 중 116개를 제거했고 **90개 경고는 순차 처리 중**이다. exhaustive-deps는 0이며 state-in-effect 82개/ref 8개가 남았다. 공식 호환 경로 없는 권고 2건은 [027](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. 기존 TreeProjection 3단계 및 자료실 모바일 보조정보 관찰은 이 단위에서 수정하지 않았다.

```text
fix(frontend): 공지 댓글 동기화의 무효 갱신 차단

- 같은 서버 revision/snapshot의 no-op 복사를 생략해 의존성 완전 선언
- 기존 댓글 병합·cursor/loaded/exhausted·ref lifecycle 보존
- 관련 83개·실제 3폭 검증, lint 91→90 및 exhaustive-deps 0
```
