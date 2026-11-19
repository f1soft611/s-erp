# 댓글 키보드 등록 callback ref 상세사양서

[작업지시서](../../directions/20261118/20261118_052_comment-submit-ref_작업지시서.md)와 [계획서](../../plan/20261118/20261118_052_comment-submit-ref_계획서.md)에 따른 게시 시점 정리다.

| 상태 | 등록 callback |
| --- | --- |
| 최초 commit | 현재 editor/입력/첨부/멘션/상위 callback |
| 이후 정상 commit | 최신 submit closure |
| Suspense로 미commit된 render | 기존 DOM은 마지막 commit의 callback 유지 |
| Enter | 기존 submit 분기·sanitize·전달 인자 유지 |
| Shift+Enter/IME 조합 | 기존 줄바꿈/조합 처리, 등록 없음 |
| 성공/실패 | 기존 본문·파일·멘션 초기화/초안 보존 정책 유지 |
| 파일 선택 | input clear 전에 선택 파일을 배열로 복사해 지연 updater에도 같은 선택을 전달 |

매 commit layout effect는 ref 대입만 수행하며 등록/DOM 변경/요청을 직접 실행하지 않는다. 기존 등록 함수와 키보드·버튼 소비자는 그대로다. 실제 브라우저에서 확인한 live FileList 경합은 파일 선택 handler의 snapshot으로만 수정한다. 새 helper/상태/공개 props/API/DB 변경을 추가하지 않는다.

미commit callback 누출과 지연 파일 선택 경합은 각각 해당 구현 전에 집중 runtime RED로 확인한다. 정상 commit 뒤 최신 callback 반영도 같은 회귀에서 확인한다. 기존 관련 회귀, 실제 브라우저 3폭에서 동일 인스턴스의 반복 선택·성공·실패·재시도, 새 lint 진단 0과 source/AST 동등성을 함께 검증한다.
