import type {
  ApprovalDocumentStatus,
  DocumentApprovalRecord,
} from '../../write/types/documentWrite.types';

export type DocumentStatusRow = Pick<
  DocumentApprovalRecord,
  | 'electronicApprovalId'
  | 'eabusNo'
  | 'title'
  | 'documentType'
  | 'documentStatus'
  | 'drafterName'
  | 'submittedAt'
  | 'updatedAt'
> & {
  rowNumber?: number;
  drafterDepartmentName: string | null;
  participantName: string;
  approvalProgress: string;
};

export type DocumentStatusFilters = {
  keyword?: string;
  eabusNo?: string;
  title?: string;
  documentType?: DocumentApprovalRecord['documentType'];
  documentStatus?: ApprovalDocumentStatus;
  submittedAtFrom?: string;
  submittedAtTo?: string;
  drafterName?: string;
  drafterDepartmentName?: string;
  participantName?: string;
  updatedAtFrom?: string;
  updatedAtTo?: string;
};

export type DocumentStatusPageResponse = {
  resultList: DocumentStatusRow[];
  totalRowCount: number;
};
