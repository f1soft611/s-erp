# 공지 이전 댓글 초기 커서 작업지시서

- 근거: [043 기준선 관찰](../../result/20261118/repository-remediation/20261118_043_notice-list-deps_결과.md)의 beforeCommentId 7/10 경합과 첫 commit 보조 진단이다.
- 현재 서버는 nextBeforeCommentId 7을 주지만 effect가 로컬 커서를 초기화하기 전 버튼은 첫 표시 댓글 10을 fallback으로 요청할 수 있다. 기존 effect 이후와 같은 커서를 초기 상호작용에서도 사용해야 한다.
- 범위: NoticeFeedList의 이전 댓글 이벤트에서 아직 소유 커서 entry가 없는 경우의 fallback만 수정한다. 이미 소유한 cursor/undefined의 의미는 보존한다.
- 기존 effect·댓글 병합·완료 판단·CRUD 커서 보존·서버 reset·JSX·API 인자 구조는 변경하지 않는다. lint 경고를 숨기거나 테스트에 sleep을 추가하지 않는다.
- 계획 → 사양 → 결정적 첫 commit RED와 보존 회귀 → 최소 이벤트 수정 → 관련 검사 → 실제 댓글 흐름/반응형 근거 → 결과·별도 커밋·푸시 순서다.
