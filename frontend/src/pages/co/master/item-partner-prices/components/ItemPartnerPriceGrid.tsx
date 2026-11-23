import { useMemo, useState, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import { MasterPickerDialog } from '../../../../../shared/components/master-picker/MasterPickerDialog';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import {
  searchOrderCustomers,
  searchOrderMaterials,
} from '../../../../sales/order/create/services/salesOrderMaster.service';
import type { ItemPartnerPriceRow, ItemPartnerPriceTradeType } from '../types/itemPartnerPrice.types';
import {
  createItemPartnerPriceColumns,
  createItemPartnerPriceRow,
  type ItemPartnerPriceCodeOptions,
  type ItemPartnerPricePickerKind,
} from './itemPartnerPriceGridModel';

type PickerState = {
  kind: ItemPartnerPricePickerKind;
  applyPatch: (changes: Partial<ItemPartnerPriceRow>) => void;
};

type Props = {
  rows: ItemPartnerPriceRow[];
  highlightKeyword?: string;
  canCreate: boolean;
  canUpdate: boolean;
  /** 행 삭제(오등록 정정). 적용 중·예정 단가만 서버가 삭제한다. */
  canDelete?: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef?: RefObject<F1GridRef<ItemPartnerPriceRow> | null>;
  codeOptions?: ItemPartnerPriceCodeOptions;
  /** 화면의 거래구분. 신규 행의 거래구분을 이 값으로 고정하고 거래구분 열·폼 칸을 숨긴다. */
  tradeType?: ItemPartnerPriceTradeType;
  /** 거래처 기준 화면: 신규 행의 거래처를 이 값으로 고정하고 거래처 컬럼을 숨긴다. */
  fixedCustomer?: { customerId: number; customerCode: string; customerName: string };
  /** 품목 기준 화면: 신규 행의 품목을 이 값으로 고정하고 품목 컬럼을 숨긴다. 매입이면 기본 거래처는 한 행만 체크된다. */
  fixedMaterial?: { materialId: number; materialCode: string; materialName: string; materialSpec?: string; materialUnit?: string };
  onChangesChange: (changes: F1GridChanges<ItemPartnerPriceRow>) => void;
};

export function ItemPartnerPriceGrid({
  rows,
  highlightKeyword,
  canCreate,
  canUpdate,
  canDelete = false,
  canExportExcel,
  loading,
  gridKey,
  gridRef,
  codeOptions,
  tradeType,
  fixedCustomer,
  fixedMaterial,
  onChangesChange,
}: Props) {
  const [picker, setPicker] = useState<PickerState | null>(null);
  const columns = useMemo(
    () => createItemPartnerPriceColumns(
      (row) => String(row.priceId).startsWith('new-price-') ? canCreate : canUpdate,
      (kind, _row, applyPatch) => setPicker({ kind, applyPatch }),
      codeOptions,
      canCreate || canUpdate,
      Boolean(fixedCustomer),
      tradeType,
      Boolean(fixedMaterial),
    ),
    [canCreate, canUpdate, codeOptions, fixedCustomer, fixedMaterial, tradeType],
  );
  const createRow = useMemo(
    () => () => ({ ...createItemPartnerPriceRow(tradeType), ...fixedCustomer, ...fixedMaterial }),
    [fixedCustomer, fixedMaterial, tradeType],
  );

  // 한 품목에는 기본 거래처가 하나뿐이다. 새로 체크된 행이 생기면 같은 품목의 다른 행 체크를 해제한다(서버가 최종 보장).
  const handleChangesChange = (changes: F1GridChanges<ItemPartnerPriceRow>) => {
    const grid = gridRef?.current;
    if (grid && fixedMaterial && tradeType !== '매출') {
      const before = new Map(rows.map((row) => [String(row.priceId), row.defaultSupplier]));
      const active = grid.getActiveRows();
      for (const row of active) {
        if (!row.defaultSupplier || before.get(String(row.priceId)) === true) continue;
        active
          .filter((other) => other.priceId !== row.priceId && other.defaultSupplier)
          .forEach((other) => grid.setCellValue(other.priceId, 'defaultSupplier', false));
      }
    }
    onChangesChange(changes);
  };
  const rowFormPlugin = useMemo(() => {
    if (!canCreate && !canUpdate) return { enabled: false };
    return {
      getTitle: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? '단가 등록' : '단가 수정',
      getDescription: () => '원화단가 또는 외화단가 중 하나는 입력해야 합니다. 부가세 포함은 과세일 때만 선택할 수 있습니다.',
      onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? canCreate : canUpdate,
    };
  }, [canCreate, canUpdate]);

  const chooseMaster = (kind: ItemPartnerPricePickerKind, option: MasterPickerOption) => {
    if (!picker) return;
    picker.applyPatch(kind === 'material'
      ? {
          materialId: option.id,
          materialCode: option.code,
          materialName: option.name,
        }
      : {
          customerId: option.id,
          customerCode: option.code,
          customerName: option.name,
        });
    setPicker(null);
  };

  return (
    <>
      <F1Grid
        key={gridKey}
        ref={gridRef}
        ariaLabel="품목·거래처별 단가 목록"
        storageKey={`${fixedCustomer ? 'co-master-item-price-by-customer-v3' : fixedMaterial ? 'co-master-item-price-by-item-v1' : canCreate || canUpdate ? 'co-master-item-partner-price-grid-v4' : 'co-master-item-price-history-v3'}-${tradeType === '매출' ? 'sales' : 'purchase'}`}
        rows={rows}
        columns={columns}
        highlightKeyword={highlightKeyword}
        rowKey="priceId"
        rowFormPlugin={rowFormPlugin}
        createRow={createRow}
        onChangesChange={handleChangesChange}
        loading={loading}
        height="100%"
        showCheckbox={false}
        canExportExcel={canExportExcel}
        allowAddRowInContextMenu={canCreate}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={canDelete}
      />
      <MasterPickerDialog
        key={picker?.kind ?? 'closed'}
        open={picker !== null}
        label={picker?.kind === 'material' ? '품목' : '거래처'}
        search={picker?.kind === 'material' ? searchOrderMaterials : searchOrderCustomers}
        onClose={() => setPicker(null)}
        onChange={(option) => chooseMaster(picker?.kind ?? 'material', option)}
      />
    </>
  );
}
