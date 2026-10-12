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
    item.documentStatus !== 'DRAFT'
  ) {
    throw new Error('임시저장 응답에 문서 ID가 없습니다.');
  }
  return item;
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
