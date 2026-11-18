import { createRef, startTransition, Suspense } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../src/shared/components/f1-grid';
import { GridHeader } from '../src/shared/components/f1-grid/core/GridHeader';
import { GridCell } from '../src/shared/components/f1-grid/core/GridCell';
import { GridRow } from '../src/shared/components/f1-grid/core/GridRow';

type Row = { id: string; name: string; code: string };

function renderGrid() {
  const rows: Row[] = Array.from({ length: 100 }, (_, index) => ({
    id: String(index + 1), name: `Item ${index + 1}`, code: `Code ${index + 1}`,
  }));
  const renderCell = vi.fn(({ value }: { value: unknown }) => String(value));
  const editable = vi.fn((_row: Row) => true);
  const columns: F1GridColumn<Row>[] = [
    { field: 'name', headerName: 'Name', editable, pinned: 'left', renderCell },
    { field: 'code', headerName: 'Code', editable, renderCell },
  ];
  const ref = createRef<F1GridRef<Row>>();
  const cellAdornment = vi.fn((_row: Row) => null);
  render(<F1Grid ref={ref} rows={rows} columns={columns} rowKey="id"
    cellAdornment={cellAdornment} showCheckbox={false}
    virtualizeRows={false} virtualizeColumns ariaLabel="Performance grid" />);
  renderCell.mockClear();
  cellAdornment.mockClear();
  return { renderCell, cellAdornment, editable, ref };
}

function createHeaderProps() {
  type HeaderRow = { id: string; enabled: boolean };
  const rows: HeaderRow[] = [{ id: '1', enabled: false }];
  const columns: F1GridColumn<HeaderRow>[] = [
    { field: 'enabled', headerName: 'Enabled', type: 'checkbox', headerCheckbox: true, editable: true },
  ];
  return {
    rows,
    columns,
    allColumns: columns,
    columnLine: true,
    selectedAll: false,
    selectedCount: 0,
    columnWidths: {},
    columnTracks: '36px 150px',
    multiSelect: true,
    onResizeColumn: vi.fn(),
    getColumnCheckboxState: vi.fn(() => ({ allChecked: false, indeterminate: false, hasEditableRows: true })),
    onToggleAllRows: vi.fn(),
    onToggleColumnCheckbox: vi.fn(),
    onToggleColumnVisibility: vi.fn(),
    sorts: [],
    onToggleSort: vi.fn(),
    filters: [],
    onApplyFilter: vi.fn(),
    pinnedFields: new Map(),
    onPinColumn: vi.fn(),
    leftOffsets: {},
    rightOffsets: {},
  } satisfies Parameters<typeof GridHeader<HeaderRow>>[0];
}

function createRowProps() {
  type CheckboxRow = { id: string; enabled: boolean };
  const row: CheckboxRow = { id: '1', enabled: false };
  const columns: F1GridColumn<CheckboxRow>[] = [
    { field: 'enabled', headerName: 'Enabled', type: 'checkbox', editable: true },
  ];
  return {
    row, rowId: '1', rowIndex: 0, renderIndex: 0, columns, columnLine: true, stripeRows: false,
    isSelected: false, rowHeight: 32, defaultRowHeight: 32, minRowHeight: 24, maxRowHeight: 200,
    resizableRows: false, dragSelectionStateRef: { current: { active: false, previousCell: null } },
    draftValue: '', mergeInfoByColumn: [[]], visibleRows: [row], selectedIds: [], rowKey: 'id',
    onSelectRow: vi.fn(), onSetRowSelection: vi.fn(), onSetFocusedCell: vi.fn(),
    onCellSelectionStart: vi.fn(), onCellSelectionDrag: vi.fn(), onCellSelectionEnd: vi.fn(),
    onCommitEdit: vi.fn(), onStartEdit: vi.fn(), onDraftChange: vi.fn(), onKeyDown: vi.fn(),
    onUpdateCell: vi.fn(), onUpdateRow: vi.fn(), getCellError: () => undefined, onStopEdit: vi.fn(),
    onCellRef: vi.fn(), onEditingCellRef: vi.fn(), onUpdateRowHeight: vi.fn(),
    getMergeEditing: () => false, getMerged: () => false, getPinOffset: () => undefined,
  } satisfies Parameters<typeof GridRow<CheckboxRow>>[0];
}

