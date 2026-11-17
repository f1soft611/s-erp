import { useMemo } from 'react';
import { F1Grid } from '../../../../../shared/components/f1-grid';
import { createQuotationStatusColumns } from '../data/quotationStatusColumns';
import type { QuotationStatusRow } from '../types/quotationStatus.types';

type Props = {
  rows: QuotationStatusRow[];
  loading: boolean;
  canExportExcel: boolean;
  onOpenQuotation: (row: QuotationStatusRow) => void;
};

export function QuotationStatusGrid({
  rows,
  loading,
  canExportExcel,
  onOpenQuotation,
}: Props) {
  const columns = useMemo(
    () => createQuotationStatusColumns({ onOpenQuotation }),
    [onOpenQuotation],
  );
  return (
    <F1Grid
      ariaLabel="견적현황 목록"
      columns={columns}
      storageKey="quotationStatusGrid"
      rowKey="quotationDetailId"
      rows={rows}
      loading={loading}
      features={[{ ftype: 'summary', dock: 'bottom' }]}
      showCheckbox
      selectionMode="row"
      selectRowOnContextMenu={false}
      allowAddRowInContextMenu={false}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
      canExportExcel={canExportExcel}
      height="100%"
      minHeight={320}
    />
  );
}
