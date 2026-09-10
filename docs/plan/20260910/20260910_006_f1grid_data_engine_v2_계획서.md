# F1-Grid Data Engine v2 구현 계획

> 단계별 TDD로 진행하며 각 단계의 집중 테스트 통과 후 다음 단계로 이동한다.

## 목표

가상화된 Render Layer 아래의 Data, Selection, Query, Tree 계층을 100,000행 기준 구조로 교체하고 서버 조회 확장점을 제공한다.

## 단계

### 1. Indexed Row Store

- `GridState`에 `rowIndexById`, `rowById`를 추가한다.
- 생성/추가/수정/삭제/복제 시 인덱스를 동기화한다.
- F1Grid의 반복 `find/findIndex`를 인덱스 조회로 교체한다.

### 2. Sparse dirty/patch

- `originalRowsById` 전체 복제를 제거한다.
- 최초 변경 시 필드 원본값만 `originalValuesById`에 저장한다.
- 현재 patch는 `patchesById`에 저장하고 원복 시 해당 필드를 제거한다.
- `getGridChanges`는 변경 ID 집합만 순회한다.

### 3. Set selection

- 내부 선택을 `Set<F1GridRowId>`로 변경한다.
- 전체 선택은 `allSelected + excludedIds`로 표현한다.
- 기존 callback/ref는 배열로 반환해 호환성을 유지한다.

### 4. Keyboard navigation

- `editableByRow` 전체 행렬 생성을 제거한다.
- 현재 좌표에서 방향에 따라 다음 편집 가능 셀을 lazy 탐색한다.
- 가상 viewport 밖 대상은 기존 focus 좌표에 반영한다.

### 5. Worker query

- 순수 query 요청/응답 타입과 worker 구현을 추가한다.
- 임계값 이상에서 Worker 정렬·필터를 사용하고 요청 sequence로 stale 응답을 무시한다.
- Worker 불가 환경과 테스트에서는 동기 엔진으로 fallback한다.

### 6. Incremental Tree projection

- `TreeIndex`에 row/children/root 인덱스를 캐시한다.
- 데이터 구조가 동일하면 expand/collapse에서 인덱스를 재생성하지 않는다.
- visible IDs만 DFS로 갱신한다.

### 7. Server-side data source

- `dataSource.load({ offset, limit, sorts, filters, signal })` 계약을 추가한다.
- 로딩/에러/전체 행 수를 관리하고 stale 요청을 취소한다.
- 로컬 `rows`와 dataSource는 상호 배타적으로 해석하되 기존 호출부는 영향받지 않는다.

## 검증

```powershell
cd frontend
npx vitest run tests/f1-grid-data-engine.test.ts tests/f1-grid-selection-engine.test.ts tests/f1-grid-query-engine.test.ts tests/f1-tree-projection.test.ts tests/f1-grid-server-data-source.test.ts --maxWorkers=1 --testTimeout=30000
npx vitest run tests/f1-grid-virtualization.test.ts tests/f1-grid-pinned-column-range.test.tsx tests/f1-grid-form-modal.test.tsx tests/f1-grid-docs.test.tsx --maxWorkers=1 --testTimeout=30000
npm run build
```
