# F1-Grid 개발자 문서 포털 전면 개편 상세 사양서

## 1. 문서 기준

- 작업지시서: [20261014_002_f1_grid_docs_overhaul_작업지시서.md](../../directions/20261014/20261014_002_f1_grid_docs_overhaul_작업지시서.md)
- 구현 계획: [20261014_002_f1_grid_docs_overhaul_계획서.md](../../plan/20261014/20261014_002_f1_grid_docs_overhaul_계획서.md)
- 승인된 설계: [2026-10-14-f1-grid-docs-overhaul-design.md](../../superpowers/specs/2026-10-14-f1-grid-docs-overhaul-design.md)

이 작업은 React 문서 포털만 변경한다. F1-Grid 런타임, 백엔드, DB 계약은 변경하지 않는다. 공개 API 표기는 `frontend/src/shared/components/f1-grid/index.ts`에서 컴포넌트에 직접 연결되는 타입 정의를 기준으로 하며, 기본값과 동작은 컴포넌트 구현 및 테스트로 확인한다. `index.ts`가 export하는 저수준 내부 유틸리티는 사용자 공개 API와 혼동되지 않게 제외한다.

## 2. 정보 구조와 콘텐츠 배치

좌측 문서 메뉴는 다음 순서의 기능 그룹으로 구성한다.

| 순서 | 메뉴 그룹 | 포함할 문서 |
|---|---|---|
| 1 | 시작하기 | 개요, 첫 그리드 만들기 |
| 2 | 그리드와 데이터 | 기본 그리드, 행 데이터/상태, 서버 데이터 소스 |
| 3 | 편집과 검증 | 셀 편집기, 검증, 변경 상태 |
| 4 | 선택·클립보드·행 작업 | 행/셀 선택, 붙여넣기, 컨텍스트 메뉴, 행 추가·복제·삭제, 내보내기 |
| 5 | 필터와 정렬 | 필터 연산자, 헤더 메뉴, 정렬 상태 |
| 6 | 컬럼·레이아웃·행 높이 | 너비, flex, 순서, 숨김, 고정, 저장, 행 높이 |
| 7 | 대용량 데이터 | 행/컬럼 가상화, 로컬 query worker, data source |
| 8 | 트리 그리드 | 부모-자식 데이터, 초기 펼침, 체크박스, 삭제 제약, 트리 ref |
| 9 | 행 병합 | `mergeRows`, 병합과 선택/고정 컬럼 상호작용 |
| 10 | 플러그인과 확장 | 편집기 플러그인, 행 폼 플러그인, 셀 렌더 훅/장식 |
| 11 | API 참조 | Grid props, Column, Tree props, refs, 공유 타입/콜백 |
| 12 | 테스트 | 사용자가 그리드 사용 화면에서 테스트하는 방법 |

기존 문서 ID와 기능별 Playground를 유지하면서 각 문서를 이 그룹에 배정한다. 기존 문서로 설명되지 않은 공개 기능은 해당 기능 문서에 추가하거나 새 기능 문서를 추가한다. 메뉴 그룹명과 일반 설명은 한국어 중심으로 작성하며 코드와 API 식별자는 영문 원문을 유지한다.

## 3. 탐색 및 페이지 동작

### 3.1 검색

검색은 대소문자를 구분하지 않고 공백을 trim한 문자열을 기준으로 다음 내용을 대상으로 한다.

- 문서 제목, 메뉴 그룹, 설명
- 섹션 제목과 설명
- API 속성/메서드/타입 식별자, 타입/시그니처, 설명, 기본값

문서 검색 결과를 선택하면 해당 문서를 표시한다. API 식별자 검색 결과는 API 참조 문서의 일치 항목으로 이동하고 항목의 앵커를 활성화한다. 결과가 없으면 접근 가능한 빈 상태를 표시한다. 기존 검색어 별칭은 한국어 레이블을 위한 보조 검색어로 유지한다.

### 3.2 앵커와 목차

- 각 문서 섹션 제목에는 새로고침 후에도 유지되는 id를 지정한다.
- 각 API 행 id는 계약 섹션과 항목 식별자를 조합해 같은 이름의 속성이 서로 다른 타입에 있어도 충돌하지 않게 한다.
- 오른쪽 섹션 목차는 현재 문서의 섹션을 표시하고 해당 위치로 이동한다.
- API 기능 설명의 참조 링크는 대응 API 행의 앵커로 이동한다.

### 3.3 화면과 반응형

