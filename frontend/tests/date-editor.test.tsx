import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DateEditor } from '../src/shared/components/f1-grid/editing/DateEditor';

it('disables both the form input and calendar trigger', () => {
  const onChange = vi.fn();
  render(<DateEditor label="기준일" variant="outlined" autoFocus={false}
    value="2026-11-17" onChange={onChange} disabled />);

  expect(screen.getByLabelText('기준일')).toBeDisabled();
  const trigger = screen.getByRole('button', { name: '기준일 달력 열기' });
  expect(trigger).toBeDisabled();
  fireEvent.click(trigger);
  expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});

it('closes the calendar when the form becomes disabled', () => {
  const props = { label: '기준일', value: '2026-11-17', onChange: vi.fn(), autoFocus: false };
  const { rerender } = render(<DateEditor {...props} />);
  fireEvent.click(screen.getByRole('button', { name: '기준일 달력 열기' }));
  expect(screen.getByRole('grid')).toBeInTheDocument();

  rerender(<DateEditor {...props} disabled />);
  expect(screen.queryByRole('grid')).not.toBeInTheDocument();
});
