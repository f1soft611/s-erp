# 업무현황·수주현황 통합검색 배경색 보정 계획서

## 목표

두 현황 페이지 통합검색 필드의 입력 배경을 테마 표면색으로 맞춰 다른 페이지와 일관되게 표시한다.

## 파일별 계획

- `frontend/src/pages/groupware/documents/status/components/DocumentStatusSearchArea.tsx`: TextField 입력 루트 배경색을 테마의 `background.paper`로 지정한다.
- `frontend/src/pages/sales/order/status/components/SalesOrderStatusSearchArea.tsx`: 동일한 배경색을 지정한다.
- `frontend/tests/status-integrated-search-background.test.tsx`: 두 검색 영역의 입력 배경색 회귀를 확인한다.
- `docs/result/20261028/status-integrated-search-background/`: 검증 결과와 브라우저 스크린샷을 보관한다.

## 실행 순서

1. 회귀 테스트를 작성하고 현재 코드에서 실패하는지 확인한다.
2. 두 검색 입력의 outlined root에 theme-aware 배경색을 적용한다.
3. 회귀 테스트와 영향 페이지 테스트, 프론트엔드 빌드를 실행한다.
4. 실제 브라우저에서 화면을 확인하고 결과 문서를 작성한다.

## 범위 밖

- 검색 입력, 조회 이벤트, 상세검색, 세션 상태, API 및 백엔드 동작
- 공통 `PageSearchArea` 동작이나 다른 페이지의 스타일

## 기준 문서

- [작업지시서](../../directions/20261028/20261028_013_status_integrated_search_background_작업지시서.md)
- [상세사양서](../../spec/20261028/20261028_013_status_integrated_search_background_상세사양서.md)
