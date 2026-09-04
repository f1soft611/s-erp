# 계획서

## 관련 작업지시서

[20260903*012_f1grid_context_menu*작업지시서.md](../../directions/20260903/20260903_012_f1grid_context_menu_작업지시서.md)

## 요구사항 분석 및 목적

F1-Grid는 헤더 메뉴(정렬/필터/고정/숨김)만 제공하고, 바디 영역 우클릭 컨텍스트 메뉴는 `frontend/src/pages/f1-grid-docs/F1-GRID.md` 25번 항목에 "미구현"으로만 문서화되어 있다. 메뉴관리 화면(F1Tree 기반)은 그리드 바깥의 툴바 버튼(`루트 메뉴 추가`, `하위 메뉴 추가`)으로 행 추가를 처리하고 있어 그리드 내부 조작과 화면 툴바 조작이 이원화되어 있다.

본 작업은 F1-Grid 코어에 우클릭 컨텍스트 메뉴 플러그인을 신설해 엑셀 내보내기, 컬럼 자동 조정, 행 CRUD, 필터/정렬 해제, 컬럼 설정 초기화를 그리드 내부에서 처리하도록 통합하고, 메뉴관리 화면의 중복 툴바 버튼을 제거하는 것을 목적으로 한다.

## 작업 범위 분해 (프론트엔드 전용)

### A. F1-Grid 코어 – 컨텍스트 메뉴 플러그인

1. **타입 정의 추가** (`grid.types.ts`)
   - `F1GridProps`에 `canExportExcel?: boolean`, `excelFileName?: string` 추가.
   - `F1GridContextMenuTreeConfig<T>` 타입 신설(트리 전용 내부 확장 포인트): `{ onAddRoot: () => void; onAddChild: (targetRowId?: F1GridRowId) => void }`.
   - `F1GridProps`(또는 별도 내부 전용 prop)에 `treeContextMenu?: F1GridContextMenuTreeConfig<T>` 추가. 일반 사용자는 이 prop을 직접 넘기지 않고, `F1Tree`가 내부적으로만 주입한다.
2. **엑셀 내보내기 유틸 신설** (`export/GridExcelExport.ts`)
   - npm `xlsx`(SheetJS) 패키지는 High 심각도 Prototype Pollution/ReDoS 취약점이 미패치 상태로 남아 있어 채택하지 않고, 대신 해당 취약점이 없는 `exceljs`를 신규 의존성으로 추가한다.
   - `exportGridRowsToExcel(columns, rows, fileName)` 형태의 함수로 구현하고, 화면에 보이는 컬럼(`visibleColumns`)과 필터/정렬 반영된 행(`visibleRows`)만 대상으로 한다.
3. **컨텍스트 메뉴 UI/로직 신설** (`core/GridContextMenu.tsx` 신규 또는 `F1Grid.tsx` 내부 인라인 MUI `Menu`)
   - 바디 스크롤 컨테이너에 `onContextMenu` 핸들러를 추가해 브라우저 기본 메뉴를 막고 커서 위치에 MUI `Menu`(`anchorReference="anchorPosition"`)를 표시한다.
   - 행 영역(`GridRow.tsx`에 `data-f1-grid-row-id` 속성 추가)에서 우클릭 시 대상 rowId를 함께 저장하고, 빈 영역 우클릭 시 rowId 없이 메뉴를 연다.
   - 헤더 영역은 대상에서 제외(기존 헤더 메뉴 그대로 유지, 이벤트 버블링 시 무시).
