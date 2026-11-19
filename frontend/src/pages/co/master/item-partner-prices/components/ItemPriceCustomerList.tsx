import { useMemo } from 'react';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { ItemPriceCustomerRow } from '../types/itemPriceCustomer.types';

function createColumns(): F1GridColumn<ItemPriceCustomerRow>[] {
  return [
    { field: 'customerId', headerName: 'No', type: 'rownumber', width: 48, align: 'center', search: { hidden: true } },
    { field: 'customerCode', headerName: '거래처코드', width: 92, align: 'center', editable: false, highlightSearch: true, search: { hidden: true } },
    { field: 'customerName', headerName: '거래처명', width: 140, editable: false, highlightSearch: true, search: { hidden: true } },
    { field: 'businessNo', headerName: '사업자번호', width: 110, align: 'center', editable: false, highlightSearch: true, search: { hidden: true } },
    { field: 'priceCount', headerName: '등록 건수', type: 'number', width: 78, align: 'right', editable: false, search: { hidden: true } },
  ];
}

type Props = {
  rows: ItemPriceCustomerRow[];
  gridKey: number;
  loading: boolean;
  selectedId?: number;
  highlightKeyword?: string;
  onSelect: (customer: ItemPriceCustomerRow) => void;
};

/** 거래처 기준 탭의 좌측 거래처 목록(읽기 전용, 행 클릭으로 단일 선택). */
export function ItemPriceCustomerList({ rows, gridKey, loading, selectedId, highlightKeyword, onSelect }: Props) {
  const columns = useMemo(() => createColumns(), []);
  return (
    <F1Grid
      key={gridKey}
      ariaLabel="거래처 목록"
      storageKey="co-master-item-price-customer-list-v1"
      rows={rows}
      columns={columns}
      rowKey="customerId"
      height="100%"
      showCheckbox={false}
      selectionMode="row"
      multiSelect={false}
      initialSelectedRowIds={selectedId === undefined ? undefined : [selectedId]}
      highlightKeyword={highlightKeyword}
      loading={loading}
      allowAddRowInContextMenu={false}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
      rowFormPlugin={{ enabled: false }}
      onSelectionChange={(ids) => {
        // 목록이 다시 그려질 때 오는 빈 선택은 무시한다(저장 후 재조회로 선택이 풀리거나 확인 창이 뜨는 것을 막는다).
        const id = ids[0];
        if (id === undefined) return;
        const customer = rows.find((row) => row.customerId === Number(id));
        if (customer) onSelect(customer);
      }}
    />
  );
}
