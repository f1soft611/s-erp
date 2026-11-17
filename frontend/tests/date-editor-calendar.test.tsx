import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { DateEditor } from '../src/shared/components/f1-grid/editing/DateEditor';

function Harness({
  initial = '2026-11-02',
  disabled,
  onChange,
}: { initial?: string; disabled?: boolean; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <DateEditor
      label="수주일자"
      variant="outlined"
      autoFocus={false}
      selectOnFocus={false}
      disabled={disabled}
      value={value}
      onChange={(next) => { setValue(next); onChange?.(next); }}
    />
  );
}

describe('DateEditor calendar', () => {
  it('opens the Korean calendar, selects a date and closes', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '수주일자 달력 열기' }));
    expect(screen.getByRole('gridcell', { name: '2026-11-02' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toContain('월');
    fireEvent.click(screen.getByRole('gridcell', { name: '2026-11-20' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-20');
    expect(screen.getByLabelText('수주일자')).toHaveValue('2026-11-20');
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('clears the value with the 삭제 button', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '수주일자 달력 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(screen.getByLabelText('수주일자')).toHaveValue('');
  });

  it('keeps typing, shortcuts and the disabled state: no calendar opens when disabled', () => {
    const { rerender } = render(<Harness />);
    const input = screen.getByLabelText('수주일자');
    fireEvent.change(input, { target: { value: '20261105' } });
    expect(input).toHaveValue('20261105');

    rerender(<Harness disabled />);
    expect(screen.getByRole('button', { name: '수주일자 달력 열기' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '수주일자 달력 열기' }));
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('can render a custom calendar through renderCalendar', () => {
    render(
      <DateEditor
        label="기준일"
        variant="outlined"
        autoFocus={false}
        value="2026-11-02"
        onChange={vi.fn()}
        renderCalendar={({ value, close }) => (
          <button type="button" onClick={close}>{`custom ${value}`}</button>
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '기준일 달력 열기' }));
    fireEvent.click(screen.getByRole('button', { name: 'custom 2026-11-02' }));
    expect(screen.queryByRole('button', { name: 'custom 2026-11-02' })).not.toBeInTheDocument();
  });
});
