# 공지사항 댓글 피드형 표시·입력 개선 결과

## 작업 개요

공지사항 댓글 영역을 최상위 댓글과 답글 1단계의 피드형 UI로 정리하고, 댓글·답글 입력창을 한 줄 시작 방식으로 개선했다.

## 주요 변경

- 깊은 답글을 화면 표시용으로 최상위 댓글의 답글 목록에 평탄화했다.
- 깊은 답글에서 답글을 작성해도 최상위 댓글 ID를 부모 ID로 사용한다.
- 댓글 입력창을 초기 28px 한 줄 높이로 조정했다.
- 일반 `Enter`는 등록하고 `Shift+Enter`는 줄바꿈하도록 처리했다.
- IME 조합 중 `Enter`는 등록하지 않도록 했다.
- 기존 첨부파일 아이콘, 댓글 CRUD, 실패 시 입력 유지 동작을 보존했다.

## 변경 파일

- `frontend/src/shared/components/feed/TiptapCommentThread.tsx`
- `frontend/src/shared/components/feed/CommentThread.tsx`
- `frontend/tests/feed-components.test.tsx`

## 검증

- 집중 테스트 38개 통과
- `cd frontend; npm run build` 성공
- 실제 브라우저에서 Shift+Enter 줄바꿈 확인
- 실제 브라우저에서 Enter 등록 및 `POST /api/v1/common/comments` 요청 확인
- 375px, 768px, 1280px에서 가로 스크롤 없음과 입력 높이 28px 확인

## 스크린샷

- [모바일 375px](screenshots/notice-comment-mobile.png)
- [태블릿 768px](screenshots/notice-comment-tablet.png)
- [데스크톱 1280px](screenshots/notice-comment-desktop.png)

## 문서 연결

- [작업지시서](../../../directions/20260917/20260917_002_공지사항_댓글_피드형입력_개선_작업지시서.md)
- [계획서](../../../plan/20260917/20260917_002_공지사항_댓글_피드형입력_개선_계획서.md)
- [상세 사양서](../../../spec/20260917/20260917_002_공지사항_댓글_피드형입력_개선_사양서.md)

DB 스키마 변경은 없다.
