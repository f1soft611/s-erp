# 작업지시서

## 요청

- rowHeight를 compact하게 줄인 이후 편집(에디터) 모드에서 셀 border가 이상하게 겹쳐 보인다.
- 편집 모드 셀에 여백(padding)이 없어 에디터가 셀 가장자리에 붙어 보인다.
- `date`, `time` 타입 컬럼 에디터의 입력 텍스트 수직 정렬이 여전히 맞지 않는다.

## 범위

- 프론트엔드: `frontend/src/shared/components/f1-grid/core/GridCell.tsx`
- 프론트엔드: `frontend/src/shared/components/f1-grid/editing/DateEditor.tsx`
- 프론트엔드: `frontend/src/shared/components/f1-grid/editing/TimeEditor.tsx`
- 프론트엔드: `frontend/src/shared/components/f1-grid/editing/DateTimeEditor.tsx`
- 검증: `frontend/tests/f1-grid.test.tsx`

## 완료 기준

- 편집 모드 셀에도 다른 셀과 동일하게 여백이 유지된다.
- 편집/포커스 셀은 2px solid outline만 보이고, 회색 grid border와 겹쳐 이중 테두리로 보이지 않는다.
- `date`, `time` 에디터의 입력 텍스트가 셀 높이 기준으로 수직 중앙 정렬된다.
- 관련 Vitest 회귀 테스트가 통과한다.
