# F1-Grid Data Engine v2 상세 사양서

## 1. Indexed Row Store

`F1GridData`는 ordered `rows`, `rowById`, `rowIndexById`를 가진다. ID 키는 기존 `getStateKey` 문자열 정규화를 사용한다. 단일 행 조회는 배열 검색을 사용하지 않는다.

## 2. Sparse 변경 모델

- `originalValuesById[id][field]`: 최초 수정 직전 값
- `patchesById[id][field]`: 현재 변경값
- `dirtyFieldsById`: 기존 표시 계약 호환
- 원래 값으로 복귀한 필드는 세 map에서 제거한다.
- inserted/deleted 상태 계약은 유지한다.
- 변경 ID 집합으로 `getGridChanges` 대상을 제한한다.

## 3. Selection model

```ts
type F1GridRowSelection = {
  allSelected: boolean;
  includedIds: Set<F1GridRowId>;
  excludedIds: Set<F1GridRowId>;
};
```

일반 선택은 includedIds, 전체 선택은 allSelected와 excludedIds를 사용한다. 외부 callback/ref는 현재 visible rows 순서의 ID 배열을 반환한다.

## 4. Keyboard navigation

현재 셀에서 다음 후보만 순차 검사한다. Tab은 행/열 방향으로 순회하고 방향키는 인접 좌표를 사용한다. 전체 boolean matrix를 만들지 않는다.

## 5. Query Worker

```ts
type GridQueryRequest<T> = {
  requestId: number;
  rows: T[];
  sorts: F1GridSort<T>[];
  filters: F1GridFilter<T>[];
  columnTypes: Record<string, F1GridEditorType | undefined>;
};
```

기본 Worker 임계값은 10,000행이다. Worker 생성 실패 시 동기 query 함수를 사용한다. 새 요청 발생 시 이전 응답은 requestId 비교로 폐기한다.

## 6. Tree index

TreeIndex는 rowById, childrenByParentId, rootIds, order를 보유한다. rows 참조/rowKey/parentKey/order 함수가 같으면 재사용한다. expanded set 변경은 index를 다시 생성하지 않고 visible rows만 계산한다.

## 7. Server data source

```ts
type F1GridDataSource<T> = {
  pageSize?: number;
  load(query: F1GridDataSourceQuery<T>): Promise<{
    rows: T[];
    totalRowCount: number;
  }>;
};
```

query에는 offset, limit, sorts, filters, AbortSignal이 포함된다. dataSource 지정 시 서버가 정렬·필터 결과를 소유한다. 요청 중 기존 행을 유지하며 공통 loading overlay를 표시한다. 실패 시 `onDataSourceError`를 호출한다.

- 초기 조회와 정렬/필터 변경은 offset 0부터 다시 조회한다.
- 로드된 데이터의 하단 overscan 영역에 도달하면 현재 로드 건수를 offset으로 다음 페이지를 요청한다.
- 다음 페이지는 기존 서버 행 뒤에 추가하며 `totalRowCount`에 도달하면 추가 요청하지 않는다.
- 서버 페이지가 교체되거나 추가될 때 local inserted/updated/deleted 상태와 sparse patch는 `rebaseGridData`로 보존한다.

## 8. 호환성

기존 `rows`, selection callback, Ref API, 편집/dirty, F1Tree 사용법은 유지한다. 새 기능은 자동 내부 최적화 또는 opt-in dataSource다.

## 9. 검증 기준

- 100,000행 store에서 ID 조회와 단일 수정이 index 기반으로 동작한다.
- 초기 생성 시 원본 행 복제 map이 없다.
- 전체 선택이 100,000 ID Set을 생성하지 않는다.
- keyboard 탐색이 행×컬럼 matrix를 생성하지 않는다.
- Worker stale 응답이 무시된다.
- Tree expand/collapse가 동일 TreeIndex를 재사용한다.
- server data source가 abort, sort/filter query, loading/error를 처리한다.
- server data source가 다음 offset 페이지를 추가하고 local dirty row를 보존한다.