describe('F1Grid interaction render isolation', () => {
  it('keeps committed row events while a later callback render suspends', async () => {
    const props = createRowProps();
    const committed = vi.fn(), next = vi.fn(), attempted = vi.fn();
    const pending = new Promise<void>(() => undefined);
    function SuspendUpdate({ blocked }: { blocked: boolean }) {
      if (blocked) {
        attempted();
        throw pending;
      }
      return null;
    }
    const view = (useNext = false, blocked = false) => (
      <Suspense fallback={<span>Updating row</span>}>
        <GridRow {...props} onSetRowSelection={useNext ? next : committed} />
        <SuspendUpdate blocked={blocked} />
      </Suspense>
    );
    const { rerender } = render(view());
    await act(async () => { startTransition(() => rerender(view(true, true))); });
    expect(attempted).toHaveBeenCalled();
    expect(screen.queryByText('Updating row')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByLabelText('1 행 선택')).getByRole('checkbox'));
    expect(next).not.toHaveBeenCalled();
    expect(committed).toHaveBeenCalledExactlyOnceWith('1', true);
    rerender(view(true));
    fireEvent.click(within(screen.getByLabelText('1 행 선택')).getByRole('checkbox'));
    expect(next).toHaveBeenCalledExactlyOnceWith('1', true);
    expect(committed).toHaveBeenCalledTimes(1);
  });

  it('registers child cells with the current commit callbacks and clears the shared cache', () => {
    const props = createRowProps();
    const nodes = new Map<string, HTMLElement>();
    let editingNode: HTMLElement | null = null;
    const register = (rowId: string | number, columnIndex: number, node: HTMLElement | null) => {
      const key = `${String(rowId)}:${columnIndex}`;
      if (node) nodes.set(key, node);
      else nodes.delete(key);
    };
    const previous = vi.fn(register), current = vi.fn(register);
    const previousEditing = vi.fn((node: HTMLElement | null) => { editingNode = node; });
    const currentEditing = vi.fn((node: HTMLElement | null) => { editingNode = node; });
    const editingCell = { rowId: '1', columnIndex: 0 };
    const { rerender, unmount } = render(
      <GridRow {...props} editingCell={editingCell} onCellRef={previous} onEditingCellRef={previousEditing} />,
    );
    const cell = screen.getByRole('checkbox', { name: 'Enabled 1' }).closest('[role="gridcell"]');
    expect(nodes.get('1:0')).toBe(cell);
    expect(editingNode).toBe(cell);
    rerender(
      <GridRow {...props} rowHeight={36} editingCell={editingCell}
        onCellRef={current} onEditingCellRef={currentEditing} />,
    );
    expect(current).toHaveBeenCalledWith('1', 0, cell);
    expect(currentEditing).toHaveBeenCalledWith(cell);
    expect(nodes.get('1:0')).toBe(cell);
    unmount();
    expect(nodes.size).toBe(0);
    expect(editingNode).toBeNull();
  });

  it('keeps committed cell events while a later callback render suspends', async () => {
    type CheckboxRow = { id: string; enabled: boolean };
    const column: F1GridColumn<CheckboxRow> = {
      field: 'enabled', headerName: 'Enabled', type: 'checkbox', editable: true,
    };
    const props = {
      row: { id: '1', enabled: false }, rowId: '1', column, columnIndex: 0,
      columnLine: true, stripeRows: false, focused: false, editing: false,
      selected: false, merged: false, rowHeight: 32, defaultRowHeight: 32, rowIndex: 0, draftValue: '',
      onFocus: vi.fn(), onMouseDown: vi.fn(), onMouseEnter: vi.fn(), onMouseUp: vi.fn(),
      onStopEdit: vi.fn(), onDoubleClick: vi.fn(), onDraftChange: vi.fn(), onKeyDown: vi.fn(),
      onSelectChange: vi.fn(), onCheckboxChange: vi.fn(), onCodePick: vi.fn(), onCellRef: vi.fn(),
    } satisfies Parameters<typeof GridCell<CheckboxRow>>[0];
    const committed = vi.fn(), next = vi.fn(), attempted = vi.fn();
    const pending = new Promise<void>(() => undefined);
    function SuspendUpdate({ blocked }: { blocked: boolean }) {
      if (blocked) {
        attempted();
        throw pending;
      }
      return null;
    }
    const view = (useNext = false, blocked = false) => (
      <Suspense fallback={<span>Updating cell</span>}>
        <GridCell {...props} onCheckboxChange={useNext ? next : committed} />
        <SuspendUpdate blocked={blocked} />
      </Suspense>
    );
    const { rerender } = render(view());
    await act(async () => { startTransition(() => rerender(view(true, true))); });
    expect(attempted).toHaveBeenCalled();
    expect(screen.queryByText('Updating cell')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enabled 1' }));
    expect(next).not.toHaveBeenCalled();
    expect(committed).toHaveBeenCalledExactlyOnceWith(true);
    rerender(view(true));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enabled 1' }));
    expect(next).toHaveBeenCalledExactlyOnceWith(true);
    expect(committed).toHaveBeenCalledTimes(1);
  });

  it('anchors a user editor to its attached cell on the first editing mount', async () => {
    type UserRow = { id: string; assignee: string | null };
    const column: F1GridColumn<UserRow> = {
      field: 'assignee', headerName: 'Assignee', type: 'user', editable: true,
      userOptions: [{ value: 'user-1', label: 'Synthetic User' }],
    };
    const onSelectChange = vi.fn();
    const viewport = vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(375);
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      const left = this === document.documentElement || this === document.body
        ? 0
        : this.getAttribute('role') === 'gridcell' ? 100 : 104;
      return {
        x: left, y: 0, left, top: 0, width: 180, height: 32, right: left + 180, bottom: 32,
        toJSON: () => ({}),
      };
    });
    try {
      render(
        <GridCell
          row={{ id: '1', assignee: null }} rowId="1" column={column} columnIndex={0}
          columnLine stripeRows={false} focused editing selected={false} merged={false}
          rowHeight={32} defaultRowHeight={32} rowIndex={0} draftValue=""
          onFocus={vi.fn()} onMouseDown={vi.fn()} onMouseEnter={vi.fn()} onMouseUp={vi.fn()}
          onStopEdit={vi.fn()} onDoubleClick={vi.fn()} onDraftChange={vi.fn()} onKeyDown={vi.fn()}
          onSelectChange={onSelectChange} onCheckboxChange={vi.fn()} onCodePick={vi.fn()} onCellRef={vi.fn()}
        />,
      );
      const listbox = await screen.findByRole('listbox');
      await waitFor(() => {
        expect((listbox.closest('.MuiAutocomplete-popper') as HTMLElement).style.transform)
          .toMatch(/^translate(?:3d)?\(100px,/);
      });
      fireEvent.click(screen.getByRole('option', { name: /Synthetic User/ }));
      expect(onSelectChange).toHaveBeenCalledExactlyOnceWith('user-1');
    } finally {
      bounds.mockRestore();
      viewport.mockRestore();
    }
  });

  it('keeps committed header events while a later callback render suspends', async () => {
    const props = createHeaderProps();
    const committed = vi.fn();
    const next = vi.fn();
    const attempted = vi.fn();
    const pending = new Promise<void>(() => undefined);
    function SuspendUpdate({ blocked }: { blocked: boolean }) {
      if (blocked) {
        attempted();
        throw pending;
      }
      return null;
    }
    const view = (useNext = false, blocked = false) => (
      <Suspense fallback={<span>Updating header</span>}>
        <GridHeader {...props} onToggleAllRows={useNext ? next : committed} />
        <SuspendUpdate blocked={blocked} />
      </Suspense>
    );
    const { rerender } = render(view());
    await act(async () => { startTransition(() => rerender(view(true, true))); });
    expect(attempted).toHaveBeenCalled();
    expect(screen.queryByText('Updating header')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByLabelText('전체 행 선택')).getByRole('checkbox'));
    expect(next).not.toHaveBeenCalled();
    expect(committed).toHaveBeenCalledTimes(1);
    rerender(view(true));
    fireEvent.click(within(screen.getByLabelText('전체 행 선택')).getByRole('checkbox'));
    expect(next).toHaveBeenCalledTimes(1);
    expect(committed).toHaveBeenCalledTimes(1);
  });

  it('keeps header memo for callback-only updates but renders checkbox state from current rows', () => {
    const props = createHeaderProps();
    const { rerender } = render(<GridHeader {...props} />);
    expect(screen.getByRole('checkbox', { name: 'Enabled 전체 선택' })).not.toBeChecked();
    const unchanged = vi.fn(() => ({ allChecked: false, indeterminate: false, hasEditableRows: true }));
    rerender(<GridHeader {...props} getColumnCheckboxState={unchanged} onToggleAllRows={vi.fn()} />);
    expect(unchanged).not.toHaveBeenCalled();
    const updated = vi.fn(() => ({ allChecked: true, indeterminate: false, hasEditableRows: true }));
    rerender(
      <GridHeader {...props} rows={[{ id: '1', enabled: true }]} getColumnCheckboxState={updated} />,
    );
    expect(screen.getByRole('checkbox', { name: 'Enabled 전체 선택' })).toBeChecked();
    expect(updated).toHaveBeenCalledWith(props.columns[0]);
  });

  it.each(['Enter', 'Tab', 'click'] as const)(
    'does not visit unrelated rows when committing a changed value with %s',
    (action) => {
      const { renderCell, cellAdornment, ref } = renderGrid();
      fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Committed item' } });
      renderCell.mockClear();
      cellAdornment.mockClear();
      if (action === 'click') {
        const neighbor = screen.getByRole('gridcell', { name: 'Code 1', exact: true });
        fireEvent.mouseDown(neighbor, { button: 0 });
        fireEvent.mouseUp(neighbor);
        fireEvent.click(neighbor);
      } else {
        fireEvent.keyDown(input, { key: action });
      }
      expect(ref.current?.getChanges().updatedRows).toEqual([
        expect.objectContaining({ id: '1', name: 'Committed item' }),
      ]);
      expect(renderCell.mock.calls.filter(([context]) => context.row.id !== '1')).toHaveLength(0);
      expect(cellAdornment.mock.calls.filter(([row]) => row.id !== '1')).toHaveLength(0);
    },
  );

  it('clears the dirty marker when restoring a value without visiting other rows', () => {
    const { cellAdornment, ref } = renderGrid();
    for (const value of ['Changed', 'Item 1']) {
      const current = screen.getByRole('gridcell', { name: value === 'Changed' ? 'Item 1' : 'Changed', exact: true });
      fireEvent.doubleClick(current);
      fireEvent.change(screen.getByRole('textbox'), { target: { value } });
      cellAdornment.mockClear();
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      expect(screen.getByRole('gridcell', { name: value, exact: true }))
        .toHaveAttribute('data-dirty-cell', String(value === 'Changed'));
      expect(cellAdornment.mock.calls.filter(([row]) => row.id !== '1')).toHaveLength(0);
    }
    expect(ref.current?.getChanges().updatedRows).toEqual([]);
  });

  it('keeps the latest edit callbacks on a row skipped during another row commit', () => {
    const { ref } = renderGrid();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'First committed' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Item 2', exact: true }));
    expect(screen.getByRole('textbox')).toHaveValue('Item 2');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Second committed' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(ref.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: '1', name: 'First committed' }),
      expect.objectContaining({ id: '2', name: 'Second committed' }),
    ]);
  });

  it('updates the previous last row boundary after appending a row', () => {
    const { ref } = renderGrid();
    const last = screen.getByRole('gridcell', { name: 'Code 100', exact: true });
    expect(getComputedStyle(last).borderBottomWidth).toBe('1px');
    act(() => ref.current?.addRow({ id: '101', name: 'Item 101', code: 'Code 101' }));
    expect(getComputedStyle(screen.getByRole('gridcell', { name: 'Code 100', exact: true })).borderBottomWidth)
      .not.toBe('1px');
    expect(getComputedStyle(screen.getByRole('gridcell', { name: 'Code 101', exact: true })).borderBottomWidth)
      .toBe('1px');
  });

  it('renumbers unchanged rows when a committed value changes the sort order', () => {
    const rows: Row[] = [
      { id: '1', name: 'Alpha', code: '' },
      { id: '2', name: 'Beta', code: '' },
    ];
    const columns: F1GridColumn<Row>[] = [
      { field: 'code', headerName: 'No.', type: 'rownumber' },
      { field: 'name', headerName: 'Name', editable: true },
    ];
    render(<F1Grid rows={rows} columns={columns} rowKey="id" showCheckbox={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Name 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '오름차순 정렬' }));
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Alpha', exact: true }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Zulu' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    const cells = screen.getAllByRole('gridcell');
    expect(cells.map((cell) => cell.textContent)).toEqual(['1', 'Beta', '2', 'Zulu']);
  });

  it('updates the remaining last row boundary when a commit filters out a row', () => {
    const rows: Row[] = [
      { id: '1', name: 'Keep A', code: '' },
      { id: '2', name: 'Keep B', code: '' },
    ];
    const columns: F1GridColumn<Row>[] = [
      { field: 'name', headerName: 'Name', editable: true },
    ];
    render(<F1Grid rows={rows} columns={columns} rowKey="id" showCheckbox={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Name 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '필터', exact: true }));
    fireEvent.change(screen.getByLabelText('Name 필터 값'), { target: { value: 'Keep' } });
    fireEvent.click(screen.getByRole('button', { name: '적용', exact: true }));
    const remaining = screen.getByRole('gridcell', { name: 'Keep A', exact: true });
    expect(getComputedStyle(remaining).borderBottomWidth).not.toBe('1px');
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Keep B', exact: true }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hidden' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(screen.queryByRole('gridcell', { name: 'Hidden', exact: true })).not.toBeInTheDocument();
    expect(getComputedStyle(remaining).borderBottomWidth).toBe('1px');
  });

  it('does not rerender other rows when selecting a pinned cell in 100 rows', () => {
    const { renderCell } = renderGrid();
    fireEvent.click(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
    expect(renderCell.mock.calls.filter(([context]) =>
      context.value !== 'Item 1' && context.value !== 'Code 1',
    )).toHaveLength(0);
  });

  it('does not rerender display cells when changing the editor draft', () => {
    const { renderCell, ref } = renderGrid();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
    renderCell.mockClear();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Edited item' } });
    expect(renderCell).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(ref.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: '1', name: 'Edited item' }),
    ]);
  });

  it('does not visit unrelated row bodies while typing', () => {
    const { cellAdornment } = renderGrid();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
    cellAdornment.mockClear();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Draft' } });
    expect(cellAdornment).toHaveBeenCalledTimes(2);
  });

  it('does not visit unrelated row bodies for a single-cell selection', () => {
    const { cellAdornment } = renderGrid();
    fireEvent.click(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
    expect(cellAdornment).toHaveBeenCalledTimes(2);
  });

  it('does not visit unrelated row bodies for a complete pointer click', () => {
    const { cellAdornment } = renderGrid();
    const cell = screen.getByRole('gridcell', { name: 'Item 1', exact: true });
    fireEvent.mouseDown(cell, { button: 0 });
    fireEvent.mouseUp(cell);
    fireEvent.click(cell);
    expect(cellAdornment.mock.calls.filter(([row]) => row.id !== '1')).toHaveLength(0);
  });

  it('does not rescan every row for header checkboxes while typing in a text column', () => {
    const { editable } = renderGrid();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
    editable.mockClear();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Header isolation' } });
    expect(editable.mock.calls.filter(([row]) => row.id !== '1')).toHaveLength(0);
  });

  it('uses the latest edit state when committing from a memoized neighboring cell', () => {
    const { ref } = renderGrid();
    const nameCell = screen.getByRole('gridcell', { name: 'Item 1', exact: true });
    const codeCell = screen.getByRole('gridcell', { name: 'Code 1', exact: true });
    fireEvent.doubleClick(nameCell);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Latest draft' } });
    fireEvent.mouseDown(codeCell);
    fireEvent.click(codeCell);
    fireEvent.keyDown(codeCell, { key: 'F2' });
    expect(screen.getByRole('textbox')).toHaveValue('Code 1');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Latest code' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Tab' });
    expect(ref.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: '1', name: 'Latest draft', code: 'Latest code' }),
    ]);
  });

  it('can restart a drag from an earlier row after clearing selection elsewhere', () => {
    renderGrid();
    const first = screen.getByRole('gridcell', { name: 'Item 1', exact: true });
    const second = screen.getByRole('gridcell', { name: 'Item 2', exact: true });
    const third = screen.getByRole('gridcell', { name: 'Item 3', exact: true });
    for (const cell of [first, second]) {
      fireEvent.mouseDown(cell, { button: 0 });
      fireEvent.mouseUp(cell);
      fireEvent.click(cell);
    }
    fireEvent.keyDown(second, { key: 'Escape' });
    fireEvent.mouseDown(first, { button: 0 });
    fireEvent.mouseEnter(third);
    fireEvent.mouseUp(third);
    expect(third).toHaveAttribute('data-grid-selected', 'true');
  });
});
