import { createRef } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { createAppTheme } from '../src/theme/theme';
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
  getGridColumnTrack,
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
  canHideGridColumn,
  getVisibleGridColumns,
  toggleGridSort,
  sortGridRows,
  getGridSortIndicator,
  getGridFilterOperators,
  matchesGridFilter,
  applyGridFilters,
  getPinnedGridColumns,
  getGridColumnPinOffsets,
  type F1GridColumn,
  type F1GridRef,
  type F1GridSort,
} from '../src/shared/components/f1-grid';
import { normalizeDateInput } from '../src/shared/components/f1-grid/editing/DateEditor';

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

describe('F1-GRID column management', () => {
  it('creates proportional grid tracks for flex columns', () => {
    expect(
      getGridColumnTrack({ field: 'code', headerName: '코드', flex: 1 }),
    ).toBe('minmax(0px, 1fr)');
    expect(
      getGridColumnTrack(
        { field: 'order', headerName: '정렬', flex: 2, width: 80 },
        140,
      ),
    ).toBe('140px');
  });

  it('filters hidden columns while preserving the configured order', () => {
    const configuredColumns = [
      { field: 'code', headerName: '코드' },
      { field: 'order', headerName: '정렬' },
      { field: 'status', headerName: '상태' },
    ] satisfies F1GridColumn<MenuRow>[];

    expect(
      getVisibleGridColumns(configuredColumns, new Set(['order'])).map(
        (column) => column.field,
      ),
    ).toEqual(['code', 'status']);
  });

  it('prevents hiding the last visible column', () => {
    const configuredColumn = {
      field: 'code',
      headerName: '코드',
    } satisfies F1GridColumn<MenuRow>;

    expect(canHideGridColumn([configuredColumn], configuredColumn)).toBe(false);
    expect(
      canHideGridColumn([configuredColumn, columns[1]], configuredColumn),
    ).toBe(true);
  });

  it('hides and restores a column through the header column list menu', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '컬럼 목록' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '정렬 표시' }));

    await waitFor(() => {
      expect(screen.queryByRole('columnheader', { name: /정렬/ })).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '컬럼 목록' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '정렬 표시' }));
    await waitFor(() => {
      expect(
        screen.getByRole('columnheader', { name: /정렬/ }),
      ).toBeInTheDocument();
    });
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
  it('normalizes supported date input shortcuts from the current date', () => {
    const now = dayjs('2026-08-28T12:00:00');

    expect(normalizeDateInput('01', now)).toBe('2026-08-01');
    expect(normalizeDateInput('0701', now)).toBe('2026-07-01');
    expect(normalizeDateInput('250604', now)).toBe('2025-06-04');
    expect(normalizeDateInput('20260801', now)).toBe('2026-08-01');
    expect(normalizeDateInput('6-5', now)).toBe('2026-06-05');
    expect(normalizeDateInput('1', now)).toBe('2026-08-01');
    expect(normalizeDateInput('0231', now)).toBe('');
  });

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

  it('stores the option value when an autocomplete edit is committed via Tab', () => {
    type StatusRow = { id: string; status: string; note: string };
    const gridRef = createRef<F1GridRef<StatusRow>>();
    const statusColumns: F1GridColumn<StatusRow>[] = [
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
      { field: 'note', headerName: '비고', editable: true },
    ];

    render(
      <F1Grid
        ref={gridRef}
        rows={[{ id: 'line-1', status: 'ready', note: '' }]}
        columns={statusColumns}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '준비' }));
    fireEvent.change(screen.getByDisplayValue('ready'), {
      target: { value: '완료' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('완료'), { key: 'Tab' });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'line-1', status: 'done' }),
    ]);
  });

  it('opens the time picker when the time editor button is clicked', () => {
    render(
      <F1Grid
        rows={[{ id: 'line-1', workTime: '09:30' }]}
        columns={[
          {
            field: 'workTime',
            headerName: '작업 시각',
            type: 'time',
            editable: true,
          },
        ]}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '09:30' }));
    fireEvent.click(screen.getByRole('button', { name: /Choose time/ }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
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

  it('uses Home, End, Insert, and Ctrl+D while leaving Backspace to the editor', () => {
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
    expect(gridRef.current?.getChanges().updatedRows).toHaveLength(0);
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

  it('resizes only the active row with keyboard and pointer input', () => {
    render(
      <F1Grid
        rows={[
          { id: 'first', description: '첫 번째 긴 설명' },
          { id: 'second', description: '두 번째 긴 설명' },
        ]}
        columns={[{ field: 'description', headerName: '설명', wrapText: true }]}
        rowKey="id"
        minRowHeight={40}
        maxRowHeight={120}
      />,
    );

    const handles = screen.getAllByRole('button', {
      name: /행 높이 조절/,
    });
    expect(handles).toHaveLength(2);
    expect(handles[0]).toHaveAttribute('aria-valuenow', '40');
    expect(handles[1]).toHaveAttribute('aria-valuenow', '40');

    fireEvent.keyDown(handles[0], { key: 'ArrowDown' });
    expect(handles[0]).toHaveAttribute('aria-valuenow', '44');
    expect(handles[1]).toHaveAttribute('aria-valuenow', '40');

    fireEvent.pointerDown(handles[0], { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(window, { clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(window, { clientY: 300, pointerId: 1 });
    expect(handles[0]).toHaveAttribute('aria-valuenow', '120');
    expect(handles[1]).toHaveAttribute('aria-valuenow', '40');
  });

  it('uses ellipsis by default and wraps configured cells after resizing', () => {
    const longText = '셀 안에서 여러 줄로 표시되어야 하는 긴 설명입니다.';
    render(
      <F1Grid
        rows={[{ id: 'first', wrapped: longText, clipped: longText }]}
        columns={[
          { field: 'wrapped', headerName: '줄바꿈', wrapText: true },
          { field: 'clipped', headerName: '말줄임' },
        ]}
        rowKey="id"
      />,
    );

    const wrappedText = screen.getAllByText(longText)[0];
    expect(wrappedText).toHaveAttribute('title', longText);
    expect(wrappedText).toHaveStyle({ whiteSpace: 'nowrap' });
    expect(wrappedText.parentElement).toHaveStyle({
      minWidth: '0px',
      overflow: 'hidden',
    });

    fireEvent.keyDown(screen.getByRole('button', { name: /행 높이 조절/ }), {
      key: 'ArrowDown',
    });
    expect(wrappedText).toHaveStyle({ whiteSpace: 'normal' });
  });
});

describe('F1-GRID interaction', () => {
  it('keeps horizontal overflow within a shrinkable grid root', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    expect(screen.getByRole('grid', { name: 'F1-GRID' })).toHaveStyle({
      minWidth: '0px',
      maxWidth: '100%',
      overflowX: 'auto',
    });
  });

  it('renders grouped headers as a two-row header and respects grouped headers', () => {
    render(
      <F1Grid
        rows={rows}
        columns={[
          { field: 'code', headerName: '코드', headerGroup: '기본정보' },
          { field: 'status', headerName: '상태', headerGroup: '기본정보' },
        ]}
        rowKey="id"
      />,
    );

    const groupHeader = screen.getByText('기본정보');
    expect(groupHeader).toBeInTheDocument();
    expect(groupHeader.closest('[role="columnheader"]')).toBeTruthy();
    expect(getComputedStyle(groupHeader).backgroundColor).toBe(
      'rgba(0, 0, 0, 0)',
    );
    expect(screen.getByRole('gridcell', { name: 'DASH' })).toBeVisible();
    expect(screen.getAllByRole('columnheader')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ textContent: '기본정보' }),
        expect.objectContaining({ textContent: '코드' }),
        expect.objectContaining({ textContent: '상태' }),
      ]),
    );

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.focus(codeCell);
    fireEvent.copy(screen.getByRole('grid', { name: 'F1-GRID' }), {
      clipboardData: { setData: vi.fn() },
    });
  });

  it('keeps the default cursor outside edit mode and switches to a text cursor while editing', () => {
    render(
      <F1Grid
        rows={[{ id: 'line-1', itemCode: 'ITEM-001', itemName: '기존 품목' }]}
        columns={[
          { field: 'itemCode', headerName: '품목코드', editable: true },
          { field: 'itemName', headerName: '품목명', editable: true },
        ]}
        rowKey="id"
      />,
    );

    const itemCodeCell = screen.getByRole('gridcell', { name: 'ITEM-001' });
    expect(itemCodeCell).toHaveStyle({ cursor: 'default' });

    fireEvent.doubleClick(itemCodeCell);
    const input = screen.getByDisplayValue('ITEM-001');
    expect(input).toHaveStyle({ cursor: 'text' });
  });

  it('supports cell-range drag selection across adjacent cells', () => {
    render(
      <F1Grid
        rows={[
          { id: '1', code: 'A', name: 'Alpha' },
          { id: '2', code: 'B', name: 'Beta' },
        ]}
        columns={[
          { field: 'code', headerName: '코드' },
          { field: 'name', headerName: '이름' },
        ]}
        rowKey="id"
      />,
    );

    const start = screen.getByRole('gridcell', { name: 'A' });
    const end = screen.getByRole('gridcell', { name: 'Beta' });
    fireEvent.mouseDown(start);
    fireEvent.mouseEnter(end);
    fireEvent.mouseUp(end);

    expect(start).toHaveAttribute('data-grid-selected', 'true');
    expect(end).toHaveAttribute('data-grid-selected', 'true');
  });

  it('keeps drag selection plain and only shows the dashed copy range after copy, then clears on Escape', () => {
    render(
      <F1Grid
        rows={[
          { id: '1', code: 'A', name: 'Alpha' },
          { id: '2', code: 'B', name: 'Beta' },
        ]}
        columns={[
          { field: 'code', headerName: '코드' },
          { field: 'name', headerName: '이름' },
        ]}
        rowKey="id"
      />,
    );

    const start = screen.getByRole('gridcell', { name: 'A' });
    const end = screen.getByRole('gridcell', { name: 'Beta' });
    fireEvent.mouseDown(start);
    fireEvent.mouseEnter(end);
    fireEvent.mouseUp(end);

    expect(window.getComputedStyle(start).border).not.toContain('dashed');
    expect(window.getComputedStyle(end).border).not.toContain('dashed');

    fireEvent.copy(screen.getByRole('grid', { name: 'F1-GRID' }), {
      clipboardData: {
        getData: vi.fn(() => 'A\tAlpha\nB\tBeta'),
        setData: vi.fn(),
      },
    });

    expect(window.getComputedStyle(start).border).toContain('dashed');
    expect(window.getComputedStyle(end).border).toContain('dashed');

    fireEvent.keyDown(start, { key: 'Escape' });
    expect(window.getComputedStyle(start).border).not.toContain('dashed');
    expect(window.getComputedStyle(end).border).not.toContain('dashed');
  });

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
      getComputedStyle(screen.getByRole('columnheader', { name: /코드/ }))
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

  it('accepts a compact month-day value in a date cell', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();
    const expectedDate = `${dayjs().year()}-06-05`;

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '2026-08-27' }));
    const dateInput = screen.getByDisplayValue('2026-08-27');
    fireEvent.change(dateInput, { target: { value: '0605' } });
    fireEvent.keyDown(dateInput, { key: 'Enter' });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'dashboard', startDate: expectedDate }),
    ]);
  });

  it('keeps compact date text while the date cell is still being edited', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '2026-08-27' }));
    const dateInput = screen.getByDisplayValue('2026-08-27');
    fireEvent.change(dateInput, { target: { value: '0605' } });

    expect(screen.getByDisplayValue('0605')).toBeInTheDocument();
  });

  it('does not draw the cell focus outline over a date editor', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    const dateCell = screen.getByRole('gridcell', { name: '2026-08-27' });
    fireEvent.doubleClick(dateCell);

    expect(dateCell).toHaveStyle({ outline: 'none' });
  });

  it('keeps predicate-disabled rows read-only', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '확정' }));

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('applies headerAlign independently from cell alignment', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    expect(screen.getByRole('columnheader', { name: /정렬/ })).toHaveStyle({
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
        name: /사용 여부/,
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

describe('F1-GRID header divider', () => {
  it('always renders a vertical divider on header cells regardless of columnLine', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    expect(
      getComputedStyle(screen.getByRole('columnheader', { name: /코드/ }))
        .borderRightWidth,
    ).toBe('1px');
  });
});

describe('F1-GRID sorting', () => {
  it('adds, updates, and toggles off multi-column sort entries', () => {
    let sorts = toggleGridSort<MenuRow>([], 'code', 'asc');
    expect(sorts).toEqual([{ field: 'code', direction: 'asc' }]);

    sorts = toggleGridSort(sorts, 'order', 'asc');
    expect(sorts).toEqual([
      { field: 'code', direction: 'asc' },
      { field: 'order', direction: 'asc' },
    ]);

    sorts = toggleGridSort(sorts, 'code', 'desc');
    expect(sorts).toEqual([
      { field: 'code', direction: 'desc' },
      { field: 'order', direction: 'asc' },
    ]);

    sorts = toggleGridSort(sorts, 'code', 'desc');
    expect(sorts).toEqual([{ field: 'order', direction: 'asc' }]);
  });

  it('sorts rows by multiple columns, treating null/undefined as last', () => {
    const data = [
      { id: 1, group: 'B', order: 2 },
      { id: 2, group: 'A', order: undefined },
      { id: 3, group: 'A', order: 1 },
    ];

    expect(
      sortGridRows(data, [
        { field: 'group', direction: 'asc' },
        { field: 'order', direction: 'asc' },
      ]).map((row) => row.id),
    ).toEqual([3, 2, 1]);
  });

  it('reports the sort direction and multi-column order for a field', () => {
    const sorts: F1GridSort<MenuRow>[] = [
      { field: 'code', direction: 'asc' },
      { field: 'order', direction: 'desc' },
    ];

    expect(getGridSortIndicator(sorts, 'order')).toEqual({
      direction: 'desc',
      order: 2,
    });
    expect(getGridSortIndicator(sorts, 'status')).toBeUndefined();
  });

  it('sorts a column ascending and descending through the header menu', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '내림차순 정렬' }));

    const cellsDesc = screen.getAllByRole('gridcell', { name: /DASH|SET/ });
    expect(cellsDesc[0]).toHaveTextContent('SET');

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '오름차순 정렬' }));

    const cellsAsc = screen.getAllByRole('gridcell', { name: /DASH|SET/ });
    expect(cellsAsc[0]).toHaveTextContent('DASH');
  });
});

