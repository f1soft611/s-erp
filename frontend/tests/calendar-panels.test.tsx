import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatePanel } from '../src/shared/components/calendar/DatePanel';
import { DateRangePanel } from '../src/shared/components/calendar/DateRangePanel';
import { MonthPanel } from '../src/shared/components/calendar/MonthPanel';

const TODAY = '2026-11-17';

describe('DatePanel', () => {
  it('shows Korean weekdays with Sunday first, the selected date and the today marker', () => {
    render(<DatePanel value="2026-11-02" onChange={vi.fn()} onClear={vi.fn()} todayValue={TODAY} />);
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(
      ['일', '월', '화', '수', '목', '금', '토'],
    );
    expect(screen.getByRole('grid', { name: '2026년 11월' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '2026-11-02' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('gridcell', { name: '2026-11-03' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('gridcell', { name: '2026-11-17' })).toHaveAttribute('aria-current', 'date');
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
  });

  it('selects a date and moves the view when an adjacent month day is chosen', () => {
    const onChange = vi.fn();
    render(<DatePanel value="2026-11-02" onChange={onChange} onClear={vi.fn()} todayValue={TODAY} />);
    fireEvent.click(screen.getByRole('gridcell', { name: '2026-11-20' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-20');

    fireEvent.click(screen.getByRole('gridcell', { name: '2026-12-05' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-12-05');
    expect(screen.getByRole('grid', { name: '2026년 12월' })).toBeInTheDocument();
  });

  it('moves with the arrows and the year and month dropdowns', () => {
    render(<DatePanel value="2026-11-02" onChange={vi.fn()} onClear={vi.fn()} todayValue={TODAY} />);
    fireEvent.click(screen.getByRole('button', { name: '다음 달' }));
    expect(screen.getByRole('grid', { name: '2026년 12월' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음 달' }));
    expect(screen.getByRole('grid', { name: '2027년 1월' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '이전 달' }));
    fireEvent.click(screen.getByRole('button', { name: '이전 달' }));

    fireEvent.change(screen.getByRole('combobox', { name: '연도' }), { target: { value: '2024' } });
    fireEvent.change(screen.getByRole('combobox', { name: '월' }), { target: { value: '2' } });
    expect(screen.getByRole('grid', { name: '2024년 2월' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '2024-02-29' })).toBeInTheDocument();
  });

  it('chooses today and clears the value', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(<DatePanel value="" onChange={onChange} onClear={onClear} todayValue={TODAY} />);
    expect(screen.getByRole('grid', { name: '2026년 11월' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '오늘' }));
    expect(onChange).toHaveBeenCalledWith(TODAY);
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('DateRangePanel', () => {
  const selectedCells = () =>
    screen.getAllByRole('gridcell').filter((cell) => cell.getAttribute('aria-selected') === 'true')
      .map((cell) => cell.getAttribute('aria-label'));

  it('turns the first click into a one-day range and completes it with the second click', () => {
    const onChange = vi.fn();
    render(<DateRangePanel from="" to="" onChange={onChange} onClear={vi.fn()} todayValue={TODAY} />);
    fireEvent.click(screen.getByRole('gridcell', { name: '2026-11-02' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-02', '2026-11-02', false);
    fireEvent.click(screen.getByRole('gridcell', { name: '2026-11-17' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-02', '2026-11-17', true);
  });

  it('swaps the ends when the second click is earlier than the first', () => {
    const onChange = vi.fn();
    render(<DateRangePanel from="" to="" onChange={onChange} onClear={vi.fn()} todayValue={TODAY} />);
    fireEvent.click(screen.getByRole('gridcell', { name: '2026-11-17' }));
    fireEvent.click(screen.getByRole('gridcell', { name: '2026-11-02' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-02', '2026-11-17', true);
  });

  it('paints the existing range and previews the range up to the hovered day', () => {
    const { rerender } = render(
      <DateRangePanel from="2026-11-02" to="2026-11-04" onChange={vi.fn()} onClear={vi.fn()} todayValue={TODAY} />,
    );
    expect(selectedCells()).toEqual(['2026-11-02', '2026-11-04']);

    // 새 범위를 시작하면 시작일만 진하게, 호버한 날짜까지 칠해지고 끝은 호버한 날짜다.
    fireEvent.click(screen.getByRole('gridcell', { name: '2026-11-10' }));
    rerender(<DateRangePanel from="2026-11-10" to="2026-11-10" onChange={vi.fn()} onClear={vi.fn()} todayValue={TODAY} />);
    fireEvent.mouseEnter(screen.getByRole('gridcell', { name: '2026-11-13' }));
    expect(selectedCells()).toEqual(['2026-11-10', '2026-11-13']);
  });

  it('chooses today as a one-day range and clears', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(<DateRangePanel from="" to="" onChange={onChange} onClear={onClear} todayValue={TODAY} />);
    fireEvent.click(screen.getByRole('button', { name: '오늘' }));
    expect(onChange).toHaveBeenCalledWith(TODAY, TODAY, true);
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('MonthPanel', () => {
  it('lists 1월 to 12월, marks the selected and current month, and picks a month', () => {
    const onChange = vi.fn();
    render(<MonthPanel value="202610" onChange={onChange} onClear={vi.fn()} todayValue={TODAY} />);
    expect(screen.getAllByRole('button', { name: /^\d+월$/ })).toHaveLength(12);
    expect(screen.getByRole('button', { name: '10월' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '11월' })).toHaveAttribute('aria-current', 'date');
    fireEvent.click(screen.getByRole('button', { name: '3월' }));
    expect(onChange).toHaveBeenLastCalledWith('202603');
  });

  it('moves the year with the arrows and the dropdown, and offers this month and clear', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(<MonthPanel value="" onChange={onChange} onClear={onClear} todayValue={TODAY} />);
    fireEvent.click(screen.getByRole('button', { name: '다음 연도' }));
    fireEvent.click(screen.getByRole('button', { name: '6월' }));
    expect(onChange).toHaveBeenLastCalledWith('202706');
    fireEvent.change(screen.getByRole('combobox', { name: '연도' }), { target: { value: '2025' } });
    fireEvent.click(screen.getByRole('button', { name: '1월' }));
    expect(onChange).toHaveBeenLastCalledWith('202501');
    fireEvent.click(screen.getByRole('button', { name: '이번 달' }));
    expect(onChange).toHaveBeenLastCalledWith('202611');
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(within(document.body).queryByText('Jan')).not.toBeInTheDocument();
  });
});
