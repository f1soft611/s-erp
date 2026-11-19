import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { F1Grid, type F1GridColumn } from '../src/shared/components/f1-grid';

type Row = { id: string; currency: string; price: number | null; memo: string };

const options = [
  { value: 'KRW', label: 'KRW' },
  { value: 'USD', label: 'USD' },
];

describe('F1Grid 선택 칸의 onValueChange', () => {
  it('셀에서 선택 값을 바꾸면 onValueChange가 돌려준 다른 칸 값도 함께 바뀐다', () => {
    const columns: F1GridColumn<Row>[] = [
      {
        field: 'currency',
        headerName: '통화',
        type: 'select',
        options,
        editable: true,
        onValueChange: (_row, value) => ({
          currency: String(value),
          price: value === 'USD' ? 0.9 : 1000,
          memo: `changed:${String(value)}`,
        }),
      },
      { field: 'price', headerName: '단가', type: 'decimal', decimalPlaces: 2, editable: false },
      { field: 'memo', headerName: '메모', type: 'text', editable: false },
    ];
    render(
      <F1Grid
        rows={[{ id: '1', currency: 'KRW', price: 1000, memo: '' }]}
        columns={columns}
        rowKey="id"
        showCheckbox={false}
        ariaLabel="grid"
      />,
    );

    fireEvent.doubleClick(screen.getByText('KRW'));
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'USD' }));

    expect(screen.getByText('changed:USD')).toBeInTheDocument();
    expect(screen.getByText('0.90')).toBeInTheDocument();
  });

  it('onValueChange가 없으면 선택한 값만 바뀐다', () => {
    const columns: F1GridColumn<Row>[] = [
      { field: 'currency', headerName: '통화', type: 'select', options, editable: true },
      { field: 'price', headerName: '단가', type: 'decimal', decimalPlaces: 2, editable: false },
    ];
    render(
      <F1Grid
        rows={[{ id: '1', currency: 'KRW', price: 1000, memo: '' }]}
        columns={columns}
        rowKey="id"
        showCheckbox={false}
        ariaLabel="grid"
      />,
    );

    fireEvent.doubleClick(screen.getByText('KRW'));
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'USD' }));

    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
  });
});
