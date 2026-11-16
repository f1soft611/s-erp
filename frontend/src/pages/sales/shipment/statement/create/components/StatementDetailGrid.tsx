import { F1Grid } from '../../../../../../shared/components/f1-grid';
import { statementDetailColumns } from '../data/statementDetailColumns';
import type { StatementDetail } from '../../types/salesStatement.types';

export function StatementDetailGrid({ rows }: { rows: StatementDetail[] }) {
  return (
    <F1Grid storageKey="sales-statement-create-details-v1" ariaLabel="거래명세서 상세 목록"
      rows={rows} columns={statementDetailColumns} rowKey="salesStatementDetailId"
      showCheckbox={false} selectionMode="row" canExportExcel={false} allowAddRowInContextMenu={false}
      allowDeleteRowInContextMenu={false} allowDuplicateRowInContextMenu={false} height="100%" />
  );
}
