# F1-GRID rownumber 컬럼 타입 사양서

- 작성일: 2026-09-01
- 작성자: GitHub Copilot

## 1. 개요

`type: 'rownumber'`로 지정한 컬럼은 실제 데이터 대신 현재 표시 순서를 기준으로 한 1부터 시작하는 순번을 자동으로 보여주는 읽기 전용 컬럼이다.

## 2. 동작 사양

1. `F1GridEditorType`에 `'rownumber'` 추가.
2. `isCellEditable`은 `column.type === 'rownumber'`인 경우 `editable` 설정과 무관하게 항상 `false`를 반환한다. 이 함수는 셀 편집 시작, Tab/Home/End 이동, 붙여넣기, 헤더 전체 체크 등 모든 편집 가능 판정 경로에서 공용으로 사용되므로 별도 예외 처리가 필요 없다.
3. `GridCell`은 `column.type === 'rownumber'`일 때 `row[column.field]` 값 대신 `rowIndex + 1`(현재 `visibleRows` 배열 내 위치, 1부터 시작)을 표시값으로 사용한다.
4. 정렬/필터/행 추가·삭제가 일어나도 항상 현재 화면상 위치 기준으로 재계산되며, row 데이터 자체에는 값을 저장하지 않는다.
5. 컬럼 정렬(`align`)은 미지정 시 숫자 컬럼과 동일하게 오른쪽 정렬을 기본값으로 한다.

## 3. 검증 기준

- `rownumber` 타입 컬럼이 행 순서에 따라 1,2,3...으로 표시되는지 테스트
- 행 추가/삭제/정렬 후에도 순번이 현재 위치 기준으로 재계산되는지 테스트
- 편집 시도(더블클릭/Enter) 시 편집 모드로 진입하지 않는지 테스트
- `npm run test -- tests/f1-grid.test.tsx`, `npm run build` 통과
