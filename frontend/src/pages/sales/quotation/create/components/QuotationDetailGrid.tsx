import { useMemo, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import {
  createQuotationDetailColumns,
  createQuotationDetailRow,
  duplicateQuotationDetailRow,
  type QuotationDetailRow,
} from '../data/quotationDetail';

type Props = {
  gridRef: RefObject<F1GridRef<QuotationDetailRow> | null>;
  rows: QuotationDetailRow[];
  onChangesChange: (changes: F1GridChanges<QuotationDetailRow>) => void;
  onSelectionChange: (rowIds: (string | number)[]) => void;
  disabled?: boolean;
};

export function QuotationDetailGrid({
  gridRef,
  rows,
  onChangesChange,
  onSelectionChange,
  disabled = false,
}: Props) {
  const columns = useMemo(
    () => createQuotationDetailColumns(disabled),
    [disabled],
  );
  return (
    <F1Grid
      ref={gridRef}
      ariaLabel="견적 상세 목록"
      storageKey="quotation-create-detail-grid-v1"
      rows={rows}
      columns={columns}
      features={[{ ftype: 'summary', dock: 'bottom' }]}
      rowKey="rowId"
      createRow={createQuotationDetailRow}
      createDuplicate={duplicateQuotationDetailRow}
      onChangesChange={onChangesChange}
      onSelectionChange={onSelectionChange}
      showCheckbox
      height="100%"
      minHeight={260}
      allowAddRowInContextMenu={!disabled}
      allowDuplicateRowInContextMenu={!disabled}
      allowDeleteRowInContextMenu={!disabled}
      disableContextMenu={disabled}
      canExportExcel={false}
    />
  );
}
