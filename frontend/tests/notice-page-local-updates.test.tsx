import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import { CommunityNoticePage } from '../src/pages/groupware/community/notice/CommunityNoticePage';

const noticeServiceMocks = vi.hoisted(() => ({
  fetchNoticePosts: vi.fn(),
  fetchNoticePostDetail: vi.fn(),
  createNoticePost: vi.fn(),
  updateNoticePost: vi.fn(),
  deleteNoticePost: vi.fn(),
  deleteNoticeAttachment: vi.fn(),
  downloadNoticeAttachment: vi.fn(),
  uploadNoticeAttachment: vi.fn(),
}));

const commentServiceMocks = vi.hoisted(() => ({
  fetchCommonComments: vi.fn(),
  createCommonComment: vi.fn(),
  updateCommonComment: vi.fn(),
  deleteCommonComment: vi.fn(),
  uploadCommonFile: vi.fn(),
  deleteCommonFile: vi.fn(),
}));

vi.mock(
  '../src/pages/groupware/community/notice/services/noticeBoardService',
  () => ({
    ...noticeServiceMocks,
  }),
);

vi.mock('../src/shared/services/commonContentApi', () => ({
  ...commentServiceMocks,
}));

const selectedModule = {
  id: 'groupware',
  name: '그룹웨어',
  icon: <span aria-hidden="true">G</span>,
  tree: [],
  menus: [],
  path: '/groupware',
};

const content = {
  title: '공지사항',
  description: '최근 공지 내용을 빠르게 확인합니다.',
  cards: [],
  items: [],
};

const detail = {
  postId: 1,
  title: '기존 공지',
  contentsHtml: '<p>공지 본문</p>',
  writerName: '관리자',
  comments: [
    {
      commentId: 10,
      writerName: '작성자',
      content: '서버가 내려준 댓글',
    },
  ],
  commentCount: 1,
};

function renderPage() {
  return render(
    <ThemeProvider theme={createTheme()}>
      <NotificationProvider>
        <CommunityNoticePage
          selectedModule={selectedModule}
          currentMenuName="공지사항"
          content={content}
        />
      </NotificationProvider>
    </ThemeProvider>,
  );
}

