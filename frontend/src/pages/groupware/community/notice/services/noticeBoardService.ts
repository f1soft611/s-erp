import {
  apiDelete,
  apiGet,
  apiPost,
  apiPostFormData,
  apiPut,
} from '../../../../../shared/services/apiClient';

export type NoticeBoardAttachmentApi = {
  boardFileId?: number | string | null;
  postId?: number | string | null;
  fileName?: string | null;
  fileSize?: number | string | null;
  objectKey?: string | null;
  bucketName?: string | null;
  mimeType?: string | null;
  contentType?: string | null;
};

export type NoticeBoardPostApi = {
  postId?: number | string | null;
  title?: string | null;
  contents?: string | null;
  contentsHtml?: string | null;
  contentsJson?: string | null;
  contentsText?: string | null;
  writerId?: string | null;
  writerName?: string | null;
  viewCount?: number | string | null;
  isNotice?: string | null;
  createdAt?: string | Date | null;
  attachments?: NoticeBoardAttachmentApi[];
};

type NoticeBoardListResponse = {
  resultList?: NoticeBoardPostApi[];
  item?: NoticeBoardPostApi;
  result?: NoticeBoardPostApi | NoticeBoardPostApi[];
  message?: string;
};

function readItem<T>(response: unknown): T | undefined {
  if (!response || typeof response !== 'object') {
    return undefined;
  }

  const candidate = response as { item?: T; result?: T };
  return (candidate.item ?? candidate.result) as T | undefined;
}

export async function fetchNoticePosts(
  page: number,
  size: number,
  keyword: string,
): Promise<NoticeBoardPostApi[]> {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
    keyword: keyword ?? '',
  });

  const result = await apiGet<NoticeBoardListResponse>(
    `/api/v1/groupware/boards/notice/posts?${query.toString()}`,
  );
  return result.resultList ?? [];
}

export async function fetchNoticePostDetail(
  postId: number,
): Promise<NoticeBoardPostApi> {
  const result = await apiGet<{ item?: NoticeBoardPostApi }>(
    `/api/v1/groupware/boards/notice/posts/${postId}`,
  );

  return (readItem<NoticeBoardPostApi>(result) ?? {}) as NoticeBoardPostApi;
}

export async function createNoticePost(
  payload: Partial<NoticeBoardPostApi>,
): Promise<NoticeBoardPostApi> {
  const result = await apiPost<{ item?: NoticeBoardPostApi }>(
    '/api/v1/groupware/boards/notice/posts',
    payload,
  );
  return (readItem<NoticeBoardPostApi>(result) ??
    (payload as NoticeBoardPostApi)) as NoticeBoardPostApi;
}

export async function updateNoticePost(
  postId: number,
  payload: Partial<NoticeBoardPostApi>,
): Promise<NoticeBoardPostApi> {
  const result = await apiPut<{ item?: NoticeBoardPostApi }>(
    `/api/v1/groupware/boards/notice/posts/${postId}`,
    payload,
  );
  return (readItem<NoticeBoardPostApi>(result) ??
    (payload as NoticeBoardPostApi)) as NoticeBoardPostApi;
}

export async function deleteNoticePost(postId: number): Promise<void> {
  await apiDelete(`/api/v1/groupware/boards/notice/posts/${postId}`);
}

export async function uploadNoticeAttachment(
  postId: number,
  file: File,
): Promise<NoticeBoardAttachmentApi> {
  const formData = new FormData();
  formData.append('file', file);

  const result = await apiPostFormData<{ item?: NoticeBoardAttachmentApi }>(
    `/api/v1/groupware/boards/notice/posts/${postId}/attachments`,
    formData,
  );

  return (readItem<NoticeBoardAttachmentApi>(result) ?? {
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type,
  }) as NoticeBoardAttachmentApi;
}

export async function deleteNoticeAttachment(
  boardFileId: number | string,
): Promise<void> {
  await apiDelete(`/api/v1/groupware/boards/notice/attachments/${boardFileId}`);
}

export async function downloadNoticeAttachment(
  attachment: NoticeBoardAttachmentApi,
): Promise<void> {
  const boardFileId = attachment.boardFileId;
  if (!boardFileId) {
    return;
  }

  const url = `/api/v1/groupware/boards/notice/attachments/${boardFileId}/download`;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
