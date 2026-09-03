import type {
  F1GridChanges,
  F1GridRowId,
  F1GridRowState,
} from '../types/grid.types';
import { getGridRowId, getStateKey, hasGridRowId } from '../utils/grid.utils';

export type F1GridData<T extends object> = {
  rows: T[];
  stateById: Record<string, F1GridRowState>;
  previousStateById: Record<string, F1GridRowState>;
  dirtyFieldsById: Record<string, Record<string, boolean>>;
  originalRowsById: Record<string, T>;
};

export function areGridValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left == null || right == null) return left === right;

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    return left.every((item, index) => areGridValuesEqual(item, right[index]));
  }

  if (typeof left === 'object' && typeof right === 'object') {
    const leftEntries = Object.entries(left as Record<string, unknown>);
    const rightEntries = Object.entries(right as Record<string, unknown>);
    if (leftEntries.length !== rightEntries.length) return false;

    return leftEntries.every(([key, value]) =>
      areGridValuesEqual(value, (right as Record<string, unknown>)[key]),
    );
  }

  return false;
}

export function createGridData<T extends object>(
  rows: T[],
  rowKey: keyof T,
): F1GridData<T> {
  const stateById: Record<string, F1GridRowState> = {};
  const originalRowsById: Record<string, T> = {};

  rows.forEach((row) => {
    const stateKey = getStateKey(getGridRowId(row, rowKey));
    stateById[stateKey] = 'normal';
    originalRowsById[stateKey] = { ...row };
  });

  return {
    rows: [...rows],
    stateById,
    previousStateById: {},
    dirtyFieldsById: {},
    originalRowsById,
  };
}

export function addGridRow<T extends object>(
  data: F1GridData<T>,
  row: T,
  rowKey: keyof T,
): F1GridData<T> {
  const stateKey = getStateKey(getGridRowId(row, rowKey));

  if (hasGridRowId(data.rows, rowKey, getGridRowId(row, rowKey))) return data;

  return {
    ...data,
    rows: [...data.rows, row],
    stateById: { ...data.stateById, [stateKey]: 'inserted' },
    dirtyFieldsById: {
      ...data.dirtyFieldsById,
      [stateKey]: Object.fromEntries(
        Object.keys(row).map((field) => [String(field), true]),
      ),
    },
  };
}

export function updateGridRow<T extends object>(
  data: F1GridData<T>,
  rowKey: keyof T,
  rowId: F1GridRowId,
  changes: Partial<T>,
): F1GridData<T> {
  const stateKey = getStateKey(rowId);
  const currentState = data.stateById[stateKey];

  if (!currentState || currentState === 'deleted') {
    return data;
  }

  const nextDirtyFields = {
    ...data.dirtyFieldsById,
    [stateKey]: {
      ...(data.dirtyFieldsById[stateKey] ?? {}),
    },
  };
  const originalRow = data.originalRowsById[stateKey];

  Object.keys(changes).forEach((field) => {
    const nextValue = (changes as Record<string, unknown>)[field];
    if (
      originalRow &&
      areGridValuesEqual(originalRow[field as keyof T], nextValue)
    ) {
      delete nextDirtyFields[stateKey][field];
    } else {
      nextDirtyFields[stateKey][field] = true;
    }
  });

  const isRowClean = Object.keys(nextDirtyFields[stateKey]).length === 0;

  return {
    ...data,
    rows: data.rows.map((row) =>
      getGridRowId(row, rowKey) === rowId ? { ...row, ...changes } : row,
    ),
    stateById: {
      ...data.stateById,
      [stateKey]:
        currentState === 'inserted'
          ? 'inserted'
          : isRowClean
            ? 'normal'
            : 'updated',
    },
    dirtyFieldsById: nextDirtyFields,
  };
}

export function markRowsDeleted<T extends object>(
  data: F1GridData<T>,
  rowKey: keyof T,
  rowIds: F1GridRowId[],
): F1GridData<T> {
  const stateById = { ...data.stateById };
  const previousStateById = { ...data.previousStateById };
  const dirtyFieldsById = { ...data.dirtyFieldsById };
  const rowIdSet = new Set(rowIds.map(getStateKey));

  data.rows.forEach((row) => {
    const stateKey = getStateKey(getGridRowId(row, rowKey));
    const currentState = stateById[stateKey];

    if (rowIdSet.has(stateKey) && currentState && currentState !== 'deleted') {
      previousStateById[stateKey] = currentState;
      stateById[stateKey] = 'deleted';
      dirtyFieldsById[stateKey] = {};
    }
  });

  return { ...data, stateById, previousStateById, dirtyFieldsById };
}

export function restoreGridRows<T extends object>(
  data: F1GridData<T>,
): F1GridData<T> {
  const stateById = { ...data.stateById };
  const dirtyFieldsById = { ...data.dirtyFieldsById };

  Object.entries(stateById).forEach(([stateKey, state]) => {
    if (state === 'deleted') {
      stateById[stateKey] = data.previousStateById[stateKey] ?? 'normal';
      delete dirtyFieldsById[stateKey];
    }
  });

  return { ...data, stateById, previousStateById: {}, dirtyFieldsById };
}

export function duplicateGridRows<T extends object>(
  data: F1GridData<T>,
  rowKey: keyof T,
  rowIds: F1GridRowId[],
  createDuplicate: (row: T) => T,
): F1GridData<T> {
  const rowIdSet = new Set(rowIds.map(getStateKey));
  const duplicates = data.rows
    .filter((row) => {
      const stateKey = getStateKey(getGridRowId(row, rowKey));
      return rowIdSet.has(stateKey) && data.stateById[stateKey] !== 'deleted';
    })
    .map(createDuplicate);
  const stateById = { ...data.stateById };

  duplicates.forEach((row) => {
    const rowId = getGridRowId(row, rowKey);
    if (!hasGridRowId(data.rows, rowKey, rowId)) {
      stateById[getStateKey(rowId)] = 'inserted';
    }
  });

  const uniqueDuplicates = duplicates.filter(
    (row) => !hasGridRowId(data.rows, rowKey, getGridRowId(row, rowKey)),
  );

  return { ...data, rows: [...data.rows, ...uniqueDuplicates], stateById };
}

export function getGridChanges<T extends object>(
  data: F1GridData<T>,
  rowKey: keyof T,
): F1GridChanges<T> {
  const changes: F1GridChanges<T> = {
    insertedRows: [],
    updatedRows: [],
    deletedRows: [],
  };

  data.rows.forEach((row) => {
    const state = data.stateById[getStateKey(getGridRowId(row, rowKey))];

    if (state === 'inserted') changes.insertedRows.push(row);
    if (state === 'updated') changes.updatedRows.push(row);
    if (state === 'deleted') changes.deletedRows.push(row);
  });

  return changes;
}
