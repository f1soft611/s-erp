# 공지 서버 댓글 동기화 의존성 작업지시서

- 근거: 잔여 lint 순차 처리 요청과 NoticeFeedList 서버 댓글 effect의 localCommentsByNoticeId 누락 1건.
- [044 초기 커서 사양](../../spec/20261118/20261118_044_notice-initial-cursor_상세사양서.md)과 기존 댓글 추가/수정/병합·이전 댓글 cursor/loaded/exhausted·서버 revision 초기화 계약을 보존한다.
- local state를 dependency에 단순 추가하면 기존 무조건 map 복사 setter가 다시 effect를 실행한다. 서버 revision과 댓글 snapshot이 모두 그대로인 경우에만 기존 no-op map 복사와 동일 ref 값 재대입을 생략한 뒤 dependency를 완전하게 선언한다.
- 변경된 서버 snapshot 또는 server revision에는 기존 본문 전체를 실행한다. snapshot/ref를 render로 이동하거나 setter/updater 안에서 다른 setter를 호출하지 않는다.
- 계획 → 사양 → 기존 관련 회귀/대상 lint RED → 최소 구현/동일 회귀·정적 비교 → 실제 격리 피드/결과 → 선행 CI 완료 후 별도 커밋·푸시 순서다.
