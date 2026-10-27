# F1-Grid Excel 텍스트 값 보존 계획

## 목표

Excel 편집 시 숫자처럼 보이는 문자열 코드의 선행 0이 사라지지 않도록 `.xlsx` 텍스트 셀 서식을 내보낸다.

## 변경 대상

- `frontend/src/shared/components/f1-grid/export/GridExcelExport.ts`
- `frontend/tests/f1-grid-excel-export.test.ts`
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- `docs/spec/20261027/20261027_014_f1grid-excel-text-preservation_상세사양서.md`
- `docs/result/20261027/f1grid-excel-text-preservation/`

## 구현 및 검증 순서

1. 실제 ExcelJS workbook 생성·재로딩 테스트에 `type: 'text'` 값 `000004` 사례를 추가해 현재 형식 누락으로 실패하는지 확인한다.
2. 내보내기에서 문자열 셀에만 `@` number format을 적용한다. 셀 값은 문자열 그대로 유지하고 numeric/date/time/Boolean 셀의 기존 형식은 보존한다.
3. `.xlsx` 재로딩 결과에서 문자열 타입·값·서식을 확인한다.
4. F1-GRID 문서와 결과 문서를 갱신한다.
5. 전용 Excel export 테스트 및 프론트엔드 빌드를 실행한다.

## 제외

수주현황 데이터/API 계약, 셀의 원본 값 정규화, 화면 편집 동작, 반응형 UI 변경은 범위에서 제외한다.
