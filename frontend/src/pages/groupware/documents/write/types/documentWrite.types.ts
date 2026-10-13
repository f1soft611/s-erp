import type {
  ModuleItem,
  PageContent,
} from '../../../../dashboard/types/dashboard';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';
import type { JSONContent } from '@tiptap/core';
import type { RichTextEditorImage } from '../../../../../shared/components/rich-text-editor/richTextEditor.types';

export type DocumentKind = '기안서' | '업무연락' | '지출결의서' | '근태신청';
export type ApprovalStatus = '임시저장' | '결재대기' | '결재중' | '보완요청' | '완료' | '반려';
export type ApprovalDocumentStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'REVISION_REQUESTED'
  | 'COMPLETED'
  | 'REJECTED';
export type DocumentApprovalScope =
  | 'ALL'
  | 'MY_PENDING'
  | 'IN_PROGRESS'
  | 'DRAFT'
  | 'COMPLETED'
  | 'REVISION_REQUESTED'
  | 'REJECTED';

export type DocumentApprovalStage = {
  id: number;
  kind: 'approval' | 'agreement';
  users: F1GridUserOption[];
  isFixed?: boolean;
};

export type DocumentWriteItem = {
  id: number;
  eabusNo?: string;
  title: string;
  kind: DocumentKind;
  status: ApprovalStatus;
  author: string;
  date: string;
  summary: string;
  isPinned?: boolean;
  documentStatus?: ApprovalDocumentStatus;
};

export type DocumentWritePageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};

export type DocumentApprovalDraftRequest = {
  documentType: 'DRAFTING' | 'BUSINESS_CONTACT' | 'EXPENSE_RESOLUTION' | 'ATTENDANCE_APPLICATION';
  draftingWorkCategoryId: number | null;
  title: string;
  contentsJson: JSONContent;
  contentsHtml: string;
  contentsText: string;
  approvalLines: {
    stageOrder: number;
    participantOrder: number;
    participantType: 'APPROVAL' | 'AGREEMENT' | 'REFERENCE';
    participantUserId: string;
  }[];
  embeddedImages: DocumentDraftEmbeddedImageMetadata[];
  temporaryImages: DocumentDraftTemporaryImage[];
};

export type DocumentDraftEmbeddedImageMetadata = {
  uploadToken: string;
  fileName: string;
  imageUrl?: string | null;
  fileId?: string | null;
  objectKey?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  width?: number | string | null;
};

export type DocumentDraftTemporaryImage = {
  uploadToken: string;
  fileName: string;
};

export type DocumentDraftEmbeddedImageUpload = RichTextEditorImage & {
  fileName: string;
  uploadToken: string;
  src: string;
  alt: string;
  fileSize: number;
  mimeType: string;
  objectKey: string;
};

export type DocumentApprovalDraftResponse = {
  electronicApprovalId: number;
  documentStatus: ApprovalDocumentStatus;
  eabusNo?: string;
  submittedAt?: string | null;
};

export type DocumentApprovalRecord = {
  electronicApprovalId: number;
  eabusNo: string;
  documentType: DocumentApprovalDraftRequest['documentType'];
  documentStatus: ApprovalDocumentStatus;
  title: string;
  drafterName: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  submittedAt?: string | null;
  summary: string;
  noticeType?: 'ACTION_REQUIRED' | 'REVISION_REQUESTED' | null;
};

export type DocumentApprovalSummary = {
  actionRequiredCount: number;
  inProgressCount: number;
  draftCount: number;
  completedCount: number;
  revisionRequestedCount: number;
  rejectedCount: number;
  notices: DocumentApprovalRecord[];
};

export type DocumentApprovalLine = {
  electronicApprovalLineId: number;
  stageOrder: number;
  participantOrder: number;
  participantType: 'APPROVAL' | 'AGREEMENT' | 'REFERENCE';
  participantUserId: string;
  participantName: string;
  participantDepartmentName?: string | null;
  actionStatus: string;
  pendingAt?: string | null;
  actionAt?: string | null;
  actionComment?: string | null;
};

export type DocumentApprovalSystemEvent = {
  eventType: string;
  content: string;
  writerName: string;
  createdAt?: string | null;
};

export type DocumentApprovalDetail = Omit<DocumentApprovalRecord, 'summary'> & {
  summary?: string;
  viewCount: number;
  isDrafter: boolean;
  draftingWorkCategoryId: number | null;
  contentsJson: string;
  contentsHtml: string;
  approvalLines: DocumentApprovalLine[];
  attachments: DocumentDraftAttachmentResponse[];
  systemEvents: DocumentApprovalSystemEvent[];
};

export type DocumentApprovalActionRequest = {
  action: 'APPROVED' | 'REJECTED' | 'RETURNED';
  actionComment?: string;
};

export type DocumentDraftAttachmentStatus =
  | 'pending'
  | 'uploaded'
  | 'failed'
  | 'unknown';

export type DocumentDraftAttachment = {
  clientId: string;
  file: File;
  status: DocumentDraftAttachmentStatus;
  fileId?: number;
  error?: string;
};

export type DocumentDraftAttachmentResponse = {
  fileId: number;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
};

export type DocumentApprovalCommentAttachment = DocumentDraftAttachmentResponse;

export type DocumentApprovalComment = {
  commentId: number;
  tenantId?: number;
  ownerType?: 'APPROVAL';
  ownerId: number;
  parentCommentId?: number | null;
  content: string;
  commentType: 'USER';
  eventType?: null;
  writerId: string | null;
  writerName: string;
  deletedYn?: 'Y' | 'N';
  createdAt?: string | null;
  updatedAt?: string | null;
  attachments?: DocumentApprovalCommentAttachment[];
};

export type DocumentApprovalCommentPage = {
  comments: DocumentApprovalComment[];
  hasPrevious: boolean;
  nextBeforeCommentId: number | null;
  resultCnt: number;
};
