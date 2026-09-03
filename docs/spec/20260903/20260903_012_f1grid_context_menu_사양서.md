# 상세 사양서

## 관련 문서

- 작업지시서: [20260903*012_f1grid_context_menu*작업지시서.md](../../directions/20260903/20260903_012_f1grid_context_menu_작업지시서.md)
- 계획서: [20260903*012_f1grid_context_menu*계획서.md](../../plan/20260903/20260903_012_f1grid_context_menu_계획서.md)

## 1. UI 구성

### 1.1 트리거

- F1-Grid 바디 영역(체크박스 열, 데이터 셀 영역, 빈 여백 포함) 우클릭 시 브라우저 기본 컨텍스트 메뉴를 막고(`event.preventDefault()`) 커서 위치(`clientX`, `clientY`)에 MUI `Menu`(`anchorReference="anchorPosition"`)를 연다.
- 헤더 영역(`GridHeader`) 우클릭은 이번 신규 메뉴 대상에서 제외하며, 기존 헤더 클릭 메뉴(정렬/필터/고정/숨김) 동작을 그대로 유지한다.
- 우클릭한 지점이 특정 데이터 행 위였다면 해당 행의 rowId를 "컨텍스트 대상 행"으로 기억한다. 빈 여백(행이 없는 영역) 우클릭 시 대상 행은 없음(`undefined`)으로 처리한다.
- 메뉴가 열려 있는 동안 다른 곳을 클릭하거나 `Escape`를 누르면 닫힌다(MUI `Menu` 기본 동작).

### 1.2 메뉴 항목 순서 및 구분선

일반 F1Grid(트리 아님):

```text
엑셀 내보내기            (canExportExcel=true 일 때만 표시)
컬럼 길이 자동 조정
──────────────
행 추가
행 복사                  (선택/대상 행이 없으면 비활성화)
행 삭제                  (선택/대상 행이 없으면 비활성화)
──────────────
필터 해제                (적용된 필터가 없으면 비활성화)
정렬 해제                (적용된 정렬이 없으면 비활성화)
──────────────
설정을 기본값으로 복원
```

F1Tree(트리 그리드):

```text
엑셀 내보내기            (canExportExcel=true 일 때만 표시)
컬럼 길이 자동 조정
──────────────
루트 추가
행 추가
행 복사                  (선택/대상 행이 없으면 비활성화)
행 삭제                  (선택/대상 행이 없으면 비활성화)
──────────────
필터 해제                (적용된 필터가 없으면 비활성화)
정렬 해제                (적용된 정렬이 없으면 비활성화)
──────────────
설정을 기본값으로 복원
```

- "그룹 해제"는 이번 범위에서 제외한다(F1-Grid 미구현 기능).
- 필터 해제/정렬 해제 항목은 그리드의 `disableFiltering`/`disableSorting`이 각각 `true`이면 표시하지 않는다. `F1Tree`는 트리 계층 구조를 유지하기 위해 항상 `disableSorting`/`disableFiltering`을 `true`로 강제하는 기존 구현을 그대로 유지하므로, 실제로는 F1Tree 컨텍스트 메뉴에 필터 해제/정렬 해제 항목이 표시되지 않는다(일반 F1Grid에서만 표시).
- 각 메뉴 항목의 접근성 라벨(`aria-label` 또는 텍스트)은 화면에 보이는 한글 텍스트와 동일하게 노출해 테스트에서 `getByRole('menuitem', { name: '...' })`로 조회 가능해야 한다.

## 2. Props / 타입 계약

### 2.1 `grid.types.ts` 변경

```typescript
export type F1GridProps<T extends object> = {
  // ...기존 필드 유지
  canExportExcel?: boolean;
  excelFileName?: string;
};

export type F1GridContextMenuTreeConfig = {
  onAddRoot: () => void;
  onAddChild: (targetRowId?: F1GridRowId) => void;
};
```

- `F1GridProps`에 `treeContextMenu?: F1GridContextMenuTreeConfig`를 추가하되, 공개 문서(F1-GRID.md)에는 "내부적으로 `F1Tree`가 주입하는 값이며 `F1Grid`를 직접 사용하는 화면에서는 지정하지 않는다"고 명시한다.
- `canExportExcel` 기본값은 `false`(미지정 시 엑셀 메뉴 숨김).
- `excelFileName` 기본값은 `${ariaLabel ?? 'f1-grid'}-export`로 하고 확장자 `.xlsx`는 내보내기 유틸에서 자동으로 붙인다.

### 2.2 `F1TreeProps` / `F1Tree.tsx`

- `F1TreeProps`는 `F1GridProps`를 상속하므로 `canExportExcel`, `excelFileName`을 그대로 사용할 수 있다.
- `F1Tree` 내부에서 `F1Grid`에 전달할 `treeContextMenu`를 다음과 같이 구성한다.

