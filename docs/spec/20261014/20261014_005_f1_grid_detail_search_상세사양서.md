# F1-Grid 상세검색 연동 문서 상세 사양서

## 1. 기준 문서

- 작업지시서: [20261014_005_f1_grid_detail_search_작업지시서.md](../../directions/20261014/20261014_005_f1_grid_detail_search_작업지시서.md)
- 계획서: [20261014_005_f1_grid_detail_search_계획서.md](../../plan/20261014/20261014_005_f1_grid_detail_search_계획서.md)
- 승인 설계: [2026-10-14-f1-grid-page-detail-search-docs-design.md](../../superpowers/specs/2026-10-14-f1-grid-page-detail-search-docs-design.md)

## 2. 현재 지원 계약

### 컬럼에서 상세검색 필드 만들기

`F1GridColumnSearchOptions`는 필드 표시만 설정한다.

| 설정 | 효과 | 기본/동작 |
| --- | --- | --- |
| `hidden` | 해당 검색 필드 제외 | `false`; `column.hidden === true`도 제외 |
| `label` | 검색 UI 레이블 | 없으면 `headerName` |
| `group` | 검색 필드 그룹 | 없으면 지정하지 않음 |
| `order` | 필드 표시 순서 | 지정값 우선, 미지정은 지정 필드 뒤에 기존 컬럼 순서 |
| `span` | 검색 폼에서 필드가 차지할 폭 | `1` |

`toPageSearchFields(columns)`는 아래 계약으로 정의된다.

- `field`: `String(column.field)`.
- `label`: `column.search?.label ?? column.headerName`.
- `type`: 현재 상세검색 지원 타입(`text`, `number`, `decimal`, `currency`, `date`, `select`, `checkbox`)이면 컬럼 `type`; 아니면 `text`.
- `searchSpan`: `column.search?.span ?? 1`.
- `group`: truthy한 `column.search?.group`만 포함.
- `options`: 컬럼의 `options`가 제공되면 그대로 포함.
- 컬럼 `hidden` 또는 검색 `hidden`이 true면 제외.
- 검색 `order` 값으로 오름차순 정렬하고, 미지정 필드는 지정 필드 뒤에 남긴다.
- `form.span`과 `search.span`은 서로 독립적이다.

### PageSearchArea 상세검색 사용

`PageSearchArea`는 `detailFields`, controlled `detailValues`, `onDetailValuesChange`, `onDetailSearch`, `onDetailClose`, `detailLoading`을 받는다. date 타입은 `{ from?: string; to?: string }` 범위로 처리한다. `select`는 컬럼 `options`를 사용한다.

```tsx
const columns: F1GridColumn<DraftRow>[] = [
  {
    field: 'name',
    headerName: '양식명',
    search: { label: '양식명', group: '기본 정보', order: 1, span: 2 },
  },
  {
    field: 'createdAt',
    headerName: '등록일',
    type: 'date',
    search: { group: '등록 정보', order: 2, span: 3 },
  },
  {
    field: 'status',
    headerName: '상태',
    type: 'select',
    options: statusOptions,
    search: { order: 3 },
  },
  {
    field: 'internalCode',
    headerName: '내부 코드',
    search: { hidden: true },
  },
];

const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);

<PageSearchArea
  detailFields={detailFields}
  detailValues={detailValues}
  onDetailValuesChange={setDetailValues}
  onDetailSearch={(values) => loadRows(toQuery(values))}
>
  {defaultSearchControls}
</PageSearchArea>
```

예제는 책임 경계를 위한 설명용 `toQuery` / `loadRows` 이름이며 실제 업무 페이지가 상태 및 API 계약에 맞게 구현한다.

## 3. 명시해야 할 책임 경계

- `toPageSearchFields`는 `PageSearchField[]` UI metadata만 만든다.
- `PageSearchArea`는 상세검색 입력 및 callback을 제공한다. 기본 검색 children은 페이지가 제공할 수 있다.
- `onDetailValuesChange`의 값 보존/정규화, 기본 키워드와 상세 조건의 결합, 검색 조건 변환, 페이지 데이터 갱신, 서버 요청과 오류 처리는 페이지가 책임진다.
- F1-Grid component 자체 또는 `F1GridColumn.search` metadata는 backend query를 실행하지 않는다.
- 사용 예는 지원되는 API 이름 및 타입과 기존 `PageSearchArea` props에 맞춘다.

## 4. 포털 배치와 탐색

- 기존 `필터와 정렬` 문서의 섹션으로 `PageSearchArea 상세검색 연동`을 추가한다.
- 별도 메뉴 그룹/문서 ID는 추가하지 않는다.
- 코드/기능 설명에 연관된 `search` API 참조를 연결한다.
- API 전체 참조의 `F1GridColumn.search` 및 `F1GridColumnSearchOptions` 계약은 유지한다.
- 포털 검색으로 `toPageSearchFields`, `PageSearchArea`를 설명하는 섹션을 찾을 수 있어야 한다. 실제 검색 대상이 문서 section body와 heading임을 고려해 API 검색 결과 목록 동작을 보존한다.

## 5. 검증

`f1-grid-docs.test.tsx`에 포털 문서 데이터 기반 테스트를 추가한다.

1. `getF1GridDoc('filtering-sorting')`에 `PageSearchArea 상세검색 연동` 섹션이 존재한다.
2. 해당 섹션 본문과 예제에 `toPageSearchFields`, `detailFields`, `onDetailValuesChange`, `onDetailSearch`, `searchSpan`, `group`, date range 및 `options`를 통한 select 설정이 설명된다.
3. `column.hidden` 및 `search.hidden`, 미지원 type fallback의 동작이 표현된다.
4. Grid가 검색 API를 실행하지 않고 업무 페이지가 조회 조건 및 요청을 담당함을 설명한다.
5. 기존 공개 API 완전성, 필터/정렬 문서 탐색, API 이름 검색 테스트가 계속 통과한다.
6. `npm run test -- tests/f1-grid-docs.test.tsx` 및 `npm run build`가 성공한다.
7. 브라우저에서 `필터와 정렬` 문서 및 `F1GridColumn.search` 검색 결과를 확인한다.
