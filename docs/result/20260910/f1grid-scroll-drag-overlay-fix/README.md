# F1-Grid 스크롤 후 드래그 오버레이 숨김 수정 결과

## 작업 근거

- 관련 기능: F1-Grid 셀 범위 선택/드래그 오버레이
- 핵심 수정 파일:
  - [frontend/src/shared/components/f1-grid/core/F1Grid.tsx](../../../../frontend/src/shared/components/f1-grid/core/F1Grid.tsx)
  - [frontend/src/shared/components/f1-grid/core/GridRow.tsx](../../../../frontend/src/shared/components/f1-grid/core/GridRow.tsx)
  - [frontend/tests/f1-grid-pinned-column-range.test.tsx](../../../../frontend/tests/f1-grid-pinned-column-range.test.tsx)
  - [frontend/tests/f1-grid.test.tsx](../../../../frontend/tests/f1-grid.test.tsx)

## 재현 원인

드래그 범위 오버레이는 화면 좌표를 계산할 때, `bodyScroll`의 현재 스크롤 위치를 이미 포함한 셀 위치와 다시 스크롤 보정값을 더해버리는 방식이 섞여 있었습니다. 특히 큰 데이터셋에서 `scrollTop`이 커진 상태로 드래그를 시작하거나 이어가면, 오버레이의 `top`/`left`가 화면 기준이 아닌 스크롤 기준으로 계산되어 보이지 않는 위치로 떠버렸습니다.

또한 드래그 중에 `selectedCellRange`가 비동기적으로 갱신되는 사이에 `mouseEnter` 이벤트가 들어오면, 새 범위 상태를 기다리기보다 현재 drag ref 상태를 기준으로 연속 드래그해야 했습니다. 이 경계 조건이 빠지면 범위가 실제로 생성되었어도 오버레이가 다시 사라지는 현상이 발생했습니다.

## 수정 내용

### 1) 오버레이 좌표 계산 보정

`updateRangeOverlay()`에서 `top` 계산은 스크롤 컨테이너 좌표계 기준으로 이미 정규화된 `topLeftRect.top - containerRect.top` 값을 기준으로 유지하도록 정리했습니다. 과거에는 `bodyScroll.scrollTop`을 다시 더해 화면 좌표를 어그러뜨리게 만들었고, 이 값이 삭제되면서 스크롤 후에도 보이는 위치로 계산됩니다.

### 2) 드래그 상태를 ref 기반으로 안정화

`GridRow.tsx`에서 `mouseEnter`를 처리할 때, `selectedCellRange`만 보고 판단하지 않고 `dragSelectionStateRef`와 `previousDragCellRef`를 함께 보도록 변경했습니다. 이 덕분에 그리드가 재렌더되기 전에도 드래그 연속 확장이 작동하고, 드래그 중에는 오버레이가 숨겨지지 않습니다.

### 3) 회귀 테스트 추가

아래 검증을 추가/보강했습니다.

- `keeps the drag overlay visible after the grid body is scrolled vertically`
- `keeps the overlay aligned when a pinned left column is part of the drag range`

## 검증 결과

다음 명령으로 실제 회귀를 확인했습니다.

```bash
cd frontend
npx vitest run tests/f1-grid-pinned-column-range.test.tsx tests/f1-grid.test.tsx -t "keeps the drag overlay visible after the grid body is scrolled vertically|keeps the drag overlay aligned when a pinned left column is part of the drag range|keeps cell render work limited when a cell is selected" --maxWorkers=1 --testTimeout=30000
```

결과:

- Test Files: 1 passed | 1 skipped
- Tests: 2 passed | 139 skipped
- 0 failed

추가로, 이전의 render work 제한 회귀도 함께 확인했습니다.

## 참고

이 수정은 스크롤 좌표계와 드래그 상태 분리라는 두 가지 근본 원인을 함께 해결한 것이며, 동일한 패턴이 다른 그리드 영역에서 반복되지 않도록 상태 관리 흐름을 ref 기반으로 안정화한 것이 핵심입니다.
