# F1-Grid 셀 범위 초기화 및 드래그 성능 계획서

- 작업지시서: [019](../../directions/20261027/20261027_019_f1grid-range-reset-and-drag-performance_작업지시서.md)

## 조사 결과

- `F1Grid`는 외부 `loading`과 내부 검색/데이터 소스 로딩을 노출한다. 조회는 로딩 상태를 올리지만 셀 범위와 복사 범위를 초기화하지 않아 이전 선택 오버레이가 계속 남는다.
- `resolvePointerCell`은 포인터 이벤트마다 `visibleRows.find`를 수행하고, 대체 셀 탐색 시 렌더된 각 셀마다 다시 행 전체를 선형 검색한다.
- `updateRangeOverlay` 역시 드래그 변경 때 anchor/focus 행 인덱스를 각각 `findIndex`로 구한다.
- 공통 `rowIndexById` 인덱스는 현재 표시 행 기준으로 이미 계산되어 선택 범위 계산에 사용된다.

## 설계

로딩이 비활성에서 활성으로 전환될 때 셀 선택 범위, 복사 범위, range ref, pointer-drag ref/state 및 오버레이를 일괄 해제한다. 행 checkbox 기반 행 선택과 편집 상태는 이 작업에서 초기화하지 않는다. 포인터 셀 탐색과 오버레이 위치 계산은 `rowIndexById`에서 행을 직접 찾도록 바꾸고, 경계 이동 및 DOM 기하 계산은 그대로 둔다.

## 실행 순서

1. 로딩 전환이 셀 범위 선택을 해제하고 행 선택은 보존하는 테스트를 추가한다.
2. 10,000행 fixture에서 pointer hit/fallback 경로가 행 ID를 전체 스캔하지 않는 성능 회귀 테스트를 추가한다.
3. 현재 실패를 확인한 후 범위 초기화와 기존 행 인덱스 재사용을 최소 구현한다.
4. 드래그/가상화 회귀, 빌드, lint를 실행하고 실제 브라우저에서 375/768/1280px를 검증한다.
5. F1-GRID 문서와 결과 기록 및 합성 데이터 스크린샷을 갱신한다.

## 대상 파일

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- `frontend/tests/f1-grid.test.tsx`
- `frontend/tests/f1-grid-drag-performance.browser.mjs`
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- `docs/result/20261027/f1grid-range-reset-and-drag-performance/`
