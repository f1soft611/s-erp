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
import { describe, expect, it, afterEach } from 'vitest';
import { createAppTheme } from '../src/theme/theme';
import { AppSettingsProvider } from '../src/shared/context/AppSettingsContext';
import {
  addGridRow,
  createGridData,
  duplicateGridRows,
  F1Grid,
  getGridChanges,
  getAutoFitColumnWidth,
  getCellDisplayValue,
  getGridMergeInfo,
  clampGridRowHeight,
  getGridRowHeightByKey,
  getGridColumnTrack,
  getGridColumnTracks,
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
  reorderGridColumns,
  moveGridColumnOrder,
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
import { NumberEditor } from '../src/shared/components/f1-grid/editing/NumberEditor';
import { TextEditor } from '../src/shared/components/f1-grid/editing/TextEditor';

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

describe('F1-GRID editor behavior', () => {
  it('selects the current value when the editor receives focus by default', () => {
    render(
      <ThemeProvider theme={createAppTheme()}>
        <TextEditor
          value="HELLO"
          onChange={() => undefined}
          onKeyDown={() => undefined}
        />
      </ThemeProvider>,
    );

    const input = screen.getByDisplayValue('HELLO') as HTMLInputElement;
    input.setSelectionRange(1, 3);

    fireEvent.focus(input);

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(5);
  });

  it('selects the current value for number editors when focused', () => {
    render(
      <ThemeProvider theme={createAppTheme()}>
        <NumberEditor
          value="12345"
          onChange={() => undefined}
          onKeyDown={() => undefined}
        />
      </ThemeProvider>,
    );

    const input = screen.getByDisplayValue('12345') as HTMLInputElement;
    fireEvent.focus(input);

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(5);
  });
});

describe('F1-GRID number formatting', () => {
  it('formats numeric values with a custom decimal precision', () => {
    const column: F1GridColumn<{ amount: number }>[][0] = {
      field: 'amount',
      headerName: '금액',
      type: 'number',
      format: 'number',
      decimalPlaces: 2,
    };

    expect(getCellDisplayValue(column, 12345.6)).toBe('12,345.60');
  });

  it('formats currency values when a custom number format is specified', () => {
    const column: F1GridColumn<{ amount: number }>[][0] = {
      field: 'amount',
      headerName: '금액',
      type: 'currency',
      format: 'currency',
      decimalPlaces: 0,
    };

    expect(getCellDisplayValue(column, 12345.6)).toBe('₩12,346');
  });
});

describe('F1-GRID editor plugins', () => {
  it('does not start editing by default unless an editor plugin is registered', () => {
    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        ariaLabel="grid without editor plugin"
      />,
    );

    const codeCell = screen.getByText('DASH');
    fireEvent.doubleClick(codeCell);

    expect(screen.queryByDisplayValue('DASH')).not.toBeInTheDocument();
  });

  it('invokes before/after edit hooks only when an editor plugin allows editing', () => {
    const onBeforeEdit = vi.fn(() => true);
    const onAfterEdit = vi.fn();

    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        ariaLabel="grid with editor plugin"
        editorPlugins={[
          {
            canEdit: () => true,
          },
        ]}
        onBeforeEdit={onBeforeEdit}
        onAfterEdit={onAfterEdit}
      />,
    );

    const codeCell = screen.getByText('DASH');
    fireEvent.doubleClick(codeCell);

    expect(onBeforeEdit).toHaveBeenCalled();
    expect(onAfterEdit).toHaveBeenCalled();
    expect(screen.getByDisplayValue('DASH')).toBeInTheDocument();
  });

  it('does not enable editing from a plugin when the column is not explicitly editable', () => {
    const columnsWithoutEditableFlag: F1GridColumn<MenuRow>[] = [
      { field: 'code', headerName: '코드', editable: false },
    ];

    render(
      <F1Grid
        rows={rows}
        columns={columnsWithoutEditableFlag}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    fireEvent.doubleClick(screen.getByText('DASH'));

    expect(screen.queryByDisplayValue('DASH')).not.toBeInTheDocument();
  });
});

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

  it('uses the configured width for a pinned flex column', () => {
    expect(
      getGridColumnTrack(
        { field: 'code', headerName: '코드', flex: 1, width: 130 },
        undefined,
        true,
      ),
    ).toBe('130px');
  });

  it('resolves flex columns into shared pixel tracks for the header and body', () => {
    expect(
      getGridColumnTracks(
        [
          { field: 'code', headerName: '코드', width: 100 },
          { field: 'order', headerName: '정렬', width: 120, flex: 2 },
          { field: 'status', headerName: '상태', width: 60, flex: 1 },
        ],
        {},
        new Map(),
        600,
        44,
      ),
    ).toBe('44px 100px 304px 152px');
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

  it('reorders columns according to the given field order, keeping unknown fields at the end', () => {
    const configuredColumns = [
      { field: 'code', headerName: '코드' },
      { field: 'order', headerName: '정렬' },
      { field: 'status', headerName: '상태' },
    ] satisfies F1GridColumn<MenuRow>[];

    expect(
      reorderGridColumns(configuredColumns, ['status', 'code']).map(
        (column) => column.field,
      ),
    ).toEqual(['status', 'code', 'order']);
  });

  it('moves a field before the target field position', () => {
    expect(moveGridColumnOrder(['a', 'b', 'c'], 'a', 'c')).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(moveGridColumnOrder(['a', 'b', 'c'], 'c', 'a')).toEqual([
      'c',
      'a',
      'b',
    ]);
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

describe('F1-GRID cell range selection', () => {
  it('keeps the drag overlay within the selected cell bounds', async () => {
    const { container } = render(
      <ThemeProvider theme={createAppTheme()}>
        <AppSettingsProvider>
          <F1Grid
            rows={rows}
            columns={columns}
            rowKey="id"
            showCheckbox={false}
          />
        </AppSettingsProvider>
      </ThemeProvider>,
    );

    const cells = Array.from(container.querySelectorAll('[role="gridcell"]'));
    expect(cells.length).toBeGreaterThanOrEqual(4);

    const startCell = cells[0] as HTMLElement;
    const endCell = cells[1] as HTMLElement;
    const bodyScroll = container.querySelector(
      '[role="grid"] > div:last-child',
    );
    const mockGetBoundingClientRect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function () {
        if (this === startCell) {
          return {
            left: 100,
            top: 40,
            right: 180,
            bottom: 90,
            width: 80,
            height: 50,
            x: 100,
            y: 40,
            toJSON: () => ({}),
          } as DOMRect;
        }
        if (this === endCell) {
          return {
            left: 100,
            top: 90,
            right: 180,
            bottom: 160,
            width: 80,
            height: 70,
            x: 100,
            y: 90,
            toJSON: () => ({}),
          } as DOMRect;
        }
        if (this === bodyScroll) {
          return {
            left: 0,
            top: 0,
            right: 400,
            bottom: 220,
            width: 400,
            height: 220,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          } as DOMRect;
        }
        return {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect;
      });

    fireEvent.mouseDown(startCell);
    fireEvent.mouseEnter(endCell);

    await waitFor(() => {
      expect(document.querySelector('[data-range-overlay]')).not.toBeNull();
    });

    const overlay = document.querySelector(
      '[data-range-overlay]',
    ) as HTMLElement;
    const overlayStyle = window.getComputedStyle(overlay);

    expect(parseFloat(overlayStyle.width)).toBeLessThanOrEqual(80);
    expect(parseFloat(overlayStyle.height)).toBeLessThanOrEqual(120);
    expect(parseFloat(overlayStyle.left)).toBeGreaterThanOrEqual(100);
    expect(parseFloat(overlayStyle.top)).toBeGreaterThanOrEqual(40);
    expect(parseFloat(overlayStyle.width)).toBeLessThanOrEqual(80 - 2);
    expect(parseFloat(overlayStyle.height)).toBeLessThanOrEqual(120 - 2);

    mockGetBoundingClientRect.mockRestore();
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

  it('renders an empty-state message when there are no rows', () => {
    render(<F1Grid rows={[]} columns={columns} rowKey="id" />);

    expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument();
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

describe('F1-GRID dirty indicator across column types', () => {
  type MixedRow = {
    id: string;
    name: string;
    qty: number;
    active: boolean;
    startDate: string;
    workTime: string;
  };
  const mixedColumns: F1GridColumn<MixedRow>[] = [
    { field: 'name', headerName: '이름', editable: true },
    { field: 'qty', headerName: '수량', type: 'number', editable: true },
    {
      field: 'active',
      headerName: '사용',
      type: 'checkbox',
      editable: true,
    },
    {
      field: 'startDate',
      headerName: '시작일',
      type: 'date',
      editable: true,
    },
    { field: 'workTime', headerName: '작업시각', type: 'time', editable: true },
  ];
  const mixedRows: MixedRow[] = [
    {
      id: 'line-1',
      name: 'Item',
      qty: 5,
      active: false,
      startDate: '2026-08-27',
      workTime: '09:30',
    },
  ];

  it('marks a text cell dirty after an edit', () => {
    render(
      <F1Grid
        rows={mixedRows}
        columns={mixedColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    const nameCell = screen.getByRole('gridcell', { name: 'Item' });
    fireEvent.doubleClick(nameCell);
    fireEvent.change(screen.getByDisplayValue('Item'), {
      target: { value: 'Item-2' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('Item-2'), { key: 'Enter' });

    expect(nameCell).toHaveAttribute('data-dirty-cell', 'true');
  });

  it('marks a number cell dirty after an edit', () => {
    render(
      <F1Grid
        rows={mixedRows}
        columns={mixedColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    const qtyCell = screen.getByRole('gridcell', { name: '5' });
    fireEvent.doubleClick(qtyCell);
    fireEvent.change(screen.getByDisplayValue('5'), {
      target: { value: '9' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('9'), { key: 'Enter' });

    expect(qtyCell).toHaveAttribute('data-dirty-cell', 'true');
  });

  it('marks a checkbox cell dirty after a toggle', () => {
    render(
      <F1Grid
        rows={mixedRows}
        columns={mixedColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: '사용 line-1' });
    fireEvent.click(checkbox);

    expect(checkbox.closest('[role="gridcell"]')).toHaveAttribute(
      'data-dirty-cell',
      'true',
    );
  });

  it('marks a date cell dirty after an edit', () => {
    render(
      <F1Grid
        rows={mixedRows}
        columns={mixedColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    const dateCell = screen.getByRole('gridcell', { name: '2026-08-27' });
    fireEvent.doubleClick(dateCell);
    fireEvent.change(screen.getByDisplayValue('2026-08-27'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('2026-09-01'), {
      key: 'Enter',
    });

    expect(dateCell).toHaveAttribute('data-dirty-cell', 'true');
  });

  it('marks a time cell dirty after an edit', () => {
    render(
      <F1Grid
        rows={mixedRows}
        columns={mixedColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    const timeCell = screen.getByRole('gridcell', { name: '09:30' });
    fireEvent.doubleClick(timeCell);
    fireEvent.change(screen.getByDisplayValue('09:30'), {
      target: { value: '14:15' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('14:15'), { key: 'Enter' });

    expect(timeCell).toHaveAttribute('data-dirty-cell', 'true');
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

  it('removes newly inserted rows from all changes when deleted', () => {
    const added = addGridRow(
      createGridData(rows, 'id'),
      {
        id: 'menus',
        code: 'MENU',
        order: 3,
        enabled: true,
        startDate: '2026-08-29',
        status: 'draft',
      },
      'id',
    );
    const deleted = markRowsDeleted(added, 'id', ['menus']);

    expect(getGridChanges(deleted, 'id')).toEqual({
      insertedRows: [],
      updatedRows: [],
      deletedRows: [],
    });
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

  it('keeps a lower merge inside the active parent merge group', () => {
    const rows = [
      { id: '1', itemName: '품목 A', category: 'RAW' },
      { id: '2', itemName: '품목 A', category: 'RAW' },
      { id: '3', itemName: '품목 B', category: 'RAW' },
      { id: '4', itemName: '품목 B', category: 'RAW' },
    ];
    const itemNameInfo = getGridMergeInfo(rows, 'itemName');
    const parentGroupByRow: number[] = [];

    itemNameInfo.forEach((info, rowIndex) => {
      parentGroupByRow[rowIndex] = info.isStart
        ? rowIndex
        : rowIndex > 0
          ? parentGroupByRow[rowIndex - 1]
          : rowIndex;
    });

    const categoryInfo = getGridMergeInfo(rows, 'category', parentGroupByRow);

    expect(categoryInfo).toEqual([
      { isStart: true, span: 2 },
      { isStart: false, span: 0 },
      { isStart: true, span: 2 },
      { isStart: false, span: 0 },
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

  it('scales default row height by the AppSettings display scale', () => {
    window.localStorage.setItem('erp-display-scale', '1.2');
    render(
      <AppSettingsProvider>
        <F1Grid
          rows={[{ id: 'first', code: 'A' }]}
          columns={[{ field: 'code', headerName: '코드' }]}
          rowKey="id"
          minRowHeight={40}
          maxRowHeight={200}
        />
      </AppSettingsProvider>,
    );

    const handle = screen.getByRole('button', { name: /행 높이 조절/ });
    expect(handle).toHaveAttribute('aria-valuenow', '48');
    window.localStorage.removeItem('erp-display-scale');
  });

  it('defaults to an unscaled row height without an AppSettingsProvider', () => {
    render(
      <F1Grid
        rows={[{ id: 'first', code: 'A' }]}
        columns={[{ field: 'code', headerName: '코드' }]}
        rowKey="id"
        minRowHeight={40}
        maxRowHeight={200}
      />,
    );

    const handle = screen.getByRole('button', { name: /행 높이 조절/ });
    expect(handle).toHaveAttribute('aria-valuenow', '40');
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

  it('keeps the edit focus border visible without clipping at the bottom edge', () => {
    render(
      <F1Grid
        rows={[{ id: 'line-1', itemCode: 'ITEM-001' }]}
        columns={[
          { field: 'itemCode', headerName: '품목코드', editable: true },
        ]}
        rowKey="id"
      />,
    );

    const itemCodeCell = screen.getByRole('gridcell', { name: 'ITEM-001' });
    fireEvent.doubleClick(itemCodeCell);

    expect(itemCodeCell).not.toHaveStyle({ overflow: 'hidden' });
    expect(itemCodeCell).toHaveStyle({ overflow: 'visible' });
  });

  it('sizes a text editor to the full height of its compact grid cell', () => {
    render(
      <F1Grid
        rows={[{ id: 'line-1', itemCode: 'ITEM-001' }]}
        columns={[
          { field: 'itemCode', headerName: '품목코드', editable: true },
        ]}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'ITEM-001' }));

    const input = screen.getByDisplayValue('ITEM-001');
    expect(input.closest('.MuiInputBase-root')).toHaveStyle({ height: '100%' });
    expect(input).toHaveStyle({ height: '100%' });
  });

  it('sizes number editors to the full height of their compact grid cells', () => {
    render(
      <F1Grid
        rows={[{ id: 'line-1', quantity: 12 }]}
        columns={[
          {
            field: 'quantity',
            headerName: '수량',
            type: 'number',
            editable: true,
          },
        ]}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '12' }));

    const input = screen.getByDisplayValue('12');
    expect(input.closest('.MuiInputBase-root')).toHaveStyle({ height: '100%' });
    expect(input).toHaveStyle({ height: '100%' });
  });

  it('moves focus to the newly dragged cell immediately so the prior selection is cleared', () => {
    render(
      <F1Grid
        rows={[
          { id: '1', code: 'A', name: 'Alpha' },
          { id: '2', code: 'B', name: 'Beta' },
          { id: '3', code: 'C', name: 'Gamma' },
        ]}
        columns={[
          { field: 'code', headerName: '코드' },
          { field: 'name', headerName: '이름' },
        ]}
        rowKey="id"
      />,
    );

    const firstCell = screen.getByRole('gridcell', { name: 'A' });
    const secondCell = screen.getByRole('gridcell', { name: 'Gamma' });

    fireEvent.mouseDown(firstCell);
    fireEvent.mouseDown(secondCell);

    expect(secondCell).toHaveAttribute('tabindex', '0');
    expect(firstCell).toHaveAttribute('tabindex', '-1');
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
    expect(
      document.querySelector('[data-range-overlay="drag"]'),
    ).toBeInTheDocument();
    expect(
      window.getComputedStyle(
        document.querySelector('[data-range-overlay="drag"]') as HTMLElement,
      ).borderTopStyle,
    ).toBe('solid');
  });

  it('supports cell-range drag selection across merged rows', () => {
    render(
      <F1Grid
        rows={[
          { id: '1', code: 'A', name: 'Alpha' },
          { id: '2', code: 'A', name: 'Beta' },
        ]}
        columns={[
          { field: 'code', headerName: '코드', mergeRows: true },
          { field: 'name', headerName: '이름' },
        ]}
        rowKey="id"
      />,
    );

    const cells = screen.getAllByRole('gridcell');
    fireEvent.mouseDown(cells[0]);
    fireEvent.mouseEnter(cells[2]);
    fireEvent.mouseUp(cells[2]);

    expect(cells[0]).toHaveAttribute('data-grid-selected', 'true');
    expect(cells[2]).toHaveAttribute('data-grid-selected', 'true');
    expect(window.getComputedStyle(cells[2]).pointerEvents).toBe('auto');
  });

  it('supports cell-range drag selection on pinned merged columns', () => {
    render(
      <F1Grid
        rows={[
          { id: '1', code: 'A', name: 'Alpha' },
          { id: '2', code: 'A', name: 'Beta' },
        ]}
        columns={[
          {
            field: 'code',
            headerName: '코드',
            mergeRows: true,
            pinned: 'left',
          },
          { field: 'name', headerName: '이름' },
        ]}
        rowKey="id"
      />,
    );

    const cells = screen.getAllByRole('gridcell');
    fireEvent.mouseDown(cells[0]);
    fireEvent.mouseEnter(cells[2]);
    fireEvent.mouseUp(cells[2]);

    expect(cells[0]).toHaveAttribute('data-grid-selected', 'true');
    expect(cells[2]).toHaveAttribute('data-grid-selected', 'true');
    expect(window.getComputedStyle(cells[2]).pointerEvents).toBe('auto');
  });

  it('keeps the top border visible when a multi-cell selection starts on the first row', () => {
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
    const end = screen.getByRole('gridcell', { name: 'Alpha' });
    fireEvent.mouseDown(start);
    fireEvent.mouseEnter(end);
    fireEvent.mouseUp(end);

    const overlay = document.querySelector('[data-range-overlay="drag"]');
    expect(overlay).toBeInTheDocument();
    expect(
      parseFloat((overlay as HTMLElement).style.top || '0'),
    ).toBeGreaterThanOrEqual(0);
    expect(window.getComputedStyle(overlay as HTMLElement).borderTopStyle).toBe(
      'solid',
    );
  });

  it('keeps drag selection plain and only draws a single outer rectangle around the copied range, then clears on Escape', () => {
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

    expect(start).not.toHaveStyle({ outline: '2px solid' });
    expect(window.getComputedStyle(start).border).not.toContain('solid');
    expect(window.getComputedStyle(end).border).not.toContain('solid');
    expect(start).not.toHaveStyle({ outline: '1px solid' });

    fireEvent.copy(screen.getByRole('grid', { name: 'F1-GRID' }), {
      clipboardData: {
        getData: vi.fn(() => 'A\tAlpha\nB\tBeta'),
        setData: vi.fn(),
      },
    });

    const copiedOverlay = screen
      .getByRole('grid', { name: 'F1-GRID' })
      .querySelector('[data-range-overlay="copy"]');
    expect(copiedOverlay).toBeInTheDocument();
    expect(
      window.getComputedStyle(copiedOverlay as HTMLElement).borderStyle,
    ).toBe('dashed');
    expect(window.getComputedStyle(start).border).not.toContain('solid');
    expect(window.getComputedStyle(end).border).not.toContain('solid');

    fireEvent.keyDown(start, { key: 'Escape' });
    expect(
      screen
        .getByRole('grid', { name: 'F1-GRID' })
        .querySelector('[data-range-overlay="copy"]'),
    ).not.toBeInTheDocument();
    expect(window.getComputedStyle(start).border).not.toContain('solid');
    expect(window.getComputedStyle(end).border).not.toContain('solid');
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

  it('renders vertical column lines once between columns when columnLine is enabled', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" columnLine />);

    const codeHeader = screen.getByRole('columnheader', { name: /코드/ });
    const orderHeader = screen.getByRole('columnheader', { name: /정렬/ });
    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    const orderCell = screen.getByRole('gridcell', { name: '1' });

    expect(getComputedStyle(codeHeader).borderLeftWidth).toBe('0px');
    expect(getComputedStyle(codeHeader).borderRightWidth).toBe('0px');
    expect(getComputedStyle(orderHeader).borderLeftWidth).toBe('1px');
    expect(getComputedStyle(codeCell).borderLeftWidth).toBe('0px');
    expect(getComputedStyle(orderCell).borderLeftWidth).toBe('1px');
    expect(getComputedStyle(orderCell).borderLeftColor).toBe(
      getComputedStyle(orderCell).borderTopColor,
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

  it('keeps the active edit border visible for date and time editors', () => {
    render(
      <F1Grid
        rows={[
          {
            id: 'dashboard',
            code: 'DASH',
            order: 1,
            enabled: true,
            startDate: '2026-08-27',
            status: '09:30',
          },
        ]}
        columns={[
          { field: 'code', headerName: '코드', editable: true },
          {
            field: 'startDate',
            headerName: '시작일',
            editable: true,
            type: 'date',
          },
          {
            field: 'status',
            headerName: '상태',
            editable: true,
            type: 'time',
          },
        ]}
        rowKey="id"
      />,
    );

    const dateCell = screen.getByRole('gridcell', { name: '2026-08-27' });
    fireEvent.doubleClick(dateCell);
    expect(dateCell).toHaveStyle({ outline: '2px solid' });

    const timeCell = screen.getByRole('gridcell', { name: '09:30' });
    fireEvent.doubleClick(timeCell);
    expect(timeCell).toHaveStyle({ outline: '2px solid' });
  });

  it('does not apply the theme default TextField margin to date/time editors', () => {
    render(
      <F1Grid
        rows={[
          {
            id: 'dashboard',
            code: 'DASH',
            order: 1,
            enabled: true,
            startDate: '2026-08-27',
            status: '09:30',
          },
        ]}
        columns={[
          { field: 'code', headerName: '코드', editable: true },
          {
            field: 'startDate',
            headerName: '시작일',
            editable: true,
            type: 'date',
          },
          {
            field: 'status',
            headerName: '상태',
            editable: true,
            type: 'time',
          },
        ]}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '2026-08-27' }));
    const dateInput = screen.getByDisplayValue('2026-08-27');
    expect(dateInput.closest('.MuiFormControl-root')).not.toHaveClass(
      'MuiFormControl-marginNormal',
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '09:30' }));
    const timeInput = screen.getByDisplayValue('09:30');
    expect(timeInput.closest('.MuiFormControl-root')).not.toHaveClass(
      'MuiFormControl-marginNormal',
    );
  });

  it('keeps cell padding while editing so the editor is not flush with the cell edge', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.doubleClick(codeCell);

    expect(getComputedStyle(codeCell).padding).not.toBe('0px');
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
        editorPlugins={[{ canEdit: () => true }]}
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

    render(
      <F1Grid
        rows={mergeRows}
        columns={mergeColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    fireEvent.doubleClick(screen.getAllByRole('gridcell')[1]);

    expect(
      getComputedStyle(
        screen.getAllByRole('gridcell', { name: 'confirmed' })[0],
      ).gridRow,
    ).toBe('3/span 2');
  });

  it('keeps merged values working on pinned left columns', () => {
    const mergeColumns: F1GridColumn<MenuRow>[] = [
      {
        field: 'status',
        headerName: '상태',
        editable: true,
        mergeRows: true,
        pinned: 'left',
      },
      { field: 'code', headerName: '코드', editable: true },
    ];
    const mergeRows = [
      { ...rows[0], status: 'draft', code: 'DASH' },
      { ...rows[1], id: 'reports', status: 'draft', code: 'REPORTS' },
    ];

    render(<F1Grid rows={mergeRows} columns={mergeColumns} rowKey="id" />);

    expect(screen.getAllByRole('gridcell', { name: 'draft' })).toHaveLength(1);
    expect(
      getComputedStyle(screen.getAllByRole('gridcell', { name: 'draft' })[0])
        .gridRow,
    ).toBe('1/span 2');
    expect(
      getComputedStyle(screen.getByRole('columnheader', { name: /상태/ })).left,
    ).toBe('44px');
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

  it('computes an auto-fit width clamped by minWidth and column maxWidth', () => {
    const narrowRows = [{ id: '1', code: 'A', headerName: '' } as MenuRow];
    const wideRows = [
      {
        id: '1',
        code: 'A-VERY-LONG-CODE-VALUE-1234567890',
        headerName: '',
      } as MenuRow,
    ];

    const narrowWidth = getAutoFitColumnWidth(columns[0], narrowRows, {
      minWidth: 80,
    });
    expect(narrowWidth).toBe(80);

    const wideWidth = getAutoFitColumnWidth(columns[0], wideRows, {
      minWidth: 80,
    });
    expect(wideWidth).toBeGreaterThan(80);

    const clampedWidth = getAutoFitColumnWidth(
      { ...columns[0], maxWidth: 90 },
      wideRows,
      { minWidth: 80 },
    );
    expect(clampedWidth).toBe(90);
  });

  it('auto-fits column width to content on resize handle double-click', () => {
    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        resizableColumns={true}
        minColumnWidth={40}
      />,
    );

    const resizeHandle = screen.getByRole('separator', {
      name: '코드 컬럼 너비 조절',
    });

    fireEvent.dblClick(resizeHandle);

    const codeHeader = screen.getByRole('columnheader', { name: /코드/ });
    expect(codeHeader).toBeVisible();
  });
});

describe('F1-GRID rownumber column', () => {
  const rownumberColumns: F1GridColumn<MenuRow>[] = [
    { field: 'id', headerName: '순번', type: 'rownumber', editable: true },
    { field: 'code', headerName: '코드', editable: true },
  ];

  it('renders the current display position instead of the underlying field value', () => {
    render(<F1Grid rows={rows} columns={rownumberColumns} rowKey="id" />);

    const cells = screen.getAllByRole('gridcell', { name: /^[12]$/ });
    expect(cells.map((cell) => cell.textContent)).toEqual(['1', '2']);
  });

  it('renumbers rows after sorting instead of keeping the original data order', () => {
    render(<F1Grid rows={rows} columns={rownumberColumns} rowKey="id" />);

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '내림차순 정렬' }));

    const cells = screen.getAllByRole('gridcell', { name: /^[12]$/ });
    expect(cells.map((cell) => cell.textContent)).toEqual(['1', '2']);
    expect(
      screen
        .getAllByRole('gridcell')
        .filter((cell) => cell.textContent === 'SET').length,
    ).toBe(1);
  });

  it('does not enter edit mode when a rownumber cell is double-clicked', () => {
    render(<F1Grid rows={rows} columns={rownumberColumns} rowKey="id" />);

    const rownumberCell = screen.getAllByRole('gridcell', {
      name: /^[12]$/,
    })[0];
    fireEvent.doubleClick(rownumberCell);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

describe('F1-GRID column drag reorder', () => {
  function createDataTransfer() {
    const store: Record<string, string> = {};
    return {
      setData: (type: string, value: string) => {
        store[type] = value;
      },
      getData: (type: string) => store[type] ?? '',
      effectAllowed: 'move',
    } as unknown as DataTransfer;
  }

  afterEach(() => {
    window.localStorage.clear();
  });

  it('reorders columns when a header is dragged and dropped on another header', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    const codeHeader = screen.getByRole('columnheader', { name: /코드/ });
    const statusHeader = screen.getByRole('columnheader', { name: /상태/ });
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(codeHeader, { dataTransfer });
    fireEvent.dragOver(statusHeader, { dataTransfer });
    fireEvent.drop(statusHeader, { dataTransfer });

    const headerFields = screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent)
      .filter((text) => text);
    expect(headerFields).toEqual([
      '정렬',
      '사용 여부',
      '시작일',
      '코드',
      '상태',
    ]);
  });

  it('marks the drop target header while dragging a column', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    const codeHeader = screen.getByRole('columnheader', { name: /코드/ });
    const statusHeader = screen.getByRole('columnheader', { name: /상태/ });
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(codeHeader, { dataTransfer });
    fireEvent.dragOver(statusHeader, { dataTransfer });

    expect(statusHeader).toHaveAttribute('data-drop-target', 'true');
  });

  it('excludes pinned columns from drag reorder targets', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '왼쪽 고정' }));

    const codeHeader = screen.getByRole('columnheader', { name: /코드/ });
    expect(codeHeader).not.toHaveAttribute('draggable', 'true');
  });

  it('persists column order to localStorage when storageKey is provided', () => {
    const { unmount } = render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-order"
      />,
    );

    const codeHeader = screen.getByRole('columnheader', { name: /코드/ });
    const statusHeader = screen.getByRole('columnheader', { name: /상태/ });
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(codeHeader, { dataTransfer });
    fireEvent.drop(statusHeader, { dataTransfer });

    const stored = window.localStorage.getItem('test-grid-column-order');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? '{}');
    expect(parsed.order).toContain('status');
    unmount();

    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-order"
      />,
    );
    const headerFields = screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent)
      .filter((text) => text);
    expect(headerFields).toEqual([
      '정렬',
      '사용 여부',
      '시작일',
      '코드',
      '상태',
    ]);
  });

  it('persists column width to localStorage and restores it on remount', () => {
    const { unmount } = render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-width"
        resizableColumns={true}
        minColumnWidth={40}
      />,
    );

    const resizeHandle = screen.getByRole('separator', {
      name: '코드 컬럼 너비 조절',
    });
    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 220 });
    fireEvent.mouseUp(window);

    const stored = window.localStorage.getItem('test-grid-column-width');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? '{}');
    expect(parsed.widths.code).toBeGreaterThan(0);
    unmount();

    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-width"
        resizableColumns={true}
        minColumnWidth={40}
      />,
    );

    const codeHeader = screen.getByRole('columnheader', { name: /코드/ });
    expect(codeHeader).toBeInTheDocument();
    const headerRow = screen.getAllByRole('row')[0];
    expect(getComputedStyle(headerRow).gridTemplateColumns).toContain(
      `${parsed.widths.code}px`,
    );
  });

  it('persists hidden column list to localStorage and restores it on remount', () => {
    const { unmount } = render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-hidden"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '컬럼 목록' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '코드 표시' }));

    const stored = window.localStorage.getItem('test-grid-column-hidden');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? '{}');
    expect(parsed.hidden).toContain('code');
    unmount();

    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-hidden"
      />,
    );

    expect(
      screen.queryByRole('columnheader', { name: /^코드$/ }),
    ).not.toBeInTheDocument();
  });

  it('persists pinned column state to localStorage and restores it on remount', () => {
    const { unmount } = render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-pinned"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '왼쪽 고정' }));

    const stored = window.localStorage.getItem('test-grid-column-pinned');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? '{}');
    expect(parsed.pinned.code).toBe('left');
    unmount();

    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-pinned"
      />,
    );

    const codeHeader = screen.getByRole('columnheader', { name: /코드/ });
    expect(codeHeader).not.toHaveAttribute('draggable', 'true');

    fireEvent.click(screen.getByRole('button', { name: '코드 컬럼 메뉴' }));
    expect(
      screen.getByRole('menuitem', { name: '고정 해제' }),
    ).not.toHaveAttribute('aria-disabled', 'true');
  });
});
