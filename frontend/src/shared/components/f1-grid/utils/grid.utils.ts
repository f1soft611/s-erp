import type { F1GridColumn, F1GridRowId } from '../types/grid.types';

export function getStateKey(rowId: F1GridRowId): string {
  return String(rowId);
}

export function hasGridRowId<T extends object>(
  rows: T[],
  rowKey: keyof T,
  rowId: F1GridRowId,
): boolean {
  return rows.some((row) => row[rowKey] === rowId);
}

export function getGridRowId<T extends object>(
  row: T,
  rowKey: keyof T,
): F1GridRowId {
  const rowId = row[rowKey];

  if (typeof rowId !== 'string' && typeof rowId !== 'number') {
    throw new Error('F1Grid rowKey must reference a string or number value.');
  }

  return rowId;
}

export function isCellEditable<T extends object>(
  column: F1GridColumn<T>,
  row: T,
): boolean {
  if (column.type === 'rownumber') return false;
  return typeof column.editable === 'function'
    ? column.editable(row)
    : Boolean(column.editable);
}

export function getGridColumnTrack<T extends object>(
  column: F1GridColumn<T>,
  resizedWidth?: number,
): string {
  if (resizedWidth !== undefined) return `${resizedWidth}px`;
  if (column.flex !== undefined && column.flex > 0) {
    return `minmax(${column.width ?? 0}px, ${column.flex}fr)`;
  }
  return `${column.width ?? 140}px`;
}

export function getCellDisplayValue<T extends object>(
  column: F1GridColumn<T>,
  value: T[keyof T],
): string {
  if (column.type === 'select' || column.type === 'autocomplete') {
    return (
      column.options?.find((option) => Object.is(option.value, value))?.label ??
      String(value ?? '')
    );
  }

  if (column.type === 'currency') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
      ? new Intl.NumberFormat('ko-KR').format(numericValue)
      : String(value ?? '');
  }

  return String(value ?? '');
}

const GRID_CELL_FONT = '400 13px "Roboto", "Helvetica", "Arial", sans-serif';
const AUTO_FIT_CELL_PADDING = 32;

let measureContext: CanvasRenderingContext2D | null | undefined;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext !== undefined) return measureContext;
  measureContext =
    typeof document === 'undefined'
      ? null
      : (document.createElement('canvas').getContext('2d') ?? null);
  return measureContext;
}

function measureTextWidth(text: string): number {
  const context = getMeasureContext();
  if (!context) return text.length * 7;
  context.font = GRID_CELL_FONT;
  return context.measureText(text).width;
}

export function getAutoFitColumnWidth<T extends object>(
  column: F1GridColumn<T>,
  rows: T[],
  options: { minWidth: number },
): number {
  const headerWidth = measureTextWidth(column.headerName);
  const contentWidth = rows.reduce((widest, row) => {
    const rawValue = column.getValue?.(row) ?? row[column.field];
    const displayValue = getCellDisplayValue(column, rawValue as T[keyof T]);
    return Math.max(widest, measureTextWidth(displayValue));
  }, 0);

  const measuredWidth =
    Math.max(headerWidth, contentWidth) + AUTO_FIT_CELL_PADDING;
  const clampedWidth = Math.max(options.minWidth, measuredWidth);

  return column.maxWidth !== undefined
    ? Math.min(column.maxWidth, clampedWidth)
    : clampedWidth;
}
