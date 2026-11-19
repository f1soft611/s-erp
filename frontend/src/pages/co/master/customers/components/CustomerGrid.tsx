import { useMemo, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
  type F1GridValidationError,
} from '../../../../../shared/components/f1-grid';
import type { CustomerRow } from '../types/customerManagement.types';
import { createCustomerRow } from '../data/customerGridData';

export type CustomerGridProps = {
  rows: CustomerRow[];
  columns: F1GridColumn<CustomerRow>[];
  highlightKeyword?: string;
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<CustomerRow> | null>;
  onChangesChange: (changes: F1GridChanges<CustomerRow>) => void;
  onValidationErrors: (errors: F1GridValidationError[]) => void;
};

export function CustomerGrid({
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
}: CustomerGridProps) {
  const rowFormPlugin = useMemo(() => {
    if (!canCreate && !canUpdate) return { enabled: false };
    return {
      getTitle: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? '거래처 등록' : '거래처 수정',
      onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? canCreate : canUpdate,
    };
  }, [canCreate, canUpdate]);

  return (
    <F1Grid
      key={gridKey}
      ref={gridRef}
      ariaLabel="거래처 목록"
      storageKey="co-master-customer-grid"
      rows={rows}
      columns={columns}
      highlightKeyword={highlightKeyword}
      rowKey="customerId"
      rowFormPlugin={rowFormPlugin}
      createRow={createCustomerRow}
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
