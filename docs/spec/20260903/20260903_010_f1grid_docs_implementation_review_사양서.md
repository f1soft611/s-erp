# F1-Grid 문서 포털 구현 정합성 검토 및 보강 상세 사양서

## 1. 문서 콘텐츠 계약

기존 `F1GridDoc`/`DocSection` 구조를 유지한다. 문서 콘텐츠는 현재 포털의 `prose`, `code`, `api`, `related` 블록으로 제공한다. 별도 Markdown 파서나 동적 코드 실행 기능은 추가하지 않는다.

### 문서별 필수 내용

| 문서                       | 필수 반영 내용                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| Overview / Getting Started | `rows`, `columns`, `rowKey`, 기본 렌더링, 기본 컬럼 구조                                  |
| Core Grid                  | 기본 Props, 행 상태, `ariaLabel`, 높이/스크롤, `showCheckbox`, 변경 이벤트                |
| Editing                    | 전체 Editor type, `options`, 검증, 편집 lifecycle, Plugin 계약, `selectOnFocus`           |
| Selection & Clipboard      | 행 선택, 헤더 전체 선택, 셀 범위 드래그, 복사/붙여넣기, Ref 선택 API                      |
| Filtering & Sorting        | 12개 Filter operator, 다중 정렬 상태, 비활성화 옵션, 표시 행 기준 적용                    |
| Column Layout              | width/flex/maxWidth, headerGroup, hidden/pinned, resize/reorder/autofit, storageKey       |
| Row Height                 | rowHeight/min/max/resizableRows, wrapText, 행별 높이 및 키보드 조절                       |
| Row Merge                  | 연속 동일 값, 정렬/필터 후 현재 행 기준, pinned/drag selection/dirty 표시 상호작용        |
| Tree Grid                  | `parentKey`, `treeColumn`, `defaultExpandAll`, `defaultExpanded`, tree checkbox, Tree Ref |
| API Reference              | Props/Column/Tree/Ref/Plugin/Filter/Sort 전체 계약                                        |
| Testing Guide              | Vitest/Playwright 검증 방법과 현재 미지원 기능 경계                                       |

## 2. API Reference 분류 및 정확성

API 표는 다음 그룹으로 나누어 표시한다.

### 2.1 Grid Props

`rows`, `columns`, `rowKey`, `ariaLabel`, `columnLine`, `storageKey`, `height`, `maxHeight`, `rowHeight`, `minRowHeight`, `maxRowHeight`, `resizableRows`, `resizableColumns`, `minColumnWidth`, `showCheckbox`, `createRow`, `createDuplicate`, `editorPlugins`, `editors`, `onBeforeEdit`, `beforeEdit`, `onAfterEdit`, `afterEdit`, `onChangesChange`, `onSelectionChange`, `rowProjection`, `cellAdornment`, `disableSorting`, `disableFiltering`를 현재 계약으로 설명한다.

### 2.2 Column 계약

`field`, `headerName`, `headerGroup`, `getValue`, `onValueChange`, `width`, `flex`, `maxWidth`, `editable`, `type`, `format`, `decimalPlaces`, `options`, `required`, `min`, `max`, `validate`, `onOpenCodePicker`, `align`, `headerAlign`, `wrapText`, `mergeRows`, `headerCheckbox`, `hidden`, `pinned`, `selectOnFocus`, `syncWithTreeCheckbox`를 설명한다.

`headerCheckbox`는 Grid Props가 아니라 `type: 'checkbox'` 데이터 컬럼의 옵션으로 표기한다. `showCheckbox`는 행 선택 컬럼, `treeCheckbox`는 Tree 노드 선택으로 별도 설명한다.

### 2.3 Tree/Ref/Plugin 계약

Tree Props의 `parentKey`, `treeColumn`, `treeCheckbox`, `defaultExpandAll`, `defaultExpanded`, `getRowOrder`, `onDeleteBlocked`, `onTreeCheckboxChange`와 Tree Ref의 `addChildRow`, `expandRow`, `collapseRow`, `expandAll`, `collapseAll`, `isExpanded`를 문서화한다.

