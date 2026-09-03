# F1-Grid rowMerge 셀 드래그 범위 선택 비동작 수정 작업지시서

## 배경

F1-Grid에서 `mergeRows`가 설정된 셀이 존재하는 경우, 마우스로 셀 범위 선택 드래그를 수행할 때 병합된 영역 또는 병합 영역을 지나는 드래그 선택이 정상 동작하지 않거나 범위가 선택되지 않는 현상이 발생함.

원인 분석 결과:

1. non-leading merged 셀에 적용된 `pointerEvents: 'none'` 스타일로 인해 뒤쪽 병합 셀에서 `onMouseDown`, `onMouseEnter`, `onMouseUp` 마우스 이벤트가 발생하지 않음.
2. 병합 시작 셀(`gridRow: span N`)의 대형 영역과 뒤쪽 셀들의 이벤트 비활성화로 인해, 마우스 드래그 이동 시 해당 셀 위치(`rowIndex`, `columnIndex`)를 감지하지 못함.

## 목표

- `mergeRows`가 적용된 컬럼 및 병합 셀 영역에서도 마우스 드래그를 이용한 범위 선택(Cell Range Selection Drag)이 부드럽고 정확하게 동작하도록 수정함.
- 병합 셀 시작 영역뿐 아니라 병합된 뒤쪽 행 셀들을 통과해 드래그할 때도 셀 범위가 정상 갱신되도록 함.
- 핀 고정(pinned) 컬럼 및 일반 컬럼 모두에서 드래그 선택 및 복사 영역 선택이 일관되게 동작함.

## 확정 요구사항

- 병합된 셀(leading 및 non-leading 셀) 영역 위에서 마우스 드래그 시작(`onMouseDown`) 및 마우스 진입(`onMouseEnter`) 이벤트가 정상 작동함.
- 병합된 행 영역 전체를 통과하거나 병합 영역 내부에서 드래그할 때 `selectedCellRange` 범위가 기대한 행/열 인덱스로 정확히 계산 및 표시됨.
- `pointerEvents` 및 z-index, visibility/opacity 속성을 정리하여 시각적 중복 노출 없이 마우스 상호작용이 완벽히 유지되도록 함.
- 관련 테스트 코드(`tests/f1-grid.test.tsx`)를 추가하여 `mergeRows` 드래그 범위 선택 회귀 방지 검증을 완료함.

## 범위

- `frontend/src/shared/components/f1-grid/core/GridCell.tsx`
- `frontend/src/shared/components/f1-grid/core/GridRow.tsx`
- `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
- `frontend/tests/f1-grid.test.tsx` (드래그 선택 테스트 추가)
- 필요 시 결과 문서 작성 (`docs/result/20260903/f1grid-rowmerge-drag-selection/`)

## 제외 범위

- 백엔드 API 및 DB 변경
- F1-Grid 이외의 타 컴포넌트 수정
- 범위 선택 이외의 무관한 이벤트 리팩터링

## 완료 기준

- `mergeRows`가 적용된 컬럼의 셀에서 마우스 드래그 시작 시 범위 선택이 시작됨.
- 병합된 행들을 가로지르거나 내려가는 드래그 동작 시 선택 영역이 정상적으로 펼쳐짐.
- 기존 핀 고정(pinned) 컬럼과의 결합 동작 및 테스트가 모두 통과함.
- 작업 결과 문서가 작성됨.

## 검증 기준

- Vitest 단안 및 전체 테스트 통과 (`npm run test -- tests/f1-grid.test.tsx`)
- `mergeRows` 셀 드래그 선택 단위 테스트 Pass
