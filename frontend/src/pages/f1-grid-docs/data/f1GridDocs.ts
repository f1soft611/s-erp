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
          ['showCheckbox', 'boolean', '행 선택 체크박스 표시 여부'],
          ['onSelectionChange', '(ids) => void', '선택 상태 변경 콜백'],
        ],
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
            'text | number | date | checkbox | select | code',
            '편집기 유형',
          ],
          ['validate', '(value, row) => string | boolean', '값 검증 규칙'],
          [
            'onOpenCodePicker',
            '(row, applyPatch) => Partial<T>',
            '코드 선택기 연동',
          ],
        ],
      },
      { type: 'code', heading: 'Editable column', code },
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
          ['showCheckbox', 'boolean', '행 선택 표시'],
          ['headerCheckbox', 'boolean', '헤더 전체 선택 토글'],
          ['onSelectionChange', 'function', '선택 변경 콜백'],
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
          ['width', 'number', '기본 너비'],
          ['flex', 'number', '가변 비율'],
          ['resizableColumns', 'boolean', '컬럼 크기 조정 허용'],
        ],
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
          ['mergeRows', 'boolean', '이전 행과 같은 값이면 셀 병합'],
          ['wrapText', 'boolean', '긴 텍스트 줄바꿈 허용'],
        ],
      },
      {
        type: 'code',
        heading: 'Merge a column',
        code: "{ field: 'itemName', mergeRows: true }",
      },
    ],
    playground: 'row-merge',
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
          ['defaultExpandAll', 'boolean', '최초 열림 상태'],
          ['treeCheckbox', 'boolean', '트리 체크박스 활성화'],
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
          ['rows', 'T[]', '행 목록'],
          ['columns', 'F1GridColumn<T>[]', '컬럼 목록'],
          ['rowHeight', 'number', '행 높이'],
          ['resizableColumns', 'boolean', '컬럼 너비 조절'],
          [
            'editorPlugins',
            'F1GridEditorPlugin<T>[]',
            '플러그인 기반 에디터 등록',
          ],
          ['onChangesChange', '(changes) => void', '변경 이벤트'],
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
