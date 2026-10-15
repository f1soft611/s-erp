import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getF1GridDoc } from '../src/pages/f1-grid-docs/data/f1GridDocs';
import { F1GridDocsPage } from '../src/pages/f1-grid-docs/F1GridDocsPage';

const expectedPublicApiByContract: Record<string, string[]> = {
  F1GridProps: `
    rows dataSource onDataSourceError columns rowKey rowFormPlugin ariaLabel
    columnLine stripeRows storageKey height minHeight maxHeight rowHeight
    minRowHeight maxRowHeight resizableRows resizableColumns minColumnWidth
    virtualizeRows virtualizeColumns rowOverscan columnOverscan
    fixedRowHeightThreshold queryWorkerThreshold disableQueryWorker showCheckbox
    createRow createDuplicate editorPlugins editors onBeforeEdit beforeEdit
    onAfterEdit afterEdit onChangesChange onSelectionChange initialSelectedRowIds
    rowProjection cellAdornment disableSorting disableFiltering canExportExcel
    excelFileName allowAddRootInContextMenu allowAddRowInContextMenu
    allowDuplicateRowInContextMenu allowDeleteRowInContextMenu deleteMenuDisabled
    loading treeContextMenu
  `
    .trim()
    .split(/\s+/),
  F1GridColumn: `
    field headerName headerGroup form search getValue onValueChange width flex
    maxWidth editable type format decimalPlaces options userOptions selectOptionIcon
    required min max validate onOpenCodePicker renderCell getCellStyle getCellProps
    align headerAlign wrapText mergeRows headerCheckbox hidden pinned selectOnFocus
    syncWithTreeCheckbox
  `
    .trim()
    .split(/\s+/),
  F1TreeProps: `
    parentKey treeColumn treeCheckbox defaultExpandAll defaultExpanded getRowOrder
    onDeleteBlocked onTreeCheckboxChange isDeleteDisabled
  `
    .trim()
    .split(/\s+/),
  F1GridRef: `
    getSelectedRows getSelectedRowIds clearSelection setSelectedRowIds addRow
    deleteSelectedRows restoreDeletedRows duplicateSelectedRows getRows getActiveRows
    getChanges validate startEdit stopEdit setCellValue
  `
    .trim()
    .split(/\s+/),
  F1TreeRef: `
    addChildRow expandRow collapseRow expandAll collapseAll isExpanded
  `
    .trim()
    .split(/\s+/),
  'Shared types': `
    F1GridRowId F1GridRowState F1GridEditorType F1GridOption F1GridOption.value
    F1GridOption.label F1GridUserOption F1GridUserOption.value F1GridUserOption.label
    F1GridUserOption.avatarUrl F1GridUserOption.positionName
    F1GridUserOption.departmentName F1GridDraftValue F1GridNumberFormat
    F1GridFormMode F1GridPinSide
  `
    .trim()
    .split(/\s+/),
  'Form and search options': `
    F1GridColumnFormOptions F1GridColumnFormOptions.hidden
    F1GridColumnFormOptions.readOnly F1GridColumnFormOptions.label
    F1GridColumnFormOptions.group F1GridColumnFormOptions.order
    F1GridColumnFormOptions.span F1GridColumnFormOptions.multiple
    F1GridColumnFormOptions.targetField F1GridColumnFormOptions.targetLabel
    F1GridColumnSearchOptions F1GridColumnSearchOptions.hidden
    F1GridColumnSearchOptions.label F1GridColumnSearchOptions.group
    F1GridColumnSearchOptions.order F1GridColumnSearchOptions.span
  `
    .trim()
    .split(/\s+/),
  'Plugins and edit contexts': `
    F1GridRowFormContext F1GridRowFormContext.mode F1GridRowFormContext.row
    F1GridRowFormApplyContext F1GridRowFormApplyContext.mode
    F1GridRowFormApplyContext.originalRow F1GridRowFormApplyContext.draftRow
    F1GridRowFormPlugin F1GridRowFormPlugin.id F1GridRowFormPlugin.enabled
    F1GridRowFormPlugin.getTitle F1GridRowFormPlugin.getDescription
    F1GridRowFormPlugin.onBeforeApply F1GridEditLifecycle F1GridEditContext
    F1GridEditContext.row F1GridEditContext.rowId F1GridEditContext.column
    F1GridEditContext.field F1GridEditContext.value F1GridEditContext.defaultValue
    F1GridEditorPlugin F1GridEditorPlugin.id F1GridEditorPlugin.name
    F1GridEditorPlugin.enabled F1GridEditorPlugin.canEdit
    F1GridEditorPlugin.createEditor F1GridEditorPlugin.startEdit
    F1GridEditorPlugin.endEdit
  `
    .trim()
    .split(/\s+/),
  'Rendering contracts': `
    F1GridCellRenderContext F1GridCellRenderContext.row
    F1GridCellRenderContext.rowId F1GridCellRenderContext.column
    F1GridCellRenderContext.field F1GridCellRenderContext.value
    F1GridCellRenderContext.rowIndex F1GridCellProps F1GridCellProps.className
    F1GridCellProps.style F1GridCellProps.title F1GridCellProps.aria-label
  `
    .trim()
    .split(/\s+/),
  'Changes, sorting, and filtering': `
    F1GridChanges F1GridChanges.insertedRows F1GridChanges.updatedRows
    F1GridChanges.deletedRows F1GridSortDirection F1GridSort F1GridSort.field
    F1GridSort.direction F1GridFilterOperator F1GridFilter F1GridFilter.field
    F1GridFilter.operator F1GridFilter.value F1GridFilter.value2
    F1GridRowProjection F1GridRowProjection.rows
  `
    .trim()
    .split(/\s+/),
  'Data source': `
    F1GridDataSource F1GridDataSource.pageSize F1GridDataSource.load
    F1GridDataSourceQuery F1GridDataSourceQuery.offset F1GridDataSourceQuery.limit
    F1GridDataSourceQuery.sorts F1GridDataSourceQuery.filters
    F1GridDataSourceQuery.signal F1GridDataSourceResult
    F1GridDataSourceResult.rows F1GridDataSourceResult.totalRowCount
  `
    .trim()
    .split(/\s+/),
  'Tree context menu': `
    F1GridContextMenuTreeConfig F1GridContextMenuTreeConfig.onAddRoot
    F1GridContextMenuTreeConfig.onAddChild
  `
    .trim()
    .split(/\s+/),
};

