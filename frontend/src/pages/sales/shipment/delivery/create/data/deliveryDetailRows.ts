import type { F1GridChanges } from '../../../../../../shared/components/f1-grid';
import type { DeliveryRow } from '../types/salesDelivery.types';

export function activeDeliveryRows(
  base: DeliveryRow[],
  changes: F1GridChanges<DeliveryRow>,
): DeliveryRow[] {
  const deleted = new Set(changes.deletedRows.map((row) => row.rowId));
  const updated = new Map(changes.updatedRows.map((row) => [row.rowId, row]));
  return [
    ...base
      .filter((row) => !deleted.has(row.rowId))
      .map((row) => updated.get(row.rowId) ?? row),
    ...changes.insertedRows.filter((row) => !deleted.has(row.rowId)),
  ];
}
