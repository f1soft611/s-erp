# ERP React Grid 개발 Agent Specification

## 1. 프로젝트 목표

React + TypeScript 기반의 ERP 시스템에서 공통으로 사용할 수 있는 자체 Grid Component를 개발한다.

외부 상용 Grid 라이브러리(AG Grid, Kendo Grid, Syncfusion Grid 등)는 사용하지 않는다.

단, Grid 내부 구현에 필요한 일반적인 React 생태계 라이브러리는 필요성 검토 후 사용할 수 있다.

목표는 일반적인 DataTable이 아니라 다음 ERP 업무 특성을 만족하는 전문 Grid를 만드는 것이다.

- 대량 데이터 처리
- Excel 중심 업무
- 빠른 키보드 입력
- 인라인 편집
- 다중 행 작업
- 행 상태 관리
- 서버사이드 조회
- 사용자별 Grid Layout
- ERP 업무에 맞는 코드/명칭 입력
- 합계/소계
- Tree / Group 기능 확장

---

# 2. 기본 기술 원칙

## 기술 스택

- React
- TypeScript
- Vite
- CSS 또는 프로젝트의 공통 Styling System
- React Hooks

## 금지

다음 Grid 라이브러리를 사용하지 않는다.

- AG Grid
- MUI DataGrid
- Kendo UI Grid
- Syncfusion Grid
- DevExtreme DataGrid
- Handsontable

단순 UI 컴포넌트 라이브러리는 Grid 외부 UI에 한하여 사용할 수 있다.

Grid의 핵심 렌더링 및 상태 관리는 직접 구현한다.

---

# 3. 최우선 개발 원칙

ERP Grid는 다음 우선순위를 기준으로 개발한다.

1. 데이터 정확성
2. 키보드 사용성
3. Excel 호환성
4. 편집 안정성
5. 대용량 데이터 처리
6. 확장성
7. UI 커스터마이징

일반적인 웹 테이블처럼 보기 좋은 것보다 ERP 사용자가 빠르게 데이터를 입력하고 수정할 수 있는 것을 우선한다.

---

# 4. 전체 Architecture

권장 구조:

```text
src/
├── components/
│   └── grid/
│       ├── core/
│       │   ├── ERPGrid.tsx
│       │   ├── GridHeader.tsx
│       │   ├── GridBody.tsx
│       │   ├── GridRow.tsx
│       │   ├── GridCell.tsx
│       │   └── GridFooter.tsx
│       │
│       ├── editing/
│       │   ├── CellEditor.tsx
│       │   ├── TextEditor.tsx
│       │   ├── NumberEditor.tsx
│       │   ├── DateEditor.tsx
│       │   ├── SelectEditor.tsx
│       │   └── AutocompleteEditor.tsx
│       │
│       ├── selection/
│       │   └── GridSelection.ts
│       │
│       ├── keyboard/
│       │   └── GridKeyboard.ts
│       │
│       ├── clipboard/
│       │   └── GridClipboard.ts
│       │
│       ├── filter/
│       │   └── GridFilter.ts
│       │
│       ├── sorting/
│       │   └── GridSort.ts
│       │
│       ├── aggregation/
│       │   └── GridAggregation.ts
│       │
│       ├── layout/
│       │   └── GridLayout.ts
│       │
│       ├── pagination/
│       │   └── GridPagination.tsx
│       │
│       ├── export/
│       │   └── GridExcelExport.ts
│       │
│       ├── types/
│       │   └── grid.types.ts
│       │
│       └── utils/
│           └── grid.utils.ts
│
└── features/
    └── ...
```

기능별 책임을 분리한다.

`ERPGrid.tsx` 하나에 모든 기능을 구현하지 않는다.

---

# 5. Grid Column Specification

컬럼은 설정 기반으로 동작해야 한다.

예시:

```typescript
const columns: ERPGridColumn<Item>[] = [
  {
    field: 'itemCode',
    headerName: '품목코드',
    width: 120,
    type: 'autocomplete',
    editable: true,
    required: true,
  },
  {
    field: 'itemName',
    headerName: '품목명',
    width: 200,
    type: 'text',
    editable: false,
  },
  {
    field: 'qty',
    headerName: '수량',
    width: 100,
    type: 'number',
    editable: true,
    align: 'right',
  },
  {
    field: 'price',
    headerName: '단가',
    width: 120,
    type: 'currency',
    editable: true,
    align: 'right',
    aggregate: 'sum',
  },
];
```