describe('F1-Grid docs portal', () => {
  it('renders the overview document and navigation items', () => {
    render(<F1GridDocsPage />);

    expect(
      screen.getAllByRole('heading', { name: 'F1-Grid' }),
    ).not.toHaveLength(0);
    expect(
      screen.getByRole('button', { name: '편집과 검증' }),
    ).toBeInTheDocument();
  });

  it('switches documents from the sidebar', () => {
    render(<F1GridDocsPage />);

    fireEvent.click(screen.getByRole('button', { name: '편집과 검증' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cell Editing' }));

    expect(
      screen.getByRole('heading', { name: 'Cell Editing' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('f1-grid-doc-playground')).toBeInTheDocument();
  });

  it('shows only the selected document group in the default sidebar', () => {
    render(<F1GridDocsPage />);

    expect(
      screen.getByRole('button', { name: '시작하기' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: '그리드와 데이터' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: '첫 그리드 만들기' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '기본 그리드' }),
    ).not.toBeInTheDocument();
  });

  it('navigates to the first document when a group heading is selected', () => {
    render(<F1GridDocsPage />);

    fireEvent.click(screen.getByRole('button', { name: '그리드와 데이터' }));

    expect(
      screen.getByRole('heading', { name: '기본 그리드' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '그리드와 데이터' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: '시작하기' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: '기본 그리드' }),
    ).toHaveClass('active');
  });

  it('selecting the current group heading navigates to its first document', () => {
    render(<F1GridDocsPage initialDocumentId="getting-started" />);

    fireEvent.click(screen.getByRole('button', { name: '시작하기' }));

    expect(
      screen.getAllByRole('heading', { name: 'F1-Grid' }),
    ).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: '시작하기' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps matching documents from multiple groups and API results visible while searching', () => {
    render(<F1GridDocsPage />);
    fireEvent.change(screen.getByRole('textbox', { name: '문서 검색' }), {
      target: { value: '필터' },
    });

    expect(
      screen.getByRole('button', { name: '기본 그리드' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '필터와 정렬' }),
    ).toBeInTheDocument();
    expect(screen.getByText('API 항목')).toBeInTheDocument();
  });

  it('documents a large dataset sample and exposes the 10k workload guidance', () => {
    render(<F1GridDocsPage initialDocumentId="large-data" />);

    expect(
      screen.getByRole('heading', { name: 'Large Dataset' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1,000 rows')).toBeInTheDocument();
    expect(screen.getByText('10,000 rows')).toBeInTheDocument();
    expect(
      screen.getByText(/대용량 셀 렌더링과 선택 상태 유지/),
    ).toBeInTheDocument();
  });

  it('documents that every rowKey must be stable and unique', () => {
    render(<F1GridDocsPage initialDocumentId="core-grid" />);

    expect(
      screen.getByText('행마다 안정적이고 고유한 행 식별자'),
    ).toBeInTheDocument();
  });

  it('keeps the label spacing consistent and the hero title styled as a headline', () => {
    render(<F1GridDocsPage />);

    const label = screen.getByText('DOCUMENTATION');
    const headings = screen.getAllByRole('heading', { name: 'F1-Grid' });

    expect(label).toHaveStyle({ letterSpacing: '0.04em' });
    expect(headings[0]).toBeInTheDocument();
    expect(headings[0]).not.toHaveStyle({ letterSpacing: 'normal' });
  });

  it('shows a true tree sample with nested rows in the Tree Grid playground', () => {
    render(<F1GridDocsPage initialDocumentId="tree-grid" />);

    expect(screen.getByText('ERP 시스템')).toBeInTheDocument();
    expect(screen.getByText('기준정보')).toBeInTheDocument();
    expect(screen.getByText('공통코드')).toBeInTheDocument();
  });

  it('opens an inline editor on the cell editing playground', () => {
    render(<F1GridDocsPage initialDocumentId="editing" />);

    fireEvent.doubleClick(screen.getAllByRole('gridcell')[0]);

    expect(screen.getByDisplayValue('ITEM-001')).toBeInTheDocument();
  });

  it('updates the playground and reports code copy state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<F1GridDocsPage initialDocumentId="row-height" />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Increase row height' }),
    );
    expect(screen.getByText('48px')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Copied')).toBeInTheDocument());
  });

  it('documents the full editing contract including plugins and number format', () => {
    render(<F1GridDocsPage initialDocumentId="editing" />);

    expect(screen.getByText('selectOnFocus')).toBeInTheDocument();
    expect(screen.getByText('decimalPlaces')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Editor Plugin lifecycle' }),
    ).toBeInTheDocument();
    expect(screen.getByText('canEdit')).toBeInTheDocument();
  });

  it('distinguishes showCheckbox from the checkbox column headerCheckbox option', () => {
    render(<F1GridDocsPage initialDocumentId="selection" />);

    expect(screen.getByText('headerCheckbox')).toBeInTheDocument();
    expect(
      screen.getByText(
        /showCheckbox는 행 선택용 체크박스 컬럼 전체를 켜고 끄고/,
      ),
    ).toBeInTheDocument();
  });

  it('documents pinned column merge and drag range selection support in Row Merge', () => {
    render(<F1GridDocsPage initialDocumentId="row-merge" />);

    expect(
      screen.getByText(/핀 고정 컬럼에서도 동일한 규칙으로 병합/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/병합된 영역에서도 셀 드래그 범위 선택이/),
    ).toBeInTheDocument();
  });

  it('documents column render hooks and the editable-header indicator', () => {
    render(<F1GridDocsPage initialDocumentId="editing" />);

    expect(screen.getByText('renderCell')).toBeInTheDocument();
    expect(screen.getByText('getCellStyle')).toBeInTheDocument();
    expect(screen.getByText('getCellProps')).toBeInTheDocument();
    expect(
      screen.getByText(/편집 가능한 컬럼은 헤더 하단에 강조 색상/),
    ).toBeInTheDocument();
  });

  it('shows a live render hook example in the editing playground', () => {
    render(<F1GridDocsPage initialDocumentId="editing" />);

    expect(screen.getByText('활성')).toBeInTheDocument();
    expect(screen.getByText('대기')).toBeInTheDocument();
    expect(screen.getByText('중지')).toBeInTheDocument();
  });

  it('documents and demonstrates the row form modal playground', () => {
    render(<F1GridDocsPage initialDocumentId="row-form-modal" />);

    expect(
      screen.getByRole('heading', { name: 'Row Form Modal' }),
    ).toBeInTheDocument();
    expect(screen.getByText('rowFormPlugin')).toBeInTheDocument();
    expect(screen.getByText('form.group')).toBeInTheDocument();
    expect(screen.getByText('form.span')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: '상세' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'one 행 정보 수정' }));

    expect(
      screen.getByRole('dialog', { name: '정보 수정' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '기본 정보' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '운영 정보' }),
    ).toBeInTheDocument();
  });

  it('documents Tree Grid expansion options and the Tree Ref API', () => {
    render(<F1GridDocsPage initialDocumentId="tree-grid" />);

    expect(screen.getByText('defaultExpanded')).toBeInTheDocument();
    expect(screen.getByText('treeCheckbox')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Tree Ref API' }),
    ).toBeInTheDocument();
    expect(screen.getByText('expandRow / collapseRow')).toBeInTheDocument();
  });

  it('groups the API reference by Props, Column, Tree and Ref contracts', () => {
    render(<F1GridDocsPage initialDocumentId="api-reference" />);

    expect(
      screen.getByRole('heading', { name: 'F1GridProps' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'F1GridColumn' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'F1TreeProps' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'F1GridRef' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'F1TreeRef' }),
    ).toBeInTheDocument();
  });

  it('documents the current grid props and provides a live context-menu sample', () => {
    render(<F1GridDocsPage initialDocumentId="context-menu" />);

    expect(screen.getByText('minHeight')).toBeInTheDocument();
    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(screen.getByText('allowAddRowInContextMenu')).toBeInTheDocument();
    expect(
      screen.getByText('allowDuplicateRowInContextMenu'),
    ).toBeInTheDocument();
    expect(screen.getByText('allowDeleteRowInContextMenu')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Toggle export menu' }),
    ).toBeInTheDocument();
  });

  it('offers a quick search for developer docs and keeps the filter accessible', () => {
    render(<F1GridDocsPage />);

    const searchField = screen.getByRole('textbox', {
      name: '문서 검색',
    });
    expect(searchField).toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: '편집' } });

    expect(screen.getByRole('button', { name: '셀 편집' })).toBeInTheDocument();
    expect(screen.getByText('검색 결과')).toBeInTheDocument();
  });

  it('documents PageSearchArea detailed-search integration', () => {
    const doc = getF1GridDoc('filtering-sorting');
    const prose = doc.sections.find(
      (section) =>
        section.type === 'prose' &&
        section.heading === 'PageSearchArea 상세검색 연동',
    );
    expect(prose?.type).toBe('prose');
    if (!prose || prose.type !== 'prose' || typeof prose.body !== 'string') {
      throw new Error('Detailed-search integration prose is missing');
    }

    expect(prose.body).toContain('F1GridColumn.search');
    expect(prose.body).toContain('toPageSearchFields(columns)');
    expect(prose.body).toContain('PageSearchArea.detailFields');
    expect(prose.body).toContain('search.hidden');
    expect(prose.body).toContain('column.hidden');
    expect(prose.body).toContain('search.label');
    expect(prose.body).toContain('search.group');
    expect(prose.body).toContain('search.order');
    expect(prose.body).toContain('search.span');
    expect(prose.body).toContain('form.span');
    expect(prose.body).toContain('searchSpan');
    expect(prose.body).toContain('미지원');
    expect(prose.body).toContain('text');
    expect(prose.body).toContain(
      'number, decimal, currency, date, select, checkbox',
    );
    expect(prose.body).toContain('detailValues');
    expect(prose.body).toContain('onDetailValuesChange');
    expect(prose.body).toContain('onDetailSearch');
    expect(prose.body).toContain('날짜 범위');
    expect(prose.body).toContain('from');
    expect(prose.body).toContain('to');
    expect(prose.body).toContain('options');
    expect(prose.body).toContain(
      'Grid 자체가 서버 조회를 수행하지 않습니다',
    );

    const example = doc.sections.find(
      (section) =>
        section.type === 'code' && section.heading === '상세검색 폼 연결',
    );
    expect(example?.type).toBe('code');
    if (!example || example.type !== 'code') {
      throw new Error('Detailed-search example is missing');
    }
    expect(example.code).toContain("type: 'date'");
    expect(example.code).toContain('toPageSearchFields(columns)');
    expect(example.code).toContain('detailFields={detailFields}');
    expect(example.code).toContain('options: statusOptions');
    expect(example.code).toContain('search: { hidden: true }');
    expect(example.code).toContain('onDetailValuesChange={setDetailValues}');
    expect(example.code).toContain('onDetailSearch=');
  });

  it('documents each public F1-Grid API identifier and nested contract field', () => {
    const apiDoc = getF1GridDoc('api-reference');
    for (const [heading, expectedNames] of Object.entries(
      expectedPublicApiByContract,
    )) {
      const section = apiDoc.sections.find(
        (item) => item.type === 'api' && item.heading === heading,
      );
      const documentedNames =
        section?.type === 'api'
          ? section.rows.map(([name]) => name)
          : [];

      expect(documentedNames, `Missing API contract section: ${heading}`).toEqual(
        expect.arrayContaining(expectedNames),
      );
    }
  });

  it('documents the complete public literal unions', () => {
    const apiDoc = getF1GridDoc('api-reference');
    const apiText = apiDoc.sections
      .flatMap((section) =>
        section.type === 'api'
          ? section.rows.flatMap((row) => row.filter(Boolean))
          : [],
      )
      .join(' ');

    expect(apiText).toContain(
      'text | number | decimal | currency | checkbox | date | datetime | time | select | autocomplete | user | code | rownumber',
    );
    expect(apiText).toContain('normal | inserted | updated | deleted');
    expect(apiText).toContain(
      'equals | notEquals | contains | startsWith | endsWith | greaterThan | lessThan | greaterThanOrEqual | lessThanOrEqual | between | isEmpty | isNotEmpty',
    );
    expect(apiText).toContain('number | decimal | currency');
    expect(apiText).toContain('asc | desc');
    expect(apiText).toContain('left | right');
    expect(apiText).toContain('create | edit');
  });

  it('searches F1GridColumn.search and opens its API reference row', () => {
    render(<F1GridDocsPage />);

    fireEvent.change(screen.getByRole('textbox', { name: '문서 검색' }), {
      target: { value: 'F1GridColumn.search' },
    });

    const result = screen.getByRole('button', {
      name: /^searchF1GridColumn$/,
    });
    fireEvent.click(result);

    expect(
      screen.getByRole('heading', { name: 'API 참조' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', {
        name: /search F1GridColumnSearchOptions/,
      }),
    ).toBeInTheDocument();
  });

  it('shows grouped navigation and a section table of contents', () => {
    render(<F1GridDocsPage />);

    expect(screen.getByText('그리드와 데이터')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: '문서 목차' }),
    ).toBeInTheDocument();
  });
});
