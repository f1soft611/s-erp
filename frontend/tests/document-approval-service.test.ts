import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  postFormData: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: api.get,
  apiPost: api.post,
  apiPostFormData: api.postFormData,
  apiPut: api.put,
  apiDelete: api.delete,
  ApiResponseError: class ApiResponseError extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  },
}));

import {
  deleteDocumentDraftEmbeddedImage,
  isDefiniteAttachmentUploadFailure,
  saveDocumentDraft,
  uploadDocumentDraftAttachment,
  uploadDocumentDraftEmbeddedImage,
} from '../src/pages/groupware/documents/write/services/documentApproval.service';
import { ApiResponseError } from '../src/shared/services/apiClient';

describe('document approval service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses create and update draft routes while preserving the document ID', async () => {
    const request = {
      documentType: 'DRAFTING' as const,
      draftingWorkCategoryId: null,
      title: '초안',
      contentsJson: { type: 'doc' },
      contentsHtml: '<p>내용</p>',
      contentsText: '내용',
      approvalLines: [],
      embeddedImages: [],
      temporaryImages: [],
    };
    api.post.mockResolvedValue({
      item: { electronicApprovalId: 41, documentStatus: 'DRAFT' },
    });
    api.put.mockResolvedValue({
      item: { electronicApprovalId: 41, documentStatus: 'DRAFT' },
    });

    await expect(saveDocumentDraft(request, null)).resolves.toEqual({
      electronicApprovalId: 41,
      documentStatus: 'DRAFT',
    });
    await expect(saveDocumentDraft(request, 41)).resolves.toEqual({
      electronicApprovalId: 41,
      documentStatus: 'DRAFT',
    });

    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/drafts',
      request,
    );
    expect(api.put).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/drafts/41',
      request,
    );
  });

  it('uses the dedicated attachment route and reports ambiguous missing IDs', async () => {
    const file = new File(['data'], 'evidence.txt', { type: 'text/plain' });
    api.postFormData.mockResolvedValue({
      item: { fileId: 51, fileName: 'evidence.txt', fileSize: 4 },
    });

    await expect(uploadDocumentDraftAttachment(41, file)).resolves.toEqual({
      fileId: 51,
      fileName: 'evidence.txt',
      fileSize: 4,
    });
    expect(api.postFormData).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/41/attachments',
      expect.any(FormData),
    );
    expect(api.postFormData.mock.calls[0][1].get('file')).toBe(file);

    api.postFormData.mockResolvedValueOnce({ item: { fileName: 'evidence.txt' } });
    await expect(uploadDocumentDraftAttachment(41, file)).rejects.toThrow(
      '첨부 업로드 결과를 확인할 수 없습니다.',
    );
  });

  it('distinguishes definite client rejections from ambiguous server failures', () => {
    expect(isDefiniteAttachmentUploadFailure(new ApiResponseError('invalid', 400))).toBe(true);
    expect(isDefiniteAttachmentUploadFailure(new ApiResponseError('failed', 500))).toBe(false);
    expect(isDefiniteAttachmentUploadFailure(new TypeError('network'))).toBe(false);
  });

  it('uploads temporary embedded images and validates the preview response', async () => {
    const file = new File(['png'], 'pasted image.png', { type: 'image/png' });
    api.postFormData.mockResolvedValue({
      item: {
        uploadToken: 'token-1',
        fileName: 'pasted image.png',
        fileSize: 3,
        mimeType: 'image/png',
        previewUrl: 'https://minio.example/preview',
        objectKey: 'tenant/1/embedded-image-temp/token-1/pasted image.png',
      },
    });

    await expect(uploadDocumentDraftEmbeddedImage(file)).resolves.toEqual({
      src: 'https://minio.example/preview',
      alt: 'pasted image.png',
      fileName: 'pasted image.png',
      uploadToken: 'token-1',
      fileSize: 3,
      mimeType: 'image/png',
      objectKey: 'tenant/1/embedded-image-temp/token-1/pasted image.png',
    });
    expect(api.postFormData).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/embedded-images/temp',
      expect.any(FormData),
    );
    expect(api.postFormData.mock.calls[0][1].get('file')).toBe(file);

    api.postFormData.mockResolvedValueOnce({
      item: { uploadToken: 'token-2', fileName: 'missing-preview.png' },
    });
    await expect(uploadDocumentDraftEmbeddedImage(file)).rejects.toThrow(
      '본문 이미지 업로드 결과를 확인할 수 없습니다.',
    );
  });

  it('deletes temporary embedded images with encoded token and filename', async () => {
    await deleteDocumentDraftEmbeddedImage('token/1', 'pasted image.png');

    expect(api.delete).toHaveBeenCalledWith(
      '/api/v1/groupware/approvals/embedded-images/temp/token%2F1?fileName=pasted+image.png',
    );
  });
});
