import {
  apiDelete,
  apiDownload,
  apiGet,
  apiPost,
  apiPostFormData,
  apiPut,
} from '../../../../../shared/services/apiClient';
import type {
  ArchiveAttachment,
  ArchiveId,
  ArchivePageResult,
  ArchivePost,
  ArchivePostSavePayload,
} from '../types/archive.types';

type ArchiveListApiResponse = {
  resultList?: ArchivePost[];
  resultCnt?: number | string | null;
};

type ArchiveItemApiResponse<T> = {
  item?: T;
};

function requireItem<T>(response: ArchiveItemApiResponse<T>, label: string): T {
  if (response.item == null) {
    throw new Error(`Archive ${label} response did not include an item.`);
  }
  return response.item;
}

export async function fetchArchivePosts(
  pageIndex: number,
  pageUnit: number,
  keyword?: string,
  categoryCode?: string,
): Promise<ArchivePageResult> {
  const query = new URLSearchParams({
    pageIndex: String(pageIndex),
    pageUnit: String(pageUnit),
  });
  const normalizedKeyword = keyword?.trim();
  if (normalizedKeyword) query.set('keyword', normalizedKeyword);
  if (categoryCode?.trim()) query.set('categoryCode', categoryCode.trim());

  const response = await apiGet<ArchiveListApiResponse>(
    `/api/v1/groupware/boards/archive/posts?${query.toString()}`,
  );
  return {
    resultList: response.resultList ?? [],
    resultCnt: Number(response.resultCnt ?? 0) || 0,
  };
}

export async function fetchArchivePostDetail(
  postId: ArchiveId,
): Promise<ArchivePost> {
  const response = await apiGet<ArchiveItemApiResponse<ArchivePost>>(
    `/api/v1/groupware/boards/archive/posts/${encodeURIComponent(String(postId))}`,
  );
  return requireItem(response, 'detail');
}

export async function createArchivePost(
  payload: ArchivePostSavePayload,
): Promise<ArchivePost> {
  const response = await apiPost<ArchiveItemApiResponse<ArchivePost>>(
    '/api/v1/groupware/boards/archive/posts',
    payload,
  );
  return requireItem(response, 'create');
}

export async function updateArchivePost(
  postId: ArchiveId,
  payload: ArchivePostSavePayload,
): Promise<ArchivePost> {
  const response = await apiPut<ArchiveItemApiResponse<ArchivePost>>(
    `/api/v1/groupware/boards/archive/posts/${encodeURIComponent(String(postId))}`,
    payload,
  );
  return requireItem(response, 'update');
}

export function deleteArchivePost(postId: ArchiveId): Promise<void> {
  return apiDelete(
    `/api/v1/groupware/boards/archive/posts/${encodeURIComponent(String(postId))}`,
  );
}

export async function uploadArchiveAttachment(
  postId: ArchiveId,
  file: File,
): Promise<ArchiveAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiPostFormData<
    ArchiveItemApiResponse<ArchiveAttachment>
  >(
    `/api/v1/groupware/boards/archive/posts/${encodeURIComponent(String(postId))}/attachments`,
    formData,
  );
  return requireItem(response, 'attachment upload');
}

export function deleteArchiveAttachment(
  boardFileId: ArchiveId,
  postId: ArchiveId,
): Promise<void> {
  const query = new URLSearchParams({ postId: String(postId) });
  return apiDelete(
    `/api/v1/groupware/boards/archive/attachments/${encodeURIComponent(String(boardFileId))}?${query.toString()}`,
  );
}

export function downloadArchiveAttachment(
  attachment: ArchiveAttachment,
): Promise<void> {
  const query = new URLSearchParams({ postId: String(attachment.postId) });
  const path = `/api/v1/groupware/boards/archive/attachments/${encodeURIComponent(String(attachment.boardFileId))}/download?${query.toString()}`;
  return apiDownload(path, attachment.fileName);
}