4. **메뉴 항목별 동작 연결**
   - 엑셀 내보내기: `canExportExcel`이 true일 때만 항목 노출, 클릭 시 `exportGridRowsToExcel` 호출.
   - 컬럼 길이 자동 조정: `visibleColumns` 전체에 대해 `getAutoFitColumnWidth` 계산 후 `setColumnWidths` 일괄 갱신.
   - 루트 추가(Tree 전용): `treeContextMenu`가 있을 때만 노출, `treeContextMenu.onAddRoot()` 호출.
   - 행 추가: `treeContextMenu`가 있으면 `treeContextMenu.onAddChild(contextRowId)` 호출(대상 없으면 루트로 추가), 없으면 기존 `handleAddRow()` 호출.
   - 행 복사 / 행 삭제: 컨텍스트 대상 행이 현재 선택 목록에 없으면 해당 행만 단일 선택으로 교체한 뒤 기존 `handleDuplicateSelectedRows()` / `handleDeleteSelectedRows()` 재사용.
   - 필터 해제: `setFilterState([])`.
   - 정렬 해제: `setSortState([])`.
   - 설정을 기본값으로 복원: `columnOrder`/`columnWidths`/`hiddenColumnFields`/`pinnedFields`를 컬럼 정의 기준 초기값으로 재설정하고 `storageKey` 로컬 스토리지 항목을 제거 후 기본값으로 재기록되도록 한다.
5. **F1Tree 연동** (`tree/F1Tree.tsx`)
   - 내부적으로 `treeContextMenu` prop을 구성해 `F1Grid`에 전달: `onAddRoot`은 기존 `addRow()` 위임과 동일, `onAddChild`는 기존 `addChildRow()` 로직(부모 필드 patch) 재사용.

### B. 메뉴관리 화면 정리

1. `MenuManagementPanel.tsx`에서 `루트 메뉴 추가`, `하위 메뉴 추가` `Button` 2개와 관련 `addChildMenu` 직접 트리거 UI, 미사용 아이콘 import(`AddIcon`, `PlaylistAddIcon` 등 다른 곳에서 안 쓰면)를 제거한다.
2. `hasSelectedTreeRow` 상태가 다른 곳에서 쓰이지 않으면 함께 정리한다(사용 여부 확인 후 제거 또는 유지).
3. `F1Tree`에 `canExportExcel`(메뉴관리 화면의 EXCEL 권한 값)을 연결한다.

### C. 문서 갱신

1. `frontend/src/pages/f1-grid-docs/F1-GRID.md` 25번 "Grid Context Menu" 섹션을 실제 구현 메뉴 구성/동작으로 갱신하고 "⚠️ 아직 미구현" 표기를 제거한다.
2. `docs/result/20260903/f1grid-context-menu/`에 결과 문서와 Playwright 스크린샷을 작성한다.

## 기존 코드/아키텍처 영향 범위

- `F1Grid.tsx`는 이미 필터/정렬/컬럼 상태(state)를 내부에서 관리하므로 컨텍스트 메뉴는 기존 상태 setter를 재사용하며 별도 상태 중복을 만들지 않는다.
- `F1Tree.tsx`는 `F1Grid`를 감싸는 얇은 래퍼 구조이므로 `treeContextMenu` prop 주입만으로 트리 전용 동작을 확장할 수 있다.
- 컨텍스트 메뉴는 기본적으로 항상 켜져 있는 동작으로 설계하며(별도 opt-in prop 없이 F1Grid를 사용하는 모든 화면에 자동 적용), 기존 화면에 미치는 영향은 "우클릭 시 메뉴가 새로 뜬다"는 추가 동작뿐이고 기존 클릭/편집/헤더 메뉴 동작에는 영향이 없다.
- `exceljs` 패키지 신규 추가로 번들 크기가 늘어나므로, 가능하면 동적 `import()`로 지연 로딩해 초기 번들에 영향이 없도록 한다.

## 검증 계획

- **Vitest**: 신규 컨텍스트 메뉴 표시/항목 조건/각 액션 동작에 대한 테스트를 `frontend/tests/f1-grid-context-menu.test.tsx`(신규)에 작성한다.
- **Vitest 회귀**: `frontend/tests/menu-management-f1-grid.test.tsx`에서 제거된 툴바 버튼을 참조하는 기존 테스트를 컨텍스트 메뉴 흐름으로 갱신한다.
- **빌드**: `npm run build`로 타입 오류 여부를 확인한다.
- **Playwright**: 메뉴관리 화면에서 우클릭 컨텍스트 메뉴 스크린샷을 캡처해 `docs/result/20260903/f1grid-context-menu/screenshots`에 저장한다.