- 데스크톱(1280px): 좌측 그룹 메뉴, 중앙 문서/예제, 우측 섹션 목차의 3열 구조.
- 태블릿(768px): 문서가 읽을 수 있는 폭을 확보하고 우측 목차를 접을 수 있게 한다. 메뉴가 본문을 덮거나 수평으로 밀어내지 않는다.
- 모바일(375px): 메뉴는 버튼으로 여닫는 탐색 패널, 목차는 접을 수 있는 인페이지 목록으로 제공한다. 넓은 API 표와 Playground는 해당 영역 안에서만 스크롤하고 페이지 전체 가로 overflow를 만들지 않는다.
- 기존 `/f1-grid-docs` URL과 대시보드 내부 컴포넌트 사용을 유지한다.
- 현재 설정 컨텍스트의 라이트/다크 모드를 유지하며 메뉴, 문서, 표, 코드, 목차, Playground 모두 같은 테마를 따른다.
- 코드 블록 복사 버튼은 기존 클립보드 처리 및 복사 성공 표시를 유지한다.
- Playground는 로컬 고정 예제 행만 사용하며 임의 코드를 실행하거나 백엔드를 호출하지 않는다.

## 4. 문서 데이터와 API 표 형식

`F1GridDoc`에 위 메뉴 그룹을 식별하는 좁은 union 타입을 추가한다. API 행 데이터는 기존 세 항목(이름, 타입, 설명)을 보존하면서 기본값 필드를 추가할 수 있도록 확장한다. API 표는 `이름`, `타입/시그니처`, `기본값`, `설명·제약`을 표시한다. 기본값을 지정하지 않는 옵션은 “없음/미지정”으로, 데이터 수나 화면 상황에 따라 달라지는 값은 “자동”과 조건으로 설명한다. 확인하지 않은 기본값을 추정하지 않는다.

기능 설명에는 해당 기능의 용도, 상호작용, 경계 조건, 연관 옵션을 설명한다. 연관 옵션의 완전한 계약은 API 참조의 항목 앵커와 연결한다. 각 기능 페이지는 기존과 같이 타입이 지정된 코드 예제 및 해당 시 실행형 Playground를 포함한다.

## 5. 공개 API 완전성 목록

### 5.1 `F1GridProps`

아래 이름을 개별적으로 참조할 수 있어야 하며 단일 행에 묶어 검색 불가능하게 만들지 않는다.

`rows`, `dataSource`, `onDataSourceError`, `columns`, `rowKey`, `rowFormPlugin`, `ariaLabel`, `columnLine`, `stripeRows`, `storageKey`, `height`, `minHeight`, `maxHeight`, `rowHeight`, `minRowHeight`, `maxRowHeight`, `resizableRows`, `resizableColumns`, `minColumnWidth`, `virtualizeRows`, `virtualizeColumns`, `rowOverscan`, `columnOverscan`, `fixedRowHeightThreshold`, `queryWorkerThreshold`, `disableQueryWorker`, `showCheckbox`, `createRow`, `createDuplicate`, `editorPlugins`, `editors`, `onBeforeEdit`, `beforeEdit`, `onAfterEdit`, `afterEdit`, `onChangesChange`, `onSelectionChange`, `initialSelectedRowIds`, `rowProjection`, `cellAdornment`, `disableSorting`, `disableFiltering`, `canExportExcel`, `excelFileName`, `allowAddRootInContextMenu`, `allowAddRowInContextMenu`, `allowDuplicateRowInContextMenu`, `allowDeleteRowInContextMenu`, `deleteMenuDisabled`, `loading`, `treeContextMenu`.

### 5.2 `F1GridColumn<T>`

`field`, `headerName`, `headerGroup`, `form`, `search`, `getValue`, `onValueChange`, `width`, `flex`, `maxWidth`, `editable`, `type`, `format`, `decimalPlaces`, `options`, `userOptions`, `selectOptionIcon`, `required`, `min`, `max`, `validate`, `onOpenCodePicker`, `renderCell`, `getCellStyle`, `getCellProps`, `align`, `headerAlign`, `wrapText`, `mergeRows`, `headerCheckbox`, `hidden`, `pinned`, `selectOnFocus`, `syncWithTreeCheckbox`.

### 5.3 `F1TreeProps<T>` unique members

기반 `F1GridProps<T>` 항목도 적용됨을 명시하고, 다음 트리 전용 항목을 각각 설명한다.

`parentKey`, `treeColumn`, `treeCheckbox`, `defaultExpandAll`, `defaultExpanded`, `getRowOrder`, `onDeleteBlocked`, `onTreeCheckboxChange`, `isDeleteDisabled`.

### 5.4 Ref 계약

`F1GridRef<T>`:

`getSelectedRows`, `getSelectedRowIds`, `clearSelection`, `setSelectedRowIds`, `addRow`, `deleteSelectedRows`, `restoreDeletedRows`, `duplicateSelectedRows`, `getRows`, `getActiveRows`, `getChanges`, `validate`, `startEdit`, `stopEdit`, `setCellValue`.

