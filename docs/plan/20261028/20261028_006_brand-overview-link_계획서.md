# S-ERP 로고 종합현황 이동 계획서

근거: [작업지시서](../../directions/20261028/20261028_006_brand-overview-link_작업지시서.md)

**Goal:** 왼쪽 상단 S-ERP를 종합현황으로 이동하는 접근 가능한 링크로 만든다.

**Architecture:** DashboardModuleSection의 기존 Typography에 React Router Link를 적용한다. 기존 라우터가 모듈, 메뉴, 제목 및 권한 처리를 그대로 담당한다.

**Tech Stack:** React, TypeScript, MUI, React Router, Vitest, Playwright.

## 실행

- [x] `frontend/tests/dashboard-module-section.test.tsx`에 다른 모듈 및 종합현황에서 링크를 클릭하는 라우팅 테스트를 추가하고 실패를 확인한다.
- [x] `frontend/src/pages/dashboard/components/DashboardModuleSection.tsx`의 브랜드를 `component={Link}`, `to="/groupware/overview"`로 연결하고 기존 색상과 타이포를 유지한다.
- [x] `cd frontend; npm run test -- tests/dashboard-module-section.test.tsx`로 회귀 테스트를 확인한다.
- [x] `cd frontend; npm run build`와 `npm run lint -- src/pages/dashboard/components/DashboardModuleSection.tsx tests/dashboard-module-section.test.tsx`를 실행한다.
- [x] 4173 서버에서 합성 메뉴 응답을 사용해 light/dark × 375/768/1280px 클릭 이동, 키보드 Enter 이동 및 가로 넘침을 확인한다.
- [x] `docs/result/20261028/brand-overview-link`에 결과 및 스크린샷을 기록한다. 기존 S-ERP 서버를 재사용했으므로 종료하지 않는다.
