import type {
  ApprovalDocumentStatus,
  ApprovalStatusColor,
  ApprovalStatus,
  DocumentApprovalRecord,
  DocumentKind,
} from '../types/documentWrite.types';

export type { ApprovalStatusColor } from '../types/documentWrite.types';
export type DocumentKindColor = 'primary' | 'info' | 'warning' | 'secondary';

export type ApprovalStatusPresentation = {
  label: ApprovalStatus;
  color: ApprovalStatusColor;
  variant: 'filled' | 'outlined';
};

export type DocumentKindPresentation = {
  label: string;
  color: DocumentKindColor;
};

const approvalStatusPresentation: Record<
  ApprovalDocumentStatus,
  ApprovalStatusPresentation
> = {
  DRAFT: { label: '임시저장', color: 'default', variant: 'outlined' },
  PENDING: { label: '결재진행중', color: 'info', variant: 'filled' },
  IN_PROGRESS: { label: '결재진행중', color: 'info', variant: 'filled' },
  COMPLETED: { label: '승인', color: 'success', variant: 'filled' },
  REJECTED: { label: '반려', color: 'error', variant: 'filled' },
  REVISION_REQUESTED: { label: '보완요청', color: 'warning', variant: 'filled' },
};

const documentKindPresentation: Record<DocumentKind, DocumentKindPresentation> = {
  기안서: { label: '기안', color: 'primary' },
  업무연락: { label: '업무', color: 'info' },
  지출결의서: { label: '지출', color: 'warning' },
  근태신청: { label: '근태', color: 'secondary' },
};

const documentKindByType: Record<DocumentApprovalRecord['documentType'], DocumentKind> = {
  DRAFTING: '기안서',
  BUSINESS_CONTACT: '업무연락',
  EXPENSE_RESOLUTION: '지출결의서',
  ATTENDANCE_APPLICATION: '근태신청',
};

function isDocumentType(
  value: DocumentKind | DocumentApprovalRecord['documentType'],
): value is DocumentApprovalRecord['documentType'] {
  return Object.prototype.hasOwnProperty.call(documentKindByType, value);
}

export function getApprovalStatusPresentation(
  status: ApprovalDocumentStatus,
): ApprovalStatusPresentation {
  return approvalStatusPresentation[status];
}

export function getDocumentKindFromType(
  documentType: DocumentApprovalRecord['documentType'],
): DocumentKind {
  return documentKindByType[documentType];
}

export function getDocumentKindPresentation(
  kind: DocumentKind | DocumentApprovalRecord['documentType'],
): DocumentKindPresentation {
  const documentKind = isDocumentType(kind) ? documentKindByType[kind] : kind;
  return documentKindPresentation[documentKind];
}
