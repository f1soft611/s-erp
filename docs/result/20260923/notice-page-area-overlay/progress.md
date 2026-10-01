# 페이지 영역 우측 오버레이 상세 패널 작업 원장

## 문서

- 작업지시서: `docs/directions/20260923/20260923_004_페이지영역_우측오버레이_상세패널_작업지시서.md`
- 계획서: `docs/plan/20260923/20260923_004_페이지영역_우측오버레이_상세패널_계획서.md`
- 상세 사양서: `docs/spec/20260923/20260923_004_페이지영역_우측오버레이_상세패널_상세사양서.md`
- 실행 방식: Inline Execution, 현재 브랜치, Worktree 없음
- DB 변경: 없음

## 진행 상태

- [x] 작업지시서·계획서·사양서 승인
- [x] 페이지 내부 오버레이 RED 테스트
- [x] `PageAreaOverlay` 구현
- [x] 기존 body 포털 Drawer 제거
- [x] 헤더 아래 페이지 영역 오버레이 연결
- [x] 국소 테스트·빌드
- [x] 브라우저 검증 시도
- [x] 결과 문서화

## 검증

- `npx vitest run tests/post-detail-panel.test.tsx`: 3 passed.
- `npm run build`: passed.
- 변경 파일 정적 오류: 없음.
- 브라우저: 4175 Vite 서버는 기동했으나 인증되지 않은 로그인 화면에서 멈춰 공지 화면의 실제 rect/스크린샷은 확보하지 못함.

## 구현 판단

`CommunityNoticePage`는 `DashboardPage`의 공통 `AppBar` 아래에서 렌더링되므로 페이지 루트에 `position: relative` 오버레이를 두었다. 따라서 오버레이는 공통 헤더·로그아웃 영역을 포함하지 않고 공지 페이지 영역만 덮는다.
