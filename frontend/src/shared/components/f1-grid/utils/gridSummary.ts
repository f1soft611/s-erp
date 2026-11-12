import type { F1GridColumn } from '../types/grid.types';

export function calculateGridSummary<T extends object>(
  rows: T[],
  column: F1GridColumn<T>,
): number | undefined {
  let count = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    const raw = column.getValue ? column.getValue(row) : row[column.field];
    if (typeof raw !== 'number' && typeof raw !== 'string') continue;
    if (typeof raw === 'string' && !raw.trim()) continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    count += 1;
    sum += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (!count) return undefined;
  switch (column.summaryType) {
    case 'sum': return sum;
    case 'average': return sum / count;
    case 'min': return min;
    case 'max': return max;
    default: return undefined;
  }
}