기본 타입:

```typescript
type ERPGridColumnType =
  | 'text'
  | 'number'
  | 'decimal'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'time'
  | 'checkbox'
  | 'select'
  | 'autocomplete'
  | 'code'
  | 'button';
```

---

# 6. 기본 Grid 기능

다음 기능을 반드시 지원한다.

## Selection

- Single Row Selection
- Multi Row Selection
- Checkbox Selection
- Select All
- Current Page Select All
- Shift Range Selection
- Ctrl Multi Selection

API:

```typescript
grid.getSelectedRows();
grid.getSelectedRowIds();
grid.clearSelection();
```

---

# 7. Editing

ERP Grid는 기본적으로 인라인 편집을 지원한다.

지원 Editor:

```text
Text
Number
Decimal
Currency
Date
DateTime
Time
Checkbox
Select
Autocomplete
Code Picker
```

셀 편집 시작:

```text
Double Click
Enter
F2
```

셀 편집 종료:

```text
Enter
Tab
Escape
```

---

# 8. Keyboard Navigation

ERP 사용성을 위해 키보드 조작을 우선한다.

필수 단축키:

```text
↑
↓
←
→

Tab
Shift + Tab

Enter
Shift + Enter

Home
End

Ctrl + C
Ctrl + V
Ctrl + X

Ctrl + A

Delete
Backspace

Escape

F2
Insert
```

기본 동작:

```text
Tab
→ 다음 셀

Shift + Tab
→ 이전 셀

Enter
→ 다음 행의 동일 컬럼

Shift + Enter
→ 이전 행의 동일 컬럼

Arrow
→ 셀 이동

F2
→ 셀 편집

Escape
→ 편집 취소
```

브라우저 기본 동작과 충돌하는 경우 Grid가 우선적으로 처리한다.

---

# 9. Excel Clipboard

ERP Grid의 핵심 기능이다.

## Excel → Grid

Excel에서 여러 셀을 복사한 뒤 Grid에서:

```text
Ctrl + V
```

하면 행/열 구조를 유지하여 붙여넣는다.

예:

```text
Excel

A001    제품A    10    10000
A002    제품B    20    20000
A003    제품C    30    30000
```

Grid:

```text
품목코드 | 품목명 | 수량 | 단가
A001     | 제품A  | 10   | 10000
A002     | 제품B  | 20   | 20000
A003     | 제품C  | 30   | 30000
```

## Grid → Excel

선택 영역 또는 선택 행을:

```text
Ctrl + C
```

하여 Excel에 붙여넣을 수 있어야 한다.

---

# 10. Row State

각 Row는 상태를 관리한다.

```typescript
type GridRowState =
  | 'normal'
  | 'inserted'
  | 'updated'
  | 'deleted';
```

예:

```text
NORMAL
INSERTED
UPDATED
DELETED
```

삭제된 Row는 즉시 데이터에서 제거하지 않고 상태를 유지할 수 있어야 한다.

저장 시:

```typescript
{
  insertedRows: [],
  updatedRows: [],
  deletedRows: []
}
```

형태로 쉽게 추출할 수 있어야 한다.

API:

```typescript
grid.getChanges();
```

---

# 11. Row CRUD

필수 API:

```typescript
grid.addRow();
grid.addRows();
grid.deleteSelectedRows();
grid.restoreDeletedRows();
grid.duplicateSelectedRows();
```

단축키:

```text
Insert
→ Row 추가

Delete
→ 선택 Row 삭제

Ctrl + D
→ Row 복제
```

---

# 12. Validation

컬럼별 Validation을 지원한다.

예:

```typescript
{
  field: 'qty',
  headerName: '수량',
  type: 'number',
  required: true,
  min: 1,
  max: 999999,
}
```

또는:

```typescript
{
  field: 'itemCode',
  required: true,
  validate: (value, row) => {
    if (!value) {
      return '품목코드는 필수입니다.';
    }

    return true;
  },
}
```

Validation 실패 시:

- Cell Error 표시
- Error Message 표시
- 저장 차단

---

# 13. Sorting

기본적으로 다음을 지원한다.

```text
Ascending
Descending
None
```

다중 컬럼 정렬을 지원할 수 있도록 설계한다.

예:

```typescript
[
  {
    field: 'department',
    direction: 'asc',
  },
  {
    field: 'itemCode',
    direction: 'asc',
  },
]
```

---

# 14. Filtering

