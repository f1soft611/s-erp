import type { F1GridColumn } from '../types/grid.types';

function exactSummary<T extends object>(rows: T[], column: F1GridColumn<T>): string | undefined {
  const parsed = rows.flatMap((row) => {
    const raw = column.getValue ? column.getValue(row) : row[column.field];
    if (typeof raw !== 'number' && typeof raw !== 'string') return [];
    const text = String(raw);
    const match = text.match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))$/);
    if (!match || text.length > 256) return [];
    const fraction = match[3] ?? match[4] ?? '';
    const digits = BigInt((match[2] ?? '0') + fraction) * (match[1] === '-' ? -1n : 1n);
    return [{ digits, scale: fraction.length }];
  });
  if (!parsed.length) return undefined;
  const scale = parsed.reduce((max, value) => Math.max(max, value.scale), 0);
  const values = parsed.map((value) => value.digits * 10n ** BigInt(scale - value.scale));
  let result: bigint;
  switch (column.summaryType) {
    case 'sum':
    case 'average':
      result = values.reduce((total, value) => total + value, 0n);
      break;
    case 'min':
      result = values.reduce((min, value) => value < min ? value : min);
      break;
    case 'max':
      result = values.reduce((max, value) => value > max ? value : max);
      break;
    default:
      return undefined;
  }
  let outputScale = scale;
  if (column.summaryType === 'average') {
    outputScale = Number.isInteger(column.decimalPlaces)
      ? Math.max(0, Math.min(column.decimalPlaces!, 100))
      : 5;
    const numerator = result * 10n ** BigInt(outputScale);
    const denominator = BigInt(values.length) * 10n ** BigInt(scale);
    const absolute = numerator < 0n ? -numerator : numerator;
    const remainder = absolute % denominator;
    let rounded = absolute / denominator;
    if ((column.rounding === 'UP' && remainder > 0n) ||
      ((column.rounding ?? 'HALF_UP') === 'HALF_UP' && remainder * 2n >= denominator)) rounded += 1n;
    result = numerator < 0n ? -rounded : rounded;
  }
  const negative = result < 0n;
  const digits = (negative ? -result : result).toString().padStart(outputScale + 1, '0');
  return `${negative ? '-' : ''}${outputScale ? `${digits.slice(0, -outputScale)}.${digits.slice(-outputScale)}` : digits}`;
}

export function calculateGridSummary<T extends object>(
  rows: T[],
  column: F1GridColumn<T>,
): number | string | undefined {
  if (column.exactDecimal) return exactSummary(rows, column);
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
