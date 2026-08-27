import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { F1Grid } from '../src/shared/components/f1-grid/F1Grid';
import {
  addGridRow,
  createGridData,
  duplicateGridRows,
  getGridChanges,
  markRowsDeleted,
  restoreGridRows,
  updateGridRow,
} from '../src/shared/components/f1-grid/f1Grid.state';
import { getGridMergeInfo } from '../src/shared/components/f1-grid/f1Grid.merge';
import type {
  F1GridColumn,
  F1GridRef,
} from '../src/shared/components/f1-grid/f1Grid.types';

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

describe('F1-GRID row state', () => {
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

describe('F1-GRID interaction', () => {
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
    fireEvent.change(screen.getByDisplayValue('draft'), {
      target: { value: 'confirmed' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('confirmed'), { key: 'Enter' });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'reports', status: 'confirmed' }),
    ]);
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
