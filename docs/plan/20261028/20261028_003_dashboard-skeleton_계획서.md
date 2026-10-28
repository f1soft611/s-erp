# Dashboard Skeleton Implementation Plan

**Goal:** 로딩 화면을 실제 종합현황의 카드·패널 배치와 일치시킨다.

**Architecture:** 기존 MetricCard/OverviewPanel에 로딩 표현을 추가하여 간격과 외곽 스타일을 공유한다. 개인/영업 전용 스켈레톤을 분리하고 기존 데이터 요청 흐름은 변경하지 않는다.

**Tech Stack:** React, MUI, Vitest, Playwright.

근거: [작업지시서](../../directions/20261028/20261028_003_dashboard-skeleton_작업지시서.md)

1. `frontend\tests\overview-page.test.tsx`: 지연 응답에서 개인 업무/공지 구조, 개인 완료 후 영업 전용 구조, 로딩 중 상세 이동 불가를 검증하는 테스트를 추가하고 실패를 확인한다.
2. `frontend\src\pages\dashboard\overview\components\OverviewWidgets.tsx`: 카드/패널의 로딩 변형 및 개인·영업 스켈레톤 구현.
3. `frontend\src\pages\dashboard\overview\components\SalesOverview.tsx`: 영업 로딩을 전용 스켈레톤으로 교체한다. OverviewPage의 기존 개인 로딩 분기는 유지한다.
4. `frontend\scripts\capture-erp-dashboard.js`: 선택적 스켈레톤 검증 모드에서 overview/sales 응답을 각각 보류하고 양 테마×3폭의 로딩/완료 상태를 캡처한다. 카드 외곽 좌표·폭·높이를 완료 상태와 대조한다.
5. 집중 테스트, 변경 파일 lint, build, 브라우저 검증 후 결과서에 근거와 스크린샷을 기록한다. 커밋은 요청되지 않았으므로 하지 않는다.

검증 명령:

```powershell
Set-Location frontend
npm run test -- tests\overview-page.test.tsx tests\dashboard-overview-service.test.ts
npm run lint -- src\pages\dashboard\overview scripts\capture-erp-dashboard.js tests\overview-page.test.tsx
npm run build
node scripts\capture-erp-dashboard.js --skeleton
```

완료: 개인/영업 로딩 회귀 테스트 2건 추가 및 집중 테스트 14건 통과, lint/build 통과. 양 테마×3폭에서 카드 치수/상대 위치 비교 및 스크린샷 저장 완료.

결과: [결과서](../../result/20261028/dashboard-skeleton/20261028_003_dashboard-skeleton_결과서.md)
