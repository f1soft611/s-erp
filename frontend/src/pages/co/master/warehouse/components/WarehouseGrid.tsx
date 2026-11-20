import { useMemo, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
  type F1GridValidationError,
} from '../../../../../shared/components/f1-grid';
import type { WarehouseRow } from '../types/warehouseManagement.types';
import { createWarehouseRow } from '../data/warehouseGridData';

export type WarehouseGridProps = {
  rows: WarehouseRow[];
  columns: F1GridColumn<WarehouseRow>[];
  highlightKeyword?: string;
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<WarehouseRow> | null>;
  onChangesChange: (changes: F1GridChanges<WarehouseRow>) => void;
  onValidationErrors: (errors: F1GridValidationError[]) => void;
};


export function WarehouseGrid({
  rows,
  columns,
  highlightKeyword,
  canCreate,
  canUpdate,
  canExportExcel,
  loading,
  gridKey,
  gridRef,
  onChangesChange,
  onValidationErrors,
}: WarehouseGridProps) {
  const rowFormPlugin = useMemo(() => {
    if (!canCreate && !canUpdate) return { enabled: false };
    return {
      getTitle: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? '창고 등록' : '창고 수정',
      onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? canCreate : canUpdate,
    };
  }, [canCreate, canUpdate]);

  return (
    <F1Grid
      key={gridKey}
      ref={gridRef}
      ariaLabel="창고 목록"
      storageKey="co-master-warehouse-grid-v2"
      rows={rows}
      columns={columns}
      highlightKeyword={highlightKeyword}
      rowKey="warehouseId"
      rowFormPlugin={rowFormPlugin}
      createRow={createWarehouseRow}
      onChangesChange={onChangesChange}
      onValidationErrors={onValidationErrors}
      loading={loading}
      height="100%"
      showCheckbox={false}
      canExportExcel={canExportExcel}
      allowAddRowInContextMenu={canCreate}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
    />
  );
}
