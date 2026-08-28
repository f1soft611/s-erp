import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  addGridRow,
  createGridData,
  duplicateGridRows,
  F1Grid,
  getGridChanges,
  getCellDisplayValue,
  getGridMergeInfo,
  clampGridRowHeight,
  getGridRowHeightByKey,
  getNextEditableCell,
  getSelectedRowIds,
  hasGridRowId,
  markRowsDeleted,
  parseGridTsv,
  restoreGridRows,
  toGridTsv,
  updateGridRow,
  validateGridRow,
  coerceClipboardValue,
  type F1GridColumn,
  type F1GridRef,
} from '../src/shared/components/f1-grid';

type MenuRow = {
  id: string;
  code: string;
  order: number;
  enabled: boolean;
  startDate: string;
  status: string;
};

const rows: MenuRow[] = [
  {
    id: 'dashboard',
    code: 'DASH',
    order: 1,
    enabled: true,
    startDate: '2026-08-27',
    status: 'draft',
  },
  {
    id: 'settings',
    code: 'SET',
    order: 2,
    enabled: true,
    startDate: '2026-08-28',
    status: 'confirmed',
  },
];

const columns: F1GridColumn<MenuRow>[] = [
  { field: 'code', headerName: '코드', editable: true },
  {
    field: 'order',
    headerName: '정렬',
    editable: true,
    type: 'number',
    align: 'center',
    headerAlign: 'center',
  },
  {
    field: 'enabled',
    headerName: '사용 여부',
    editable: true,
    type: 'checkbox',
    headerCheckbox: true,
  },
  { field: 'startDate', headerName: '시작일', editable: true, type: 'date' },
  {
    field: 'status',
    headerName: '상태',
    editable: (row) => row.status === 'draft',
    type: 'select',
    options: [
      { value: 'draft', label: '작성중' },
      { value: 'confirmed', label: '확정' },
    ],
  },
];

describe('F1-GRID clipboard', () => {
  it('serializes rows to tab-separated values in column order', () => {
    expect(toGridTsv(rows, columns)).toBe(
      'DASH\t1\ttrue\t2026-08-27\tdraft\nSET\t2\ttrue\t2026-08-28\tconfirmed',
    );
  });

  it('parses TSV and coerces numeric and checkbox column values', () => {
    expect(parseGridTsv('ITEM-1\t12\tY')).toEqual([['ITEM-1', '12', 'Y']]);
    expect(
      coerceClipboardValue('12', {
        field: 'order',
        headerName: '정렬',
        type: 'number',
      }),
    ).toBe(12);
    expect(
      coerceClipboardValue('Y', {
        field: 'enabled',
        headerName: '사용 여부',
        type: 'checkbox',
      }),
    ).toBe(true);
  });
});

describe('F1-GRID validation', () => {
  it('returns field errors for required, bounds, and custom validation', () => {
    const errors = validateGridRow(
      { id: 'line-1', itemCode: '', qty: 0, name: '금지 품목' },
      [
        { field: 'itemCode', headerName: '품목코드', required: true },
        { field: 'qty', headerName: '수량', min: 1, max: 9 },
        {
          field: 'name',
          headerName: '품목명',
          validate: (value) =>
            value === '금지 품목' ? '등록할 수 없는 품목입니다.' : true,
        },
      ],
    );

    expect(errors).toEqual({
      itemCode: '품목코드은(는) 필수입니다.',
      qty: '수량은(는) 1 이상이어야 합니다.',
      name: '등록할 수 없는 품목입니다.',
    });
  });
});

