import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import type { MenuPermission, ModuleItem } from '../src/pages/dashboard/types/dashboard';
import type {
  ArchiveAttachment,
  ArchivePost,
} from '../src/pages/groupware/community/archive/types/archive.types';
import { pageContentMap } from '../src/pages/dashboard/services/dashboardData';

const archiveServices = vi.hoisted(() => ({
  fetchArchivePosts: vi.fn(),
  fetchArchivePostDetail: vi.fn(),
  createArchivePost: vi.fn(),
  updateArchivePost: vi.fn(),
  deleteArchivePost: vi.fn(),
  uploadArchiveAttachment: vi.fn(),
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
    fetchArchivePosts: archiveServices.fetchArchivePosts,
    fetchArchivePostDetail: archiveServices.fetchArchivePostDetail,
    createArchivePost: archiveServices.createArchivePost,
    updateArchivePost: archiveServices.updateArchivePost,
    deleteArchivePost: archiveServices.deleteArchivePost,
    uploadArchiveAttachment: archiveServices.uploadArchiveAttachment,
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

const archivePost: ArchivePost = {
  postId: 12,
  title: '업무 가이드',
  contents: '첫 번째 줄\n두 번째 줄',
  contentsText: '첫 번째 줄\n두 번째 줄',
  categoryCode: 'GUIDE',
  attachmentCount: 1,
  writerName: '홍길동',
  createdAt: '2026-10-15T09:00:00',
};

const attachment: ArchiveAttachment = {
  boardFileId: 31,
  postId: 12,
  fileName: 'guide.pdf',
  fileSize: 120,
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
        pageContentMap['archive'] ?? {
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

async function openPostDetail() {
  fireEvent.click(await screen.findByRole('button', { name: /업무 가이드/ }));
  return screen.findByRole('region', { name: /게시글 상세/ });
}

describe('Archive dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    archiveServices.fetchArchivePosts.mockResolvedValue({
      resultList: [archivePost],
      resultCnt: 1,
    });
    archiveServices.fetchArchivePostDetail.mockResolvedValue({
      ...archivePost,
      attachments: [attachment],
    });
    archiveServices.createArchivePost.mockResolvedValue({
      ...archivePost,
      postId: 42,
    });
    archiveServices.updateArchivePost.mockResolvedValue(archivePost);
    archiveServices.deleteArchivePost.mockResolvedValue(undefined);
    archiveServices.uploadArchiveAttachment.mockResolvedValue(attachment);
    archiveServices.deleteArchiveAttachment.mockResolvedValue(undefined);
    archiveServices.downloadArchiveAttachment.mockResolvedValue(undefined);
    archiveServices.fetchCommonCodeGroups.mockResolvedValue([
      { id: 8, groupCode: 'WF_ARCHIVE_CATEGORY', useAt: 'Y' },
    ]);
    archiveServices.fetchCommonCodeItems.mockResolvedValue([
      { itemCode: 'GUIDE', itemNm: '업무양식', useAt: 'Y' },
      { itemCode: 'MANUAL', itemNm: '매뉴얼', useAt: 'Y' },
      { itemCode: 'DISABLED', itemNm: '비활성 분류', useAt: 'N' },
    ]);
  });

  it('dispatches the groupware archive key to the 자료실 page', async () => {
    expect('archive' in pageContentMap).toBe(true);
    renderArchive();

    expect(await screen.findByText('자료실')).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: '자료실 목록' })).toBeInTheDocument();
  });

  it('shows only active common-code categories in filter and editor', async () => {
    renderArchive();

    const filter = await screen.findByRole('combobox', { name: '분류 필터' });
    fireEvent.mouseDown(filter);
    expect(await screen.findByRole('option', { name: '업무양식' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '매뉴얼' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '비활성 분류' })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('option', { name: '업무양식' }));
    fireEvent.click(screen.getByRole('button', { name: '새 자료 등록' }));
    const editorCategory = await screen.findByRole('combobox', { name: '자료 분류' });
    fireEvent.mouseDown(editorCategory);
    expect(await screen.findByRole('option', { name: '업무양식' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '비활성 분류' })).not.toBeInTheDocument();
  });

  it('sends title, content, and author search through the server keyword and resets pagination', async () => {
    renderArchive();

    const search = await screen.findByRole('textbox', { name: '자료 검색' });
    fireEvent.change(search, { target: { value: '홍길동' } });
    fireEvent.keyDown(search, { key: 'Enter' });

    await waitFor(() =>
      expect(archiveServices.fetchArchivePosts).toHaveBeenLastCalledWith(
        1,
        expect.any(Number),
        '홍길동',
        '',
      ),
    );
  });

  it('filters with the selected active category code', async () => {
    renderArchive();

    const filter = await screen.findByRole('combobox', { name: '분류 필터' });
    fireEvent.mouseDown(filter);
    fireEvent.click(await screen.findByRole('option', { name: '매뉴얼' }));

    await waitFor(() =>
      expect(archiveServices.fetchArchivePosts).toHaveBeenLastCalledWith(
        1,
        expect.any(Number),
        '',
        'MANUAL',
      ),
    );
  });

  it('loads detail, preserves multiline plain text, and downloads each attachment individually', async () => {
    renderArchive();
    await openPostDetail();

    expect(archiveServices.fetchArchivePostDetail).toHaveBeenCalledWith(12);
    expect(screen.getByLabelText('자료 설명').textContent).toBe(
      '첫 번째 줄\n두 번째 줄',
    );
    expect(screen.getByText('guide.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다운로드 guide.pdf' }));
    await waitFor(() =>
      expect(archiveServices.downloadArchiveAttachment).toHaveBeenCalledWith(
        attachment,
      ),
    );
  });

  it('shows each mutation only when tenant-admin and its menu permission are both granted', async () => {
    const permissions = { ...adminPermissions, create: false, update: false, delete: true };
    renderArchive(permissions, true);
    expect(await screen.findByRole('table', { name: '자료실 목록' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '새 자료 등록' })).not.toBeInTheDocument();

    await openPostDetail();
    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
  });

  it('hides all mutation actions when the user is not a tenant administrator', async () => {
    renderArchive(adminPermissions, false);
    expect(screen.queryByRole('button', { name: '새 자료 등록' })).not.toBeInTheDocument();

    await openPostDetail();
    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
  });

  it('creates the post before uploading files and reports partial upload failure without discarding the draft', async () => {
    archiveServices.uploadArchiveAttachment.mockRejectedValueOnce(
      new Error('파일 업로드 실패'),
    );
    renderArchive();
    fireEvent.click(await screen.findByRole('button', { name: '새 자료 등록' }));

    fireEvent.change(await screen.findByRole('textbox', { name: '제목' }), {
      target: { value: '신규 가이드' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: '설명' }), {
      target: { value: '설명 초안' },
    });
    const category = screen.getByRole('combobox', { name: '자료 분류' });
    fireEvent.mouseDown(category);
    fireEvent.click(await screen.findByRole('option', { name: '업무양식' }));
    fireEvent.change(screen.getByLabelText('첨부파일 추가'), {
      target: { files: [new File(['file'], 'draft.txt', { type: 'text/plain' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(archiveServices.createArchivePost).toHaveBeenCalledWith({
        title: '신규 가이드',
        contents: '설명 초안',
        categoryCode: 'GUIDE',
      }),
    );
    expect(archiveServices.uploadArchiveAttachment).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ name: 'draft.txt' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'draft.txt 업로드 실패: 파일 업로드 실패',
    );
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('신규 가이드');
    expect(screen.getByRole('textbox', { name: '설명' })).toHaveValue('설명 초안');
  });

  it('retains existing attachments during edits unless they are explicitly removed', async () => {
    renderArchive();
    await openPostDetail();
    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    expect(await screen.findAllByText('guide.pdf')).not.toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(archiveServices.updateArchivePost).toHaveBeenCalledWith(
        12,
        expect.objectContaining({ title: '업무 가이드' }),
      ),
    );
    expect(archiveServices.deleteArchiveAttachment).not.toHaveBeenCalled();
  });

  it('keeps a failed attachment removal retryable and reports which file failed', async () => {
    archiveServices.deleteArchiveAttachment.mockRejectedValueOnce(
      new Error('파일 삭제 실패'),
    );
    renderArchive();
    await openPostDetail();
    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    fireEvent.click(await screen.findByRole('button', { name: '제거' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'guide.pdf 제거 실패: 파일 삭제 실패',
    );
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('업무 가이드');
    expect(screen.getByRole('button', { name: '복원' })).toBeInTheDocument();
  });

  it('requires confirmation before deleting a post', async () => {
    renderArchive();
    await openPostDetail();
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));

    const dialog = await screen.findByRole('dialog', { name: /자료 삭제 확인/ });
    expect(within(dialog).getByText(/삭제하시겠습니까/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '삭제 확인' }));

    await waitFor(() =>
      expect(archiveServices.deleteArchivePost).toHaveBeenCalledWith(12),
    );
  });

  it('renders a retry action for list failures rather than an empty success state', async () => {
    archiveServices.fetchArchivePosts
      .mockRejectedValueOnce(new Error('일시적인 오류'))
      .mockResolvedValueOnce({ resultList: [], resultCnt: 0 });
    renderArchive();

    expect(await screen.findByText(/일시적인 오류/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText(/등록된 자료가 없습니다/)).toBeInTheDocument();
  });
});
