import { useMemo, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
  type F1GridValidationError,
} from '../../../../../shared/components/f1-grid';
import type { CommonCodeItemRow } from '../../common-code/types/commonCodeManagement.types';
import type {
  WarehouseRow,
  WarehouseUserOption,
} from '../types/warehouseManagement.types';
import { sanitizeWarehouseNumberInput } from '../utils/warehouseNumberInput';

export type WarehouseGridProps = {
  rows: WarehouseRow[];
  columns: F1GridColumn<WarehouseRow>[];
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<WarehouseRow> | null>;
  onChangesChange: (changes: F1GridChanges<WarehouseRow>) => void;
  onValidationErrors: (errors: F1GridValidationError[]) => void;
};

const PLANT_OPTIONS = [
  { value: 0, label: '사내' },
  { value: 1, label: '외부' },
];

export function createWarehouseRow(): WarehouseRow {
  return {
    warehouseId: `new-warehouse-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    warehouseCode: '',
    warehouseName: '',
    warehouseType: '',
    deleteLockAt: 'N',
    disuseAt: 'N',
    stockQtyDispAt: 'Y',
    stockIoAt: 'Y',
    safetyStockAlertAt: 'N',
    stockDefaultAt: 'N',
    plantId: null,
    customerId: null,
    managerUserId: null,
    managerUserName: '',
    departmentId: null,
    departmentName: '',
    telNo: '',
    faxNo: '',
    address: '',
    remark: '',
  };
}

export function createWarehouseColumns(
  canEdit: boolean,
  userOptions: WarehouseUserOption[],
  warehouseTypeItems: CommonCodeItemRow[],
): F1GridColumn<WarehouseRow>[] {
  const ynColumn = (
    field: keyof WarehouseRow,
    headerName: string,
    order: number,
    width = 110,
  ): F1GridColumn<WarehouseRow> => ({
    field,
    headerName,
    type: 'checkbox',
    headerCheckbox: true,
    align: 'center',
    width,
    editable: canEdit,
    onValueChange: (_row, checked) => ({
      [field]: checked ? 'Y' : 'N',
    }) as Partial<WarehouseRow>,
    form: { group: '운영설정', order },
    search: { hidden: true },
  });

  return [
    {
      field: 'warehouseId',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
      search: { hidden: true },
      form: { hidden: true },
    },
    {
      field: 'warehouseCode',
      headerName: '창고코드',
      width: 110,
      align: 'center',
      editable: canEdit,
      pinned: 'left',
      form: { group: '기본정보', order: 1 },
      search: { hidden: true },
    },
    {
      field: 'warehouseName',
      headerName: '창고명',
      width: 180,
      editable: canEdit,
      required: true,
      pinned: 'left',
      validation: { unique: true },
      form: { group: '기본정보', order: 2 },
      search: { label: '창고명', order: 1 },
    },
    {
      field: 'warehouseType',
      headerName: '창고구분',
      width: 130,
      type: 'select',
      options: warehouseTypeItems.map((item) => ({
        value: item.itemCode,
        label: item.itemNm,
      })),
      editable: canEdit,
      form: { group: '기본정보', order: 3 },
      search: { label: '창고구분', order: 2 },
    },
    ynColumn('deleteLockAt', '삭제불가', 1),
    ynColumn('disuseAt', '불용창고', 2),
    ynColumn('stockQtyDispAt', '현재고표시', 3),
    ynColumn('stockIoAt', '수불처리', 4),
    ynColumn('safetyStockAlertAt', '안전재고미달알림', 5, 150),
    ynColumn('stockDefaultAt', '재고현황기본조회', 6, 150),
    {
      field: 'plantId',
      headerName: '사업장',
      width: 100,
      align: 'center',
      type: 'select',
      options: PLANT_OPTIONS,
      editable: canEdit,
      form: { group: '기본정보', order: 4 },
      search: { hidden: true },
    },
    {
      field: 'managerUserId',
      headerName: '담당자',
      width: 140,
      type: 'user',
      userOptions: userOptions.map((user) => ({
        value: user.userId,
        label: user.userNm,
        avatarUrl: user.profileImage,
        positionName: user.levelNm,
        departmentName: user.departmentNm,
      })),
      editable: canEdit,
      onValueChange: (_row, value) => {
        const selected = userOptions.find(
          (user) => String(user.userId) === String(value),
        );
        return {
          managerUserId: value === '' || value == null ? null : Number(value),
          departmentId:
            selected?.departmentId == null ? null : Number(selected.departmentId),
          departmentName: selected?.departmentNm ?? '',
        } as Partial<WarehouseRow>;
      },
      form: { group: '담당', order: 1 },
      search: { hidden: true },
    },
    {
      field: 'departmentId',
      headerName: '담당부서',
      width: 140,
      editable: false,
      getValue: (row) => row.departmentName ?? '',
      renderCell: ({ row }) => row.departmentName ?? '',
      form: { group: '담당', order: 2, readOnly: true },
      search: { hidden: true },
    },
    {
      field: 'telNo',
      headerName: '전화번호',
      width: 110,
      editable: canEdit,
      align: 'center',
      inputFormat: { type: 'korean-phone', maxDigits: 11 },
      sanitizeInput: sanitizeWarehouseNumberInput,
      form: { group: '연락처', order: 1 },
      search: { hidden: true },
    },
    {
      field: 'faxNo',
      headerName: '팩스번호',
      width: 110,
      editable: canEdit,
      align: 'center',
      inputFormat: { type: 'korean-phone', maxDigits: 11 },
      sanitizeInput: sanitizeWarehouseNumberInput,
      form: { group: '연락처', order: 2 },
      search: { hidden: true },
    },
    {
      field: 'address',
      headerName: '주소',
      width: 260,
      editable: canEdit,
      form: { group: '연락처', order: 3, span: 2 },
      search: { hidden: true },
    },
    {
      field: 'remark',
      headerName: '비고',
      width: 200,
      hidden: true,
      editable: canEdit,
      form: { hidden: false, group: '기타', order: 1, span: 2 },
      search: { hidden: true },
    },
    {
      field: 'tenantId',
      headerName: '테넌트 ID',
      hidden: true,
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'createdBy',
      headerName: '등록자',
      hidden: true,
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'createdAt',
      headerName: '등록일시',
      hidden: true,
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'updatedBy',
      headerName: '수정자',
      hidden: true,
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'updatedAt',
      headerName: '수정일시',
      hidden: true,
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
  ];
}

export function WarehouseGrid({
  rows,
  columns,
  canCreate,
  canUpdate,
  canExportExcel,
  loading,
  gridKey,
  gridRef,
  onChangesChange,
  onValidationErrors,
}: WarehouseGridProps) {
  const rowFormPlugin = useMemo(() => {
    if (!canCreate && !canUpdate) return { enabled: false };
    return {
      getTitle: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? '창고 등록' : '창고 수정',
      onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? canCreate : canUpdate,
    };
  }, [canCreate, canUpdate]);

  return (
    <F1Grid
      key={gridKey}
      ref={gridRef}
      ariaLabel="창고 목록"
      storageKey="co-master-warehouse-grid"
      rows={rows}
      columns={columns}
      rowKey="warehouseId"
      rowFormPlugin={rowFormPlugin}
      createRow={createWarehouseRow}
      onChangesChange={onChangesChange}
      onValidationErrors={onValidationErrors}
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