기본 필터:

```text
equals
notEquals
contains
startsWith
endsWith
greaterThan
lessThan
greaterThanOrEqual
lessThanOrEqual
between
isEmpty
isNotEmpty
```

데이터 타입에 따라 적절한 필터 UI를 제공한다.

예:

```text
문자열
→ Contains

숫자
→ >= <= = Between

날짜
→ 날짜 범위

Boolean
→ Yes / No
```

---

# 15. Column Management

사용자가 다음 기능을 사용할 수 있어야 한다.

```text
Column Resize
Column Reorder
Column Hide
Column Show
Column Pin
```

Column Pin:

```text
left
right
none
```

예:

```text
품목코드 ← 고정

품목명
규격
수량
단가
금액

금액 → 고정
```

---

# 16. Grid Layout 저장

ERP에서는 사용자별 Grid 설정을 저장할 수 있어야 한다.

저장 대상:

```text
Column Width
Column Order
Hidden Columns
Pinned Columns
Sort
Filter
Page Size
```

예:

```typescript
{
  gridId: 'PURCHASE_ORDER',
  userId: 'USER001',

  columns: [
    {
      field: 'itemCode',
      width: 120,
      hidden: false,
      order: 0,
      pinned: 'left',
    }
  ],

  pageSize: 50,
}
```

추후 서버 저장을 고려하여 설계한다.

---

# 17. Pagination

서버사이드 Pagination을 기본 구조로 고려한다.

Request:

```typescript
{
  page: 1,
  pageSize: 50,
}
```

Response:

```typescript
{
  rows: [],
  totalCount: 12345,
}
```

지원:

```text
10
20
50
100
200
```

페이지 크기는 설정 가능해야 한다.

---

# 18. Server-side Query

Grid 자체가 API를 호출하도록 강하게 결합하지 않는다.

다음 데이터를 외부에서 주입할 수 있도록 설계한다.

```typescript
{
  page,
  pageSize,
  sort,
  filters
}
```

예:

```typescript
const query = grid.getQuery();

fetchItems(query);
```

Grid는 UI와 상태를 관리하고 API 통신은 Feature/Service Layer가 담당한다.

---

# 19. Aggregation

Footer에서 다음 집계를 지원한다.

```text
SUM
AVG
MIN
MAX
COUNT
```

예:

```typescript
{
  field: 'amount',
  aggregate: 'sum',
}
```

결과:

```text
합계: 12,500,000
```

---

# 20. Grouping

2차 개발 기능으로 설계한다.

지원 예정:

```text
Department
Customer
Supplier
Item
Date
```

예:

```text
▼ 삼성전자
    제품A    10
    제품B    20
    합계     30

▼ LG전자
    제품C    15
    제품D    25
    합계     40
```

---

# 21. Tree Grid

ERP 메뉴, 조직, BOM 등에 사용할 수 있도록 Tree 구조를 확장 가능하게 설계한다.

예:

```text
구매관리
 ├─ 구매요청
 ├─ 발주관리
 │   ├─ 발주등록
 │   └─ 발주조회
 └─ 입고관리
```

Tree Grid는 일반 Grid와 별도의 컴포넌트로 분리하지 않고 Core Grid 위에서 확장 가능하도록 설계한다.

---

# 22. 대용량 데이터

다음 데이터를 고려한다.

```text
10,000 rows
100,000 rows
1,000,000 rows
```

전체 데이터를 DOM에 렌더링하지 않는다.

필요한 경우:

```text
Virtual Scrolling
Server-side Pagination
```

을 사용한다.

특히 Row 수가 증가하더라도 DOM Node가 비정상적으로 증가하지 않도록 한다.

---

# 23. Performance

다음 사항을 반드시 고려한다.

### React Rendering

불필요한 전체 Grid Re-render를 방지한다.

가능하면:

```text
Grid
 ├── Header
 ├── Row 1
 ├── Row 2
 ├── Row 3
```

각 Row/Cell을 독립적으로 최적화한다.

필요한 경우:

```typescript
React.memo
useMemo
useCallback
```

을 사용한다.

단, 무조건 사용하는 것이 아니라 실제 렌더링 비용을 고려한다.

---

# 24. Grid Toolbar

기본 Toolbar:

```text
[조회] [추가] [삭제] [복제] [저장] [엑셀] [컬럼설정]
```

화면별로 버튼을 조합할 수 있도록 한다.

예:

