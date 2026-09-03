# F1-Grid rowMerge 셀 드래그 범위 선택 비동작 수정 사양서

## 1. 문제 정의

`mergeRows: true` 설정이 포함된 F1-Grid 컬럼에서 셀 선택 후 드래그(`onCellSelectionStart`, `onCellSelectionDrag`)를 할 때, 병합된 행 영역(2번째 행부터 N번째 행) 위로 마우스를 이동해도 `onMouseEnter` 이벤트가 해당 행 셀에서 발생하지 않아 범위 선택이 병합 셀 아래로 확장되지 않거나 멈추는 현상이 발생한다.

## 2. 요구사항

### 2.1 기능 요구사항

- 병합된 셀(1번째~N번째 행) 어디서나 마우스 다운(`onMouseDown`)을 눌러 선택을 시작할 수 있어야 함.
- 마우스를 드래그하여 병합 영역의 각 행을 지나갈 때 `selectedCellRange`가 마우스 포인터가 가리키는 실제 행(`rowIndex`) 및 열(`columnIndex`)로 정확히 업데이트되어야 함.
- 드래그 선택 하이라이트 배경색 및 테두리가 병합 영역과 비병합 영역 구분 없이 일관되게 표시되어야 함.
- `mergeRows`와 `pinned: 'left' | 'right'`가 동시에 적용된 컬럼에서도 드래그 범위 선택이 정상 동작해야 함.

### 2.2 비기능 요구사항

- 드래그 중 성능 저하가 없어야 함 (`onMouseEnter` 이벤트 핸들러의 가벼운 유지).
- 병합 셀 뒤쪽 텍스트 중복 노출이 없어야 함 (`opacity: 0` 유지).

## 3. 상세 컴포넌트 동작 설계

### 3.1 `GridCell.tsx`

- `mergedCellHidden` (비시작 병합 셀)
  - `pointerEvents`: `'none'`에서 `'auto'`로 변경.
  - `opacity`: `0` 유지 (시각적으로 숨김 처리 및 텍스트 노출 안 함).
  - `zIndex`: 병합 시작 셀(`mergeInfo.isStart`)이 `span N`으로 전체를 차지하더라도, 뒤쪽 행 셀들이 마우스 호버/드래그 이벤트를 우선적으로 받을 수 있도록 `zIndex` 또는 포인터 상호작용 레이어를 조정함.

### 3.2 `GridRow.tsx` / `F1Grid.tsx`

- `onCellSelectionDrag`: 마우스가 들어오는 `cell = { rowId, columnIndex }`를 받아 `cellSelectionRange` 상태를 정상 업데이트함.

## 4. 검증 기준

- `tests/f1-grid.test.tsx`에 `mergeRows` 드래그 선택 테스트 추가:
  - 병합된 셀 영역에서 마우스 다운 후 다음 행으로 마우스 엔터 시 `selectedCellRange` 범위가 `row 0 ~ row 1`로 선택되는지 검증.
- 모든 F1-Grid 관련 테스트 통과 (`npx vitest run tests/f1-grid.test.tsx`).