describe('CommunityNoticePage local updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    noticeServiceMocks.fetchNoticePosts.mockResolvedValue([
      { postId: 1, title: '기존 공지' },
    ]);
    noticeServiceMocks.fetchNoticePostDetail.mockResolvedValue(detail);
    noticeServiceMocks.createNoticePost.mockResolvedValue({
      ...detail,
      postId: 2,
      title: '새 공지',
    });
    noticeServiceMocks.updateNoticePost.mockResolvedValue({
      ...detail,
      title: '수정 공지',
    });
    noticeServiceMocks.deleteNoticePost.mockResolvedValue(undefined);
    commentServiceMocks.fetchCommonComments.mockResolvedValue([]);
    commentServiceMocks.createCommonComment.mockResolvedValue({
      commentId: 11,
      writerName: '나',
      content: '새 댓글',
    });
  });

  it('uses comments from the integrated detail response without fetching comments per post', async () => {
    renderPage();

    expect(
      await screen.findByText('서버가 내려준 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(noticeServiceMocks.fetchNoticePostDetail).toHaveBeenCalledTimes(1);
    expect(commentServiceMocks.fetchCommonComments).not.toHaveBeenCalled();
  });

  it('removes only the deleted notice without reloading the notice list', async () => {
    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /공지 메뉴 기존 공지/i }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '공지 삭제' }));

    await waitFor(() => {
      expect(screen.queryByText('기존 공지')).not.toBeInTheDocument();
    });
    expect(noticeServiceMocks.deleteNoticePost).toHaveBeenCalledWith(1);
    expect(noticeServiceMocks.fetchNoticePosts).toHaveBeenCalledTimes(1);
  });

  it('appends the created notice without reloading the notice list', async () => {
    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /새 공지 작성/i }));
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '새 공지' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(screen.getByText('새 공지')).toBeInTheDocument();
    });
    expect(noticeServiceMocks.createNoticePost).toHaveBeenCalledTimes(1);
    expect(noticeServiceMocks.fetchNoticePosts).toHaveBeenCalledTimes(1);
  });

  it('cleans up already uploaded notice files when a later upload fails', async () => {
    noticeServiceMocks.uploadNoticeAttachment
      .mockResolvedValueOnce({ boardFileId: 201, fileName: '첫 파일.txt' })
      .mockRejectedValueOnce(new Error('second upload failed'));
    noticeServiceMocks.deleteNoticeAttachment.mockResolvedValue(undefined);
    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /새 공지 작성/i }));
    const input = screen.getByLabelText('첨부 파일 선택');
    fireEvent.change(input, {
      target: {
        files: [
          new File(['one'], 'one.txt', { type: 'text/plain' }),
          new File(['two'], 'two.txt', { type: 'text/plain' }),
        ],
      },
    });
    expect(await screen.findByText('one.txt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(noticeServiceMocks.deleteNoticeAttachment).toHaveBeenCalledWith(
        201,
        2,
      ),
    );
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
  });

  it('replaces the updated notice without reloading the notice list', async () => {
    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /공지 메뉴 기존 공지/i }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '공지 수정' }));
    const titleInput = await screen.findByLabelText('제목');
    fireEvent.change(titleInput, { target: { value: '수정 공지' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(screen.getByText('수정 공지')).toBeInTheDocument();
    });
    expect(noticeServiceMocks.updateNoticePost).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ title: '수정 공지' }),
    );
    expect(noticeServiceMocks.fetchNoticePosts).toHaveBeenCalledTimes(1);
  });

  it('deletes only an explicitly removed existing attachment while updating a notice', async () => {
    noticeServiceMocks.fetchNoticePostDetail.mockResolvedValueOnce(detail);
    noticeServiceMocks.fetchNoticePostDetail.mockResolvedValueOnce({
      ...detail,
      attachments: [
        { boardFileId: 101, fileName: '삭제할 파일.pdf', fileSize: 12 },
        { boardFileId: 102, fileName: '유지할 파일.pdf', fileSize: 24 },
      ],
    });
    noticeServiceMocks.deleteNoticeAttachment.mockResolvedValueOnce(undefined);

    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /공지 메뉴 기존 공지/i }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '공지 수정' }));

    expect(await screen.findByText('삭제할 파일.pdf')).toBeInTheDocument();
    expect(screen.getByText('유지할 파일.pdf')).toBeInTheDocument();
    const removedAttachmentCard = screen
      .getByText('삭제할 파일.pdf')
      .closest('[data-file-card="true"]');
    expect(removedAttachmentCard).not.toBeNull();
    fireEvent.click(
      within(removedAttachmentCard as HTMLElement).getByRole('button', {
        name: '첨부 파일 삭제',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(noticeServiceMocks.deleteNoticeAttachment).toHaveBeenCalledWith(
        101,
        1,
      );
    });
    expect(noticeServiceMocks.deleteNoticeAttachment).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('삭제할 파일.pdf')).not.toBeInTheDocument();
    expect(screen.getAllByText('유지할 파일.pdf').length).toBeGreaterThan(0);
  });

  it('keeps the notice state and edit dialog open when attachment deletion fails', async () => {
    noticeServiceMocks.fetchNoticePostDetail.mockResolvedValueOnce(detail);
    noticeServiceMocks.fetchNoticePostDetail.mockResolvedValueOnce({
      ...detail,
      attachments: [
        { boardFileId: 101, fileName: '삭제 실패 파일.pdf', fileSize: 12 },
      ],
    });
    noticeServiceMocks.deleteNoticeAttachment.mockRejectedValueOnce(
      new Error('attachment delete failed'),
    );

    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /공지 메뉴 기존 공지/i }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '공지 수정' }));
    expect(await screen.findByText('삭제 실패 파일.pdf')).toBeInTheDocument();
    const failedAttachmentCard = screen
      .getByText('삭제 실패 파일.pdf')
      .closest('[data-file-card="true"]');
    expect(failedAttachmentCard).not.toBeNull();
    fireEvent.click(
      within(failedAttachmentCard as HTMLElement).getByRole('button', {
        name: '첨부 파일 삭제',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(
        screen.getByText('공지사항 첨부파일 삭제에 실패했습니다.'),
      ).toBeInTheDocument();
    });
    expect(noticeServiceMocks.deleteNoticeAttachment).toHaveBeenCalledWith(
      101,
      1,
    );
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
    expect(screen.getByText('기존 공지')).toBeInTheDocument();
  });

  it('updates the local comment tree without reloading the notice list', async () => {
    renderPage();

    expect(
      await screen.findByText('서버가 내려준 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(input, { target: { innerHTML: '<p>새 댓글</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => {
      expect(commentServiceMocks.createCommonComment).toHaveBeenCalledWith(
        'NOTICE',
        1,
        '<p>새 댓글</p>',
        undefined,
      );
    });
    expect(screen.getByText('새 댓글')).toBeInTheDocument();
    expect(noticeServiceMocks.fetchNoticePosts).toHaveBeenCalledTimes(1);
    expect(commentServiceMocks.fetchCommonComments).not.toHaveBeenCalled();
  });

  it('cleans up already uploaded comment files when a later upload fails', async () => {
    commentServiceMocks.uploadCommonFile
      .mockResolvedValueOnce({ fileId: 301, fileName: '첫 댓글 파일.txt' })
      .mockRejectedValueOnce(new Error('second upload failed'));
    renderPage();

    expect(
      await screen.findByText('서버가 내려준 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(input, { target: { innerHTML: '<p>댓글</p>' } });
    fireEvent.change(screen.getByLabelText('댓글 첨부파일 선택'), {
      target: {
        files: [
          new File(['one'], 'comment-one.txt', { type: 'text/plain' }),
          new File(['two'], 'comment-two.txt', { type: 'text/plain' }),
        ],
      },
    });
    expect(await screen.findByText('comment-one.txt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() =>
      expect(commentServiceMocks.deleteCommonFile).toHaveBeenCalledWith(
        'NOTICE_COMMENT',
        11,
        301,
      ),
    );
  });

  it('keeps the comment draft and does not render a failed comment', async () => {
    commentServiceMocks.createCommonComment.mockRejectedValueOnce(
      new Error('comment failed'),
    );
    renderPage();

    expect(
      await screen.findByText('서버가 내려준 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(input, { target: { innerHTML: '<p>저장 실패 댓글</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => {
      expect(commentServiceMocks.createCommonComment).toHaveBeenCalled();
    });
    expect(input.innerHTML).toContain('저장 실패 댓글');
  });

  it('keeps a failed reply draft without rendering the reply', async () => {
    commentServiceMocks.createCommonComment.mockRejectedValueOnce(
      new Error('reply failed'),
    );
    renderPage();

    expect(
      await screen.findByText('서버가 내려준 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '답글' }));
    const replyInput = screen.getByRole('textbox', { name: '답글 입력' });
    fireEvent.input(replyInput, {
      target: { innerHTML: '<p>저장 실패 답글</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '답글 등록' }));

    await waitFor(() => {
      expect(commentServiceMocks.createCommonComment).toHaveBeenCalledWith(
        'NOTICE',
        1,
        '<p>저장 실패 답글</p>',
        10,
      );
    });
    expect(replyInput.innerHTML).toContain('저장 실패 답글');
  });

  it('keeps the previous comment content when an update fails', async () => {
    commentServiceMocks.updateCommonComment.mockRejectedValueOnce(
      new Error('update failed'),
    );
    renderPage();

    expect(
      await screen.findByText('서버가 내려준 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '댓글 수정 작성자' }));
    const editInput = await screen.findByRole('textbox', {
      name: '댓글 수정 입력',
    });
    fireEvent.input(editInput, {
      target: { innerHTML: '<p>수정 실패 댓글</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '댓글 수정 완료' }));

    await waitFor(() => {
      expect(commentServiceMocks.updateCommonComment).toHaveBeenCalled();
    });
    expect(screen.getByText('서버가 내려준 댓글')).toBeInTheDocument();
    expect(editInput.innerHTML).toContain('수정 실패 댓글');
  });

  it('removes a deleted comment attachment from local state after success', async () => {
    noticeServiceMocks.fetchNoticePostDetail.mockResolvedValueOnce({
      ...detail,
      comments: [
        {
          commentId: 10,
          writerName: '작성자',
          content: '첨부 댓글',
          attachments: [{ fileId: 'file-1', fileName: '자료.pdf' }],
        },
      ],
    });
    commentServiceMocks.deleteCommonFile.mockResolvedValueOnce(undefined);
    renderPage();

    expect(
      await screen.findByText('첨부 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(
      screen.getByRole('menuitem', { name: /댓글 수정 작성자/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: '첨부 파일 삭제' }));

    await waitFor(() => {
      expect(commentServiceMocks.deleteCommonFile).toHaveBeenCalledWith(
        'NOTICE_COMMENT',
        10,
        'file-1',
      );
    });
    expect(screen.queryByText('자료.pdf')).not.toBeInTheDocument();
  });

  it('keeps a comment attachment and shows an error when deletion fails', async () => {
    noticeServiceMocks.fetchNoticePostDetail.mockResolvedValueOnce({
      ...detail,
      comments: [
        {
          commentId: 10,
          writerName: '작성자',
          content: '첨부 댓글',
          attachments: [{ fileId: 'file-1', fileName: '자료.pdf' }],
        },
      ],
    });
    commentServiceMocks.deleteCommonFile.mockRejectedValueOnce(
      new Error('attachment delete failed'),
    );
    renderPage();

    expect(
      await screen.findByText('첨부 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(
      screen.getByRole('menuitem', { name: /댓글 수정 작성자/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: '첨부 파일 삭제' }));

    await waitFor(() => {
      expect(
        screen.getByText('댓글 첨부파일 삭제에 실패했습니다.'),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('자료.pdf')).toBeInTheDocument();
  });

  it('preserves replies when their parent comment is deleted', async () => {
    noticeServiceMocks.fetchNoticePostDetail.mockResolvedValueOnce({
      ...detail,
      comments: [
        {
          commentId: 10,
          writerName: '작성자',
          content: '부모 댓글',
        },
        {
          commentId: 11,
          parentCommentId: 10,
          writerName: '답글 작성자',
          content: '보존할 답글',
        },
      ],
      commentCount: 2,
    });
    renderPage();

    expect(
      await screen.findByText('보존할 답글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '댓글 삭제 작성자' }));

    await waitFor(() => {
      expect(commentServiceMocks.deleteCommonComment).toHaveBeenCalledWith(
        'NOTICE',
        1,
        10,
      );
    });
    expect(screen.queryByText('부모 댓글')).not.toBeInTheDocument();
    expect(screen.getByText('보존할 답글')).toBeInTheDocument();
  });

  it('keeps the notice when notice deletion fails', async () => {
    noticeServiceMocks.deleteNoticePost.mockRejectedValueOnce(
      new Error('notice delete failed'),
    );
    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /공지 메뉴 기존 공지/i }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '공지 삭제' }));

    await waitFor(() => {
      expect(noticeServiceMocks.deleteNoticePost).toHaveBeenCalledWith(1);
    });
    expect(screen.getByText('기존 공지')).toBeInTheDocument();
    expect(screen.getByText('공지 삭제에 실패했습니다.')).toBeInTheDocument();
  });
});
