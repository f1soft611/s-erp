import { useMemo, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import {
  emptyMaterialPayload,
  expiryStatuses,
  materialTextFields,
  type ExpiryStatus,
  type MaterialOption,
  type MaterialRow,
} from '../types/materialManagement.types';

const expiryUnitLabels: Record<ExpiryStatus, string> = {
  NONE: '',
  DAY: '일',
  MONTH: '개월',
  YEAR: '년',
};

export function createMaterialRow(): MaterialRow {
  return {
    ...emptyMaterialPayload(),
    materialId: `new-material-${crypto.randomUUID()}`,
  };
}

export function createMaterialColumns(
  canEdit: boolean | ((row: MaterialRow) => boolean),
  options: MaterialOption[] = [],
  rows: MaterialRow[] = [],
): F1GridColumn<MaterialRow>[] {
  const columns: F1GridColumn<MaterialRow>[] = [
    {
      field: 'materialId',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
      form: { hidden: true },
      search: { hidden: true },
    },
  ];
  materialTextFields.forEach((definition, index) => {
    const codeGroup =
      'codeGroup' in definition ? definition.codeGroup : undefined;
    const fieldOptions = codeGroup
      ? options
          .filter((item) => item.groupCode === codeGroup)
          .map((item) => ({ value: item.itemCode, label: item.itemName }))
      : [];
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
      field: definition.field,
      headerName: definition.label,
      width: definition.field === 'materialName' ? 180 : 125,
      hidden: !('visible' in definition && definition.visible),
      editable: definition.field === 'materialCode' ? false : canEdit,
      align: definition.align ?? 'left',
      required:
        definition.field === 'materialName' ||
        definition.field === 'materialTypeCode',
      type: codeGroup ? 'select' : 'text',
      ...(codeGroup ? { options: fieldOptions } : {}),
      form: definition.field === 'materialCode'
        ? { hidden: true }
        : {
            hidden: false,
            group: definition.group,
            order:
              definition.field === 'materialNo'
                ? 25
                : definition.field === 'kfdaReportNo'
                  ? 26
                  : index,
            ...(definition.field === 'location' ? { span: 2 } : {}),
          },
      search: 'search' in definition ? { order: index } : { hidden: true },
    });
  });
  columns.push(
    {
      field: 'materialWeight',
      headerName: '중량',
      type: 'number',
      hidden: true,
      editable: canEdit,
      form: { hidden: false, group: '규격·분류', order: 20 },
      search: { hidden: true },
    },
    {
      field: 'safeInvoice',
      headerName: '안전재고',
      type: 'decimal',
      width: 110,
      editable: canEdit,
      form: { group: '재고·위치', order: 20 },
      search: { hidden: true },
    },
    {
      field: 'expiryedStatus',
      headerName: '소비기한기준',
      type: 'select',
      width: 130,
      editable: canEdit,
      options: expiryStatuses.map((value) => ({
        value,
        label:
          options.find(
            (item) =>
              item.groupCode === 'EXPIRY_STATUS' && item.itemCode === value,
          )?.itemName ??
          { NONE: '없음', DAY: '일', MONTH: '개월', YEAR: '년' }[value],
      })),
      onValueChange: (_row, value) => {
        const status = expiryStatuses.find((candidate) => candidate === value);
        if (!status) {
          throw new Error('소비기한기준은 NONE/DAY/MONTH/YEAR 중 하나여야 합니다.');
        }
        return {
          expiryedStatus: status,
          ...(status === 'NONE' ? { expiryedCount: null } : {}),
        };
      },
      form: { group: '기타·소비기한', order: 23 },
      search: { order: 30 },
    },
    {
      field: 'expiryedCount',
      headerName: '소비기한 숫자',
      type: 'number',
      editable: canEdit,
      validate: (value, row) => {
        const count = value == null || value === '' ? null : Number(value);
        if (row.expiryedStatus === 'NONE') {
          return count === null
            ? true
            : '소비기한 기준이 없음이면 숫자를 비워 주세요.';
        }
        if (count === null) return '소비기한 숫자를 입력해 주세요.';
        if (!Number.isSafeInteger(count) || count < 1 || count > 2147483647) {
          return '소비기한 숫자는 1~2147483647의 정수여야 합니다.';
        }
        return true;
      },
      form: {
        hidden: false,
        group: '기타·소비기한',
        order: 24,
        label: (row) =>
          row.expiryedStatus === 'NONE'
            ? '소비기한 숫자'
            : `소비기한 숫자 (${expiryUnitLabels[row.expiryedStatus]})`,
        disabled: (row) => row.expiryedStatus === 'NONE',
      },
      search: { hidden: true },
    },
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
  rows,
  columns,
  canCreate,
  canUpdate,
  canExportExcel,
  loading,
  gridKey,
  gridRef,
  onChangesChange,
}: Props) {
  const rowFormPlugin = useMemo(
    () =>
      !canCreate && !canUpdate
        ? { enabled: false }
        : {
            getTitle: ({ mode }: { mode: 'create' | 'edit' }) =>
              mode === 'create' ? '품목 등록' : '품목 수정',
            onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) =>
              mode === 'create' ? canCreate : canUpdate,
          },
    [canCreate, canUpdate],
  );
  return (
    <F1Grid
      key={gridKey}
      ref={gridRef}
      ariaLabel="품목 목록"
      storageKey="co-master-material-grid"
      rows={rows}
      columns={columns}
      rowKey="materialId"
      rowFormPlugin={rowFormPlugin}
      createRow={createMaterialRow}
      onChangesChange={onChangesChange}
      loading={loading}
      height="100%"
      showCheckbox={false}
      canExportExcel={canExportExcel}
      allowAddRowInContextMenu={canCreate}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
    />
  );
}
