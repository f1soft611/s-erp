# F1-Grid 대용량 스크롤 성능 개선 계획서

## 작업 근거

- 작업지시서: [20260911*002_f1grid*대용량*스크롤*성능개선\_작업지시서.md](../../directions/20260911/20260911_002_f1grid_대용량_스크롤_성능개선_작업지시서.md)
- 범주: `bounded`
- 대상: `frontend/src/shared/components/f1-grid` 공용 가상화/렌더링 로직

## 작업 목적

F1-Grid의 대용량 데이터 스크롤 지연을 줄이고, 보이는 영역만을 빠르게 그릴 수 있도록 성능을 개선한다. 특히 `rowOverscan`, 고정 높이 처리, 불필요한 re-render, scroll 중 heavy calculation을 경감해 화면이 “바로 보이지 않고 잠깐 뒤에 보이는” 현상을 완화한다.

## 현재 구조 분석

### 1. 가상화 로직

- `F1Grid`는 `rowVirtualState`를 계산해 가상 행 범위를 결정한다.
- `GridVirtualization.ts`의 `getVirtualRowWindow`는 스크롤 위치와 viewport height를 기반으로 시작/끝 인덱스를 계산한다.
- `rowOverscan` 기본값은 현재 8로 설정되어 있어, 대용량 데이터에서 너무 많은 추가 행을 미리 렌더링할 수 있다.

### 2. row height 가변 계산

- `F1Grid`는 `rowHeights` state를 관리하고, 행 높이를 갱신하는 로직을 가진다.
- 사용자가 row resize를 수행하거나 동적 높이가 적용될 때 `setRowHeights`가 반복되어 virtual window 계산이 더 무거워진다.
- 행 높이가 크게 달라지면 `topPadding`/`bottomPadding` 계산이 누적되어 스크롤 성능이 저하된다.

### 3. 렌더 병목 지점

- `GridBody`는 `visibleRows.map`으로 모든 가상 행을 한 번에 마운트한다.
- 각 행은 `GridRow`와 `GridCell`을 포함하고, 이 값들이 scroll/re-render에 재활용되기 때문에 계산량이 커진다.
- `columns`, `selection`, `mergeInfoByColumn` 등이 매 렌더마다 새 참조를 만들면 `memo` 최적화가 깨져서 오히려 느려질 수 있다.

## 작업 분해

### Step 1: 회귀 테스트와 기준선 확보

- 파일: `frontend/tests/f1-grid-virtualization.test.ts`
- 작업:
  - 가상화 로직에 대해 대용량 스크롤 기대값 테스트를 보강한다.
  - `rowOverscan` 값 감소와 window 계산 범위가 정상인지 확인하는 테스트를 추가한다.
- 검증:
  - `cd frontend && npm run test -- tests/f1-grid-virtualization.test.ts`

### Step 2: row height 고정화 및 가변 높이 경계 정리

- 파일:
  - `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
  - `frontend/src/shared/components/f1-grid/core/GridVirtualization.ts`
- 작업:
  - 기본 row height는 고정값 유지
  - `fixedRowHeightThreshold` 기준을 명확히 하여, 대용량 데이터에서는 가변 row height를 제한
  - row height 캐시와 virtual window 계산의 결합을 단순화
- 검증:
  - `cd frontend && npm run test -- tests/f1-grid.test.tsx`

### Step 3: overscan 조정 및 스크롤 계산 경량화

- 파일:
  - `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
  - `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
- 작업:
  - `rowOverscan` 기본값을 8에서 2~4 범위로 낮춤
  - scroll 중 `bodyScrollMetrics` 계산이 중복되지 않도록 정리
  - 불필요한 `dirtyCellMap`, `mergeInfoByColumn`, `rangeOverlay` 계산을 조건부로 제한
- 검증:
  - `cd frontend && npm run test -- tests/f1-grid-virtualization.test.ts --run`

### Step 4: props 안정화와 memo 무효화 방지

- 파일:
  - `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
  - `frontend/src/shared/components/f1-grid/core/GridRow.tsx`
  - `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
- 작업:
  - `columns`, `visibleRows`, `rowSelection`, `mergeInfoByColumn` 참조 안정화
  - `useMemo`/`memo` 조건을 다시 검토해 새 객체 생성으로 인한 재렌더 방지
  - `GridRow`/`GridCell` 렌더 비용을 낮추는 구조 정리
- 검증:
  - `cd frontend && npm run test -- tests/f1-grid.test.tsx`

### Step 5: 10,000건 이상 처리 전략 정리

- 파일:
  - `frontend/src/shared/components/f1-grid/types/grid.types.ts`
  - 관련 사용처(필요 시)
- 작업:
  - 10,000건 이상 데이터는 로컬 전체 렌더보다 `dataSource` + pageSize 기반 서버 페이지네이션을 우선 고려하도록 문서 및 코드 경고를 정리
  - 비고: 구현 범위 안에서 로직을 바로 바꾸기보다, 대용량 데이터 전용 경고와 사용 가이드를 보강
- 검증:
  - `cd frontend && npm run test -- tests/f1-grid-server-data-source.test.tsx`

### Step 6: 최종 회귀 검증

- 파일: 전체 F1-Grid 관련 테스트 및 빌드
- 작업:
  - 성능 개선 후 기존 기능 회귀 여부를 확인
  - F1-Grid 문서/결과 문서와 검증 로그를 같이 정리
- 검증:
  - `cd frontend && npm run test`
  - `cd frontend && npm run build`

## 영향 범위

### 변경 대상

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
- `frontend/src/shared/components/f1-grid/core/GridRow.tsx`
- `frontend/src/shared/components/f1-grid/core/GridVirtualization.ts`
- `frontend/tests/f1-grid-virtualization.test.ts`

### 비영향 대상

- 백엔드 API/DB
- F1-Grid 외부 화면 로직
- 전역 UI 구조 전체 리팩터링

## 검증 계획

### 최소 검증

- `cd frontend && npm run test -- tests/f1-grid-virtualization.test.ts`
- `cd frontend && npm run test -- tests/f1-grid.test.tsx`
- `cd frontend && npm run build`

### 추가 검증

- 대용량 rows(예: 10,000건 이상)에서 스크롤 동작을 브라우저 수준에서 확인
- 가변 높이/row resize가 정상적으로 유지되는지 확인
- overscan 감소 이후 빈 화면 지연이 감소했는지 확인

## 결과 문서화

- 구현 완료 후 `docs/result/20260911/f1grid-large-scroll-performance/` 경로에 성능 개선 개요, 원인, 조치, 검증 결과를 기록한다.
- 스크린샷이 필요한 경우 브라우저 캡처를 함께 남긴다.

## DB 영향

- DB 스크립트: 해당 없음
- 영향 검토: 프론트엔드 공용 F1-Grid 성능 개선에 국한되며, 데이터베이스나 서버 API 계약은 변경하지 않는다.
