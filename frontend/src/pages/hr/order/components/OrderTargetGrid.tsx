import type { RefObject } from 'react';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../shared/components/f1-grid';
import type { OrderTargetRow } from '../types/order.types';

type Props = {
  rows: OrderTargetRow[];
  columns: F1GridColumn<OrderTargetRow>[];
  gridKey: string;
  gridRef: RefObject<F1GridRef<OrderTargetRow> | null>;
};

/** 대상 사원 표. 체크박스로 고른 행을 대상에서 뺄 수 있고 명령 후 값 열만 수정할 수 있다. */
export function OrderTargetGrid({ rows, columns, gridKey, gridRef }: Props) {
  return (
    <F1Grid
      key={gridKey}
      ref={gridRef}
      ariaLabel="대상 사원"
      storageKey="hr-order-target-grid-v1"
      rows={rows}
      columns={columns}
      rowKey="userId"
      height="100%"
      rowFormPlugin={{ enabled: false }}
      canExportExcel={false}
      allowAddRowInContextMenu={false}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
    />
  );
}
