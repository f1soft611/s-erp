# F1-Grid 셀 dirty 표시 기능 계획서

## 1. 목적

F1-Grid의 셀 수정 상태를 사용자에게 명시적으로 보이도록 하는 dirty 표시 기능을 정리하고 구현한다. 현재 dirty 상태 값은 내부적으로 계산되고 있으나, 시각적 표시가 일관되지 않아 수정 여부가 잘 인지되지 않는다.

## 2. 현황 분석

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`에서 `dirtyCellMap`을 계산해 각 셀의 dirty 여부를 전달한다.
- `GridRow.tsx`에서 `dirtyCellMap`을 기반으로 `GridCell`에 `dirtyCell` 플래그를 전달한다.
- `GridCell.tsx`에는 이미 작은 빨간 표시를 렌더링하는 코드가 있지만, 실제 구조/스타일/레이어링이 요구 사항에 맞는지 재점검이 필요하다.
- dirty 표시가 선택/편집 상태와 충돌하거나, 셀 영역을 벗어나 보이거나, 재렌더링 시 사라지는 회귀 가능성이 있다.
- 관련 F1-Grid 테스트는 dirty 표시 시나리오가 부족하여 회귀를 막기 어렵다.

## 3. 작업 범위

### 3.1 프론트엔드 수정 범위

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- `frontend/src/shared/components/f1-grid/core/GridRow.tsx`
- `frontend/src/shared/components/f1-grid/core/GridCell.tsx`
- 필요 시 `frontend/src/shared/components/f1-grid/core/GridBody.tsx` 또는 공통 스타일 정리

### 3.2 테스트 범위

- `frontend/tests/f1-grid.test.tsx` 또는 관련 F1-Grid 테스트 파일에 dirty 셀 표시 검증 추가
- 편집 후 dirty marker가 유지되는 시나리오 확인
- 선택/편집 상태와 css 조합 검증

## 4. 구현 접근법

1. dirty 상태가 실제로 어떤 셀의 어느 필드에서 집계되는지 재확인한다.
2. `GridCell`의 표시 위치를 기준좌표와 z-index 관점에서 정렬한다.
3. 수정 중인 셀, 선택된 셀, 범위 선택 오버레이와 상호작용하지 않도록 시각 계층을 조정한다.
4. dirty marker는 일반 셀 텍스트와 겹치지 않도록 작은 모서리 마크 형태로 유지한다.
5. 기존 편집/selection 동작을 유지하면서 테스트를 추가해 회귀 여부를 검증한다.

## 5. 검증 계획

- 기존 F1-Grid 테스트 실행
- 해당 dirty 표시 시나리오 테스트 추가 후 실행
- 필요 시 브라우저 렌더링 검증을 보완한다.

실행 명령:

- cd frontend
- npm run test -- tests/f1-grid.test.tsx

## 6. 영향 범위

- F1-Grid 공통 셀 렌더링 로직에만 영향이 있으며, 메뉴 관리 화면은 데이터 흐름을 변경하지 않는다.
- 수정 범위는 dirty 표시와 관련된 셀 UI 렌더링으로 제한한다.
- 기존 선택/편집/drag 동작을 보존하도록 구현한다.
