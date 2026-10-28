# ERP 실데이터 대시보드 Implementation Plan

> **For agentic workers:** executing-plans 스킬로 이 세션에서 순서대로 수행한다. 관련 없는 기존 스테이징 변경은 보존하고 자동 커밋하지 않는다.

**Goal:** 로그인 후 종합현황에 실제 개인 결재·공지·수주 집계를 표시하고 두 테마/세 가지 화면 폭을 지원한다.

**Architecture:** 기존 그룹웨어 종합현황 분기와 앱 셸을 유지한다. `dashboard` 백엔드 Controller/Service/DAO/VO 및 조회 Mapper를 추가하고 기존 결재 요약 서비스를 재사용한다. 프론트엔드 서비스/타입/위젯을 대시보드 기능 안에 배치하고 기존 OverviewPage에서 조립한다.

**Tech Stack:** React, TypeScript, MUI theme, Spring/eGovFrame, MyBatis, PostgreSQL, Vitest, JUnit, Playwright.

---

근거: [작업지시서](../../directions/20261028/20261028_002_erp-dashboard_작업지시서.md)

## Task 1: 계약 확정

- [x] 기본 DB MCP 테이블/컬럼 메타데이터와 기존 결재 actor/메뉴 권한 흐름 확인.
- [x] 상세사양에 화면, 날짜, 금액, 권한, 부분 오류 및 상세 이동 계약 기록.

## Task 2: 서버 조회 API

Files:
- Create: `backend/src/main/java/egovframework/let/dashboard/{controller,service,service/impl,domain/model,domain/repository}`
- Create: `backend/src/main/resources/egovframework/mapper/let/dashboard/Dashboard_SQL_postgresql.xml`
- Test: `backend/src/test/java/egovframework/let/dashboard/DashboardServiceTest.java`
- Test: `backend/src/test/java/egovframework/let/dashboard/DashboardMapperTest.java`

- [x] 먼저 인증 누락/메뉴권한 차단/테넌트 전달/월 범위/부분 실패 테스트 작성 후 실패 확인.
- [x] `/api/v1/dashboard/overview`, `/api/v1/dashboard/sales?month=YYYY-MM` 구현. 기존 ResultVO 응답 사용.
- [x] 결재는 기존 요약 + 본인 기안 보완 건수 조회. 공지는 본문 없이 5건.
- [x] 수주는 헤더 1건당 1행으로 집계하고 공급가액·합계 구분. 최근 6개월 추이와 오늘부터 7일 납기 목록 5건.
- [x] DashboardService/Mapper/Controller 및 기존 수주 Service/Mapper 집중 테스트 → PASS.

## Task 3: 화면

Files:
- Modify: `frontend/src/pages/groupware/OverviewPage.tsx`
- Modify: `frontend/src/pages/dashboard/services/dashboardData.tsx`
- Create: `frontend/src/pages/dashboard/overview/{services,types,components}`
- Modify: `frontend/src/pages/sales/order/status/hooks/useSalesOrderStatusSearch.ts` (명시적 대시보드 drilldown 기간)
- Modify: `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx`, `hooks/useNoticeInteractions.ts` (공지 ID 상세 이동)
- Test: `frontend/tests/overview-page.test.tsx`, `frontend/tests/dashboard-overview-service.test.ts`

- [x] API 계약 검증과 월 변경/오류/빈 결과/권한 없는 위젯/내비게이션 테스트를 먼저 작성하여 실패 확인.
- [x] 월 선택, 새로고침, 서버 기준일과 조회시각, 카드/알림/공지/6개월 막대 추이/납기 예정 목록 구현.
- [x] MUI palette와 alpha 색상으로 두 테마에 대응. 새 차트 라이브러리 없이 접근 가능한 막대 차트 사용.
- [x] 개인 데이터와 수주 응답은 독립 로드, 이전 요청 결과 무시, 실패 시 숫자 0 대체 금지.
- [x] 문서 업무는 기존 상세 컴포넌트 재사용. 수주 카드는 명시적 기간을 URL로 전달하여 조회조건 세션보다 우선 적용.
- [x] 집중 Vitest 36건, 대시보드 신규/변경 파일 대상 lint, `npm run build` → PASS. 기존 영역의 린트 경고/테스트 실패는 결과서에 구분.

## Task 4: 브라우저 및 결과

- [x] 기존 4173 서버가 S-ERP임을 확인해 재사용. 기존 서버는 종료하지 않음.
- [x] 합성 fixture를 API 경계에서 주입하는 Playwright 스크립트로 두 테마 × 375/768/1280px 캡처.
- [x] 가로 넘침/런타임 오류, 월 변경, 카드 이동, 오류 재시도/권한 숨김 확인.
- [x] 실제 운영 데이터/API 검증과 fixture 기반 렌더링 검증의 차이를 결과에 명시.
- [x] 결과 문서에 DB MCP 근거·스키마 무변경·검증 결과·스크린샷 링크 기록.

결과: [구현·검증 결과서](../../result/20261028/erp-dashboard/20261028_002_erp-dashboard_결과서.md)
