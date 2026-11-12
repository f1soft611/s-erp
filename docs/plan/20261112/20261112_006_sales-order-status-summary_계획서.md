# 수주현황 집계 적용 계획

작업지시서: [20261112_006](../../directions/20261112/20261112_006_sales-order-status-summary_작업지시서.md)

1. 사양을 작성하고 수주현황 그리드가 여러 행의 네 컬럼 합계를 표시하는 실패 테스트를 작성한다.
2. 엑셀 파일의 상단·하단 집계 값과 숫자 형식, 집계가 없는 기존 내보내기 동작의 회귀 테스트를 작성한다.
3. `frontend/src/pages/sales/order/status/data/salesOrderStatusColumns.tsx`의 해당 컬럼에 `summaryType: 'sum'`을 지정한다.
4. 화면과 엑셀이 동일한 공통 계산을 사용하도록 집계 계산을 분리하고 `GridExcelExport.ts`에 집계 행을 반영한다.
5. 회귀 테스트, 빌드, lint와 실제 브라우저 검증 후 결과 및 기능 문서를 작성한다.