Grid Ref의 선택, 행 CRUD, 변경 추출, 검증, 편집, 셀 값 설정 메서드와 `F1GridChanges`의 세 상태 배열을 설명한다.

Editor Plugin은 `id`, `name`, `enabled`, `canEdit`, `createEditor`, `startEdit`, `endEdit` 및 편집 context를 설명한다. `editorPlugins`와 호환 별칭 `editors`의 관계를 명시한다.

### 2.4 Filter/Sort 계약

Filter operator는 `equals`, `notEquals`, `contains`, `startsWith`, `endsWith`, `greaterThan`, `lessThan`, `greaterThanOrEqual`, `lessThanOrEqual`, `between`, `isEmpty`, `isNotEmpty`를 모두 표기한다. Sort는 `field`와 `asc`/`desc` 방향의 배열 상태로 설명한다.

## 3. Playground 사양

- `selection`: 행 체크박스, 선택 변경 상태를 제공한다.
- `editing`: 실제 editable 컬럼과 Plugin 경로를 사용한다.
- `row-height`: `rowHeight`, `minRowHeight`, `maxRowHeight`, `resizableRows`, `wrapText`를 사용한다.
- `layout`: 컬럼 숨김/표시, 고정, 리사이즈 등 현재 구현된 조작만 제공한다.
- `row-merge`: 연속 동일 값과 pinned 컬럼 병합 표시를 제공한다.
- `tree`: `parentId`, `id`, `name` 계층 데이터로 `F1Tree`를 렌더링하며 `defaultExpandAll` 또는 `defaultExpanded` 동작을 설명한다.

문서용 샘플은 서버 API에 의존하지 않는다. 현재 구현하지 않은 pagination, aggregation, virtualization, Excel Export를 Playground에 추가하지 않는다.

## 4. 가이드 정합성 규칙

- 실제 `frontend/src/shared/components/f1-grid/types/grid.types.ts`에 없는 Props/Column/Ref API는 현재 지원 목록에서 제거한다.
- 설계 문서에만 존재하는 기능은 `향후 계획` 영역으로 옮기고, 현재 사용 예시와 섞지 않는다.
- `mergeRows`는 현재 구현의 boolean 계약에 맞춘다. `mergeKey`, `mergeWhen`, `enableRowMerge`, merge 전용 public Ref 메서드는 구현되지 않은 계획 항목으로 명시한다.
- `addRows`, 서버사이드 pagination/query, aggregation, virtualization, Excel Export는 현재 API로 예시를 제공하지 않는다.

## 5. 반응형 UI 기준

문서 포털의 기존 구조와 스타일을 유지하면서 다음을 검증한다.

- 1280px: 사이드바와 본문, Playground controls/Grid가 안정적으로 배치된다.
- 768px: 문서 메뉴와 Playground가 좁은 폭에 맞게 줄어들며 본문 전체에 불필요한 가로 스크롤이 생기지 않는다.
- 375px: 헤더·문서 제목·API 표·Grid가 겹치거나 잘리지 않는다. Grid 내부에 필요한 경우에만 내부 스크롤을 사용한다.
- 코드 블록, 표, 버튼, Grid 셀의 텍스트가 부모 영역 밖으로 넘치지 않는다.

## 6. 테스트 및 결과 기준

Vitest는 문서 목록과 주요 계약 문자열, 문서 전환, Tree 샘플, Editing/Row Height Playground, 코드 복사 상태를 검증한다. 기존 `f1-grid.test.tsx`는 문서 작업으로 공용 Grid 동작이 변하지 않았음을 회귀 확인한다.

Playwright는 공개 `/f1-grid-docs`에서 문서 전환과 주요 Playground 표시를 확인하고 1280px/768px/375px 스크린샷을 `docs/result/20260903/f1grid-docs-implementation-review/screenshots/`에 저장한다.

## 7. 예외 및 제한사항

- 문서 포털은 임의의 TypeScript 코드를 실행하지 않는다.
- 샘플 데이터는 로컬 정적 데이터이며 실제 업무 데이터나 백엔드 API를 조회하지 않는다.
- 문서와 실제 소스 계약이 다시 달라질 경우, 구현을 추측해 문서화하지 않고 타입/동작을 기준으로 문서를 갱신한다.
