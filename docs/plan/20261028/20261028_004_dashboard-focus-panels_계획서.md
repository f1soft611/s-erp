# Dashboard Focus Panels Implementation Plan

**Goal:** 승인된 A 포커스 카드형을 실제 대시보드와 로딩 화면에 적용한다.

**Architecture:** OverviewPanel에 선택적 focus/footer 표현과 공유 행 컴포넌트를 추가한다. 기존 클릭 콜백과 데이터 조건을 유지하며 납기 표시는 서버 기준일로 계산한다.

**Tech Stack:** React, MUI, Vitest, Playwright.

근거: [작업지시서](../../directions/20261028/20261028_004_dashboard-focus-panels_작업지시서.md)

- [x] `frontend\tests\overview-page.test.tsx`: 고정 공지/하단 이동, 월 경계 납기 D-day/상세 조건 회귀 테스트 작성 및 실패 확인.
- [x] `frontend\src\pages\dashboard\overview\components\OverviewWidgets.tsx`: focus 패널, 공통 목록 행, 스켈레톤 외곽/하단/날짜 구조 반영.
- [x] `frontend\src\pages\groupware\OverviewPage.tsx`: 업무/공지 포커스 행과 하단 링크 적용.
- [x] `frontend\src\pages\dashboard\overview\components\SalesOverview.tsx`: 달력 날짜와 오늘/내일/D-n, 하단 전체 보기 적용.
- [x] 집중 Vitest, 변경 영역 lint, build 및 기존 Playwright(일반/스켈레톤) 실행. 결과/스크린샷 기록.

```powershell
Set-Location frontend
npm run test -- tests\overview-page.test.tsx tests\dashboard-overview-service.test.ts
npm run lint -- src\pages\dashboard\overview src\pages\groupware\OverviewPage.tsx tests\overview-page.test.tsx scripts\capture-erp-dashboard.js
npm run build
node scripts\capture-erp-dashboard.js --focus
node scripts\capture-erp-dashboard.js --focus --skeleton
```

결과: [결과서](../../result/20261028/dashboard-focus-panels/20261028_004_dashboard-focus-panels_결과서.md)
