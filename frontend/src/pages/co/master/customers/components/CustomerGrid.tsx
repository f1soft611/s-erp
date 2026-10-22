import { useMemo, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import type { CustomerRow } from '../types/customerManagement.types';

export type CustomerGridProps = {
  rows: CustomerRow[];
  columns: F1GridColumn<CustomerRow>[];
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<CustomerRow> | null>;
  onChangesChange: (changes: F1GridChanges<CustomerRow>) => void;
};

export function createCustomerRow(): CustomerRow {
  return {
    customerId: `new-customer-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    customerCode: '',
    customerName: '',
    custNameAbbr: '',
    presidentName: '',
    businessNo: '',
    juridNo: '',
    businessStatus1: '',
    businessItem1: '',
    postCode: '',
    address: '',
    telephoneNo: '',
    facsimileNo: '',
    custMemo: '',
    useAt: 'Y',
  };
}

export function createCustomerColumns(
  canEdit: boolean,
): F1GridColumn<CustomerRow>[] {
  return [
    {
      field: 'customerId',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      search: { hidden: true },
      form: { hidden: true },
    },
    {
      field: 'customerCode',
      headerName: '거래처코드',
      width: 110,
      align: 'center',
      editable: canEdit,
      form: { group: '기본정보', order: 1 },
      search: { hidden: true },
    },
    {
      field: 'customerName',
      headerName: '거래처명',
      width: 180,
      editable: canEdit,
      required: true,
      form: { group: '기본정보', order: 2 },
      search: { hidden: true },
    },
    {
      field: 'custNameAbbr',
      headerName: '약칭',
      width: 110,
      editable: canEdit,
      form: { group: '기본정보', order: 3 },
      search: { hidden: true },
    },
    {
      field: 'presidentName',
      headerName: '대표자',
      width: 100,
      editable: canEdit,
      form: { group: '사업자정보', order: 1 },
      search: { label: '대표자', order: 1 },
    },
    {
      field: 'businessNo',
      headerName: '사업자번호',
      width: 130,
      editable: canEdit,
      form: { group: '사업자정보', order: 2 },
      search: { label: '사업자번호', order: 2 },
    },
    {
      field: 'businessStatus1',
      headerName: '업태',
      width: 110,
      editable: canEdit,
      form: { group: '사업자정보', order: 4 },
      search: { label: '업태', order: 4 },
    },
    {
      field: 'businessItem1',
      headerName: '종목',
      width: 110,
      editable: canEdit,
      form: { group: '사업자정보', order: 5 },
      search: { label: '종목', order: 5 },
    },
    {
      field: 'telephoneNo',
      headerName: '전화번호',
      width: 130,
      editable: canEdit,
      form: { group: '연락처', order: 1 },
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
      field: 'useAt',
      headerName: '사용여부',
      width: 90,
      type: 'select',
      align: 'center',
      options: [
        { value: 'Y', label: '사용' },
        { value: 'N', label: '미사용' },
      ],
      editable: canEdit,
      form: { group: '기본정보', order: 4 },
      search: { label: '사용여부', order: 6 },
    },
    {
      field: 'juridNo',
      headerName: '법인등록번호',
      hidden: true,
      editable: canEdit,
      form: { hidden: false, group: '사업자정보', order: 3 },
      search: { label: '법인등록번호', order: 3 },
    },
    {
      field: 'postCode',
      headerName: '우편번호',
      hidden: true,
      editable: canEdit,
      form: { hidden: false, group: '연락처', order: 2 },
      search: { hidden: true },
    },
    {
      field: 'facsimileNo',
      headerName: '팩스번호',
      hidden: true,
      editable: canEdit,
      form: { hidden: false, group: '연락처', order: 4 },
      search: { hidden: true },
    },
    {
      field: 'custMemo',
      headerName: '메모',
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

export function CustomerGrid({
  rows,
  columns,
  canCreate,
  canUpdate,
  canExportExcel,
  loading,
  gridKey,
  gridRef,
  onChangesChange,
}: CustomerGridProps) {
  const rowFormPlugin = useMemo(() => {
    if (!canCreate && !canUpdate) return { enabled: false };
    return {
      getTitle: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? '거래처 등록' : '거래처 수정',
      onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? canCreate : canUpdate,
    };
  }, [canCreate, canUpdate]);

  return (
    <F1Grid
      key={gridKey}
      ref={gridRef}
      ariaLabel="거래처 목록"
      storageKey="co-master-customer-grid"
      rows={rows}
      columns={columns}
      rowKey="customerId"
      rowFormPlugin={rowFormPlugin}
      createRow={createCustomerRow}
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
