import { describe, expect, it } from 'vitest';
import {
  addMonths,
  buildMonthGrid,
  isIsoDate,
  isWithinRange,
  orderRange,
  parseIsoDate,
  toIsoDate,
} from '../src/shared/components/calendar/calendarUtils';

describe('calendar utils', () => {
  it('builds a fixed 6x7 grid that starts on the Sunday of the first week', () => {
    // 2026-11-01 is a Sunday, so the grid starts on 11/1 and runs to 12/12.
    const grid = buildMonthGrid(2026, 11);
    expect(grid).toHaveLength(6);
    grid.forEach((week) => expect(week).toHaveLength(7));
    expect(grid[0][0]).toMatchObject({ iso: '2026-11-01', day: 1, inMonth: true, weekday: 0 });
    expect(grid[4][1]).toMatchObject({ iso: '2026-11-30', inMonth: true, weekday: 1 });
    expect(grid[4][2]).toMatchObject({ iso: '2026-12-01', day: 1, inMonth: false });
    expect(grid[5][6]).toMatchObject({ iso: '2026-12-12', inMonth: false, weekday: 6 });
  });

  it('shows the previous month days before a month that does not start on Sunday', () => {
    // 2026-10-01 is a Thursday.
    const grid = buildMonthGrid(2026, 10);
    expect(grid[0].map((cell) => cell.iso)).toEqual([
      '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03',
    ]);
    expect(grid[0].filter((cell) => cell.inMonth)).toHaveLength(3);
    expect(grid[5][6].iso).toBe('2026-11-07');
  });

  it('handles leap years and year boundaries', () => {
    const feb = buildMonthGrid(2028, 2).flat().filter((cell) => cell.inMonth);
    expect(feb).toHaveLength(29);
    expect(buildMonthGrid(2027, 2).flat().filter((cell) => cell.inMonth)).toHaveLength(28);
    const jan = buildMonthGrid(2027, 1);
    expect(jan[0][0].iso).toBe('2026-12-27');
  });

  it('moves months across year boundaries', () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths(2026, 11, 14)).toEqual({ year: 2028, month: 1 });
  });

  it('validates and parses ISO dates', () => {
    expect(isIsoDate('2026-11-17')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('20261117')).toBe(false);
    expect(isIsoDate('')).toBe(false);
    expect(parseIsoDate('2026-11-17')).toEqual({ year: 2026, month: 11, day: 17 });
    expect(parseIsoDate('bad')).toBeNull();
    expect(toIsoDate(2026, 3, 5)).toBe('2026-03-05');
  });

  it('orders a range and tests membership inclusively', () => {
    expect(orderRange('2026-11-17', '2026-11-02')).toEqual(['2026-11-02', '2026-11-17']);
    expect(orderRange('2026-11-02', '2026-11-17')).toEqual(['2026-11-02', '2026-11-17']);
    expect(isWithinRange('2026-11-02', '2026-11-02', '2026-11-17')).toBe(true);
    expect(isWithinRange('2026-11-10', '2026-11-17', '2026-11-02')).toBe(true);
    expect(isWithinRange('2026-11-18', '2026-11-02', '2026-11-17')).toBe(false);
    expect(isWithinRange('2026-11-10', '', '2026-11-17')).toBe(false);
  });
});
