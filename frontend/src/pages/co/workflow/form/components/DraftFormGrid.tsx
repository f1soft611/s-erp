import { useMemo, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import type { CommonCodeItemRow } from '../../../master/common-code/types/commonCodeManagement.types';
import type {
  DraftFormRow,
  DraftFormUserOption,
} from '../types/draftFormManagement.types';

export type DraftFormGridProps = {
  rows: DraftFormRow[];
  columns: F1GridColumn<DraftFormRow>[];
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<DraftFormRow> | null>;
  onChangesChange: (changes: F1GridChanges<DraftFormRow>) => void;
};

export function createDraftFormRow(): DraftFormRow {
  return {
    draftingWorkCategoryId: `new-draft-form-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    cataTypeCode: '',
    codeName: '',
    categoryItemId: null,
    categoryName: '',
    regTermId: null,
    regTerm: '',
    reviewerId: null,
    reviewerName: '',
    approverId: null,
    approverName: '',
    assigneeIds: [],
    assigneeSummary: '',
    createdByName: '',
    createdAt: '',
    hasDocument: false,
    useAt: 'Y',
  };
}

export function duplicateDraftFormRow(row: DraftFormRow): DraftFormRow {
  return {
    ...row,
    draftingWorkCategoryId: `new-draft-form-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    cataTypeCode: '',
    codeName: `${row.codeName} 복사`,
    createdByName: '',
    createdAt: '',
  };
}

export function createDraftFormColumns(
  categoryItems: CommonCodeItemRow[],
  cycleItems: CommonCodeItemRow[],
  users: DraftFormUserOption[],
  canEdit: boolean,
): F1GridColumn<DraftFormRow>[] {
  const getCodeLabel = (items: CommonCodeItemRow[], value: unknown) =>
    items.find((item) => String(item.id) === String(value))?.itemNm ??
    String(value ?? '');
  const getUserLabel = (value: unknown) => {
    if (value == null || value === '') return '';
    const user = users.find(
      (option) => String(option.loginId) === String(value),
    );
    if (!user) return String(value);
    return user.departmentNm
      ? `${user.userNm} (${user.departmentNm})`
      : user.userNm;
  };
  const getUserOptions = (
    getValue: (user: DraftFormUserOption) => string | number,
  ) =>
    users.map((user) => ({
      value: getValue(user),
      label: user.userNm,
      avatarUrl: user.profileImage,
      positionName: user.levelNm,
      departmentName: user.departmentNm,
    }));

  return [
    {
      field: 'draftingWorkCategoryId',
      headerName: 'No',
      type: 'rownumber',
      width: 50,
      align: 'center',
      pinned: 'left',
      search: { hidden: true },
    },
    {
      field: 'cataTypeCode',
      headerName: '구분코드',
      width: 110,
      editable: false,
      align: 'center',
      pinned: 'left',
      form: { group: '기본정보', order: 1, readOnly: true },
      search: { hidden: true },
    },
    {
      field: 'codeName',
      headerName: '구분명',
      flex: 1,
      width: 300,
      editable: canEdit,
      required: true,
      pinned: 'left',
      form: { group: '기본정보', order: 2 },
      search: { hidden: true },
    },
    {
      field: 'categoryItemId',
      headerName: '분류',
      width: 100,
      align: 'center',
      type: 'select',
      options: categoryItems.map((item) => ({
        value: Number(item.id),
        label: item.itemNm,
      })),
      renderCell: ({ value }) => getCodeLabel(categoryItems, value),
      editable: canEdit,
      required: true,
      form: { group: '기본정보', order: 3 },
      search: { label: '분류', order: 1 },
    },
    {
      field: 'regTermId',
      headerName: '등록주기',
      width: 80,
      align: 'center',
      type: 'select',
      options: cycleItems.map((item) => ({
        value: Number(item.id),
        label: item.itemNm,
      })),
      renderCell: ({ value }) => getCodeLabel(cycleItems, value),
      editable: canEdit,
      required: true,
      form: { group: '기본정보', order: 4 },
      search: { label: '등록주기', order: 2 },
    },
    {
      field: 'reviewerId',
      headerGroup: '결재자',
      headerName: '검토자',
      width: 120,
      type: 'user',
      userOptions: getUserOptions((user) => user.loginId),
      renderCell: ({ value }) => getUserLabel(value),
      onValueChange: (_row, value) => ({
        reviewerId: value === '' || value == null ? null : Number(value),
      }),
      editable: canEdit,
      form: { group: '결재자', order: 1 },
      search: { hidden: true },
    },
    {
      field: 'approverId',
      headerGroup: '결재자',
      headerName: '승인자',
      width: 120,
      type: 'user',
      userOptions: getUserOptions((user) => user.loginId),
      renderCell: ({ value }) => getUserLabel(value),
      onValueChange: (_row, value) => ({
        approverId: value === '' || value == null ? null : Number(value),
      }),
      editable: canEdit,
      form: { group: '결재자', order: 2 },
      search: { hidden: true },
    },
    {
      field: 'assigneeIds',
      headerName: '담당자',
      width: 150,
      type: 'user',
      userOptions: getUserOptions((user) => user.userId),
      getValue: (row) => row.assigneeSummary,
      onValueChange: (_row, value) => {
        const assigneeIds = Array.isArray(value) ? value.map(String) : [];
        const names = assigneeIds.map(
          (id) => users.find((user) => user.userId === id)?.userNm ?? id,
        );
        const assigneeSummary =
          names.length === 0
            ? ''
            : names.length === 1
              ? names[0]
              : `${names[0]} 외 ${names.length - 1}명`;
        return { assigneeIds, assigneeSummary };
      },
      editable: canEdit,
      form: { group: '담당자', order: 1, multiple: true, span: 2 },
      search: { hidden: true },
    },
    {
      field: 'createdByName',
      headerName: '등록자',
      width: 80,
      align: 'center',
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'createdAt',
      headerName: '등록일시',
      align: 'center',
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'useAt',
      headerName: '사용여부',
      width: 80,
      type: 'select',
      align: 'center',
      options: [
        { value: 'Y', label: '사용' },
        { value: 'N', label: '미사용' },
      ],
      editable: canEdit,
      form: { group: '기본정보', order: 5 },
      search: { label: '사용여부', order: 3 },
    },
  ];
}

export function DraftFormGrid({
  rows,
  columns,
  canCreate,
  canUpdate,
  loading,
  gridKey,
  gridRef,
  onChangesChange,
}: DraftFormGridProps) {
  const rowFormPlugin = useMemo(() => {
    if (!canCreate && !canUpdate) return { enabled: false };
    return {
      getTitle: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? '기안양식 등록' : '기안양식 수정',
      onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? canCreate : canUpdate,
    };
  }, [canCreate, canUpdate]);

  return (
    <F1Grid
      key={gridKey}
      ref={gridRef}
      ariaLabel="기안양식 목록"
      storageKey="co-workflow-draft-form-grid"
      rows={rows}
      columns={columns}
      rowKey="draftingWorkCategoryId"
      rowFormPlugin={rowFormPlugin}
      createRow={createDraftFormRow}
      createDuplicate={duplicateDraftFormRow}
      onChangesChange={onChangesChange}
      loading={loading}
      height="100%"
      showCheckbox={false}
      canExportExcel={true}
      allowAddRowInContextMenu={canCreate}
      allowDuplicateRowInContextMenu={canCreate}
      allowDeleteRowInContextMenu={false}
    />
  );
}
