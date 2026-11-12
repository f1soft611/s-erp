import { createRef } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../src/shared/components/f1-grid';

type Row = { id: string; sum: number | string | null; average: number | null; min: number; max: number };

const columns: F1GridColumn<Row>[] = [
  { field: 'id', headerName: 'ID', type: 'text' },
  { field: 'sum', headerName: 'Sum', type: 'number', summaryType: 'sum', pinned: 'left', editable: true },
  { field: 'average', headerName: 'Average', type: 'number', summaryType: 'average' },
  { field: 'min', headerName: 'Min', type: 'number', summaryType: 'min' },
  { field: 'max', headerName: 'Max', type: 'number', summaryType: 'max' },
];

const rows: Row[] = [
  { id: 'a', sum: 10, average: 2, min: 7, max: -2 },
  { id: 'b', sum: '20', average: 4, min: 3, max: 8 },
  { id: 'c', sum: '', average: null, min: 9, max: 1 },
];

describe('F1Grid summary', () => {
  it('aggregates all filtered rows, keeps its position, and updates on edit and delete', () => {
    const ref = createRef<F1GridRef<Row>>();
    render(<F1Grid ref={ref} rows={rows} columns={columns} rowKey="id"
      features={[{ ftype: 'summary', dock: 'top' }]} virtualizeRows />);
    const summary = screen.getByTestId('f1-grid-summary-top');
    expect(within(summary).getByRole('gridcell', { name: 'Sum 집계' })).toHaveTextContent('30');
    expect(within(summary).getByRole('gridcell', { name: 'Average 집계' })).toHaveTextContent('3');
    expect(within(summary).getByRole('gridcell', { name: 'Min 집계' })).toHaveTextContent('3');
    expect(within(summary).getByRole('gridcell', { name: 'Max 집계' })).toHaveTextContent('8');
    expect(summary.compareDocumentPosition(screen.getByTestId('f1-grid-body-scroll')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    act(() => ref.current?.setCellValue('a', 'sum', 25));
    expect(within(summary).getByText('45')).toBeInTheDocument();
    act(() => {
      ref.current?.setSelectedRowIds(['b']);
    });
    act(() => ref.current?.deleteSelectedRows());
    expect(within(summary).getByRole('gridcell', { name: 'Sum 집계' })).toHaveTextContent('25');
    act(() => ref.current?.addRow({ id: 'd', sum: 5, average: 2, min: 1, max: 2 }));
    expect(within(summary).getByRole('gridcell', { name: 'Sum 집계' })).toHaveTextContent('30');
  });

  it('renders a bottom summary with empty values ignored', () => {
    render(<F1Grid rows={[{ id: 'x', sum: null, average: null, min: 3, max: 8 }]}
      columns={columns} rowKey="id" features={[{ ftype: 'summary', dock: 'bottom' }]} />);
    const summary = screen.getByTestId('f1-grid-summary-bottom');
    expect(summary).toHaveTextContent('3');
    expect(summary).toHaveTextContent('8');
    expect(within(summary).getByRole('gridcell', { name: 'Sum 집계' })).toBeEmptyDOMElement();
    expect(within(summary).getByRole('gridcell', { name: 'Average 집계' })).toBeEmptyDOMElement();
    expect(screen.getByTestId('f1-grid-body-scroll').compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('updates the aggregate when a column filter changes', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id"
      features={[{ ftype: 'summary', dock: 'top' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'ID 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '필터' }));
    fireEvent.change(screen.getByLabelText('ID 필터 값'), { target: { value: 'b' } });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(within(screen.getByTestId('f1-grid-summary-top')).getByRole('gridcell', { name: 'Sum 집계' })).toHaveTextContent('20');
  });

  it.each([
    { dock: 'top' as const, columnLine: true },
    { dock: 'bottom' as const, columnLine: false },
  ])('matches body column borders for $dock summary with columnLine=$columnLine', ({ dock, columnLine }) => {
    const { container } = render(<F1Grid rows={rows} columns={columns} rowKey="id"
      features={[{ ftype: 'summary', dock }]} columnLine={columnLine} />);
    const summaryCells = within(screen.getByTestId(`f1-grid-summary-${dock}`)).getAllByRole('gridcell');
    const bodyRow = container.querySelector('[data-f1-grid-row-id="a"]') as HTMLElement;
    const bodyCells = within(bodyRow).getAllByRole('gridcell');
    summaryCells.forEach((cell, index) => {
      const summaryStyle = getComputedStyle(cell);
      const bodyStyle = getComputedStyle(bodyCells[index]);
      expect(summaryStyle.borderLeftWidth).toBe(bodyStyle.borderLeftWidth);
      expect(summaryStyle.borderRightWidth || '0px').toBe(bodyStyle.borderRightWidth || '0px');
    });
  });
});
