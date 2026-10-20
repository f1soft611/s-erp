import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import type { MenuPermission, ModuleItem } from '../src/pages/dashboard/types/dashboard';
import { pageContentMap } from '../src/pages/dashboard/services/dashboardData';

const archiveServices = vi.hoisted(() => ({
  fetchArchiveFiles: vi.fn(),
  uploadArchiveFile: vi.fn(),
  deleteArchiveAttachment: vi.fn(),
  downloadArchiveAttachment: vi.fn(),
  fetchCommonCodeGroups: vi.fn(),
  fetchCommonCodeItems: vi.fn(),
}));

vi.mock(
  '../src/pages/groupware/community/archive/services/archiveBoardService',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('../src/pages/groupware/community/archive/services/archiveBoardService')
    >()),
    fetchArchiveFiles: archiveServices.fetchArchiveFiles,
    uploadArchiveFile: archiveServices.uploadArchiveFile,
    deleteArchiveAttachment: archiveServices.deleteArchiveAttachment,
    downloadArchiveAttachment: archiveServices.downloadArchiveAttachment,
  }),
);

vi.mock(
  '../src/pages/co/master/common-code/services/commonCodeManagement.service',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('../src/pages/co/master/common-code/services/commonCodeManagement.service')
    >()),
    fetchCommonCodeGroups: archiveServices.fetchCommonCodeGroups,
    fetchCommonCodeItems: archiveServices.fetchCommonCodeItems,
  }),
);

const moduleItem: ModuleItem = {
  id: 'groupware',
  name: '그룹웨어',
  icon: null,
  tree: [],
  menus: [],
};

const adminPermissions: MenuPermission = {
  read: true,
  create: true,
  update: true,
  delete: true,
};

function renderArchive(
  permissions: MenuPermission = adminPermissions,
  isTenantAdmin = true,
) {
  return render(
    <DashboardContent
      selectedModule={moduleItem}
      currentMenuName="자료실"
      currentPageKey="archive"
      breadcrumbItems={['그룹웨어', '자료실']}
      content={
        pageContentMap.archive ?? {
          title: '자료실',
          description: '자료실 설명',
          cards: [],
          items: [],
        }
      }
      selectedMenuPermissions={permissions}
      isTenantAdmin={isTenantAdmin}
    />,
  );
}

describe('Archive dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    archiveServices.fetchArchiveFiles.mockResolvedValue({
      resultList: [
        {
          boardFileId: 31,
          postId: 12,
          fileName: '업무 가이드.pdf',
          writerName: '홍길동',
          uploadedAt: '2026-10-15T09:00:00',
          fileSize: 1024,
          categoryCode: 'GUIDE',
        },
      ],
      resultCnt: 1,
    });
    archiveServices.uploadArchiveFile.mockResolvedValue({
      boardFileId: 44,
      postId: 40,
      fileName: 'new-file.pdf',
      writerName: '홍길동',
    });
    archiveServices.deleteArchiveAttachment.mockResolvedValue(undefined);
    archiveServices.downloadArchiveAttachment.mockResolvedValue(undefined);
    archiveServices.fetchCommonCodeGroups.mockResolvedValue([
      { id: 8, groupCode: 'WF_ARCHIVE_CATEGORY', useAt: 'Y' },
    ]);
    archiveServices.fetchCommonCodeItems.mockResolvedValue([
      { itemCode: 'GUIDE', itemNm: '업무양식', useAt: 'Y' },
      { itemCode: 'MANUAL', itemNm: '매뉴얼', useAt: 'Y' },
    ]);
  });

  it('renders archive file grid and folder chips', async () => {
    renderArchive();
    expect(await screen.findByRole('grid', { name: '자료실' })).toBeInTheDocument();
    expect(await screen.findByText('업무양식')).toBeInTheDocument();
    expect(screen.getByText('매뉴얼')).toBeInTheDocument();
  });

  it('sends keyword search to file-list API', async () => {
    renderArchive();
    const search = await screen.findByRole('textbox', { name: '자료 검색' });
    fireEvent.change(search, { target: { value: '홍길동' } });
    fireEvent.keyDown(search, { key: 'Enter' });

    await waitFor(() =>
      expect(archiveServices.fetchArchiveFiles).toHaveBeenLastCalledWith(
        0,
        expect.any(Number),
        '홍길동',
        '',
        expect.any(AbortSignal),
      ),
    );
  });

  it('opens file picker and uploads selected files immediately', async () => {
    renderArchive();
    const upload = await screen.findByLabelText('자료 파일 선택');
    const first = new File(['first'], 'first.pdf', { type: 'application/pdf' });
    const second = new File(['second'], 'second.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(upload, { target: { files: [first, second] } });

    await waitFor(() =>
      expect(archiveServices.uploadArchiveFile).toHaveBeenCalledTimes(2),
    );
    expect(archiveServices.uploadArchiveFile).toHaveBeenNthCalledWith(
      1,
      first,
      undefined,
    );
    expect(archiveServices.uploadArchiveFile).toHaveBeenNthCalledWith(
      2,
      second,
      undefined,
    );
  });
});
