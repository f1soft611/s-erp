import type {
  ModuleItem,
  PageContent,
} from '../../../../dashboard/types/dashboard';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';
import type { JSONContent } from '@tiptap/core';
import type { RichTextEditorImage } from '../../../../../shared/components/rich-text-editor/richTextEditor.types';

export type DocumentKind = '기안서' | '업무연락' | '지출결의서' | '근태신청';
export type ApprovalStatus = '임시저장' | '결재대기' | '결재중' | '보완요청' | '완료';

export type DocumentApprovalStage = {
  id: number;
  kind: 'approval' | 'agreement';
  users: F1GridUserOption[];
  isFixed?: boolean;
};

export type DocumentWriteItem = {
  id: number;
  title: string;
  kind: DocumentKind;
  status: ApprovalStatus;
  author: string;
  date: string;
  summary: string;
  isPinned?: boolean;
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
  documentStatus: 'DRAFT';
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
};