`F1TreeRef<T>`는 위 Grid ref 계약을 상속하며 다음을 추가한다:

`addChildRow`, `expandRow`, `collapseRow`, `expandAll`, `collapseAll`, `isExpanded`.

### 5.5 공유 타입, 중첩 옵션, 리터럴 값

다음 타입과 멤버를 참조에서 설명한다.

- 기본 타입: `F1GridRowId`, `F1GridRowState`, `F1GridEditorType`, `F1GridDraftValue`, `F1GridNumberFormat`, `F1GridFormMode`, `F1GridPinSide`.
- 컬럼 입력: `F1GridOption`, `F1GridUserOption`, `F1GridColumnFormOptions<T>`, `F1GridColumnSearchOptions`.
- 편집/렌더링: `F1GridEditContext<T>`, `F1GridCellRenderContext<T>`, `F1GridCellProps`, `F1GridEditLifecycle<T>`, `F1GridEditorPlugin<T>`.
- 폼: `F1GridRowFormContext<T>`, `F1GridRowFormApplyContext<T>`, `F1GridRowFormPlugin<T>`.
- 변경/조회: `F1GridChanges<T>`, `F1GridSortDirection`, `F1GridSort<T>`, `F1GridFilterOperator`, `F1GridFilter<T>`, `F1GridRowProjection<T>`, `F1GridDataSourceQuery<T>`, `F1GridDataSourceResult<T>`, `F1GridDataSource<T>`, `F1GridContextMenuTreeConfig`.

중첩 계약은 타입 정의와 대조하여 빠짐없이 다룬다. 최소한 Form/Search 필드, option/user option 필드, 편집/렌더 콜백 context, row-form/plugin 계약, sort/filter 객체, change set, projection, data source의 `pageSize`/`load` 및 query/result 필드를 포함한다.

리터럴 유니언의 실제 구성원도 명시한다: `F1GridRowState`는 `normal | inserted | updated | deleted`; `F1GridEditorType`은 `text | number | decimal | currency | checkbox | date | datetime | time | select | autocomplete | user | code | rownumber`; `F1GridNumberFormat`은 `number | decimal | currency`; `F1GridFormMode`는 `create | edit`; `F1GridSortDirection`은 `asc | desc`; `F1GridPinSide`는 `left | right`; `F1GridFilterOperator`는 `equals | notEquals | contains | startsWith | endsWith | greaterThan | lessThan | greaterThanOrEqual | lessThanOrEqual | between | isEmpty | isNotEmpty`.

## 6. 기본값 및 주요 동작 명세

문서에 기입할 기본값은 구현에서 최종 확인한다. 현재 확인된 Grid 기본값은 아래와 같으며 구현에서 바뀐 것이 확인되면 코드가 기준이다.

- `rows=[]`, `ariaLabel='F1-GRID'`, `columnLine=true`, `stripeRows=true`.
- `rowHeight=32`, `minRowHeight=32`, `maxRowHeight=300`, `resizableRows=true`, `resizableColumns=true`, `minColumnWidth=50`.
- `rowOverscan=4`, `columnOverscan=2`, `fixedRowHeightThreshold=10000`, `queryWorkerThreshold=10000`, `disableQueryWorker=false`.
- `virtualizeRows`는 미지정 시 표시 행 수가 200 이상일 때 켜진다. `virtualizeColumns`는 미지정 시 표시 컬럼 수가 12 이상이고 계산된 전체 컬럼 너비가 viewport보다 클 때 켜진다. 지정한 boolean은 자동 결정에 우선한다.
- `showCheckbox=true`, `disableSorting=false`, `disableFiltering=false`, `canExportExcel=false`, `allowAddRootInContextMenu=true`, `allowAddRowInContextMenu=true`, `allowDuplicateRowInContextMenu=true`, `allowDeleteRowInContextMenu=true`, `deleteMenuDisabled=false`, `loading=false`.
- `storageKey` 미지정 시 컬럼 설정을 저장하지 않는다. `height`, `minHeight`, `maxHeight`와 `excelFileName`은 호출자가 지정하지 않으면 해당 제한/이름을 강제하지 않는다. `F1GridDataSource.pageSize`는 기본 200이다.
- Grid 컬럼에서 `type` 미지정 시 text editor로 처리된다. `editable` 미지정 시 checkbox 외의 컬럼은 편집 불가이고 checkbox 컬럼은 편집 가능하다. `rownumber`는 편집 불가다. `selectOnFocus` 기본은 `true`; `headerCheckbox`는 설정하지 않으면 헤더 전체 선택이 표시되지 않는다. `hidden`과 `pinned`는 별도 값이 없으면 표시/비고정이다. 너비 기본 정책은 고정 폭 컬럼 140px이며 `flex`가 설정되면 잔여 폭을 분배한다. 일반 숫자 표시는 `decimalPlaces`가 없으면 최소 0·최대 3자리다. `format='currency'`를 지정하면 KRW 통화 표시가 적용되고 기본 자릿수는 0이다. 통화 편집기 유형만 지정하고 `format`을 생략한 경우 표시 문자열에 KRW 통화 기호를 덧붙이지 않는다.
- 컬럼 폼의 `span`은 기본 1이며 `form.multiple`은 기본 false다. 편집기 플러그인의 `enabled`와 행 폼 플러그인의 `enabled`는 명시적으로 false가 아닌 한 활성이다. 초기 정렬/필터 상태는 비어 있다.
- `F1Tree`: `treeCheckbox=false`, `defaultExpanded='all'`. `defaultExpandAll=true`는 이후 데이터에 새 parent가 생기는 경우도 전체 확장 상태를 보충한다. Tree는 기본 Grid 정렬/필터를 비활성화한다.

