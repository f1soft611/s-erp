# 댓글 editor 입력 전제조건 상세사양서

- [계획서](../../plan/20261118/20261118_020_comment-editor-readiness_계획서.md)는 [작업지시서](../../directions/20261118/20261118_001_repository-remediation_작업지시서.md)의 전체 CI 후속이다.
- 운영 TiptapCommentThread의 immediatelyRender:false와 실제 editor를 유지한다. editor를 mock하거나 즉시 렌더하도록 제품을 바꾸지 않는다.
- 일반 댓글·메뉴·이전 댓글 표시는 editor 준비와 별개다. 실제 입력이 필요한 여섯 기존 동기 조회만 findByRole로 기다린다.
- 수정 대상은 같은 공지 테스트 파일의 댓글 추가·capped comments·pagination/cursor·첨부 실패 정리·기존 세 댓글 이후 추가 사례다.
- 실제 입력·등록·저장 payload·목록 재조회 횟수·이전 cursor·초안 보존 단언을 모두 유지한다.
- 새 sleep, timeout override, source skip/retry, 테스트 순서 변경, 운영 API/DB/의존성 변경은 하지 않는다. UI 스크린샷 대상이 아니다.
