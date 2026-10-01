# 페이지 영역 우측 오버레이 상세 패널 결과

## 변경 내용

공지사항 상세 오버레이를 앱 전체 body 포털 Drawer에서 페이지 영역 내부 오버레이로 변경했다. `CommunityNoticePage`는 공통 `DashboardPage` AppBar 아래에 렌더링되므로, 페이지 루트에 오버레이 호스트를 두어 공통 헤더·로그아웃 영역을 덮지 않도록 했다.

- `PageAreaOverlay` 공통 페이지 영역 오버레이 추가
- 오버레이 범위: 페이지 콘텐츠 루트의 `position: absolute; inset: 0`
- 패널 폭: 데스크톱 `min(960px, 72vw)`, 모바일 `100%`
- 패널 높이: 페이지 영역 전체 높이
- 본문·댓글은 기존 `PostDetailPanel` 독립 스크롤 유지
- Escape와 페이지 영역 백드롭으로 닫기
- 기존 게시글 API·액션·헤더·로그아웃 기능 변경 없음

## 변경 파일

- `frontend/src/shared/components/view-mode/PageAreaOverlay.tsx`
- `frontend/src/shared/components/feed/PostDetailPanel.tsx`
- `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx`
- `frontend/tests/post-detail-panel.test.tsx`

## 검증 결과

- `npx vitest run tests/post-detail-panel.test.tsx`: 3 passed
- `npm run build`: 통과
- 변경 파일 정적 오류 점검: 오류 없음

## 브라우저 검증 제한

4175 포트에서 Vite 개발 서버를 직접 기동하고 브라우저를 열었으나 인증되지 않은 로그인 화면에 도달했다. 공지사항 화면까지 이동할 인증이 없어 실제 375px·768px·1280px rect와 스크린샷은 확보하지 못했다.

## DB 영향

백엔드·DB 변경 없음.
