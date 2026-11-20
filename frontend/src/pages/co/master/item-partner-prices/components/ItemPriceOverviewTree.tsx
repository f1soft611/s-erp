import { useMemo, useState, type RefObject } from 'react';
import {
  F1Tree,
  type F1GridChanges,
  type F1TreeRef,
} from '../../../../../shared/components/f1-grid';
import { MasterPickerDialog } from '../../../../../shared/components/master-picker/MasterPickerDialog';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import { searchOrderCustomers } from '../../../../sales/order/create/services/salesOrderMaster.service';
import type { ItemPriceOverviewRow } from '../types/itemPriceOverview.types';
import type { ItemPartnerPriceCodeOptions } from './itemPartnerPriceGridModel';
import {
  createItemPriceChildRow,
  createItemPriceOverviewColumns,
  isNewChildRow,
} from './itemPriceOverviewGridModel';

type Props = {
  rows: ItemPriceOverviewRow[];
  treeRef: RefObject<F1TreeRef<ItemPriceOverviewRow> | null>;
  gridKey: number;
  loading: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  today: string;
  highlightKeyword?: string;
  codeOptions?: ItemPartnerPriceCodeOptions;
  onChangesChange: (changes: F1GridChanges<ItemPriceOverviewRow>) => void;
  onSelectionChange: (rowIds: (string | number)[]) => void;
};

type PickerState = { applyPatch: (changes: Partial<ItemPriceOverviewRow>) => void };

/** 품목(부모) 아래에 거래처 특별단가(자식)를 펼치는 트리 그리드. */
export function ItemPriceOverviewTree({
  rows, treeRef, gridKey, loading, canCreate, canUpdate, canExportExcel, today, highlightKeyword,
  codeOptions, onChangesChange, onSelectionChange,
}: Props) {
  const [picker, setPicker] = useState<PickerState | null>(null);
  const canEdit = canCreate || canUpdate;
  const columns = useMemo(() => createItemPriceOverviewColumns({
    canEdit,
    today,
    codeOptions,
    onPickCustomer: (_row, applyPatch) => setPicker({ applyPatch }),
  }), [canEdit, today, codeOptions]);

  // 한 품목에는 기본 거래처가 하나뿐이다. 새로 체크된 행이 생기면 같은 품목의 다른 거래처 행 체크를 해제한다(서버가 최종 보장).
  const handleChangesChange = (changes: F1GridChanges<ItemPriceOverviewRow>) => {
    const tree = treeRef.current;
    if (tree) {
      const before = new Map(rows.map((row) => [row.rowId, row.purchaseDefaultSupplier]));
      const active = tree.getActiveRows();
      for (const row of active) {
        if (row.parentId === null || !row.purchaseDefaultSupplier || before.get(row.rowId) === true) continue;
        active
          .filter((other) => other.parentId === row.parentId && other.rowId !== row.rowId && other.purchaseDefaultSupplier)
          .forEach((other) => tree.setCellValue(other.rowId, 'purchaseDefaultSupplier', false));
      }
    }
    onChangesChange(changes);
  };

  const addSpecialPrice = (rowId: string | number | undefined) => {
    const tree = treeRef.current;
    if (!tree || rowId === undefined) return;
    const active = tree.getActiveRows();
    const selected = active.find((row) => row.rowId === rowId);
    const parent = selected && selected.parentId
      ? active.find((row) => row.rowId === selected.parentId)
      : selected;
    if (!parent) return;
    const child = createItemPriceChildRow(parent);
    tree.addChildRow(parent.rowId, child);
    tree.expandRow(parent.rowId);
  };

  const choose = (option: MasterPickerOption) => {
    picker?.applyPatch({
      customerId: option.id,
      customerCode: option.code,
      customerName: option.name,
      displayName: option.name,
    });
    setPicker(null);
  };

  return (
    <>
      <F1Tree
        key={gridKey}
        ref={treeRef}
        storageKey="co-master-item-price-overview-v2"
        ariaLabel="품목 기준 단가"
        rows={rows}
        rowKey="rowId"
        parentKey="parentId"
        treeColumn="displayName"
        columns={columns}
        highlightKeyword={highlightKeyword}
        height="100%"
        defaultExpanded={[]}
        showCheckbox={false}
        selectionMode="row"
        multiSelect={false}
        rowFormPlugin={canEdit
          ? {
              getTitle: () => '품목 단가 입력',
              getDescription: () => '적용일을 비우면 서버 오늘 날짜로 저장됩니다. 값만 바꾸면 현재 단가를 정정하고, 더 늦은 적용일을 입력하면 새 단가로 등록됩니다.',
            }
          : { enabled: false }}
        loading={loading}
        canExportExcel={canExportExcel}
        onChangesChange={handleChangesChange}
        onSelectionChange={onSelectionChange}
        treeContextMenu={{
          addRootLabel: '',
          addChildLabel: '특별단가 추가',
          addRootDisabled: true,
          isAddChildDisabled: (id) => !canCreate || loading || id === undefined,
          onAddRoot: () => undefined,
          onAddChild: addSpecialPrice,
        }}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
        isDeleteDisabled={(row) => !isNewChildRow(row)}
      />
      <MasterPickerDialog
        key={picker ? 'open' : 'closed'}
        open={picker !== null}
        label="거래처"
        search={searchOrderCustomers}
        onClose={() => setPicker(null)}
        onChange={choose}
      />
    </>
  );
}

