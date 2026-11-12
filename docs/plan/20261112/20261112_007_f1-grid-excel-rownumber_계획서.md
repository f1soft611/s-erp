# F1-Grid Excel 행번호 구현 계획

**목표:** 엑셀 행번호를 그리드의 표시 순서에 맞춘다.

**구조:** 기존 내보내기는 필터·정렬된 `visibleRows`를 받는다. 데이터 행 인덱스만 행번호 값에 사용하며 다른 컬럼과 집계 행은 유지한다.

**기술:** React, TypeScript, ExcelJS, Vitest.

1. `frontend/tests/f1-grid-excel-export.test.ts`에서 원본 값과 무관한 표시 순번 및 상·하단 집계의 빈 행번호 셀을 검증하고 실패를 확인한다.
2. `frontend/src/shared/components/f1-grid/export/GridExcelExport.ts`의 데이터 행 반복에서 `rownumber`만 `index + 1`을 사용한다.
3. 엑셀 테스트와 빌드, 변경 파일 lint 및 실제 브라우저 다운로드를 검증하고 `frontend/src/pages/f1-grid-docs/F1-GRID.md`와 결과 문서를 갱신한다.
