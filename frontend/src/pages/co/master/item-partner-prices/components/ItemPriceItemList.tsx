import { useMemo } from 'react';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { ITEM_TYPE_OPTIONS } from '../data/priceSearchFields';
import type { ItemPartnerPriceTradeType } from '../types/itemPartnerPrice.types';
import type { ItemPriceOverviewRow } from '../types/itemPriceOverview.types';

/** 품목코드·품목·규격·단위를 나란히 둔다. 기본 거래처는 오른쪽 단가 목록의 "기본 거래처" 열에서 보고 지정한다. */
function createColumns(): F1GridColumn<ItemPriceOverviewRow>[] {
  return [
    { field: 'materialId', headerName: 'No', type: 'rownumber', width: 44, align: 'center', search: { hidden: true } },
    { field: 'materialCode', headerName: '품목코드', width: 80, align: 'center', editable: false, highlightSearch: true, search: { hidden: true } },
    { field: 'materialName', headerName: '품목', width: 116, editable: false, highlightSearch: true, search: { hidden: true } },
    { field: 'materialSpec', headerName: '규격', width: 84, editable: false, highlightSearch: true, search: { hidden: true } },
    { field: 'materialUnit', headerName: '단위', width: 48, align: 'center', editable: false, search: { hidden: true } },
    {
      field: 'materialTypeCode',
      headerName: '계정분류',
      type: 'select',
      width: 70,
      align: 'center',
      options: ITEM_TYPE_OPTIONS,
      editable: false,
      search: { hidden: true },
    },
    { field: 'customerCount', headerName: '거래처 수', type: 'number', width: 66, align: 'right', editable: false, search: { hidden: true } },
  ];
}

type Props = {
  tradeType: ItemPartnerPriceTradeType;
  rows: ItemPriceOverviewRow[];
  gridKey: number;
  loading: boolean;
  selectedId?: number;
  highlightKeyword?: string;
  onSelect: (item: ItemPriceOverviewRow) => void;
};

/** 품목 기준 탭의 좌측 품목 목록(읽기 전용, 행 클릭으로 단일 선택). */
export function ItemPriceItemList({ tradeType, rows, gridKey, loading, selectedId, highlightKeyword, onSelect }: Props) {
  const columns = useMemo(() => createColumns(), []);
  return (
    <F1Grid
      key={gridKey}
      ariaLabel="품목 목록"
      storageKey={`co-master-item-price-item-list-${tradeType === '매출' ? 'sales' : 'purchase'}-v1`}
      rows={rows}
      columns={columns}
      rowKey="materialId"
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
        const item = rows.find((row) => row.materialId === Number(id));
        if (item) onSelect(item);
      }}
    />
  );
}
