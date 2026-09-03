# F1-Grid rowMerge 셀 드래그 범위 선택 비동작 수정 계획서

## 1. 목적

F1-Grid에서 `mergeRows` 옵션이 적용된 컬럼/셀 영역에서 마우스 드래그를 통한 셀 범위 선택(`selectedCellRange`)이 정상적으로 동작하도록 이벤트 및 레이아웃을 수정한다.

## 2. 현황 및 문제 원인

- 병합 시작 셀(`mergeInfo.isStart === true`)은 `gridRow: rowIndex + 1 / span N`으로 지정되어 N개 행 높이 전체를 덮고 있음.
- 병합된 뒤쪽 셀들(`mergedCellHidden === true`)에는 `pointerEvents: 'none'`이 적용되어 있어, 뒤쪽 셀 위치로 마우스를 이동하더라도 `onMouseEnter` 이벤트가 감지되지 않고 항상 병합 시작 셀 또는 주변 영역만 감지됨.
- 이로 인해 병합 셀을 지나치는 드래그를 수행할 때 마우스 커서가 가리키는 정확한 행 인덱스(`rowIndex`)로 `onCellSelectionDrag`가 트리거되지 않아 선택 범위가 제대로 갱신되지 않는 문제가 발생함.

## 3. 구현 접근법

1. `GridCell`에서 non-leading 병합 셀(`mergedCellHidden`)에 적용되어 있던 `pointerEvents: 'none'`을 제거하거나, 병합 시작 셀과 뒤쪽 병합 셀들의 포인터 이벤트 레이어 순서를 조정함 (`pointerEvents: 'auto'`).
2. 병합된 뒤쪽 셀이 마우스 이벤트를 수신할 수 있도록 하고, 시각적인 텍스트 노출은 비워두거나 `opacity: 0` 상태를 유지하여 시각적 중복 노출을 차단하면서 마우스 호버/드래그 이벤트를 정상 포착하게 함.
3. 병합 시작 셀의 `zIndex`와 포인터 이벤트 투과 처리를 조정하여, 사용자가 드래그할 때 마우스 아래에 위치한 정확한 `(rowIndex, columnIndex)`가 감지되도록 보완함.
4. `tests/f1-grid.test.tsx`에 `mergeRows` 영역에서의 드래그 선택 테스트 케이스를 추가하여 회귀 검증함.

## 4. 검증 계획

- Vitest 단일 테스트 실행: `Set-Location 'frontend'; npx vitest run tests/f1-grid.test.tsx`
- 병합 영역 드래그 선택 테스트 Pass 확인
- 기존 `mergeRows` 기능 및 pinned column 조합 테스트 Pass 확인

## 5. 영향 범위

- `frontend/src/shared/components/f1-grid/core/GridCell.tsx`
- `frontend/tests/f1-grid.test.tsx`
