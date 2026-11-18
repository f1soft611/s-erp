import { createElement } from 'react';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Button, Typography } from '@mui/material';
import type { F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { CommonCodeItemRow } from '../../../master/common-code/types/commonCodeManagement.types';
import type {
  DraftFormRow,
  DraftFormUserOption,
} from '../types/draftFormManagement.types';

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
  onOpenTemplate?: (row: DraftFormRow) => void,
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
      headerName: '양식코드',
      highlightSearch: true,
      width: 110,
      editable: false,
      align: 'center',
      pinned: 'left',
      form: { group: '기본정보', order: 1, readOnly: true },
      search: { hidden: true },
    },
    {
      field: 'codeName',
      headerName: '양식명',
      highlightSearch: true,
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
    {
      field: 'hasDocument',
      headerName: '문서 양식',
      width: 140,
      align: 'center',
      pinned: 'right',
      getValue: () => '',
      editable: false,
      renderCell: ({ row }) => {
        if (!onOpenTemplate) {
          return createElement(
            Typography,
            { variant: 'caption', color: 'text.secondary' },
            '읽기 전용',
          );
        }
        const label = row.hasDocument ? '문서 수정' : '문서 작성';
        const ActionIcon = row.hasDocument
          ? EditOutlinedIcon
          : DescriptionOutlinedIcon;
        return createElement(
          Button,
          {
            size: 'small',
            'aria-label': `${label}: ${row.codeName}`,
            startIcon: createElement(ActionIcon, { fontSize: 'small' }),
            onClick: (event) => {
              event.stopPropagation();
              onOpenTemplate(row);
            },
          },
          label,
        );
      },
      form: { hidden: true },
      search: { hidden: true },
    },
  ];
}
