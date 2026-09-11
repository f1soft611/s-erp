# F1-Grid 대용량 스크롤 성능 개선 상세 사양서

## 작업 근거

- 작업지시서: [20260911*002_f1grid*대용량*스크롤*성능개선\_작업지시서.md](../../directions/20260911/20260911_002_f1grid_대용량_스크롤_성능개선_작업지시서.md)
- 계획서: [20260911*002_f1grid_large_scroll_performance*계획서.md](../../plan/20260911/20260911_002_f1grid_large_scroll_performance_계획서.md)

## 1. 목표

F1-Grid가 대용량 데이터에서 스크롤 시 “바로 보이지 않고 잠깐 뒤에 보이는” 현상을 줄인다. 이를 위해 가상화 범위, row height 계산, scroll 중 heavy calculation, props 안정화, 대용량 데이터 필요 시 서버 페이지네이션 전략을 정비한다.

## 2. 사용자 요구사항

### 2.1 row 높이 고정화

- 기본 row 높이는 고정값으로 유지한다.
- 동적 row height가 필요할 때는 제한된 범위에서만 계산되도록 한다.
- 대용량 데이터에서는 가변 row height 계산이 스크롤 지연을 야기하지 않도록 설계한다.

### 2.2 overscan 축소

- rowOverscan 기본값을 8에서 2~4 범위로 조정한다.
- 스크롤 시 과도한 row 미리 렌더를 방지한다.
- 보이는 영역과 인접 영역만 빠르게 준비하여 사용자 경험을 개선한다.

### 2.3 props 안정화

- `columns`, `rowSelection`, `mergeInfoByColumn`, `visibleRows` 같은 의존성이 큰 값은 새 참조 생성이 반복되지 않도록 한다.
- `memo`와 `useMemo`를 활용해 재렌더 비용을 줄인다.
- `GridRow`/`GridCell`의 불필요한 re-render를 방지한다.

### 2.4 scroll 중 heavy calculation 제거

- scroll 이벤트 시 `viewportMetrics`, `rowVirtualState`, `dirtyCellMap`, `rangeOverlay` 계산이 과도하게 반복되지 않도록 한다.
- RAF를 활용하되, 가장 최근 스크롤 값만 반영하도록 조정한다.
- 스크롤에 직접 연관되지 않은 계산은 화면이 보이는 시점으로 미뤄서 버벅임을 줄인다.

### 2.5 10k 이상 데이터 대응

- 10,000건 이상 대용량 데이터에서는 로컬 전체 렌더를 기본 전략으로 두지 않는 구조를 고려한다.
- 서버 페이지네이션 또는 `dataSource` 기반 lazy loading 우선 사용을 권장한다.
- F1Grid의 로컬 데이터 처리 범위를 명확히 제한한다.

## 3. 화면/로직 요구사항

### 3.1 가상화 동작

- `F1Grid`는 보이는 행 범위만 렌더링하도록 유지한다.
- `visibleRows.length`가 많은 경우에도 사용자 스크롤 위치에 맞는 window 계산을 수행한다.
- overscan 값이 너무 커서 빈 화면 느낌이 생기지 않도록 해야 한다.

### 3.2 row height 처리

- 고정 높이 모드와 동적 높이 모드가 명확히 분리된다.
- 대용량 데이터에서 고정 모드가 우선 적용되도록 한다.
- 필요할 때만 동적 높이 계산을 허용한다.

### 3.3 렌더 최적화

- `GridBody`는 현재 보이는 rows만 실제 DOM에 배치한다.
- 패딩 값은 스크롤 위치 기반으로 계산되며, 스크롤 중 불필요하게 리렌더링되지 않는다.
- `GridRow`는 props 변경이 있을 때만 다시 렌더되도록 관리한다.

### 3.4 대용량 데이터 전략

- 10k 이상은 로컬 처리보다 서버 데이터 소스 사용을 우선 배치한다.
- 사용자에게 “대용량 데이터는 server pagination 사용 권장” 안내가 가능해야 한다.

## 4. 기능 동작 사양

### 4.1 기본 설정

- 기본 `rowOverscan` 값은 2~4 범위로 축소한다.
- 기본 `rowHeight`는 고정값 32를 유지한다.
- `fixedRowHeightThreshold`는 대용량 데이터 타이밍에서 고정 높이 모드를 적용하는 기준으로 사용한다.

### 4.2 계산 경량화

- 스크롤 이벤트는 가능한 한 최근 값만 반영한다.
- 동일 스크롤 위치에 대해 중복 계산이 발생하지 않도록 한다.
- heavy calculation은 RAF로 스케줄링한다.

### 4.3 props 안정화

- `columns`와 `selection`이 새 배열/객체로 생성되더라도 필요한 경우에만 계산이 재실행되도록 설계한다.
- 불필요한 `useMemo`/`memo` 의존성 누락을 방지한다.

## 5. 비기능 요구사항

### 5.1 성능

- 대용량 데이터 스크롤 시 첫 번째 보이는 row가 지연 없이 표시되는 정도를 개선한다.
- 실제 브라우저 환경에서 체감 반응 속도가 안정적으로 향상되어야 한다.

### 5.2 유지보수성

- 성능 튜닝은 가상화 로직과 렌더 최적화 중심으로 구성한다.
- 동적 높이 로직과 고정 높이 로직이 혼재하지 않도록 구분한다.

### 5.3 회귀 방지

- 기존 기능 테스트와 F1Grid 관련 테스트가 모두 통과해야 한다.
- rowSelection, column virtualization, form editing 등 기존 동작이 깨지지 않아야 한다.

## 6. 예외 사항

- 큰 변화나 기능 추가를 본 작업과 함께 수행하지 않는다.
- F1-Grid 엔진의 전체 구조를 대폭 개편하지 않는다.
- 백엔드/DB 변경을 본 작업에 포함하지 않는다.

## 7. 검증 기준

### 7.1 단위/통합 테스트

- `frontend/tests/f1-grid-virtualization.test.ts`가 통과한다.
- `frontend/tests/f1-grid.test.tsx`가 통과한다.
- `frontend/tests/f1-grid-server-data-source.test.tsx`가 통과한다.

### 7.2 빌드 검증

- `cd frontend && npm run build`가 정상 종료한다.

### 7.3 UI 성능 검증

- 대용량 스크롤 시 빈 화면 평균 지연이 감소한다.
- overscan 축소 후 렌더가 안정적이다.
- row resize와 selection 동작이 기존과 동일하게 유지된다.

## 8. 완료 기준

- row 고정화, overscan 축소, props 안정화, heavy calculation 경감이 반영되었다.
- 대용량 데이터의 스크롤 지연이 개선되었다.
- 기존 F1Grid 테스트와 빌드가 모두 통과했다.
- 결과 문서와 검증 로그가 정리되었다.

## 9. DB 영향

- DB 스크립트: 해당 없음
- 영향 검토: 프론트엔드 공용 F1-Grid 성능 개선만 수행하며, 데이터베이스 및 API 계약은 변경하지 않는다.