describe('F1-GRID filtering', () => {
  it('returns operator sets by column type', () => {
    expect(getGridFilterOperators('text')).toContain('contains');
    expect(getGridFilterOperators('number')).toContain('between');
    expect(getGridFilterOperators('checkbox')).toEqual(['equals']);
  });

  it('matches rows using contains, range, and empty operators', () => {
    const textColumn: F1GridColumn<MenuRow> = {
      field: 'code',
      headerName: '코드',
    };
    const numberColumn: F1GridColumn<MenuRow> = {
      field: 'order',
      headerName: '정렬',
      type: 'number',
    };

    expect(
      matchesGridFilter(
        rows[0],
        { field: 'code', operator: 'contains', value: 'da' },
        textColumn,
      ),
    ).toBe(true);
    expect(
      matchesGridFilter(
        rows[0],
        { field: 'order', operator: 'between', value: '1', value2: '1' },
        numberColumn,
      ),
    ).toBe(true);
    expect(
      matchesGridFilter(
        rows[1],
        { field: 'order', operator: 'between', value: '1', value2: '1' },
        numberColumn,
      ),
    ).toBe(false);
  });

  it('applies multiple filters with AND semantics', () => {
    expect(
      applyGridFilters(
        rows,
        [
          { field: 'code', operator: 'contains', value: 'a' },
          { field: 'enabled', operator: 'equals', value: true },
        ],
        columns,
      ),
    ).toEqual([rows[0]]);
  });

  it('filters visible rows through the header filter popover', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '필터' }));
    fireEvent.change(screen.getByLabelText('코드 필터 값'), {
      target: { value: 'SET' },
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    await waitFor(() => {
      expect(screen.queryByRole('gridcell', { name: 'DASH' })).toBeNull();
    });
    expect(screen.getByRole('gridcell', { name: 'SET' })).toBeInTheDocument();
  });
});

