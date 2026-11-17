import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FormDateField, normalizeFormDate } from '../src/shared/components/FormDateField';

function Harness({
  initial = '',
  disabled,
  error,
  onChange,
}: { initial?: string; disabled?: boolean; error?: string; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <FormDateField
      label="입고일"
      value={value}
      disabled={disabled}
      error={error}
      onChange={(next) => { setValue(next); onChange?.(next); }}
    />
  );
}

const input = () => screen.getByRole('textbox', { name: /^입고일/ });

describe('normalizeFormDate', () => {
  it('normalizes shortcuts and reports non-empty invalid input', () => {
    expect(normalizeFormDate('2026-11-17')).toEqual({ date: '2026-11-17', invalid: false });
    expect(normalizeFormDate('20261117')).toEqual({ date: '2026-11-17', invalid: false });
    expect(normalizeFormDate('')).toEqual({ date: '', invalid: false });
    expect(normalizeFormDate('   ')).toEqual({ date: '', invalid: false });
    expect(normalizeFormDate('20261340')).toEqual({ date: '', invalid: true });
    expect(normalizeFormDate('abc')).toEqual({ date: '', invalid: true });
  });
});

describe('FormDateField', () => {
  it('confirms a shortcut as YYYY-MM-DD on blur', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.change(input(), { target: { value: '20261117' } });
    fireEvent.blur(input());
    expect(input()).toHaveValue('2026-11-17');
    expect(onChange).toHaveBeenLastCalledWith('2026-11-17');
    expect(screen.queryByText(/올바른/)).not.toBeInTheDocument();
  });

  it('keeps an invalid value and shows the field error until the value changes', () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: '20261340' } });
    fireEvent.blur(input());
    expect(input()).toHaveValue('20261340');
    expect(screen.getByText('올바른 입고일을(를) 입력해 주세요.')).toBeInTheDocument();
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(input(), { target: { value: '2026111' } });
    expect(screen.queryByText(/올바른/)).not.toBeInTheDocument();
  });

  it('shows no error for an empty value (required is checked when saving)', () => {
    render(<Harness initial="2026-11-17" />);
    fireEvent.change(input(), { target: { value: '' } });
    fireEvent.blur(input());
    expect(screen.queryByText(/올바른/)).not.toBeInTheDocument();
  });

  it('prefers the external error over the blur error', () => {
    render(<Harness error="입고일을 입력해 주세요." />);
    fireEvent.change(input(), { target: { value: 'zz' } });
    fireEvent.blur(input());
    expect(screen.getByText('입고일을 입력해 주세요.')).toBeInTheDocument();
    expect(screen.queryByText('올바른 입고일을(를) 입력해 주세요.')).not.toBeInTheDocument();
  });

  it('picks a date from the calendar', () => {
    const onChange = vi.fn();
    render(<Harness initial="2026-11-02" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '입고일 달력 열기' }));
    fireEvent.click(screen.getByRole('gridcell', { name: '2026-11-20' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-20');
    expect(input()).toHaveValue('2026-11-20');
  });

  it('is disabled together with its calendar button and never opens the calendar', () => {
    render(<Harness initial="2026-11-02" disabled />);
    expect(input()).toBeDisabled();
    expect(screen.getByRole('button', { name: '입고일 달력 열기' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '입고일 달력 열기' }));
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });
});
