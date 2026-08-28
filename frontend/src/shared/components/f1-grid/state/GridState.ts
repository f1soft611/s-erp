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
};

export function createGridData<T extends object>(
  rows: T[],
  rowKey: keyof T,
): F1GridData<T> {
  const stateById: Record<string, F1GridRowState> = {};

  rows.forEach((row) => {
    stateById[getStateKey(getGridRowId(row, rowKey))] = 'normal';
  });

  return { rows: [...rows], stateById, previousStateById: {} };
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

  return {
    ...data,
    rows: data.rows.map((row) =>
      getGridRowId(row, rowKey) === rowId ? { ...row, ...changes } : row,
    ),
    stateById: {
      ...data.stateById,
      [stateKey]: currentState === 'inserted' ? 'inserted' : 'updated',
    },
  };
}

export function markRowsDeleted<T extends object>(
  data: F1GridData<T>,
  rowKey: keyof T,
  rowIds: F1GridRowId[],
): F1GridData<T> {
  const stateById = { ...data.stateById };
  const previousStateById = { ...data.previousStateById };
  const rowIdSet = new Set(rowIds.map(getStateKey));

  data.rows.forEach((row) => {
    const stateKey = getStateKey(getGridRowId(row, rowKey));
    const currentState = stateById[stateKey];

    if (rowIdSet.has(stateKey) && currentState && currentState !== 'deleted') {
      previousStateById[stateKey] = currentState;
      stateById[stateKey] = 'deleted';
    }
  });

  return { ...data, stateById, previousStateById };
}

export function restoreGridRows<T extends object>(
  data: F1GridData<T>,
): F1GridData<T> {
  const stateById = { ...data.stateById };

  Object.entries(stateById).forEach(([stateKey, state]) => {
    if (state === 'deleted') {
      stateById[stateKey] = data.previousStateById[stateKey] ?? 'normal';
    }
  });

  return { ...data, stateById, previousStateById: {} };
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
