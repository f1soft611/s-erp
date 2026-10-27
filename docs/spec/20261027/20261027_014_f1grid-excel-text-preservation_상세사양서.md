# F1-Grid Excel 텍스트 값 보존 상세 사양

## 배경 및 원인

숫자처럼 생긴 문자열(예: `"000004"`)도 `.xlsx` 셀의 데이터 값이 문자열이라는 사실만으로 Excel 편집 동작까지 텍스트로 고정되지는 않는다. 셀 표시 형식이 기본 `General`이면 Excel이 셀을 편집하고 확정할 때 입력을 숫자로 해석해 선행 0을 제거할 수 있다.

## 동작 계약

- `type: 'text'`와 기존 표시 문자열 경로 등 문자열로 기록되는 데이터 셀은 Excel number format `@`를 사용한다.
- 셀 값 자체는 String으로 저장한다. 숫자 변환이나 앞자리 0의 추정·복구를 하지 않는다.
- `number`, `decimal`, `currency`, `rownumber`, `datetime`, `time`, `checkbox`의 값 타입 및 기존 서식은 변경하지 않는다.
- 빈 셀과 헤더의 처리, 파일명, visible rows/columns 및 다운로드 동작은 변경하지 않는다.
- 이미 숫자 타입으로 전달되어 선행 0을 잃은 원본 값은 exporter가 복구하지 않는다. 코드 필드는 API/그리드 데이터부터 문자열이어야 한다.

## 검증

- 실제 ExcelJS workbook을 저장하고 다시 읽어 문자열 코드 `000004`가 String 값이며 `numFmt === '@'`인지 확인한다.
- 테스트에 해당 컬럼을 `type: 'text'`로 명시하고 숫자/날짜 등 기존 typed export 회귀를 확인한다.
- `f1-grid-excel-export.test.ts`와 `npm run build`를 실행한다.
