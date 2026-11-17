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
import type { ItemPartnerPriceRow } from '../types/itemPartnerPrice.types';
import {
  createItemPartnerPriceColumns,
  createItemPartnerPriceRow,
  type ItemPartnerPricePickerKind,
} from './itemPartnerPriceGridModel';

type PickerState = {
  kind: ItemPartnerPricePickerKind;
  applyPatch: (changes: Partial<ItemPartnerPriceRow>) => void;
};

type Props = {
  rows: ItemPartnerPriceRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<ItemPartnerPriceRow> | null>;
  onChangesChange: (changes: F1GridChanges<ItemPartnerPriceRow>) => void;
};

export function ItemPartnerPriceGrid({
  rows,
  canCreate,
  canUpdate,
  canExportExcel,
  loading,
  gridKey,
  gridRef,
  onChangesChange,
}: Props) {
  const [picker, setPicker] = useState<PickerState | null>(null);
  const columns = useMemo(
    () => createItemPartnerPriceColumns(
      (row) => String(row.priceId).startsWith('new-price-') ? canCreate : canUpdate,
      (kind, _row, applyPatch) => setPicker({ kind, applyPatch }),
    ),
    [canCreate, canUpdate],
  );
  const rowFormPlugin = useMemo(() => {
    if (!canCreate && !canUpdate) return { enabled: false };
    return {
      getTitle: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? '단가 등록' : '단가 수정',
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
        storageKey="co-master-item-partner-price-grid-v1"
        rows={rows}
        columns={columns}
        rowKey="priceId"
        rowFormPlugin={rowFormPlugin}
        createRow={createItemPartnerPriceRow}
        onChangesChange={onChangesChange}
        loading={loading}
        height="100%"
        showCheckbox={false}
        canExportExcel={canExportExcel}
        allowAddRowInContextMenu={canCreate}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
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
