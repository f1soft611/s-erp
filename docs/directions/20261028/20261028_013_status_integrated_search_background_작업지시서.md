# 업무현황·수주현황 통합검색 배경색 보정 작업지시서

## 배경

업무현황과 수주현황의 통합검색 입력 필드 배경색이 다른 페이지의 통합검색 필드와 다르게 보인다.

## 목표

- 업무현황과 수주현황의 통합검색 입력 필드에 기존 페이지와 일관된 테마 배경색을 적용한다.
- 다크 모드에서도 테마의 표면 배경색을 사용한다.
- 검색 동작과 상세검색의 동작 및 API 계약은 변경하지 않는다.

## 범위

- `frontend/src/pages/groupware/documents/status/components/DocumentStatusSearchArea.tsx`
- `frontend/src/pages/sales/order/status/components/SalesOrderStatusSearchArea.tsx`
- 두 검색 영역의 배경색 회귀 테스트
- 날짜별 계획·상세사양·결과 문서

## 절차 및 완료 조건

1. 두 검색 영역 입력의 배경색이 테마 표면색과 일치하는지 검사하는 회귀 테스트를 먼저 추가하고, 현재 구현에서 실패함을 확인한다.
2. 두 TextField의 outlined 입력 루트에 `theme.palette.background.paper`를 적용한다.
3. 회귀 테스트, 관련 페이지 테스트와 프론트엔드 빌드를 실행한다.
4. 실제 브라우저에서 두 화면의 검색 입력을 확인하고 결과 문서에 스크린샷을 보관한다.

## 기준

- 사용자 요청: “업무현황, 수주현황 통합검색 필드 배경색이 다른 페이지랑 다르게 적용되어있어”
- [계획서](../../plan/20261028/20261028_013_status_integrated_search_background_계획서.md)
- [상세사양서](../../spec/20261028/20261028_013_status_integrated_search_background_상세사양서.md)
