export type ArchiveId = number | string;

export type ArchiveAttachment = {
  boardFileId: ArchiveId;
  postId: ArchiveId;
  fileName: string;
  fileSize?: number | string | null;
  contentType?: string | null;
  mimeType?: string | null;
  fileUsageType?: string | null;
};

export type ArchivePost = {
  postId: ArchiveId;
  title: string;
  contents: string;
  categoryCode: string;
  writerId?: string | null;
  writerName?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  attachments?: ArchiveAttachment[];
};

export type ArchivePostSavePayload = {
  title: string;
  contents: string;
  categoryCode: string;
};

export type ArchivePageResult = {
  resultList: ArchivePost[];
  resultCnt: number;
};

export type ArchiveCategory = {
  code: string;
  name: string;
};
