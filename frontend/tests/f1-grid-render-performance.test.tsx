import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../src/shared/components/f1-grid';

type Row = { id: string; name: string; code: string };

function renderGrid() {
  const rows: Row[] = Array.from({ length: 100 }, (_, index) => ({
    id: String(index + 1), name: `Item ${index + 1}`, code: `Code ${index + 1}`,
  }));
  const renderCell = vi.fn(({ value }: { value: unknown }) => String(value));
  const columns: F1GridColumn<Row>[] = [
    { field: 'name', headerName: 'Name', editable: true, pinned: 'left', renderCell },
    { field: 'code', headerName: 'Code', editable: true, renderCell },
  ];
  const ref = createRef<F1GridRef<Row>>();
  render(<F1Grid ref={ref} rows={rows} columns={columns} rowKey="id"
    showCheckbox={false} virtualizeRows={false} ariaLabel="Performance grid" />);
  renderCell.mockClear();
  return { renderCell, ref };
}

describe('F1Grid interaction render isolation', () => {
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
});
