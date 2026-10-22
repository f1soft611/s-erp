import { useMemo, type RefObject } from 'react';
import { F1Grid, type F1GridChanges, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import {
  emptyMaterialPayload, expiryStatuses, materialTextFields,
  type MaterialOption, type MaterialRow,
} from '../types/materialManagement.types';

export function createMaterialRow(): MaterialRow {
  return { ...emptyMaterialPayload(), materialId: `new-material-${crypto.randomUUID()}` };
}

export function createMaterialColumns(
  canEdit: boolean | ((row: MaterialRow) => boolean),
  options: MaterialOption[] = [],
  rows: MaterialRow[] = [],
): F1GridColumn<MaterialRow>[] {
  const columns: F1GridColumn<MaterialRow>[] = [{
    field: 'materialId', headerName: 'No', type: 'rownumber', width: 56,
    form: { hidden: true }, search: { hidden: true },
  }];
  materialTextFields.forEach((definition, index) => {
    const codeGroup = 'codeGroup' in definition ? definition.codeGroup : undefined;
    const fieldOptions = codeGroup ? options.filter((item) => item.groupCode === codeGroup)
      .map((item) => ({ value: item.itemCode, label: item.itemName })) : [];
    if (codeGroup) {
      const knownValues = new Set(fieldOptions.map((option) => option.value));
      for (const row of rows) {
        const value = row[definition.field];
        if (value && !knownValues.has(value)) {
          fieldOptions.push({ value, label: value });
          knownValues.add(value);
        }
      }
      fieldOptions.unshift({ value: '', label: '선택 안 함' });
    }
    columns.push({
      field: definition.field, headerName: definition.label,
      width: definition.field === 'materialName' ? 180 : 125,
      hidden: !('visible' in definition && definition.visible),
      editable: canEdit,
      required: definition.field === 'materialName' || definition.field === 'materialTypeCode',
      type: codeGroup ? 'select' : 'text',
      ...(codeGroup ? { options: fieldOptions } : {}),
      form: { hidden: false, group: definition.group, order: index,
        ...(definition.field === 'location' ? { span: 2 } : {}) },
      search: 'search' in definition ? { order: index } : { hidden: true },
    });
  });
  columns.push(
    { field: 'materialWeight', headerName: '중량', type: 'number', hidden: true, editable: canEdit,
      form: { hidden: false, group: '규격·분류', order: 20 }, search: { hidden: true } },
    { field: 'safeInvoice', headerName: '안전재고', type: 'decimal', width: 110, editable: canEdit,
      form: { group: '재고·위치', order: 20 }, search: { hidden: true } },
    { field: 'expiryedStatus', headerName: '소비기한기준', type: 'select', width: 130, editable: canEdit,
      options: expiryStatuses.map((value) => ({
        value, label: options.find((item) => item.groupCode === 'EXPIRY_STATUS' && item.itemCode === value)?.itemName
          ?? ({ NONE: '없음', DAY: '일', MONTH: '월', YEAR: '년' })[value],
      })),
      form: { group: '기타·소비기한', order: 30 }, search: { order: 30 } },
    { field: 'expiryedCount', headerName: '소비기한계산숫자', type: 'number', hidden: true, editable: canEdit,
      form: { hidden: false, group: '기타·소비기한', order: 31 }, search: { hidden: true } },
  );
  return columns;
}

type Props = {
  rows: MaterialRow[];
  columns: F1GridColumn<MaterialRow>[];
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<MaterialRow> | null>;
  onChangesChange: (changes: F1GridChanges<MaterialRow>) => void;
};

export function MaterialGrid({
  rows, columns, canCreate, canUpdate, canExportExcel, loading, gridKey, gridRef, onChangesChange,
}: Props) {
  const rowFormPlugin = useMemo(() => !canCreate && !canUpdate ? { enabled: false } : {
    getTitle: ({ mode }: { mode: 'create' | 'edit' }) => mode === 'create' ? '품목 등록' : '품목 수정',
    onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) => mode === 'create' ? canCreate : canUpdate,
  }, [canCreate, canUpdate]);
  return <F1Grid
    key={gridKey} ref={gridRef} ariaLabel="품목 목록" storageKey="co-master-material-grid"
    rows={rows} columns={columns} rowKey="materialId" rowFormPlugin={rowFormPlugin}
    createRow={createMaterialRow} onChangesChange={onChangesChange} loading={loading}
    height="100%" showCheckbox={false} canExportExcel={canExportExcel}
    allowAddRowInContextMenu={canCreate} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false}
  />;
}