```typescript
const treeContextMenu: F1GridContextMenuTreeConfig = {
  onAddRoot: () => gridRef.current?.addRow(),
  onAddChild: (targetRowId) => {
    if (targetRowId === undefined) {
      gridRef.current?.addRow();
      return;
    }
    gridRef.current?.addRow({ [parentKey]: targetRowId } as Partial<T>);
  },
};
```

## 3. 동작 상세

### 3.1 엑셀 내보내기

- `canExportExcel !== true`이면 메뉴 항목을 렌더링하지 않는다(비활성화가 아니라 미표시).
- 클릭 시 `export/GridExcelExport.ts`의 `exportGridRowsToExcel(visibleColumns, visibleRows, fileName)`을 호출한다.
  - `visibleColumns`: 현재 숨김 처리되지 않고 순서/고정이 반영된 컬럼 목록(헤더명 기준으로 열 제목 구성).
  - `visibleRows`: 현재 필터/정렬이 반영된 행 목록(화면에 보이는 순서 그대로).
  - 각 셀 값은 `column.getValue?.(row) ?? row[column.field]`를 우선 사용하고, 필요한 표시 포맷은 `getCellDisplayValue` 유틸을 재사용해 화면 표시값과 최대한 일치시킨다.
  - 파일명은 `${excelFileName ?? defaultFileName}.xlsx`, 시트명은 `Sheet1` 또는 `ariaLabel`을 정리한 값을 사용한다.
- npm `xlsx`(SheetJS)는 High 심각도 Prototype Pollution/ReDoS 취약점이 미패치 상태라 채택하지 않고, `exceljs`의 `Workbook`/`addWorksheet`/`xlsx.writeBuffer()` API로 워크북을 만든 뒤 `Blob` + 익명 `<a download>` 링크로 브라우저에서 즉시 다운로드한다.
- 번들 크기 영향을 줄이기 위해 `exceljs`는 클릭 시점에 `await import('exceljs')`로 동적 로딩한다.

### 3.2 컬럼 길이 자동 조정

- `visibleColumns` 전체를 순회하며 `getAutoFitColumnWidth(column, activeRows 또는 visibleRows, { minWidth: minColumnWidth })`로 계산한 폭을 `setColumnWidths`에 일괄 반영한다.
- 계산 대상 행은 현재 필터가 적용된 상태라면 필터 반영된 `visibleRows` 기준으로 계산한다(화면에 보이는 데이터 기준 자동 맞춤).

### 3.3 루트 추가 (Tree 전용)

- `treeContextMenu`가 존재할 때만 메뉴 항목이 보인다.
- 클릭 시 `treeContextMenu.onAddRoot()`를 호출한다. 우클릭 위치(대상 행)와 무관하게 항상 루트 추가로 동작한다.

### 3.4 행 추가

- `treeContextMenu`가 있으면: `treeContextMenu.onAddChild(contextRowId)` 호출.
  - `contextRowId`가 특정 행이면 해당 행의 자식으로 추가된다(부모 필드가 자동 설정됨).
  - `contextRowId`가 없으면(빈 영역 우클릭) 루트로 추가된다.
- `treeContextMenu`가 없으면(일반 F1Grid): 우클릭 대상과 무관하게 `handleAddRow()`(기존 `addRow()` 동작)를 호출한다.
- 신규 행 추가 후 방금 추가된 행이 편집 가능한 상태(기존 `addRow` 동작과 동일)로 남는다. 별도 자동 포커스/스크롤 변경은 추가하지 않는다.

### 3.5 행 복사 / 행 삭제

- 컨텍스트 대상 행(`contextRowId`)이 있고 현재 선택된 행 목록(`selectedIds`)에 포함되어 있지 않으면, 메뉴를 열기 직전에 선택 상태를 해당 행 하나로 교체한다(`setSelectedIds([contextRowId])`).
- 컨텍스트 대상 행이 이미 다중 선택에 포함되어 있으면 기존 선택 목록을 그대로 유지한다(다중 행에 대해 복사/삭제 수행).
- 컨텍스트 대상 행이 없고(선택도 없음) 빈 영역 우클릭인 경우, "행 복사"/"행 삭제" 항목은 비활성화(disabled) 상태로 표시한다.
- 클릭 시 각각 기존 `duplicateSelectedRows()` / `deleteSelectedRows()`(F1Grid 내부 핸들러, F1Tree의 경우 하위 행 차단 로직 포함)를 호출한다.

### 3.6 필터 해제 / 정렬 해제

- 필터 해제: `filterState.length === 0`이면 비활성화, 클릭 시 `setFilterState([])`.
- 정렬 해제: `sortState.length === 0`이면 비활성화, 클릭 시 `setSortState([])`.
- `disableFiltering`/`disableSorting` prop이 각각 `true`인 그리드에서는 해당 항목 자체를 표시하지 않는다.

### 3.7 설정을 기본값으로 복원