describe('F1-GRID extended editors', () => {
  it('formats currency values for display', () => {
    expect(
      getCellDisplayValue(
        { field: 'price', headerName: '단가', type: 'currency' },
        12000,
      ),
    ).toBe('12,000');
  });

  it('applies a code picker patch to related row fields', () => {
    const gridRef =
      createRef<
        F1GridRef<{ id: string; itemCode: string; itemName: string }>
      >();
    const onOpenCodePicker = () => ({
      itemCode: 'ITEM-002',
      itemName: '테스트 품목',
    });

    render(
      <F1Grid
        ref={gridRef}
        rows={[{ id: 'line-1', itemCode: 'ITEM-001', itemName: '기존 품목' }]}
        columns={[
          {
            field: 'itemCode',
            headerName: '품목코드',
            type: 'code',
            editable: true,
            onOpenCodePicker,
          },
          { field: 'itemName', headerName: '품목명', editable: true },
        ]}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'ITEM-001' }));
    fireEvent.click(screen.getByRole('button', { name: '코드 선택' }));

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({
        itemCode: 'ITEM-002',
        itemName: '테스트 품목',
      }),
    ]);
  });

  it('stores autocomplete, decimal, datetime, and time editor values', () => {
    type ExtendedRow = {
      id: string;
      status: string;
      ratio: number;
      deliveryAt: string;
      workTime: string;
    };
    const gridRef = createRef<F1GridRef<ExtendedRow>>();
    const extendedColumns: F1GridColumn<ExtendedRow>[] = [
      {
        field: 'status',
        headerName: '상태',
        type: 'autocomplete',
        editable: true,
        options: [
          { value: 'ready', label: '준비' },
          { value: 'done', label: '완료' },
        ],
      },
      { field: 'ratio', headerName: '비율', type: 'decimal', editable: true },
      {
        field: 'deliveryAt',
        headerName: '납기 일시',
        type: 'datetime',
        editable: true,
      },
      {
        field: 'workTime',
        headerName: '작업 시각',
        type: 'time',
        editable: true,
      },
    ];

    render(
      <F1Grid
        ref={gridRef}
        rows={[
          {
            id: 'line-1',
            status: 'ready',
            ratio: 1.5,
            deliveryAt: '2026-08-28T09:30',
            workTime: '09:30',
          },
        ]}
        columns={extendedColumns}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '준비' }));
    fireEvent.change(screen.getByDisplayValue('ready'), {
      target: { value: '완료' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('완료'), { key: 'Enter' });
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '1.5' }));
    fireEvent.change(screen.getByDisplayValue('1.5'), {
      target: { value: '2.75' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('2.75'), { key: 'Enter' });
    fireEvent.doubleClick(
      screen.getByRole('gridcell', { name: '2026-08-28T09:30' }),
    );
    fireEvent.change(screen.getByDisplayValue('2026-08-28T09:30'), {
      target: { value: '2026-08-29T11:45' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('2026-08-29T11:45'), {
      key: 'Enter',
    });
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '09:30' }));
    fireEvent.change(screen.getByDisplayValue('09:30'), {
      target: { value: '14:15' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('14:15'), { key: 'Enter' });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({
        status: 'done',
        ratio: 2.75,
        deliveryAt: '2026-08-29T11:45',
        workTime: '14:15',
      }),
    ]);
  });
});

