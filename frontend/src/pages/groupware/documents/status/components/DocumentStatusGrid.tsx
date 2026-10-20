import { Chip } from '@mui/material';
import { F1Grid } from '../../../../../shared/components/f1-grid';
import type {
  F1GridColumn,
  F1GridDataSource,
} from '../../../../../shared/components/f1-grid/types/grid.types';
import type { DocumentStatusRow } from '../types/documentStatus.types';

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'DRAFTING', label: '기안서' },
  { value: 'BUSINESS_CONTACT', label: '업무연락' },
  { value: 'EXPENSE_RESOLUTION', label: '지출결의서' },
  { value: 'ATTENDANCE_APPLICATION', label: '근태신청' },
];

const DOCUMENT_STATUS_OPTIONS = [
  { value: 'DRAFT', label: '임시저장' },
  { value: 'PENDING', label: '결재대기' },
  { value: 'IN_PROGRESS', label: '결재진행' },
  { value: 'REVISION_REQUESTED', label: '보완요청' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'REJECTED', label: '반려' },
];

const PARTICIPANT_TYPE_OPTIONS = [
  { value: 'DRAFTER', label: '기안' },
  { value: 'APPROVAL', label: '결재' },
  { value: 'AGREEMENT', label: '합의' },
  { value: 'REFERENCE', label: '참조' },
];

const ACTION_STATUS_OPTIONS = [
  { value: 'WAITING', label: '대기' },
  { value: 'PENDING', label: '처리 중' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
  { value: 'RETURNED', label: '보완요청' },
];

const STATUS_COLORS = {
  DRAFT: 'default',
  PENDING: 'info',
  IN_PROGRESS: 'info',
  REVISION_REQUESTED: 'warning',
  COMPLETED: 'success',
  REJECTED: 'error',
} as const;

const STATUS_LABELS = Object.fromEntries(
  DOCUMENT_STATUS_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<string, string>;

const PARTICIPANT_TYPE_LABELS = Object.fromEntries(
  PARTICIPANT_TYPE_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<string, string>;

const ACTION_STATUS_LABELS = Object.fromEntries(
  ACTION_STATUS_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<string, string>;

function renderTokenLabels(value: string, labels: Record<string, string>) {
  return value
    .split(', ')
    .map((token) => labels[token] ?? token)
    .filter(Boolean)
    .join(', ');
}

export function createDocumentStatusColumns(): F1GridColumn<DocumentStatusRow>[] {
  return [
    {
      field: 'rowNumber',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'electronicApprovalId',
      headerName: '문서번호',
      type: 'number',
      width: 80,
      align: 'center',
      editable: false,
      search: {
        label: '문서번호',
        order: 4,
        span: 1,
        group: '문서정보',
      },
    },
    {
      field: 'title',
      headerName: '제목',
      width: 260,
      editable: false,
      search: { label: '제목', order: 5, span: 4, group: '제목' },
    },
    {
      field: 'documentType',
      headerName: '문서종류',
      type: 'select',
      options: DOCUMENT_TYPE_OPTIONS,
      width: 100,
      align: 'center',
      editable: false,
      search: { label: '문서종류', order: 3, span: 2, group: '결재상태' },
    },
    {
      field: 'documentStatus',
      headerName: '결재상태',
      type: 'select',
      options: DOCUMENT_STATUS_OPTIONS,
      width: 100,
      align: 'center',
      editable: false,
      search: { label: '결재상태', order: 2, span: 2, group: '결재상태' },
      renderCell: ({ row }) => (
        <Chip
          size="small"
          color={STATUS_COLORS[row.documentStatus]}
          label={
            row.documentType === 'BUSINESS_CONTACT' &&
            row.documentStatus === 'COMPLETED'
              ? '발송완료'
              : (STATUS_LABELS[row.documentStatus] ?? row.documentStatus)
          }
        />
      ),
    },
    {
      field: 'submittedAt',
      headerName: '결재신청일',
      type: 'date',
      width: 100,
      align: 'center',
      editable: false,
      search: { label: '결재신청일', order: 1, span: 4, group: '결재신청일' },
    },
    {
      field: 'drafterName',
      headerName: '기안자',
      width: 100,
      align: 'center',
      editable: false,
      search: { label: '기안자', order: 6, group: '기안정보' },
    },
    {
      field: 'drafterDepartmentName',
      headerName: '기안부서',
      width: 100,
      align: 'center',
      editable: false,
      search: { label: '기안부서', order: 7, group: '기안정보' },
    },
    {
      field: 'participantName',
      headerName: '결재 참여자',
      hidden: true,
      width: 220,
      editable: false,
      search: {
        label: '결재 참여자',
        order: 8,
        group: '결재 참여자',
      },
    },
    {
      field: 'myParticipantType',
      headerName: '내 결재 역할',
      type: 'select',
      width: 80,
      align: 'center',
      editable: false,
      options: PARTICIPANT_TYPE_OPTIONS,
      search: {
        label: '내 결재 역할',
        order: 9,
        group: '내 결재정보',
      },
      renderCell: ({ row }) =>
        renderTokenLabels(row.myParticipantType, PARTICIPANT_TYPE_LABELS),
    },
    {
      field: 'myActionStatus',
      headerName: '내 처리상태',
      type: 'select',
      width: 80,
      align: 'center',
      editable: false,
      options: ACTION_STATUS_OPTIONS,
      search: {
        label: '내 처리상태',
        order: 10,
        group: '내 결재정보',
      },
      renderCell: ({ row }) =>
        renderTokenLabels(row.myActionStatus, ACTION_STATUS_LABELS),
    },
    {
      field: 'currentApprovalStep',
      headerName: '현재 결재단계·담당자',
      width: 150,
      editable: false,
      align: 'center',
      search: {
        label: '현재 결재담당자',
        order: 11,
        span: 4,
        group: '현재 결재',
      },
    },
    {
      field: 'approvalProgress',
      headerName: '결재 진행',
      width: 80,
      align: 'center',
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'updatedAt',
      headerName: '최종 변경일',
      type: 'date',
      width: 100,
      align: 'center',
      editable: false,
      search: { hidden: true },
    },
  ];
}

type DocumentStatusGridProps = {
  dataSource: F1GridDataSource<DocumentStatusRow>;
  onSelectionChange: (rowIds: Array<string | number>) => void;
  onDataSourceError: (error: Error) => void;
};

const columns = createDocumentStatusColumns();

export function DocumentStatusGrid({
  dataSource,
  onSelectionChange,
  onDataSourceError,
}: DocumentStatusGridProps) {
  return (
    <F1Grid
      ariaLabel="문서현황"
      columns={columns}
      rowKey="electronicApprovalId"
      dataSource={dataSource}
      onDataSourceError={onDataSourceError}
      onSelectionChange={onSelectionChange}
      showCheckbox
      disableFiltering
      disableContextMenu
      canExportExcel={false}
      height="100%"
      minHeight={320}
    />
  );
}
