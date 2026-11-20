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
  type ItemPartnerPriceCodeOptions,
  type ItemPartnerPricePickerKind,
} from './itemPartnerPriceGridModel';

/** 거래처 선택 창의 "거래처 없음" 항목. 선택하면 품목 공통단가(거래처 공통)가 된다. */
const DEFAULT_CUSTOMER_OPTION: MasterPickerOption = {
  id: 0,
  code: '',
  name: '공통단가(거래처 공통)',
};

async function searchCustomersWithDefault(keyword: string): Promise<MasterPickerOption[]> {
  return [DEFAULT_CUSTOMER_OPTION, ...(await searchOrderCustomers(keyword))];
}

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
  /** 거래처 기준 화면: 신규 행의 거래처를 이 값으로 고정하고 거래처 컬럼을 숨긴다. */
  fixedCustomer?: { customerId: number; customerCode: string; customerName: string };
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
  fixedCustomer,
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
    ),
    [canCreate, canUpdate, codeOptions, fixedCustomer],
  );
  const createRow = useMemo(
    () => fixedCustomer
      ? () => ({ ...createItemPartnerPriceRow(), ...fixedCustomer })
      : createItemPartnerPriceRow,
    [fixedCustomer],
  );
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
      : option.id === 0
        ? { customerId: null, customerCode: '', customerName: '' }
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
        storageKey={fixedCustomer ? 'co-master-item-price-by-customer-v2' : canCreate || canUpdate ? 'co-master-item-partner-price-grid-v3' : 'co-master-item-price-history-v2'}
        rows={rows}
        columns={columns}
        highlightKeyword={highlightKeyword}
        rowKey="priceId"
        rowFormPlugin={rowFormPlugin}
        createRow={createRow}
        onChangesChange={onChangesChange}
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
        search={picker?.kind === 'material' ? searchOrderMaterials : searchCustomersWithDefault}
        onClose={() => setPicker(null)}
        onChange={(option) => chooseMaster(picker?.kind ?? 'material', option)}
      />
    </>
  );
}
