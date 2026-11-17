import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { F1Grid, F1GridHighlightText, type F1GridColumn } from '../src/shared/components/f1-grid';
import { splitByHighlight } from '../src/shared/components/f1-grid/utils/grid.utils';

type Row = { id: string; name: string; code: string };
const rows: Row[] = [
  { id: '1', name: 'Alpha Bolt', code: 'ab-100' },
  { id: '2', name: 'bolt BOLT', code: 'xx-200' },
];

describe('F1Grid highlightKeyword', () => {
  it('splits every case-insensitive match', () => {
    expect(splitByHighlight('bolt BOLT', 'bolt')).toEqual([
      { text: 'bolt', match: true },
      { text: ' ', match: false },
      { text: 'BOLT', match: true },
    ]);
    expect(splitByHighlight('a.b', '.')).toEqual([
      { text: 'a', match: false },
      { text: '.', match: true },
      { text: 'b', match: false },
    ]);
    expect(splitByHighlight('abc', 'zz')).toEqual([{ text: 'abc', match: false }]);
  });

  it('marks matches only in highlightSearch columns', () => {
    const columns: F1GridColumn<Row>[] = [
      { field: 'name', headerName: 'Name', highlightSearch: true },
      { field: 'code', headerName: 'Code' },
    ];
    const { container, rerender } = render(
      <F1Grid rows={rows} columns={columns} rowKey="id" showCheckbox={false} highlightKeyword=" bolt " ariaLabel="grid" />,
    );
    const marks = Array.from(container.querySelectorAll('[data-f1-grid-highlight="true"]'));
    expect(marks.map((node) => node.textContent)).toEqual(['Bolt', 'bolt', 'BOLT']);

    rerender(<F1Grid rows={rows} columns={columns} rowKey="id" showCheckbox={false} highlightKeyword="" ariaLabel="grid" />);
    expect(container.querySelectorAll('[data-f1-grid-highlight="true"]')).toHaveLength(0);
  });

  it('passes the keyword to renderCell only for highlightSearch columns', () => {
    const renderCell = vi.fn(({ row, highlightKeyword }: { row: Row; highlightKeyword?: string }) => (
      <F1GridHighlightText text={row.name} keyword={highlightKeyword} />
    ));
    const plain = vi.fn(({ value }: { value: unknown }) => String(value));
    const columns: F1GridColumn<Row>[] = [
      { field: 'name', headerName: 'Name', highlightSearch: true, renderCell },
      { field: 'code', headerName: 'Code', renderCell: plain },
    ];
    const { container } = render(
      <F1Grid rows={rows} columns={columns} rowKey="id" showCheckbox={false} highlightKeyword="alpha" ariaLabel="grid" />,
    );
    expect(container.querySelectorAll('[data-f1-grid-highlight="true"]')).toHaveLength(1);
    expect(plain.mock.calls.every(([context]) => context.highlightKeyword === undefined)).toBe(true);
  });
});
