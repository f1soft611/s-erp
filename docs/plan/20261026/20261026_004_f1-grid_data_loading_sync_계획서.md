# F1-Grid 조회 완료와 데이터 표시 시점 정합 계획서

## 관련 문서

- 작업지시서: [20261026_004_f1-grid_data_loading_sync_작업지시서.md](../../directions/20261026/20261026_004_f1-grid_data_loading_sync_작업지시서.md)
- 상세 설계: [F1-Grid 조회 데이터 표시 시점 설계](../../superpowers/specs/2026-10-26-f1-grid-data-loading-sync-design.md)
- 실행 단계: [F1-Grid 데이터 동기화 구현 계획](../../superpowers/plans/2026-10-26-f1-grid-data-loading-sync.md)

## 목적

조회 API가 끝난 뒤 공통 F1-Grid의 내부 편집 행 데이터가 반영되기 전에 빈 그리드가 화면에 먼저 나타나는 시차를 제거한다. 외부 `rows` 동기화를 layout effect에서 수행해 최신 조회 행이 표시되기 전에 브라우저가 페인트하지 않도록 한다.

## 변경 파일과 책임

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: 행 prop 동기화 effect를 `useLayoutEffect`로 변경하고 기존 분기와 상태 처리를 유지한다.
- `frontend/tests/f1-grid.test.tsx`: loading 중에서 새 행과 loading 종료가 함께 전달될 때 최신 행 표시 및 overlay 제거를 확인한다.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: 조회 행이 페인트 전에 반영되는 사용자 동작 계약을 문서화한다.
- `docs/result/20261026/f1-grid-data-loading-sync/`: 집중 테스트, 회귀 테스트, 빌드, 인증 브라우저 확인 및 캡처 근거를 기록한다.

## 실행 순서

1. loading overlay 테스트에 API 조회 완료 상태(새 `rows`, `loading=false`)를 회귀 사례로 추가한다.
2. F1-Grid 동기화 effect 전체를 `useEffect`에서 `useLayoutEffect`로 옮긴다. 비교, dirty state, 저장 행 확정, data source, 선택/포커스 및 dependency는 유지한다.
3. F1-Grid 동작 문서를 갱신한다.
4. F1-Grid, 렌더 성능, row merge 테스트 및 frontend build를 실행한다.
5. 공유 브라우저로 최초 조회 표시 시점을 확인할 수 있는 범위에서 확인하고 결과서/캡처를 기록한다.

## 검증

- `cd frontend; npm run test -- tests/f1-grid.test.tsx`
- `cd frontend; npm run test -- tests/f1-grid.test.tsx tests/f1-grid-render-performance.test.tsx tests/f1-grid-row-merge-regression.test.tsx`
- `cd frontend; npm run build`
- 인증 브라우저에서 품목관리·거래처 관리 최초 조회와 overlay 종료 프레임의 행 표시를 확인한다.

## 범위 제한

- 페이지 API, backend, database, 페이지별 `loading` 상태 및 저장 정책을 변경하지 않는다.
- 동기화 effect의 분기/동작 및 무관한 F1-Grid 최적화는 변경하지 않는다.
- 이미 존재하는 타 작업 파일 변경을 되돌리거나 범위에 편입하지 않는다.
