import { apiDelete, apiGet, apiPost, apiPostFormData } from './apiClient';

export type CommonOwnerType = 'NOTICE' | 'BOARD' | 'APPROVAL';

export type CommonFileItem = {
  fileId?: number | string | null;
  ownerType?: CommonOwnerType | string | null;
  ownerId?: number | string | null;
  fileName?: string | null;
  filePath?: string | null;
  objectKey?: string | null;
  bucketName?: string | null;
  mimeType?: string | null;
  contentType?: string | null;
  fileSize?: number | string | null;
  uploadedBy?: string | null;
};

export type CommonCommentItem = {
  commentId?: number | string | null;
  ownerType?: CommonOwnerType | string | null;
  ownerId?: number | string | null;
  parentCommentId?: number | string | null;
  content?: string | null;
  writerId?: string | null;
  writerName?: string | null;
  deletedYn?: string | null;
};

const readItem = <T>(response: unknown): T | undefined => {
  if (!response || typeof response !== 'object') return undefined;
  const candidate = response as { item?: T; result?: T };
  return (candidate.item ?? candidate.result) as T | undefined;
};

export async function fetchCommonFiles(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
): Promise<CommonFileItem[]> {
  const result = await apiGet<{ resultList?: CommonFileItem[] }>(
    `/api/v1/common/files?ownerType=${encodeURIComponent(ownerType)}&ownerId=${encodeURIComponent(String(ownerId))}`,
  );
  return result.resultList ?? [];
}

export async function uploadCommonFile(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
  file: File,
  uploaderId?: string,
): Promise<CommonFileItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('ownerType', String(ownerType));
  formData.append('ownerId', String(ownerId));
  if (uploaderId) formData.append('uploaderId', uploaderId);

  const result = await apiPostFormData<{ item?: CommonFileItem }>(
    '/api/v1/common/files/upload',
    formData,
  );

  return (
    readItem<CommonFileItem>(result) ?? {
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      ownerType,
      ownerId,
    }
  );
}

export async function deleteCommonFile(fileId: number | string): Promise<void> {
  await apiDelete(`/api/v1/common/files/${fileId}`);
}

export async function downloadCommonFile(
  fileId: number | string,
): Promise<void> {
  const url = `/api/v1/common/files/${fileId}/download`;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export async function fetchCommonComments(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
): Promise<CommonCommentItem[]> {
  const result = await apiGet<{ resultList?: CommonCommentItem[] }>(
    `/api/v1/common/comments?ownerType=${encodeURIComponent(ownerType)}&ownerId=${encodeURIComponent(String(ownerId))}`,
  );
  return result.resultList ?? [];
}

export async function createCommonComment(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
  content: string,
  parentCommentId?: number | string,
): Promise<CommonCommentItem> {
  const result = await apiPost<{ item?: CommonCommentItem }>(
    '/api/v1/common/comments',
    {
      ownerType,
      ownerId,
      content,
      parentCommentId,
    },
  );

  return (readItem<CommonCommentItem>(result) ?? {
    ownerType,
    ownerId,
    content,
    parentCommentId,
  }) as CommonCommentItem;
}