API별 설명은 다음 차이를 분명히 한다.

- `showCheckbox`는 행 선택 열, `headerCheckbox`는 checkbox 데이터 컬럼의 헤더 전체 선택, `treeCheckbox`는 계층 노드 및 하위 노드 체크다.
- `editorPlugins`가 있으면 `editors`보다 우선하고, legacy 편집 lifecycle `beforeEdit`/`afterEdit`는 해당 `onBeforeEdit`/`onAfterEdit`이 없을 때 호환 별칭으로 적용된다.
- `rowFormPlugin.enabled`가 `false`면 폼 모달 대신 기존 인라인 편집/행 추가 흐름을 유지한다.
- `dataSource.load`는 `offset`, `limit`, `sorts`, `filters`, `signal`을 받고 `rows`, `totalRowCount`를 반환한다. `pageSize` 미지정 시 `limit=200`이다. `onDataSourceError`와 취소/최신 요청 처리는 구현 동작에 맞게 설명한다.
- `F1GridColumn.form`의 `multiple`은 `user` 편집과 행 폼 필드 다중 선택에 적용된다. `syncWithTreeCheckbox=false`만 해당 checkbox 컬럼을 트리 체크와 동기화하지 않는다.
- `wrapText=true`는 행 높이가 기본 행 높이보다 큰 경우에 줄바꿈한다. 그 외 기본 표시 셀은 한 줄 말줄임표다.
- 행 높이 조절, dirty/change 추적, clipboard 및 편집 commit, 병합된 셀과 pinned 컬럼, 가상화는 현재 테스트와 구현이 확인하는 경계 안에서 설명한다.

## 7. 회귀 및 완료 검증

### 자동 테스트

`frontend/tests/f1-grid-docs.test.tsx`에서 다음을 검증한다.

1. 공개 API의 모든 component props, column options, tree options, ref methods, 관련 public type identifiers가 API 참조에 존재한다.
2. nested contract 필드 및 literal union 값이 누락되지 않는다.
3. 메뉴 그룹이 승인 순서로 보이고 문서가 올바른 그룹에 배정된다.
4. API 이름으로 검색할 수 있고 결과가 정확한 API 행 anchor로 이동한다.
5. 문서 섹션 목차와 stable anchors가 동작한다.
6. 코드 복사 및 편집, row form, tree, merge, row-height, large-data, context-menu Playground 회귀 테스트가 통과한다.

실행 명령:

```powershell
Set-Location frontend
npm run test -- tests/f1-grid-docs.test.tsx
npm run build
```

### 브라우저 검증

`http://127.0.0.1:4173`의 기존 S-ERP 서버를 확인한 뒤 재사용한다. 375px, 768px, 1280px에서 문서 전환, API 검색/앵커, Playground, 페이지 수평 overflow를 확인한다. 두 테마 모두 같은 주요 화면을 점검한다. 서버가 다른 서비스이거나 판별할 수 없으면 새 포트를 임의로 사용하지 않는다.

결과 문서 및 데스크톱/모바일 스크린샷은 `docs/result/20261014/f1-grid-docs-overhaul/` 아래에 저장한다. 변경 코드 및 문서 외에 현재 존재하는 사용자 변경은 수정하거나 포함하지 않는다.

## 8. 제외 범위

- F1-Grid engine, 다른 기능 페이지, 공유 전역 레이아웃의 무관한 수정
- API 경로, 백엔드, 데이터베이스, PostgreSQL 조회
- 새 외부 라이브러리, 임의 코드 실행기, 서버 연결 Playground
- 저수준 exported utility/engine 내부 함수의 사용자 문서화