describe('F1-GRID clipboard, validation, and keyboard commands', () => {
  type ItemRow = {
    id: string;
    itemCode: string;
    itemName: string;
    qty: number;
  };
  const itemColumns: F1GridColumn<ItemRow>[] = [
    {
      field: 'itemCode',
      headerName: '품목코드',
      editable: true,
      required: true,
    },
    { field: 'itemName', headerName: '품목명', editable: true },
    {
      field: 'qty',
      headerName: '수량',
      type: 'number',
      editable: true,
      min: 1,
    },
  ];
  const itemRows: ItemRow[] = [
    { id: 'line-1', itemCode: 'ITEM-001', itemName: '기존 품목', qty: 1 },
  ];

  it('pastes TSV from the focused cell and adds overflow rows as inserted', () => {
    const gridRef = createRef<F1GridRef<ItemRow>>();
    let nextId = 2;
    render(
      <F1Grid
        ref={gridRef}
        rows={itemRows}
        columns={itemColumns}
        rowKey="id"
        createRow={() => ({
          id: `line-${nextId++}`,
          itemCode: '',
          itemName: '',
          qty: 0,
        })}
      />,
    );

    const itemCodeCell = screen.getByRole('gridcell', { name: 'ITEM-001' });
    fireEvent.click(itemCodeCell);
    fireEvent.paste(itemCodeCell, {
      clipboardData: {
        getData: () => 'ITEM-010\t신규 품목\t3\nITEM-011\t추가 품목\t4',
      },
    });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({
        id: 'line-1',
        itemCode: 'ITEM-010',
        itemName: '신규 품목',
        qty: 3,
      }),
    ]);
    expect(gridRef.current?.getChanges().insertedRows).toEqual([
      expect.objectContaining({
        id: 'line-2',
        itemCode: 'ITEM-011',
        itemName: '추가 품목',
        qty: 4,
      }),
    ]);
  });

  it('copies selected rows as tab-separated clipboard text', () => {
    render(<F1Grid rows={itemRows} columns={itemColumns} rowKey="id" />);
    fireEvent.click(screen.getByLabelText('line-1 행 선택'));
    const setData = vi.fn();

    fireEvent.copy(screen.getByRole('grid', { name: 'F1-GRID' }), {
      clipboardData: { setData },
    });

    expect(setData).toHaveBeenCalledWith(
      'text/plain',
      'ITEM-001\t기존 품목\t1',
    );
  });

  it('returns false and marks invalid cells through validate()', () => {
    const gridRef = createRef<F1GridRef<ItemRow>>();
    render(
      <F1Grid
        ref={gridRef}
        rows={[{ ...itemRows[0], itemCode: '', qty: 0 }]}
        columns={itemColumns}
        rowKey="id"
      />,
    );

    let valid = true;
    act(() => {
      valid = gridRef.current?.validate() ?? true;
    });
    expect(valid).toBe(false);
    expect(
      screen.getByRole('gridcell', { name: '품목코드은(는) 필수입니다.' }),
    ).toHaveAttribute('data-grid-error', '품목코드은(는) 필수입니다.');
  });

  it('uses Home, End, Backspace, Insert, and Ctrl+D according to focus and selection', () => {
    const gridRef = createRef<F1GridRef<ItemRow>>();
    let nextId = 2;
    render(
      <F1Grid
        ref={gridRef}
        rows={itemRows}
        columns={itemColumns}
        rowKey="id"
        createRow={() => ({
          id: `line-${nextId++}`,
          itemCode: '',
          itemName: '',
          qty: 0,
        })}
        createDuplicate={(row) => ({ ...row, id: `line-${nextId++}` })}
      />,
    );

    const codeCell = screen.getByRole('gridcell', { name: 'ITEM-001' });
    fireEvent.click(codeCell);
    fireEvent.keyDown(codeCell, { key: 'End' });
    expect(document.activeElement).toBe(
      screen.getByRole('gridcell', { name: '1' }),
    );
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' });
    expect(document.activeElement).toBe(codeCell);
    act(() => {
      gridRef.current?.clearSelection();
    });
    fireEvent.keyDown(codeCell, { key: 'Backspace' });
    expect(gridRef.current?.getChanges().updatedRows[0]).toEqual(
      expect.objectContaining({ itemCode: '' }),
    );
    fireEvent.keyDown(codeCell, { key: 'Insert' });
    expect(gridRef.current?.getChanges().insertedRows).toHaveLength(1);
    act(() => {
      gridRef.current?.clearSelection();
    });
    fireEvent.click(screen.getByLabelText('line-1 행 선택'));
    fireEvent.keyDown(codeCell, { key: 'd', ctrlKey: true });
    expect(gridRef.current?.getChanges().insertedRows).toHaveLength(2);
  });
});

