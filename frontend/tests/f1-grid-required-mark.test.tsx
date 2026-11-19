import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../src/shared/components/f1-grid';

type Row = { id: string; name: string; price: number | null };
const rows: Row[] = [{ id: '1', name: 'A', price: null }];

describe('F1Grid requiredMark', () => {
  it('shows the required asterisk in the header without validating empty cells', () => {
    const columns: F1GridColumn<Row>[] = [
      { field: 'name', headerName: '이름', required: true },
      { field: 'price', headerName: '단가', type: 'decimal', requiredMark: true },
    ];
    const ref = createRef<F1GridRef<Row>>();
    render(<F1Grid ref={ref} rows={rows} columns={columns} rowKey="id" showCheckbox={false} ariaLabel="grid" />);

    expect(screen.getByLabelText('이름 필수')).toBeInTheDocument();
    expect(screen.getByLabelText('단가 필수')).toBeInTheDocument();
    // requiredMark는 표시 전용이라 비어 있어도 검증을 통과한다(required는 검증한다).
    expect(ref.current?.validate()).toBe(true);
  });

  it('does not show the asterisk when neither option is set', () => {
    const columns: F1GridColumn<Row>[] = [{ field: 'name', headerName: '이름' }];
    render(<F1Grid rows={rows} columns={columns} rowKey="id" showCheckbox={false} ariaLabel="grid" />);
    expect(screen.queryByLabelText('이름 필수')).not.toBeInTheDocument();
  });
});