```tsx
<ERPGridToolbar
  buttons={[
    'refresh',
    'add',
    'delete',
    'duplicate',
    'save',
    'excel',
    'columnSettings',
  ]}
/>
```

---

# 25. Grid Context Menu

우클릭 메뉴를 지원한다.

기본 메뉴:

```text
행 추가
행 복제
행 삭제
────────────
복사
붙여넣기
────────────
컬럼 고정
컬럼 숨김
컬럼 설정
────────────
Excel 다운로드
```

화면별 Custom Menu를 추가할 수 있어야 한다.

---

# 26. Status / UI

행 상태를 사용자가 쉽게 구분할 수 있어야 한다.

예:

```text
신규 Row
수정 Row
삭제 Row
Validation Error
Disabled Row
Selected Row
```

단, 특정 색상을 하드코딩하지 않는다.

프로젝트 Theme을 통해 변경 가능하도록 한다.

---

# 27. 접근성

가능한 범위에서 다음을 지원한다.

```text
Keyboard Navigation
Focus Management
ARIA Role
ARIA Label
Screen Reader
```

특히 현재 Focus Cell을 명확하게 관리한다.

---

# 28. TypeScript

any 사용을 최소화한다.

금지:

```typescript
const row: any
```

권장:

```typescript
interface ERPGridRow {
  id: string | number;
  [key: string]: unknown;
}
```

Generic을 적극적으로 사용한다.

```typescript
ERPGrid<T>
ERPGridColumn<T>
```

예:

```tsx
<ERPGrid<Item>
  rows={items}
  columns={columns}
/>
```

---

# 29. Public API

최종적으로 다음과 같은 API를 제공하는 것을 목표로 한다.

```typescript
interface ERPGridRef<T> {

  // Selection
  getSelectedRows(): T[];
  getSelectedRowIds(): Array<string | number>;
  clearSelection(): void;

  // Row
  addRow(row?: Partial<T>): void;
  addRows(rows: Partial<T>[]): void;
  deleteSelectedRows(): void;
  duplicateSelectedRows(): void;

  // Editing
  startEdit(rowId: string | number, field: keyof T): void;
  stopEdit(): void;

  // Data
  getRows(): T[];
  setRows(rows: T[]): void;

  // Change
  getChanges(): GridChanges<T>;
  clearChanges(): void;

  // Query
  getQuery(): GridQuery;

  // Clipboard
  copy(): void;
  paste(): Promise<void>;

  // Layout
  getLayout(): GridLayout;
  setLayout(layout: GridLayout): void;
  resetLayout(): void;

  // Validation
  validate(): boolean;
}
```

---

# 30. Component 사용 예

최종 사용 형태는 다음과 같이 단순해야 한다.

```tsx
const columns: ERPGridColumn<Item>[] = [
  {
    field: 'itemCode',
    headerName: '품목코드',
    width: 120,
    type: 'autocomplete',
    editable: true,
    required: true,
  },
  {
    field: 'itemName',
    headerName: '품목명',
    width: 200,
  },
  {
    field: 'qty',
    headerName: '수량',
    width: 100,
    type: 'number',
    editable: true,
    aggregate: 'sum',
  },
  {
    field: 'price',
    headerName: '단가',
    width: 120,
    type: 'currency',
    editable: true,
    aggregate: 'sum',
  },
];

return (
  <ERPGrid
    gridId="PURCHASE_ORDER"
    rowKey="id"
    columns={columns}
    rows={rows}
    editable
    selectable="multiple"
    pagination
    sortable
    filterable
  />
);
```

화면 개발자는 Grid 내부 구현을 알 필요가 없어야 한다.

---

# 31. 개발 순서

Agent는 모든 기능을 한 번에 구현하지 않는다.

다음 순서대로 개발한다.

## Phase 1 - Core

```text
1. Grid Types
2. Grid Component
3. Column Definition
4. Header
5. Body
6. Row
7. Cell
8. Basic Selection
```

완료 후 테스트한다.

## Phase 2 - Editing

```text
1. Cell Focus
2. Text Editor
3. Number Editor
4. Date Editor
5. Select Editor
6. Inline Editing
7. Row State
8. Validation
```

## Phase 3 - ERP Keyboard

```text
1. Arrow Navigation
2. Tab
3. Enter
4. F2
5. Insert
6. Delete
7. Ctrl+C
8. Ctrl+V
```

## Phase 4 - Excel

