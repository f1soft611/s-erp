# 공지 댓글 이미지 조회 의존성 상세사양서

[작업지시서](../../directions/20261118/20261118_050_comment-image-deps_작업지시서.md)와 [계획서](../../plan/20261118/20261118_050_comment-image-deps_계획서.md)에 따른 내부 바인딩 정리다.

| 항목 | 보존 계약 |
| --- | --- |
| 키 | 기존 `[noticeId, commentId, attachmentId][]` JSON과 notice ID dependency를 그대로 사용 |
| 표시 정보 | 같은 이미지 요청 ID 목록을 유지하는 댓글 내용·작성자·첨부 표시명·테마 변경에는 재다운로드/URL 재생성 없음 |
| 요청 | 기존 순서·중복을 유지한 commentId/attachmentId로 기존 서비스 호출 |
| 성공/실패 | allSettled의 같은 index 대응, 기존 오류 문구/미리보기/다운로드 유지 |
| lifecycle | 기존 active guard, 늦은 응답 무시, 교체·닫기·unmount URL 폐기 유지 |
| 화면 | 기존 썸네일·뷰어·CommonDialog·JSX/CSS/공개 props 그대로 |
| 제외 | 서버 댓글 동기화·커서·본문 이미지·새 권한/기능/API/DB 변경 없음 |

내부에서 생성한 JSON 문자열만 좁은 3-tuple 배열로 복원하며 외부 입력을 새로 수용하지 않는다. 원본 키 생성이 바뀌면 이 복원 형태도 함께 검토해야 한다. 빈 키는 `[]`라 기존 빈 목록 guard를 그대로 따른다.

기존 이미지 미리보기 테스트의 표시 정보/테마 재렌더 보존 회귀를 구현 전에 확장한다. 실제 RED는 해당 exhaustive-deps 진단 1건이며 기존 동작 회귀는 기준선과 수정 후 모두 통과해야 한다. 린트 disable, 배열 참조 dependency 추가, 새로운 state/ref mirror, render 중 ref/DOM/요청 작업을 금지한다.