describe('F1-GRID row state', () => {
  it('rejects a duplicate row ID before adding a row', () => {
    const data = createGridData(rows, 'id');
    const duplicate = addGridRow(data, rows[0], 'id');

    expect(hasGridRowId(data.rows, 'id', 'dashboard')).toBe(true);
    expect(hasGridRowId(data.rows, 'id', 'new-row')).toBe(false);
    expect(duplicate.rows).toHaveLength(data.rows.length);
  });

  it('keeps inserted rows inserted after edits and returns them as changes', () => {
    const added = addGridRow(
      createGridData(rows, 'id'),
      { id: 'menus', code: 'MENU', order: 3, enabled: true },
      'id',
    );
    const updated = updateGridRow(added, 'id', 'menus', { order: 4 });

    expect(updated.stateById.menus).toBe('inserted');
    expect(getGridChanges(updated, 'id').insertedRows).toEqual([
      { id: 'menus', code: 'MENU', order: 4, enabled: true },
    ]);
  });

  it('marks edited original rows as updated', () => {
    const updated = updateGridRow(
      createGridData(rows, 'id'),
      'id',
      'settings',
      {
        enabled: false,
      },
    );

    expect(updated.stateById.settings).toBe('updated');
    expect(getGridChanges(updated, 'id').updatedRows).toEqual([
      expect.objectContaining({
        id: 'settings',
        code: 'SET',
        order: 2,
        enabled: false,
      }),
    ]);
  });

  it('keeps deleted rows in the change set and restores their prior states', () => {
    const deleted = markRowsDeleted(
      updateGridRow(createGridData(rows, 'id'), 'id', 'settings', { order: 9 }),
      'id',
      ['dashboard', 'settings'],
    );

    expect(getGridChanges(deleted, 'id').deletedRows).toEqual([
      expect.objectContaining({
        id: 'dashboard',
        code: 'DASH',
        order: 1,
        enabled: true,
      }),
      expect.objectContaining({
        id: 'settings',
        code: 'SET',
        order: 9,
        enabled: true,
      }),
    ]);
    expect(restoreGridRows(deleted).stateById).toEqual({
      dashboard: 'normal',
      settings: 'updated',
    });
  });

  it('duplicates selected rows as inserted rows with consumer-provided IDs', () => {
    const duplicated = duplicateGridRows(
      createGridData(rows, 'id'),
      'id',
      ['dashboard'],
      (row) => ({ ...row, id: `${row.id}-copy` }),
    );

    expect(duplicated.rows.at(-1)).toEqual(
      expect.objectContaining({
        id: 'dashboard-copy',
        code: 'DASH',
        order: 1,
        enabled: true,
      }),
    );
    expect(duplicated.stateById['dashboard-copy']).toBe('inserted');
  });
});

describe('F1-GRID row merge', () => {
  it('merges only contiguous equal values and exposes each group span', () => {
    const mergeInfo = getGridMergeInfo(
      [
        { id: '1', group: 'A' },
        { id: '2', group: 'A' },
        { id: '3', group: 'B' },
        { id: '4', group: 'A' },
      ],
      'group',
    );

    expect(mergeInfo).toEqual([
      { isStart: true, span: 2 },
      { isStart: false, span: 0 },
      { isStart: true, span: 1 },
      { isStart: true, span: 1 },
    ]);
  });
});

describe('F1-GRID row height', () => {
  it('clamps row heights and applies keyboard resize steps', () => {
    expect(clampGridRowHeight(12, 40, 300)).toBe(40);
    expect(clampGridRowHeight(420, 40, 300)).toBe(300);
    expect(getGridRowHeightByKey(40, 'ArrowDown', 40, 300, 4)).toBe(44);
    expect(getGridRowHeightByKey(40, 'ArrowUp', 40, 300, 4)).toBe(40);
  });
});