```text
1. Clipboard Parser
2. Excel → Grid
3. Grid → Excel
4. Multi Cell Paste
5. Validation on Paste
```

## Phase 5 - Data

```text
1. Sorting
2. Filtering
3. Pagination
4. Server Query
5. Aggregation
```

## Phase 6 - Layout

```text
1. Column Resize
2. Column Reorder
3. Column Hide
4. Column Pin
5. Column Settings
6. Layout Save/Load
```

## Phase 7 - Performance

```text
1. Render Optimization
2. Row Memoization
3. Virtual Scroll
4. Large Dataset Test
```

## Phase 8 - Advanced

```text
1. Grouping
2. Tree Grid
3. Undo/Redo
4. Context Menu
5. Advanced Excel
```

---

# 32. 테스트 기준

각 기능은 구현 후 반드시 테스트한다.

## 기본

```text
Grid 렌더링
Row 렌더링
Column 렌더링
```

## Selection

```text
Single
Multi
Checkbox
Shift
Ctrl
Select All
```

## Editing

```text
Text
Number
Date
Select
Autocomplete
```

## Keyboard

```text
Arrow
Tab
Enter
F2
Insert
Delete
Ctrl+C
Ctrl+V
```

## Excel

```text
1행 붙여넣기
다중행 붙여넣기
다중열 붙여넣기
빈 셀
숫자
날짜
```

## Data

```text
Sorting
Filtering
Pagination
Aggregation
```

## Performance

최소 다음 데이터를 테스트한다.

```text
1,000 rows
10,000 rows
100,000 rows
```

---

# 33. Agent 작업 규칙

Agent는 다음 규칙을 반드시 지킨다.

### Rule 1

기존 프로젝트 구조를 먼저 확인한다.

```text
package.json
tsconfig
vite.config
src/
공통 컴포넌트
Theme
State Management
```

을 확인한 후 구현한다.

### Rule 2

기존 프로젝트에 이미 존재하는 공통 기능을 재사용한다.

중복 구현하지 않는다.

### Rule 3

하나의 파일에 지나치게 많은 코드를 작성하지 않는다.

### Rule 4

기능별로 모듈을 분리한다.

### Rule 5

새로운 라이브러리를 추가하기 전에 반드시 필요성을 검토한다.

### Rule 6

외부 Grid Library를 추가하지 않는다.

### Rule 7

기능 구현 후 테스트를 작성한다.

### Rule 8

기존 ERP 화면에서 사용하는 UX 패턴과 일관성을 유지한다.

### Rule 9

ERP 업무 특성을 고려하지 않은 일반적인 Table UI를 구현하지 않는다.

### Rule 10

성능 최적화는 기능 구현 이후가 아니라 Architecture 단계부터 고려한다.

---

# 34. Definition of Done

기능이 완료되었다고 판단하기 위한 조건:

```text
[ ] TypeScript 오류 없음
[ ] ESLint 오류 없음
[ ] Unit Test 통과
[ ] 기존 Grid 기능 영향 없음
[ ] Keyboard 동작 확인
[ ] Excel Clipboard 확인
[ ] 10,000건 테스트
[ ] 불필요한 Re-render 확인
[ ] API와 독립적인 구조
[ ] 재사용 가능한 Component
[ ] Public API 문서화
```

---

# 35. 최종 목표

최종적으로 ERP 각 화면에서 다음과 같이 사용할 수 있는 Grid를 만든다.

```tsx
<ERPGrid
  gridId="SALES_ORDER"
  columns={columns}
  rows={rows}
  editable
  selectable="multiple"
  filterable
  sortable
  pagination
  onChange={handleChange}
/>
```

그리고 구매, 판매, 생산, 재고, 회계, 인사 등 모든 ERP 화면에서 동일한 Grid를 사용한다.

```text
ERP
│
├── 구매
│   ├── 구매요청
│   ├── 발주
│   └── 입고
│
├── 판매
│   ├── 견적
│   ├── 주문
│   └── 출고
│
├── 생산
│   ├── 작업지시
│   ├── BOM
│   └── 생산실적
│
├── 재고
│   ├── 재고조회
│   └── 재고이동
│
└── 회계
    ├── 전표
    └── 결산
```

모든 화면이 동일한 Grid UX를 사용하도록 한다.

**핵심 목표는 "ERP 개발자가 Grid를 개발하는 것이 아니라, Grid를 조합하여 ERP 화면을 개발하는 구조"를 만드는 것이다.**