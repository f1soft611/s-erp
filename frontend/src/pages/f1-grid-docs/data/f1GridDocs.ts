import type { F1GridDoc } from '../types';

const code = `const columns = [
  { field: 'itemCode', headerName: '품목코드', editable: true },
  { field: 'itemName', headerName: '품목명', wrapText: true },
];

<F1Grid rows={rows} columns={columns} rowKey="id" />`;

export const f1GridDocs: F1GridDoc[] = [
  {
    id: 'overview',
    title: 'F1-Grid',
    category: 'guide',
    description: 'ERP 화면을 위한 키보드 중심 데이터 그리드 문서입니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Build for working data',
        body: '문서를 읽고 바로 실행 예제로 확인하세요. 모든 예제는 로컬 샘플 데이터로 동작합니다. F1-Grid는 표준 CRUD, 선택 상태, 정렬/필터, 트리 구조, 편집 플러그인까지 ERP 운영 화면에 필요한 흐름을 하나의 핵심 컴포넌트로 묶어 둡니다.',
      },
      {
        type: 'api',
        heading: 'Core capabilities',
        rows: [
          ['rows', 'T[]', '표시할 데이터 집합'],
          ['columns', 'F1GridColumn<T>[]', '필드별 표시/편집 정책'],
          ['rowKey', 'keyof T', '행 식별자'],
          ['editorPlugins', 'F1GridEditorPlugin<T>[]', '커스텀 편집기 확장'],
        ],
      },
      { type: 'code', heading: 'A small, typed grid', code },
    ],
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    category: 'guide',
    description: '첫 Grid를 만들고 컬럼 정의를 시작합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Start with columns',
        body: '행 데이터와 컬럼 설정을 준비한 뒤 rowKey를 지정합니다. 열 폭, 고정 여부, 편집 허용 여부는 컬럼 수준에서 공통 정책으로 관리해 화면 코드가 단순해집니다.',
      },
      {
        type: 'code',
        heading: 'First grid',
        code: `const columns = [{ field: 'itemCode', headerName: '품목코드', width: 140, editable: true }];\n<F1Grid rows={rows} columns={columns} rowKey="id" />`,
      },
    ],
  },
  {
    id: 'core-grid',
    title: 'Core Grid',
    category: 'feature',
    description: '정렬, 필터, 선택과 행 상태의 기본 동작을 확인합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Core behavior',
        body: 'F1-Grid는 Excel 같은 입력 흐름과 ERP 업무에 필요한 행 상태를 제공합니다. 선택된 행, 변경 여부, 항목별 필터와 정렬은 표준 인터페이스를 유지하면서도 화면에서 쉽게 재사용됩니다.',
      },
      {
        type: 'api',
        heading: 'Core props',
        rows: [
          ['rows', 'T[]', '표시할 행'],
          ['columns', 'F1GridColumn<T>[]', '컬럼 정의'],
          ['rowKey', 'keyof T', '행 식별자'],
          ['ariaLabel', 'string', '그리드 영역 접근성 레이블 (기본값 F1-GRID)'],
          [
            'height / maxHeight',
            'number | string',
            '그리드 컨테이너 높이 제한',
          ],
          ['columnLine', 'boolean', '컬럼 사이 세로 구분선 표시 여부'],
          ['storageKey', 'string', '컬럼 순서/너비/숨김/고정 상태 저장 키'],
          ['showCheckbox', 'boolean', '행 선택 체크박스 표시 여부'],
          ['onSelectionChange', '(ids) => void', '선택 상태 변경 콜백'],
          [
            'onChangesChange',
            '(changes) => void',
            'insertedRows/updatedRows/deletedRows 변경 콜백',
          ],
        ],
      },
      {
        type: 'prose',
        heading: 'Row state',
        body: '각 행은 normal, inserted, updated, deleted 상태를 가지며 grid.getChanges()로 세 목록을 추출할 수 있습니다.',
      },
    ],
    playground: 'selection',
  },
  {
    id: 'editing',
    title: 'Cell Editing',
    category: 'feature',
    description: '텍스트, 숫자, 날짜, 코드 셀을 인라인으로 편집합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Edit in place',
        body: 'editable 컬럼은 셀에 초점을 맞추고 바로 값을 입력할 수 있습니다. 컬럼 타입을 지정하면 날짜, 금액, 코드, 체크박스 등 업무 형태에 맞는 편집 UI를 삽입할 수 있습니다.',
      },
      {
        type: 'api',
        heading: 'Editing options',
        rows: [
          ['editable', 'boolean | (row) => boolean', '편집 가능 여부'],
          [
            'type',
            'text | number | decimal | currency | checkbox | date | datetime | time | select | autocomplete | code | rownumber',
            '편집기 유형',
          ],
          ['options', 'F1GridOption[]', 'select/autocomplete 선택 목록'],
          ['format', 'number | decimal | currency', '숫자 컬럼 표시 형식'],
          ['decimalPlaces', 'number', '숫자 표시 소수점 자릿수'],
          ['required / min / max', 'boolean / number', '기본 검증 규칙'],
          ['validate', '(value, row) => string | boolean', '값 검증 규칙'],
          [
            'selectOnFocus',
            'boolean (기본 true)',
            '포커스 시 입력값 전체 선택 여부',
          ],
          [
            'onOpenCodePicker',
            '(row, applyPatch) => Partial<T>',
            '코드 선택기 연동',
          ],
        ],
      },
      {
        type: 'api',
        heading: 'Editor Plugin lifecycle',
        rows: [
          [
            'editorPlugins / editors',
            'F1GridEditorPlugin<T>[]',
            '커스텀 편집기 확장 목록 (editors는 호환 별칭)',
          ],
          ['canEdit', '(context) => boolean', '편집 가능 여부 판단'],
          ['createEditor', '(context) => ReactNode', '커스텀 편집 UI 렌더링'],
          [
            'startEdit / endEdit',
            '(context) => boolean | void',
            '편집 시작/종료 훅, false 반환 시 중단',
          ],
          [
            'onBeforeEdit / onAfterEdit',
            'F1GridEditLifecycle<T>',
            'Grid 단위 편집 전/후 훅 (beforeEdit/afterEdit는 호환 별칭)',
          ],
        ],
      },
      { type: 'code', heading: 'Editable column', code },
      {
        type: 'code',
        heading: 'Number format column',
        code: "{ field: 'amount', headerName: '금액', type: 'number', format: 'currency', decimalPlaces: 2 }",
      },
      {
        type: 'prose',
        heading: 'Dirty cell indicator',
        body: '값이 변경된 셀은 좌측 상단에 작은 표시가 나타나며, 편집 중인 셀에서는 표시가 숨겨집니다.',
      },
    ],
    playground: 'editing',
  },
  {
    id: 'selection',
    title: 'Selection & Clipboard',
    category: 'feature',
    description: '행 선택과 셀 범위 선택, 클립보드 흐름을 확인합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Move quickly',
        body: '키보드와 마우스로 범위를 선택하고 변경 상태를 확인합니다. 선택 기반 작업은 저장 전 변경 영역을 추적하고, 복사/붙여넣기 흐름을 표준화할 때 강력합니다.',
      },
      {
        type: 'api',
        heading: 'Selection props',
        rows: [
          [
            'showCheckbox',
            'boolean',
            '행 선택용 체크박스 컬럼(Row Selector) 전체 표시 여부',
          ],
          [
            'headerCheckbox',
            'F1GridColumn 옵션',
            "type: 'checkbox' 데이터 컬럼에서 헤더 클릭으로 전체 값 편집",
          ],
          ['onSelectionChange', '(ids) => void', '선택 변경 콜백'],
        ],
      },
      {
        type: 'prose',
        heading: 'showCheckbox vs headerCheckbox',
        body: 'showCheckbox는 행 선택용 체크박스 컬럼 전체를 켜고 끄고, headerCheckbox는 type이 checkbox인 데이터 컬럼에서 헤더 클릭으로 전체 값을 편집하는 기능입니다. 이름은 비슷하지만 서로 다른 책임을 가지므로 혼동하지 않아야 합니다.',
      },
      {
        type: 'api',
        heading: 'Clipboard & range selection',
        rows: [
          [
            'Ctrl+C / Ctrl+V',
            '-',
            '선택 범위 또는 셀 범위를 Excel 호환 TSV로 복사/붙여넣기',
          ],
          [
            '드래그 범위 선택',
            '-',
            '마우스 드래그로 인접 셀 범위를 선택하고 오버레이로 표시',
          ],
          [
            'dirty-cell 표시',
            '-',
            '값이 변경된 셀에 좌상단 마크 표시 (data-dirty-cell)',
          ],
        ],
      },
      {
        type: 'api',
        heading: 'Selection Ref API',
        rows: [
          ['getSelectedRows()', 'T[]', '선택된 행 데이터 반환'],
          ['getSelectedRowIds()', 'F1GridRowId[]', '선택된 행 id 반환'],
          ['clearSelection()', 'void', '선택 상태 초기화'],
        ],
      },
    ],
    playground: 'selection',
  },
  {
    id: 'filtering-sorting',
    title: 'Filtering & Sorting',
    category: 'feature',
    description: '헤더 메뉴에서 정렬과 컬럼 필터를 사용합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Find a row',
        body: '컬럼 헤더 메뉴를 통해 데이터를 업무 순서에 맞게 정리합니다. 기본 정렬/필터는 헤더 액션에서 바로 노출되며, 일부 화면은 disableSorting/disableFiltering로 비활성화가 가능합니다.',
      },
      {
        type: 'api',
        heading: 'Sort/filter controls',
        rows: [
          ['disableSorting', 'boolean', '개별 화면에서 정렬 비활성화'],
          ['disableFiltering', 'boolean', '개별 화면에서 필터 비활성화'],
          ['pinned', 'left | right', '고정 컬럼과 정렬 메뉴 조합 지원'],
        ],
      },
      {
        type: 'api',
        heading: 'Filter operators',
        rows: [
          ['equals', '-', '같음'],
          ['notEquals', '-', '같지 않음'],
          ['contains', '-', '포함'],
          ['startsWith', '-', '시작 문자'],
          ['endsWith', '-', '끝 문자'],
          ['greaterThan', '-', '초과'],
          ['lessThan', '-', '미만'],
          ['greaterThanOrEqual', '-', '이상'],
          ['lessThanOrEqual', '-', '이하'],
          ['between', '-', '범위'],
          ['isEmpty', '-', '비어 있음'],
          ['isNotEmpty', '-', '비어 있지 않음'],
        ],
      },
      {
        type: 'prose',
        heading: 'Multi-column sort',
        body: '정렬 상태는 F1GridSort<T>[] 배열로 다중 컬럼을 지원하며, 필터와 정렬 모두 현재 화면에 표시된 행을 기준으로 다시 계산됩니다.',
      },
      {
        type: 'code',
        heading: 'Disable when needed',
        code: '<F1Grid disableSorting disableFiltering {...props} />',
      },
    ],
  },
  {
    id: 'column-layout',
    title: 'Column Layout',
    category: 'feature',
    description: '컬럼 고정, 표시, 순서 변경과 너비 조절을 다룹니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Shape the workspace',
        body: '중요한 컬럼은 고정하고 나머지는 화면에 맞춰 조정합니다. 컬럼 관리와 고정 상태는 스토리지에 저장해 화면을 다시 열어도 사용자 선호를 유지할 수 있습니다.',
      },
      {
        type: 'api',
        heading: 'Layout props',
        rows: [
          ['pinned', 'left | right', '컬럼 고정'],
          ['width / maxWidth', 'number', '기본/최대 너비'],
          ['flex', 'number', '가변 비율'],
          ['headerGroup', 'string', '헤더 상단 그룹 라벨'],
          ['hidden', 'boolean', '초기 숨김 여부 (헤더 메뉴에서 표시 전환)'],
          ['resizableColumns', 'boolean', '컬럼 크기 조정 허용'],
          ['storageKey', 'string', '순서/너비/숨김/고정 상태 저장 키'],
        ],
      },
      {
        type: 'prose',
        heading: 'Header menu actions',
        body: '컬럼 헤더 메뉴에서 정렬, 필터, 고정, 숨김/표시, 자동 맞춤, 드래그 순서 변경을 모두 처리합니다. 마지막으로 표시된 컬럼은 숨길 수 없습니다.',
      },
    ],
    playground: 'layout',
  },
  {
    id: 'row-height',
    title: 'Row Height',
    category: 'feature',
    description: '행 높이와 긴 텍스트 줄바꿈을 실제 화면에서 조절합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Give data room',
        body: '기본 행 높이를 기준으로 긴 텍스트는 wrapText 설정에 따라 줄바꿈됩니다. ERP 화면은 한 셀이 길게 늘어나도 전체 표가 비정상적으로 무너지지 않도록 세부 값을 함께 제어합니다.',
      },
      {
        type: 'api',
        heading: 'Height options',
        rows: [
          ['rowHeight', 'number', '기본 행 높이'],
          ['minRowHeight', 'number', '최소 높이'],
          ['maxRowHeight', 'number', '최대 높이'],
          ['resizableRows', 'boolean', '사용자 행 높이 조절 허용'],
        ],
      },
      {
        type: 'code',
        heading: 'Resizable rows',
        code: '<F1Grid rowHeight={40} minRowHeight={40} maxRowHeight={300} resizableRows />',
      },
    ],
    playground: 'row-height',
  },
  {
    id: 'row-merge',
    title: 'Row Merge',
    category: 'feature',
    description: '연속해서 같은 값을 가진 셀을 병합합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Read grouped data',
        body: 'mergeRows를 지정하면 연속된 동일 값이 하나의 시각적 그룹으로 표시됩니다. 품목명, 그룹명, 상태처럼 연속 그룹을 위한 필드에 적합합니다.',
      },
      {
        type: 'api',
        heading: 'Merge options',
        rows: [
          [
            'mergeRows',
            'boolean',
            '이전 행과 같은 값이면 셀 병합 (현재 boolean 계약만 지원)',
          ],
          ['wrapText', 'boolean', '긴 텍스트 줄바꿈 허용'],
        ],
      },
      {
        type: 'prose',
        heading: 'Pinned columns and range selection',
        body: 'mergeRows는 핀 고정 컬럼에서도 동일한 규칙으로 병합되며, 병합된 영역에서도 셀 드래그 범위 선택이 각 행을 정상적으로 지나갑니다. 병합 시작 행이 아닌 셀을 편집하면 해당 행만 분리되어 편집됩니다. mergeKey, mergeWhen, enableRowMerge, grid.refreshRowMerge()는 아직 구현되지 않았습니다.',
      },
      {
        type: 'code',
        heading: 'Merge a column',
        code: "{ field: 'itemName', mergeRows: true, pinned: 'left' }",
      },
    ],
    playground: 'row-merge',
  },
  {
    id: 'context-menu',
    title: 'Context Menu',
    category: 'feature',
    description:
      '바디 우클릭으로 엑셀 내보내기, 행 추가, 필터/정렬 초기화, 레이아웃 복원 등을 수행합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Fast actions at the cursor',
        body: 'F1-Grid 바디 영역을 우클릭하면 커서 위치에 컨텍스트 메뉴가 열립니다. 헤더 영역은 기존 정렬/필터/고정/숨김 메뉴를 유지하고, 바디 메뉴는 행 추가, 복사, 삭제, 컬럼 자동 맞춤, 엑셀 내보내기처럼 작업 성격이 강한 액션을 한 곳에 모아줍니다.',
      },
      {
        type: 'api',
        heading: 'Context menu props',
        rows: [
          ['canExportExcel', 'boolean', '엑셀 내보내기 메뉴 노출 여부'],
          ['excelFileName', 'string', '다운로드 파일명 기본값'],
          [
            'treeContextMenu',
            'F1GridContextMenuTreeConfig',
            'F1Tree가 내부적으로 주입하는 트리 전용 콜백',
          ],
        ],
      },
      {
        type: 'code',
        heading: 'Enable the export menu',
        code: '<F1Tree rows={rows} rowKey="id" parentKey="parentId" treeColumn="name" canExportExcel={hasExcelPermission} excelFileName="menu-export" />',
      },
    ],
    playground: 'tree',
  },
  {
    id: 'tree-grid',
    title: 'Tree Grid',
    category: 'feature',
    description: '상하위 관계가 있는 데이터를 계층 구조로 표시합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Navigate hierarchy',
        body: 'parentKey와 treeColumn을 지정해 트리 데이터를 표현합니다. 메뉴, 조직도, 계정 구조처럼 부모-자식 관계를 가진 데이터는 이 영역에서 한 번에 조작할 수 있습니다.',
      },
      {
        type: 'api',
        heading: 'Tree API',
        rows: [
          ['parentKey', 'keyof T', '부모 식별자 필드'],
          ['treeColumn', 'keyof T', '트리 노드 이름 표시 필드'],
          ['defaultExpandAll', 'boolean', '최초 렌더링 시 전체 펼침'],
          [
            'defaultExpanded',
            "'all' | 'root' | F1GridRowId[]",
            '초기 펼침 대상 지정',
          ],
          ['treeCheckbox', 'boolean', '트리 노드 체크박스 활성화'],
          [
            'syncWithTreeCheckbox',
            'boolean (컬럼 옵션, 기본 true)',
            'type: checkbox 컬럼 값을 트리 체크 상태와 동기화',
          ],
          ['getRowOrder', '(row) => number', '같은 부모 하위 정렬 기준'],
          [
            'onDeleteBlocked',
            '(rowIds) => void',
            '자식이 있는 행 삭제 시도 시 콜백',
          ],
          [
            'onTreeCheckboxChange',
            '(rowIds) => void',
            '트리 체크 상태 변경 콜백',
          ],
        ],
      },
      {
        type: 'api',
        heading: 'Tree Ref API',
        rows: [
          [
            'addChildRow(parentId, row?)',
            'void',
            '특정 부모의 자식 행 추가 및 자동 펼침',
          ],
          [
            'expandRow / collapseRow',
            '(rowId) => void',
            '개별 노드 펼치기/접기',
          ],
          ['expandAll / collapseAll', '() => void', '전체 펼치기/접기'],
          ['isExpanded(rowId)', 'boolean', '펼침 상태 확인'],
        ],
      },
      {
        type: 'code',
        heading: 'Tree setup',
        code: '<F1Tree rows={rows} rowKey="id" parentKey="parentId" treeColumn="name" defaultExpandAll />',
      },
    ],
    playground: 'tree',
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    category: 'reference',
    description: 'F1-Grid props와 컬럼 타입을 빠르게 찾습니다.',
    sections: [
      {
        type: 'api',
        heading: 'F1GridProps',
        rows: [
          ['rows', 'T[]', '표시할 데이터'],
          ['columns', 'F1GridColumn<T>[]', '컬럼 정의'],
          ['rowKey', 'keyof T', '행 식별자'],
          ['ariaLabel', 'string', '접근성 레이블'],
          ['columnLine', 'boolean', '컬럼 세로 구분선'],
          ['storageKey', 'string', '컬럼 레이아웃 저장 키'],
          ['height / maxHeight', 'number | string', '컨테이너 높이 제한'],
          ['rowHeight / minRowHeight / maxRowHeight', 'number', '행 높이 범위'],
          [
            'resizableRows / resizableColumns',
            'boolean',
            '행/컬럼 크기 조절 허용',
          ],
          ['minColumnWidth', 'number', '컬럼 최소 너비'],
          ['showCheckbox', 'boolean', '행 선택 체크박스 표시'],
          [
            'createRow / createDuplicate',
            '() => T | (row: T) => T',
            '행 추가/복제 시 생성 로직',
          ],
          ['canExportExcel', 'boolean', '엑셀 내보내기 메뉴 노출 여부'],
          ['excelFileName', 'string', '기본 다운로드 파일명'],
          [
            'editorPlugins / editors',
            'F1GridEditorPlugin<T>[]',
            '편집기 플러그인 (editors는 호환 별칭)',
          ],
          [
            'onBeforeEdit / beforeEdit',
            'F1GridEditLifecycle<T>',
            '편집 시작 전 훅',
          ],
          [
            'onAfterEdit / afterEdit',
            'F1GridEditLifecycle<T>',
            '편집 종료 후 훅',
          ],
          ['onChangesChange', '(changes) => void', '변경된 행 목록 콜백'],
          ['onSelectionChange', '(ids) => void', '선택 상태 변경 콜백'],
          [
            'rowProjection',
            '(rows: T[]) => { rows: T[] }',
            '표시 행 가공 (Tree 등에서 사용)',
          ],
          ['cellAdornment', '(row, column) => ReactNode', '셀 앞 장식 렌더링'],
          [
            'disableSorting / disableFiltering',
            'boolean',
            '정렬/필터 비활성화',
          ],
        ],
      },
      {
        type: 'api',
        heading: 'F1GridColumn',
        rows: [
          ['field', 'keyof T', '데이터 필드'],
          ['headerName', 'string', '헤더 표시명'],
          ['headerGroup', 'string', '헤더 상단 그룹 라벨'],
          ['getValue / onValueChange', '함수', '표시값 계산 / 값 변경 시 패치'],
          ['width / flex / maxWidth', 'number', '너비 정책'],
          ['editable', 'boolean | (row) => boolean', '편집 가능 여부'],
          ['type', 'F1GridEditorType', '편집기 유형'],
          [
            'format / decimalPlaces',
            'F1GridNumberFormat / number',
            '숫자 표시 형식',
          ],
          ['options', 'F1GridOption[]', 'select/autocomplete 목록'],
          ['required / min / max / validate', '-', '검증 규칙'],
          ['onOpenCodePicker', '함수', '코드 선택기 연동'],
          ['align / headerAlign', 'left | center | right', '정렬'],
          ['wrapText / mergeRows', 'boolean', '줄바꿈 / 연속 값 병합'],
          ['headerCheckbox', 'boolean', 'checkbox 컬럼 헤더 전체 선택 토글'],
          ['hidden / pinned', 'boolean / left | right', '숨김 / 고정'],
          ['selectOnFocus', 'boolean', '포커스 시 값 전체 선택'],
          ['syncWithTreeCheckbox', 'boolean', 'Tree 체크박스와 동기화'],
        ],
      },
      {
        type: 'api',
        heading: 'F1TreeProps',
        rows: [
          ['parentKey / treeColumn', 'keyof T', '부모 필드 / 트리 라벨 필드'],
          ['treeCheckbox', 'boolean', '트리 체크박스 활성화'],
          [
            'defaultExpandAll / defaultExpanded',
            "boolean / 'all' | 'root' | ids",
            '초기 펼침 상태',
          ],
          ['getRowOrder', '(row) => number', '형제 노드 정렬 기준'],
          [
            'onDeleteBlocked',
            '(rowIds) => void',
            '자식 있는 행 삭제 차단 콜백',
          ],
          ['onTreeCheckboxChange', '(rowIds) => void', '체크 상태 변경 콜백'],
        ],
      },
      {
        type: 'api',
        heading: 'F1GridRef',
        rows: [
          ['getSelectedRows / getSelectedRowIds', '함수', '선택된 행/id 조회'],
          ['clearSelection', '() => void', '선택 해제'],
          [
            'addRow / deleteSelectedRows / restoreDeletedRows / duplicateSelectedRows',
            '함수',
            '행 CRUD',
          ],
          ['getRows / getActiveRows', '() => T[]', '전체/삭제 제외 행 조회'],
          [
            'getChanges',
            '() => F1GridChanges<T>',
            'inserted/updated/deleted 목록',
          ],
          ['validate', '() => boolean', '전체 검증 실행'],
          ['startEdit / stopEdit', '함수', '편집 시작/종료 제어'],
          ['setCellValue', '(rowId, field, value) => void', '셀 값 직접 설정'],
        ],
      },
      {
        type: 'api',
        heading: 'F1TreeRef',
        rows: [
          ['addChildRow', '(parentId, row?) => void', '자식 행 추가'],
          ['expandRow / collapseRow', '(rowId) => void', '개별 노드 펼침/접힘'],
          ['expandAll / collapseAll', '() => void', '전체 펼침/접힘'],
          ['isExpanded', '(rowId) => boolean', '펼침 상태 확인'],
        ],
      },
      {
        type: 'related',
        heading: 'Related guides',
        links: [
          { id: 'core-grid', label: 'Core Grid' },
          { id: 'editing', label: 'Cell Editing' },
          { id: 'tree-grid', label: 'Tree Grid' },
        ],
      },
    ],
  },
  {
    id: 'testing-guide',
    title: 'Testing Guide',
    category: 'reference',
    description: 'Vitest와 실제 브라우저에서 Grid를 검증하는 방법입니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Test behavior',
        body: 'DOM 단위 테스트와 Playwright 브라우저 검증을 함께 사용해 실제 화면을 확인합니다. 문서 내용과 실제 데이터 계층 구조를 일치시키는 것이 가장 중요합니다.',
      },
      {
        type: 'prose',
        heading: 'Implemented vs planned',
        body: '포털 예시는 F1GridProps/F1GridColumn 등 실제 구현 계약만 사용합니다. 집계, 서버사이드 페이지네이션, 가상 스크롤, Excel Export 등은 아직 구현되지 않았으므로 포털과 Playground에 포함하지 않습니다.',
      },
      {
        type: 'code',
        heading: 'Run focused tests',
        code: 'cd frontend\nnpm run test -- tests/f1-grid-docs.test.tsx',
      },
    ],
  },
];

export function getF1GridDoc(id: string) {
  return f1GridDocs.find((doc) => doc.id === id) ?? f1GridDocs[0];
}