describe('F1-GRID interaction', () => {
  it('rebases external rows when the grid has no pending changes', () => {
    const { rerender } = render(
      <F1Grid rows={rows} columns={columns} rowKey="id" />,
    );

    rerender(
      <F1Grid
        rows={[{ ...rows[0], code: 'DASH-UPDATED' }, rows[1]]}
        columns={columns}
        rowKey="id"
      />,
    );

    expect(
      screen.getByRole('gridcell', { name: 'DASH-UPDATED' }),
    ).toBeVisible();
  });

  it('moves DOM focus to the next editable cell with Tab', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.click(codeCell);
    fireEvent.doubleClick(codeCell);
    fireEvent.keyDown(screen.getByDisplayValue('DASH'), { key: 'Tab' });

    expect(document.activeElement).toBe(
      screen.getByRole('gridcell', { name: '1' }),
    );
  });
  it('calculates Ctrl and Shift selection from visible row indexes', () => {
    expect(
      getSelectedRowIds(['dashboard'], 'settings', {
        ctrlKey: true,
        shiftKey: false,
      }),
    ).toEqual(['dashboard', 'settings']);
    expect(
      getSelectedRowIds(['dashboard'], 'settings', {
        ctrlKey: false,
        shiftKey: true,
        visibleRowIds: ['dashboard', 'settings', 'reports'],
      }),
    ).toEqual(['dashboard', 'settings']);
  });

  it('finds the next editable cell across a row boundary', () => {
    expect(
      getNextEditableCell(
        { rowIndex: 0, columnIndex: 0 },
        [
          [true, false],
          [false, true],
        ],
        1,
      ),
    ).toEqual({ rowIndex: 1, columnIndex: 1 });
  });

  it('renders vertical column lines when columnLine is enabled', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" columnLine />);

    expect(
      getComputedStyle(screen.getByRole('columnheader', { name: '코드' }))
        .borderLeftWidth,
    ).toBe('1px');
    expect(
      getComputedStyle(screen.getByRole('gridcell', { name: 'DASH' }))
        .borderLeftWidth,
    ).toBe('1px');
    expect(
      getComputedStyle(screen.getByRole('gridcell', { name: 'DASH' }))
        .borderLeftColor,
    ).toBe(
      getComputedStyle(screen.getByRole('gridcell', { name: 'DASH' }))
        .borderTopColor,
    );
  });

  it('displays select labels and stores the selected option value', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    const statusCell = screen.getByRole('gridcell', { name: '작성중' });
    fireEvent.doubleClick(statusCell);
    expect(
      screen
        .getByRole('combobox')
        .closest('.MuiInputBase-root')
        ?.querySelector('fieldset'),
    ).toBeNull();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: '확정' }));

    expect(screen.getAllByRole('gridcell', { name: '확정' })).toHaveLength(2);
    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'dashboard', status: 'confirmed' }),
    ]);
  });

  it('edits dates as YYYY-MM-DD values', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '2026-08-27' }));
    const dateInput = screen.getByDisplayValue('2026-08-27');
    fireEvent.change(dateInput, { target: { value: '2026-09-01' } });
    fireEvent.keyDown(dateInput, { key: 'Enter' });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'dashboard', startDate: '2026-09-01' }),
    ]);
  });

  it('keeps predicate-disabled rows read-only', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '확정' }));

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('applies headerAlign independently from cell alignment', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    expect(screen.getByRole('columnheader', { name: '정렬' })).toHaveStyle({
      textAlign: 'center',
    });
  });

  it('centers cell content when align is set to center', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    expect(screen.getByRole('gridcell', { name: '1' })).toHaveStyle({
      justifyContent: 'center',
    });
  });

  it('only renders the select-all checkbox in the header when headerCheckbox is set', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    expect(screen.getByLabelText('사용 여부 전체 선택')).toBeInTheDocument();
    expect(screen.queryByLabelText('상태 전체 선택')).not.toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', {
        name: '사용 여부 전체 선택 사용 여부',
      }),
    ).toHaveTextContent('사용 여부');
  });

  it('selects rows through row checkboxes and exposes their IDs through the ref', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(screen.getByLabelText('dashboard 행 선택'));
    fireEvent.click(screen.getByLabelText('settings 행 선택'));

    expect(gridRef.current?.getSelectedRowIds()).toEqual([
      'dashboard',
      'settings',
    ]);
  });

  it('commits an inline text edit on Enter and returns the updated row', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.doubleClick(codeCell);
    fireEvent.change(screen.getByDisplayValue('DASH'), {
      target: { value: 'DASH-NEW' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('DASH-NEW'), { key: 'Enter' });

    expect(screen.getByRole('gridcell', { name: 'DASH-NEW' })).toBeVisible();
    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({
        id: 'dashboard',
        code: 'DASH-NEW',
        order: 1,
        enabled: true,
      }),
    ]);
  });

  it('keeps the editor focused while typing multiple characters', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.doubleClick(codeCell);
    const editor = screen.getByDisplayValue('DASH');

    fireEvent.change(editor, { target: { value: 'DASH-' } });

    expect(document.activeElement).toBe(editor);
  });

  it('keeps a merged value editable for a non-leading row', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();
    const mergeColumns: F1GridColumn<MenuRow>[] = [
      { field: 'status', headerName: '상태', editable: true, mergeRows: true },
    ];
    const mergeRows = [
      { ...rows[0], status: 'draft' },
      { ...rows[1], id: 'reports', status: 'draft' },
    ];

    render(
      <F1Grid
        ref={gridRef}
        rows={mergeRows}
        columns={mergeColumns}
        rowKey="id"
      />,
    );

    expect(screen.getAllByRole('gridcell', { name: 'draft' })).toHaveLength(1);
    expect(
      getComputedStyle(screen.getAllByRole('gridcell', { name: 'draft' })[0])
        .gridRow,
    ).toBe('1/span 2');
    fireEvent.doubleClick(screen.getAllByRole('gridcell')[1]);
    expect(getComputedStyle(screen.getAllByRole('gridcell')[0]).gridRow).toBe(
      '1',
    );
    fireEvent.change(screen.getByDisplayValue('draft'), {
      target: { value: 'confirmed' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('confirmed'), { key: 'Enter' });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'reports', status: 'confirmed' }),
    ]);
  });

  it('only unmerges the group containing the edited cell', () => {
    const mergeColumns: F1GridColumn<MenuRow>[] = [
      { field: 'status', headerName: '상태', editable: true, mergeRows: true },
    ];
    const mergeRows = [
      { ...rows[0], status: 'draft' },
      { ...rows[1], id: 'reports', status: 'draft' },
      { ...rows[0], id: 'confirmed-1', status: 'confirmed' },
      { ...rows[1], id: 'confirmed-2', status: 'confirmed' },
    ];

    render(<F1Grid rows={mergeRows} columns={mergeColumns} rowKey="id" />);

    fireEvent.doubleClick(screen.getAllByRole('gridcell')[1]);

    expect(
      getComputedStyle(
        screen.getAllByRole('gridcell', { name: 'confirmed' })[0],
      ).gridRow,
    ).toBe('3/span 2');
  });

  it('does not create an updated row when an edit is committed without a value change', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.doubleClick(codeCell);
    fireEvent.keyDown(screen.getByDisplayValue('DASH'), { key: 'Enter' });

    expect(gridRef.current?.getChanges()).toEqual({
      insertedRows: [],
      updatedRows: [],
      deletedRows: [],
    });
  });

  it('commits and exits edit mode when clicking outside the editing cell', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.doubleClick(codeCell);
    fireEvent.change(screen.getByDisplayValue('DASH'), {
      target: { value: 'DASH-NEW' },
    });

    fireEvent.mouseDown(document.body);

    expect(screen.queryByDisplayValue('DASH-NEW')).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'DASH-NEW' })).toBeVisible();
    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'dashboard', code: 'DASH-NEW' }),
    ]);
  });

  it('toggles all editable checkbox cells through the column header checkbox', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    const headerCheckbox = screen.getByLabelText('사용 여부 전체 선택');
    expect(headerCheckbox).toBeChecked();

    fireEvent.click(headerCheckbox);

    expect(screen.getByLabelText('사용 여부 dashboard')).not.toBeChecked();
    expect(screen.getByLabelText('사용 여부 settings')).not.toBeChecked();
    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'dashboard', enabled: false }),
      expect.objectContaining({ id: 'settings', enabled: false }),
    ]);

    fireEvent.click(headerCheckbox);

    expect(screen.getByLabelText('사용 여부 dashboard')).toBeChecked();
    expect(screen.getByLabelText('사용 여부 settings')).toBeChecked();
  });

  it('moves the focused cell with ArrowRight and starts editing with F2', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.click(codeCell);
    fireEvent.keyDown(codeCell, { key: 'ArrowRight' });

    const orderCell = screen.getByRole('gridcell', { name: '1' });
    expect(orderCell).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(orderCell, { key: 'F2' });

    expect(screen.getByDisplayValue('1')).toHaveAttribute('type', 'number');
  });
});
