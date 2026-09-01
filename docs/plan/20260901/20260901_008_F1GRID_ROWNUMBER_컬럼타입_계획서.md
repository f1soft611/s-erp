# F1-GRID rownumber 컬럼 타입 계획서

- 작성일: 2026-09-01
- 작성자: GitHub Copilot
- 작업 대상: `frontend/src/shared/components/f1-grid`

## 구현 계획

### 1단계: 타입 추가

- `F1GridEditorType`에 `'rownumber'` 추가

### 2단계: 읽기 전용 처리

- `utils/grid.utils.ts`의 `isCellEditable`에서 `column.type === 'rownumber'`이면 무조건 `false` 반환(다른 편집/포커스 이동 로직이 공통으로 이 함수를 사용하므로 별도 분기 불필요)

### 3단계: 표시값 계산

- `GridCell.tsx`에서 `column.type === 'rownumber'`이면 실제 셀 값 대신 `rowIndex + 1`을 표시값으로 사용
- 정렬 우선순위: `column.align` > 기본 오른쪽 정렬(숫자 컬럼과 동일)

### 4단계: 검증

- `npm run test -- tests/f1-grid.test.tsx`
- `npm run build`

## 알려진 제한사항

- 클립보드 복사(`toGridTsv`)는 실제 row 데이터 값을 사용하므로 rownumber 컬럼은 원본 필드 값(대개 비어있음)이 복사된다. 이번 요청 범위(표시용 자동 채번)에는 해당 사항이 없어 별도 처리하지 않는다.