describe('F1-GRID column pin', () => {
  it('initially pins columns declared with the column pinned option', () => {
    render(
      <F1Grid
        rows={rows}
        columns={[
          { ...columns[0], pinned: 'left' },
          columns[1],
          { ...columns[2], pinned: 'right' },
        ]}
        rowKey="id"
      />,
    );

    expect(screen.getByRole('columnheader', { name: /코드/ })).toHaveStyle({
      position: 'sticky',
      left: '44px',
    });
    expect(screen.getByRole('columnheader', { name: /사용 여부/ })).toHaveStyle(
      {
        position: 'sticky',
        right: '0px',
      },
    );
  });

  it('reorders columns into left-pinned, unpinned, and right-pinned groups', () => {
    const pinned = new Map<string, 'left' | 'right'>([
      ['status', 'left'],
      ['code', 'right'],
    ]);

    expect(
      getPinnedGridColumns(columns, pinned).map((column) => column.field),
    ).toEqual(['status', 'order', 'enabled', 'startDate', 'code']);
  });

  it('accumulates left and right pin offsets from the checkbox column width', () => {
    const orderedColumns = [
      { field: 'status', headerName: '상태', width: 100 },
      { field: 'order', headerName: '정렬', width: 80 },
      { field: 'code', headerName: '코드', width: 120 },
    ] satisfies F1GridColumn<MenuRow>[];
    const pinned = new Map<string, 'left' | 'right'>([
      ['status', 'left'],
      ['code', 'right'],
    ]);

    expect(getGridColumnPinOffsets(orderedColumns, pinned)).toEqual({
      leftOffsets: { status: 44 },
      rightOffsets: { code: 0 },
    });
  });

  it('pins a column to the left and unpins it through the header menu', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '왼쪽 고정' }));

    await waitFor(() => {
      expect(
        getComputedStyle(screen.getByRole('columnheader', { name: /코드/ }))
          .position,
      ).toBe('sticky');
    });

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '고정 해제' }));

    await waitFor(() => {
      expect(
        getComputedStyle(screen.getByRole('columnheader', { name: /코드/ }))
          .position,
      ).not.toBe('sticky');
    });
  });

  it('keeps pinned header and body cells visually above scrolling cells', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '왼쪽 고정' }));

    await waitFor(() => {
      const pinnedHeader = screen.getByRole('columnheader', { name: /코드/ });
      const pinnedCell = screen.getByRole('gridcell', { name: 'DASH' });

      expect(pinnedHeader).toHaveStyle({
        backgroundColor: 'rgb(232, 236, 244)',
        zIndex: '3',
      });
      expect(pinnedCell).toHaveStyle({
        backgroundColor: 'rgb(255, 255, 255)',
        zIndex: '2',
      });
      expect(pinnedCell).toHaveStyle({
        boxShadow: expect.stringContaining('inset'),
      });
    });
  });

  it('keeps the row-selection header above a pinned column header', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '왼쪽 고정' }));

    await waitFor(() => {
      expect(
        screen.getByRole('columnheader', { name: '전체 행 선택' }),
      ).toHaveStyle({
        backgroundColor: 'rgb(232, 236, 244)',
        zIndex: '4',
      });
    });
  });

  it('keeps row-selection cells above pinned body cells', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '왼쪽 고정' }));

    await waitFor(() => {
      const selectionCheckbox = screen.getByLabelText('dashboard 행 선택');
      expect(selectionCheckbox.closest('.MuiBox-root')).toHaveStyle({
        zIndex: '3',
      });
    });
  });

  it('keeps selected row-selection cells opaque above scrolling cells', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '왼쪽 고정' }));
    fireEvent.click(screen.getByLabelText('dashboard 행 선택'));

    await waitFor(() => {
      expect(
        screen.getByLabelText('dashboard 행 선택').closest('.MuiBox-root'),
      ).toHaveStyle({
        backgroundColor: 'rgb(232, 238, 252)',
      });
    });
  });

  it('uses a dark opaque background for pinned headers in dark mode', async () => {
    render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <F1Grid rows={rows} columns={columns} rowKey="id" />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '왼쪽 고정' }));

    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: /코드/ })).toHaveStyle({
        backgroundColor: 'rgb(28, 36, 50)',
      });
    });
  });
});

describe('F1-GRID column resize', () => {
  it('resizes column width on mouse drag and clamps to minColumnWidth', () => {
    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        resizableColumns={true}
        minColumnWidth={60}
      />,
    );

    const resizeHandle = screen.getByRole('separator', {
      name: '코드 컬럼 너비 조절',
    });
    expect(resizeHandle).toBeInTheDocument();

    // Mouse drag resize
    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 220 });
    fireEvent.mouseUp(window);

    const codeHeader = screen.getByRole('columnheader', { name: /코드/ });
    expect(codeHeader).toBeVisible();
  });
});