- 클릭 시 다음을 수행한다.
  1. `columnOrder`를 `columns.map(c => String(c.field))`로 재설정.
  2. `columnWidths`를 `{}`로 재설정.
  3. `hiddenColumnFields`를 컬럼 정의의 `hidden: true` 기준 초기 Set으로 재설정.
  4. `pinnedFields`를 컬럼 정의의 `pinned` 기준 초기 Map으로 재설정.
  5. `storageKey`가 있으면 `window.localStorage.removeItem(storageKey)` 호출(이후 상태 변경 effect가 기본값을 다시 기록).
- 필터/정렬 상태는 이 항목의 대상이 아니며(별도 항목으로 분리되어 있으므로) 초기화하지 않는다.

## 4. 권한 연동 (메뉴관리 화면 예시)

- `MenuManagementPanel.tsx`는 상위에서 전달받는 `permissionCodes`(또는 동일 계열의 EXCEL 권한 boolean)를 `F1Tree`의 `canExportExcel`에 연결한다.
- 권한이 없는 경우 컨텍스트 메뉴에 엑셀 항목이 아예 보이지 않아야 한다(자동화 테스트로 검증).

## 5. 메뉴관리 화면 툴바 정리

- `MenuManagementPanel.tsx`의 "메뉴 업무 액션" 툴바(`role="toolbar" aria-label="메뉴 업무 액션"`)에서 `루트 메뉴 추가`, `하위 메뉴 추가` `Button` 2개를 제거한다.
- `addChildMenu` 함수와 관련 미사용 아이콘 import(`AddIcon`, `PlaylistAddIcon`)는 다른 곳에서 사용되지 않으면 함께 제거한다.
- `hasSelectedTreeRow` state는 다른 UI(예: 삭제 버튼 활성화 등)에서 계속 쓰이는지 확인 후, 쓰이지 않으면 제거하고 쓰이면 유지한다.
- "메뉴 그리드 제어" 툴바(펼치기/접기)는 그대로 유지한다.
- 결과적으로 루트/하위 메뉴 추가는 그리드 우클릭 컨텍스트 메뉴(`루트 추가`, `행 추가`)로만 수행한다.

## 6. 예외/에지 케이스

- 편집 중인 셀이 있을 때 우클릭하면, 기존 편집을 커밋(또는 취소)한 뒤 컨텍스트 메뉴를 연다(기존 셀 포커스 이동/편집 종료 로직 재사용).
- 컨텍스트 메뉴가 열려 있는 상태에서 그리드 `rows` props가 변경되면 메뉴를 닫는다(참조하던 rowId가 사라지는 문제 방지). `columns`는 화면단에서 매 렌더마다 새 배열로 생성되는 경우가 많아 의존성에 포함하지 않는다(포함 시 메뉴가 열리자마자 닫히는 회귀가 발생한다).
- `exceljs` 동적 로딩/워크북 생성 실패(네트워크 오류 등) 시 콘솔 오류를 남기고 사용자에게 알리는 최소한의 실패 처리(예: `window.alert` 대신 콘솔 로그 + 상위 콜백이 있다면 호출)만 수행한다. 별도의 토스트 알림 시스템을 새로 만들지 않는다.

## 7. 테스트 항목 (Vitest, RTL)

- 바디 우클릭 시 메뉴가 열리고, 헤더 우클릭 시에는 열리지 않는다.
- `canExportExcel` 미지정/`false`일 때 엑셀 항목이 없고, `true`일 때 있다.
- 트리가 아닌 F1Grid에는 `루트 추가` 항목이 없고, F1Tree에는 있다.
- 특정 행 위에서 "행 추가" 클릭 시 트리에서는 해당 행의 자식으로 추가된다(부모 필드 값 검증).
- 빈 영역 우클릭 후 "행 추가" 클릭 시 트리에서는 루트로 추가된다.
- 선택되지 않은 행 위에서 우클릭 후 "행 삭제" 클릭 시 해당 행만 삭제 처리된다.
- 필터/정렬이 없을 때 "필터 해제"/"정렬 해제" 항목이 비활성화된다.
- "설정을 기본값으로 복원" 클릭 후 컬럼 순서/폭/숨김/고정이 초기값으로 돌아가고 `storageKey` 로컬 스토리지 값도 초기화된다.
- 메뉴관리 화면(`menu-management-f1-grid.test.tsx`)에서 기존 `루트 메뉴 추가`/`하위 메뉴 추가` 버튼 참조 테스트를 컨텍스트 메뉴 기반 흐름으로 갱신한다.

## 8. 문서 갱신 대상

- `docs/guide/F1-GRID.md` 25번 섹션: 실제 구현된 메뉴 목록/동작/Props(`canExportExcel`, `excelFileName`)로 갱신, "⚠️ 아직 미구현" 제거.
- `docs/result/20260903/f1grid-context-menu/`: 결과 문서 + Playwright 스크린샷(메뉴관리 화면에서 우클릭 메뉴 표시, 각 항목 하이라이트 등).
