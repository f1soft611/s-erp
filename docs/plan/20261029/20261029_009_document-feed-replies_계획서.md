# 문서작성 피드 답글 기본 접힘 계획서

**Goal:** 문서작성 피드와 문서 상세의 답글만 기본 접힘으로 변경한다.

**Architecture:** 기존 `CommentThread`의 기본값 `expandReplies=false`를 재사용한다. `DocumentApprovalDetailFeed`의 별도 옵션 전달을 제거해 피드와 상세 모두 답글을 접는다.

**Tech Stack:** React, TypeScript, Vitest, Playwright.

기준: [작업지시서](../../directions/20261029/20261029_009_document-feed-replies_작업지시서.md)

1. `frontend/tests/document-write-page.test.tsx`에서 피드와 패널 모두 답글 최초 접힘, 클릭 열기/닫기, 댓글/입력창 유지를 검증한다.
2. 해당 테스트의 실패를 확인한다.
3. `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`의 `expandReplies` 전달을 제거한다.
4. 관련 Vitest, 변경 파일 lint, production build를 실행한다.
5. 실제 브라우저에서 가상 데이터를 사용해 피드와 상세의 375/768/1280px 기본 접힘 및 토글을 확인하고 결과와 스크린샷을 기록한다.

공통 컴포넌트, 백엔드, API, DB, 공지사항은 수정하지 않는다.
