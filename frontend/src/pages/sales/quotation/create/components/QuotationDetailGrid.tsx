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
  type OpenMaterialPicker,
  type QuotationDetailRow,
} from '../data/quotationDetail';
import type { QuotationCodeOption } from '../services/quotationCommonCode.service';
import { usePolicyDecimalRule } from '../../../../../shared/components/f1-grid/core/gridDecimalPolicyContext';

type Props = {
  gridRef: RefObject<F1GridRef<QuotationDetailRow> | null>;
  rows: QuotationDetailRow[];
  onChangesChange: (changes: F1GridChanges<QuotationDetailRow>) => void;
  onSelectionChange: (rowIds: (string | number)[]) => void;
  onOpenMaterialPicker: OpenMaterialPicker;
  unitOptions: QuotationCodeOption[];
  disabled?: boolean;
  onCalculationError?: (error: Error) => void;
};

export function QuotationDetailGrid({
  gridRef,
  rows,
  onChangesChange,
  onSelectionChange,
  onOpenMaterialPicker,
  unitOptions,
  disabled = false,
  onCalculationError,
}: Props) {
  const policy = usePolicyDecimalRule();
  const amountRule = policy && ('places' in policy ? policy : policy.currency);
  const columns = useMemo(
    () => createQuotationDetailColumns(onOpenMaterialPicker, disabled, unitOptions, amountRule, onCalculationError, policy),
    [amountRule, disabled, onCalculationError, onOpenMaterialPicker, policy, unitOptions],
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
