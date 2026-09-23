# 공지사항 전체 우측 오버레이 상세 패널 결과

## 변경 내용

기존 `ContentSplitLayout` 우측 컬럼에 표시하던 상세를 페이지 오른쪽 전체 높이를 사용하는 MUI Drawer 오버레이로 전환했다.

- 데스크톱 패널 폭: `min(960px, 72vw)`
- 모바일 패널 폭: `100vw`
- 패널 높이: `100dvh` 및 `100vh` fallback
- 목록은 배경에 유지
- 패널 헤더는 고정, 본문·댓글 영역은 독립 세로 스크롤
- X 버튼, 백드롭, Escape로 닫기
- 기존 `NoticeFeedList`를 단일 게시글로 재사용해 게시글 기능 유지

## 변경 파일

- `frontend/src/shared/components/feed/PostDetailPanel.tsx`
- `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx`
- `frontend/tests/post-detail-panel.test.tsx`

## 검증

- `npx vitest run tests/post-detail-panel.test.tsx`: 2 passed
- `npm run build`: 통과
- 정적 오류 점검: 오버레이 관련 변경 파일 오류 없음

## 브라우저 검증 제한

개발 서버는 4174에서 기동했으나 브라우저 요청이 기존 4173 로그인 앱으로 연결되었다. 개발 계정 인증이 실패하여 공지사항 화면까지 진입할 수 없었고, 따라서 375px·768px·1280px 실제 스크린샷은 확보하지 못했다.

## DB 영향

백엔드·DB 변경 없음.
