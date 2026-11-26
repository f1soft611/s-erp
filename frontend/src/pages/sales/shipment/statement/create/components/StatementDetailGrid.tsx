import { F1Grid } from '../../../../../../shared/components/f1-grid';
import { statementDetailColumns } from '../data/statementDetailColumns';
import type { StatementDetail } from '../../types/salesStatement.types';
import type { F1GridRowId } from '../../../../../../shared/components/f1-grid';

export function StatementDetailGrid({ rows, selectable = false, selectedRowIds, onSelectionChange }: {
  rows: StatementDetail[];
  selectable?: boolean;
  selectedRowIds?: F1GridRowId[];
  onSelectionChange?: (rowIds: F1GridRowId[]) => void;
}) {
  return (
    <F1Grid storageKey="sales-statement-create-details-v1" ariaLabel="거래명세서 상세 목록"
      rows={rows} columns={statementDetailColumns} features={[{ ftype: 'summary', dock: 'bottom' }]} rowKey="salesStatementDetailId"
      showCheckbox={selectable} selectionMode="row" multiSelect={selectable}
      initialSelectedRowIds={selectedRowIds}
      onSelectionChange={selectable ? onSelectionChange : undefined}
      canExportExcel={false} allowAddRowInContextMenu={false}
      allowDeleteRowInContextMenu={false} allowDuplicateRowInContextMenu={false} height="100%" />
  );
}
