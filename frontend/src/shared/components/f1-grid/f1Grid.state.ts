import type {
  F1GridChanges,
  F1GridRowId,
  F1GridRowState,
} from './f1Grid.types';

export type F1GridData<T extends object> = {
  rows: T[];
  stateById: Record<string, F1GridRowState>;
  previousStateById: Record<string, F1GridRowState>;
};

function getStateKey(rowId: F1GridRowId): string {
  return String(rowId);
}

function getRowId<T extends object>(row: T, rowKey: keyof T): F1GridRowId {
  const rowId = row[rowKey];

  if (typeof rowId !== 'string' && typeof rowId !== 'number') {
    throw new Error('F1Grid rowKey must reference a string or number value.');
  }

  return rowId;
}

export function createGridData<T extends object>(
  rows: T[],
  rowKey: keyof T,
): F1GridData<T> {
  const stateById: Record<string, F1GridRowState> = {};

  rows.forEach((row) => {
    stateById[getStateKey(getRowId(row, rowKey))] = 'normal';
  });

  return { rows: [...rows], stateById, previousStateById: {} };
}

export function addGridRow<T extends object>(
  data: F1GridData<T>,
  row: T,
  rowKey: keyof T,
): F1GridData<T> {
  const stateKey = getStateKey(getRowId(row, rowKey));

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
      getRowId(row, rowKey) === rowId ? { ...row, ...changes } : row,
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
    const stateKey = getStateKey(getRowId(row, rowKey));
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
      const stateKey = getStateKey(getRowId(row, rowKey));
      return rowIdSet.has(stateKey) && data.stateById[stateKey] !== 'deleted';
    })
    .map(createDuplicate);
  const stateById = { ...data.stateById };

  duplicates.forEach((row) => {
    stateById[getStateKey(getRowId(row, rowKey))] = 'inserted';
  });

  return { ...data, rows: [...data.rows, ...duplicates], stateById };
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
    const state = data.stateById[getStateKey(getRowId(row, rowKey))];

    if (state === 'inserted') changes.insertedRows.push(row);
    if (state === 'updated') changes.updatedRows.push(row);
    if (state === 'deleted') changes.deletedRows.push(row);
  });

  return changes;
}
