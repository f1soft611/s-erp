# 20261028_008 종합현황 개인 결재 카드 필터 계획서

근거: [작업지시서](../../directions/20261028/20261028_008_overview-approval-card-filter_작업지시서.md), [상세사양서](../../spec/20261028/20261028_008_overview-approval-card-filter_상세사양서.md), [설계](../../superpowers/specs/2026-10-28-overview-approval-card-filter-design.md)

## 목표

개인 업무 카드의 의미와 문서 목록을 일치시킨다. `dashboardScope`를 URL로 전달하여 기존 문서 업무 scope 조회를 재사용한다.

## 변경 파일

- `frontend/src/pages/groupware/OverviewPage.tsx`: 카드별 scope 쿼리 생성.
- `frontend/src/pages/dashboard/DashboardPage.tsx`, `components/DashboardContent.tsx`: URL scope 검증, query update 및 대상 페이지 전달.
- `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`, `hooks/useDocumentWritePage.ts`, `types/documentWrite.types.ts`, `data/documentPresentation.ts`: 기존 작성 화면에 scope 초기값과 URL 동기화 연결.
- `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx`, `hooks/useDocumentStatusSearch.ts`, `services/documentStatus.service.ts`, `types/documentStatus.types.ts`, `types/documentStatusPage.types.ts`: 조회 전용 화면에 초기 scope, API 전달, 표시/해제 적용.
- `frontend/tests/overview-page.test.tsx`, `tests/use-document-write-page.test.tsx`, `tests/document-status-page.test.tsx`, `tests/document-status-service.test.ts`, `tests/document-presentation.test.ts`: 회귀 검증.
- `docs/result/20261028/overview-approval-card-filter/`: 검증 결과와 브라우저 캡처.

## 순서

1. 종합현황 카드 클릭 테스트에 scope별 URL 기대를 추가하고 실패를 확인한다.
2. 작성 화면 훅 테스트에서 초기 scope가 API 요청과 활성 칩에 반영되는지 실패를 확인한다.
3. 조회 전용 검색의 scope 직렬화와 초기화/해제 테스트를 추가한다.
4. 가장 작은 구현으로 해당 테스트를 통과시킨다.
5. 집중 Vitest, 대상 lint, 프론트엔드 빌드를 실행한다.
6. S-ERP 브라우저에서 작성/조회 권한 경로를 확인하고 기존 브라우저 정책에 맞게 스크린샷을 결과 폴더에 보관한다.

서버 API/DB 계약은 변경하지 않으므로 DB MCP와 스키마 변경은 이 작업 범위가 아니다.
