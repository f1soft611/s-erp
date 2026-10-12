import {
  apiDelete,
  apiGet,
  apiPost,
  apiPostFormData,
  apiPut,
  ApiResponseError,
} from '../../../../../shared/services/apiClient';
import type {
  DocumentApprovalDraftRequest,
  DocumentApprovalDraftResponse,
  DocumentApprovalActionRequest,
  ApprovalDocumentStatus,
  DocumentApprovalDetail,
  DocumentApprovalRecord,
  DocumentApprovalScope,
  DocumentApprovalSummary,
  DocumentDraftEmbeddedImageUpload,
  DocumentDraftAttachmentResponse,
} from '../types/documentWrite.types';

const APPROVAL_API = '/api/v1/groupware/approvals';

export class UnknownAttachmentUploadOutcomeError extends Error {
  constructor() {
    super('첨부 업로드 결과를 확인할 수 없습니다.');
    this.name = 'UnknownAttachmentUploadOutcomeError';
  }
}

const DOCUMENT_STATUSES = new Set([
  'DRAFT',
  'PENDING',
  'IN_PROGRESS',
  'REVISION_REQUESTED',
  'COMPLETED',
  'REJECTED',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWorkflowStatus(value: unknown): value is ApprovalDocumentStatus {
  return typeof value === 'string' && DOCUMENT_STATUSES.has(value);
}

export function isDefiniteAttachmentUploadFailure(error: unknown): boolean {
  return error instanceof ApiResponseError && error.status >= 400 && error.status < 500;
}

export async function saveDocumentDraft(
  request: DocumentApprovalDraftRequest,
  electronicApprovalId: number | null,
): Promise<DocumentApprovalDraftResponse> {
  const path = electronicApprovalId === null
    ? `${APPROVAL_API}/drafts`
    : `${APPROVAL_API}/drafts/${electronicApprovalId}`;
  const response = electronicApprovalId === null
    ? await apiPost<{ item?: DocumentApprovalDraftResponse }>(path, request)
    : await apiPut<{ item?: DocumentApprovalDraftResponse }>(path, request);
  const item = response.item;
  if (
    !item ||
    !Number.isSafeInteger(item.electronicApprovalId) ||
    item.electronicApprovalId <= 0 ||
    (item.documentStatus !== 'DRAFT' && item.documentStatus !== 'REVISION_REQUESTED')
  ) {
    throw new Error('임시저장 응답에 문서 ID가 없습니다.');
  }
  return item;
}

export async function submitDocumentApproval(
  electronicApprovalId: number,
  request: DocumentApprovalDraftRequest,
): Promise<DocumentApprovalDraftResponse> {
  const response = await apiPost<{ item?: DocumentApprovalDraftResponse }>(
    `${APPROVAL_API}/${electronicApprovalId}/submit`,
    request,
  );
  const item = response.item;
  if (
    !item ||
    item.electronicApprovalId !== electronicApprovalId ||
    item.documentStatus !== 'PENDING' ||
    !item.eabusNo?.trim() ||
    !item.submittedAt?.trim()
  ) {
    throw new Error('결재신청 응답을 확인할 수 없습니다.');
  }
  return item;
}

export async function listDocumentApprovals(
  scope: DocumentApprovalScope = 'ALL',
  documentType?: DocumentApprovalRecord['documentType'],
  electronicApprovalId?: number,
): Promise<DocumentApprovalRecord[]> {
  const query = new URLSearchParams({ scope });
  if (documentType) query.set('documentType', documentType);
  if (electronicApprovalId !== undefined) {
    query.set('electronicApprovalId', String(electronicApprovalId));
  }
  const response = await apiGet<{ resultList?: DocumentApprovalRecord[] }>(
    `${APPROVAL_API}/documents?${query.toString()}`,
  );
  if (!Array.isArray(response.resultList)) {
    throw new Error('전자결재 문서 목록 응답을 확인할 수 없습니다.');
  }
  return response.resultList;
}

export async function getDocumentApprovalSummary(): Promise<DocumentApprovalSummary> {
  const response = await apiGet<{ item?: DocumentApprovalSummary }>(
    `${APPROVAL_API}/summary`,
  );
  const item = response.item;
  if (
    !isObject(item) ||
    ![
      item.actionRequiredCount,
      item.inProgressCount,
      item.draftCount,
      item.completedCount,
      item.revisionRequestedCount,
      item.rejectedCount,
    ].every((count) => typeof count === 'number' && Number.isFinite(count)) ||
    !Array.isArray(item.notices)
  ) {
    throw new Error('전자결재 요약 응답을 확인할 수 없습니다.');
  }
  return item;
}

export async function getDocumentApprovalDetail(
  electronicApprovalId: number,
): Promise<DocumentApprovalDetail> {
  const response = await apiGet<{ item?: DocumentApprovalDetail }>(
    `${APPROVAL_API}/documents/${electronicApprovalId}`,
  );
  const item = response.item;
  if (
    !isObject(item) ||
    item.electronicApprovalId !== electronicApprovalId ||
    typeof item.title !== 'string' ||
    typeof item.contentsHtml !== 'string' ||
    !Array.isArray(item.approvalLines) ||
    !Array.isArray(item.attachments) ||
    !Array.isArray(item.systemEvents)
  ) {
    throw new Error('전자결재 상세 응답을 확인할 수 없습니다.');
  }
  return item;
}

export async function processDocumentApprovalAction(
  electronicApprovalId: number,
  request: DocumentApprovalActionRequest,
): Promise<{ electronicApprovalId: number; documentStatus: string }> {
  const response = await apiPost<{
    item?: { electronicApprovalId?: number; documentStatus?: string };
  }>(`${APPROVAL_API}/${electronicApprovalId}/actions`, request);
  const item = response.item;
  if (
    !item ||
    item.electronicApprovalId !== electronicApprovalId ||
    !isWorkflowStatus(item.documentStatus)
  ) {
    throw new Error('결재 처리 응답을 확인할 수 없습니다.');
  }
  return {
    electronicApprovalId: item.electronicApprovalId,
    documentStatus: item.documentStatus,
  };
}

export async function uploadDocumentDraftAttachment(
  electronicApprovalId: number,
  file: File,
): Promise<DocumentDraftAttachmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiPostFormData<{ item?: DocumentDraftAttachmentResponse }>(
    `${APPROVAL_API}/${electronicApprovalId}/attachments`,
    formData,
  );
  const item = response.item;
  if (!item || !Number.isSafeInteger(item.fileId) || item.fileId <= 0) {
    throw new UnknownAttachmentUploadOutcomeError();
  }
  return {
    fileId: item.fileId,
    fileName: item.fileName ?? file.name,
    fileSize: item.fileSize ?? file.size,
  };
}

export async function uploadDocumentDraftEmbeddedImage(
  file: File,
): Promise<DocumentDraftEmbeddedImageUpload> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiPostFormData<{
    item?: {
      uploadToken?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      previewUrl?: string;
      objectKey?: string;
    };
  }>(`${APPROVAL_API}/embedded-images/temp`, formData);
  const item = response.item;
  if (
    !item ||
    !item.uploadToken?.trim() ||
    !item.fileName?.trim() ||
    !item.previewUrl?.trim() ||
    !item.objectKey?.trim() ||
    typeof item.fileSize !== 'number' ||
    !Number.isSafeInteger(item.fileSize) ||
    item.fileSize < 0 ||
    !item.mimeType?.trim()
  ) {
    throw new Error('본문 이미지 업로드 결과를 확인할 수 없습니다.');
  }
  return {
    src: item.previewUrl,
    alt: item.fileName,
    fileName: item.fileName,
    uploadToken: item.uploadToken,
    fileSize: item.fileSize,
    mimeType: item.mimeType,
    objectKey: item.objectKey,
  };
}

export async function deleteDocumentDraftEmbeddedImage(
  uploadToken: string,
  fileName: string,
): Promise<void> {
  const query = new URLSearchParams({ fileName });
  await apiDelete(
    `${APPROVAL_API}/embedded-images/temp/${encodeURIComponent(uploadToken)}?${query.toString()}`,
  );
}

export async function listDocumentDraftAttachments(
  electronicApprovalId: number,
): Promise<DocumentDraftAttachmentResponse[]> {
  const response = await apiGet<{ resultList?: DocumentDraftAttachmentResponse[] }>(
    `${APPROVAL_API}/${electronicApprovalId}/attachments`,
  );
  if (!Array.isArray(response.resultList)) {
    throw new Error('첨부 목록 응답을 확인할 수 없습니다.');
  }
  return response.resultList;
}

export async function deleteDocumentDraftAttachment(
  electronicApprovalId: number,
  fileId: number,
): Promise<void> {
  await apiDelete(`${APPROVAL_API}/${electronicApprovalId}/attachments/${fileId}`);
}
