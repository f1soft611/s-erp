import { describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiDownload: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPostFormData: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

import { downloadNoticeAttachment } from '../src/pages/groupware/community/notice/services/noticeBoardService';

describe('notice board downloads', () => {
  it('passes the uploaded file name to the download client', async () => {
    apiMocks.apiDownload.mockResolvedValue(undefined);

    await downloadNoticeAttachment({
      boardFileId: 5,
      postId: 54,
      fileName: '업무일정표.xlsx',
    });

    expect(apiMocks.apiDownload).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/notice/attachments/5/download?postId=54',
      '업무일정표.xlsx',
    );
  });
});
