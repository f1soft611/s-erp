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

## 추가 보완(2026-09-10): 중간 스크롤 드래그 캡처와 대용량 무브 성능

이후 추가로 남아 있던 두 가지 이슈를 아래 방식으로 보완했습니다.

### 1) 중간 스크롤 상태에서도 드래그가 이어지도록 pointer hit resolution 적용

기존에는 셀 간 hover 이벤트에만 의존해서, 스크롤이 발생하는 도중에는 실제 포인터가 새 셀 위에 올라가도 `mouseEnter`가 다시 들어오지 않는 경우가 있었습니다. 이 동작은 스크롤이 발생하는 즉시 드래그 범위가 끊기거나, 현재 보이는 뷰포트 안에서 해당 셀을 계산하지 못해 범위가 비정상적으로 유지되는 문제가 있었습니다.

그래서 `F1Grid`에서 `document.elementsFromPoint()` 기반의 포인터 셀 해석을 추가해, 현재 화면 좌표에서 실제로 가리키는 셀을 계산하도록 보완했습니다. 드래그 중에는 매 프레임마다 새 좌표를 확인하고, 동일 셀로 재진입하는 경우는 중복 계산을 건너뛰도록 해서 대량 데이터에서도 무의미한 재렌더를 줄였습니다.

### 2) 대용량 데이터 드래그 동안 range update를 축약해서 부드럽게

대량 행이 보이는 상태에서 드래그 중에는 `setCellSelection`이 너무 자주 발생하면 오버레이와 선택 상태 계산이 병목이 되었습니다. 이를 위해 드래그 중 선택 범위 갱신은 기존 값과 동일할 때는 일단 건너뛰고, 프레임 단위로 `requestAnimationFrame`으로 묶어 실제로 변경된 경우만 반영하도록 정리했습니다.

이렇게 하면 스크롤 중에 포인터가 셀 경계 사이를 건너뛰는 상황에서도 범위가 안정적으로 잡히고, 큰 데이터셋에서도 드래그 느낌이 훨씬 부드러워집니다.

## 검증 결과

다음 명령으로 실제 회귀를 확인했습니다.

```bash
cd frontend
npx vitest run tests/f1-grid.test.tsx -t "keeps the drag overlay visible after the grid body is scrolled vertically|continues the range drag after the viewport scrolls while the pointer stays in place" --maxWorkers=1 --testTimeout=30000
npm run build
```

결과:

- Test Files: 1 passed
- Tests: 2 passed | 139 skipped
- Build: Vite production build success (exit code 0)

추가로, 관련 스크롤 회귀와 대규모 화면에 대한 빌드 경고 없이 정상 검증되었습니다.

## 참고

이 수정은 스크롤 좌표계와 드래그 상태 분리라는 두 가지 근본 원인을 함께 해결한 것이며, 동일한 패턴이 다른 그리드 영역에서 반복되지 않도록 상태 관리 흐름을 ref 기반으로 안정화한 것이 핵심입니다.
