# F1-Grid Excel 정수 숫자 표시 보정 계획

## 목표

Excel 사용자 정의 숫자 형식 `#,##0.#####`가 정수에도 소수점 기호를 남기는 문제를 해결한다.

## 변경 대상

- `frontend/src/shared/components/f1-grid/export/GridExcelExport.ts`
- `frontend/tests/f1-grid-excel-export.test.ts`
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- `docs/spec/20261027/20261027_015_f1grid-excel-integer-number-format_상세사양서.md`
- `docs/result/20261027/f1grid-excel-integer-number-format/`

## 구현 순서

1. 정수 Number와 정수 숫자 문자열에 대한 실패 회귀 테스트를 추가한다.
2. 테스트 실패를 확인한 뒤, 정수 값에는 `#,##0`, 기본 소수 값에는 기존 `#,##0.#####`를 사용한다.
3. 명시된 `decimalPlaces`와 currency 표시 서식은 현재 동작을 유지한다.
4. 공개 문서 및 결과를 갱신한다.
5. 전용 Excel export 테스트, 프론트엔드 빌드, 실제 Excel 서식 표시를 검증한다.

## 범위 제외

Grid 화면 표시 로직, 숫자 데이터 변환/반올림, API/백엔드 및 DB 변경은 포함하지 않는다.
