import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { normalizeNoticeEmbeddedImageSources } from '../src/pages/groupware/community/notice/components/NoticeFeedList';
import { describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { NoticeFeedList } from '../src/pages/groupware/community/notice/components/NoticeFeedList';
import { noticeFeed } from '../src/pages/groupware/community/notice/data/noticeData';

describe('Community notice page', () => {
  it('normalizes legacy MinIO image sources to the stable notice image API', () => {
    const html =
      '<p><img src="http://minio.example/expired" data-object-key="tenant/1/notice-temp/token/image.png" /></p>';

    const normalized = normalizeNoticeEmbeddedImageSources(html, 42);

    expect(normalized).toContain(
      'api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey=tenant%2F1%2Fnotice-temp%2Ftoken%2Fimage.png',
    );
    expect(normalized).not.toContain('minio.example');
  });

  it('keeps the initial skeleton loading state without showing a preloaded notice list', async () => {
    await act(async () => {
      render(
        <DashboardContent
          selectedModule={{
            id: 'groupware',
            name: '그룹웨어',
            icon: <span aria-hidden="true">G</span>,
            tree: [],
            menus: [],
            path: '/groupware',
          }}
          currentMenuName="공지사항"
          currentPageKey="notice"
          breadcrumbItems={['그룹웨어', '커뮤니티', '공지사항']}
          content={{
            title: '공지사항',
            description: '최근 공지 내용을 빠르게 확인합니다.',
            cards: [],
            items: [],
          }}
        />,
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /새 공지 작성/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId('notice-feed-skeleton')).toBeInTheDocument();
    expect(
      screen.queryByText(/3분기_업무일정표_v2\.pdf/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /공지사항/i }),
    ).not.toBeInTheDocument();
  });

  it('renders attachment and comment features for a notice feed item', async () => {
    await act(async () => {
      render(
        <NoticeFeedList
          items={[noticeFeed[0]]}
          isDark={false}
          expandedNoticeId={noticeFeed[0].id}
          onToggleExpand={() => undefined}
          onToggleLike={() => undefined}
          onToggleBookmark={() => undefined}
          onAddComment={() => undefined}
          onDelete={() => undefined}
          onEdit={() => undefined}
          onDownload={() => undefined}
        />,
      );
    });

    expect(
      await screen.findByText('3분기_업무일정표_v2.pdf'),
    ).toBeInTheDocument();
    expect(screen.getByText('부서별_협업_일정_안내.hwp')).toBeInTheDocument();
    expect(screen.getAllByText(/댓글/i).length).toBeGreaterThan(0);

    const commentInput = screen.getByRole('textbox', { name: '댓글 입력' });
    expect(commentInput).toHaveAttribute('contenteditable', 'true');
  });

  it('shows the pin toggle beside the more menu button', () => {
    const onTogglePinned = vi.fn();
    const item = { ...noticeFeed[0], isPinned: 'N' };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        onTogglePinned={onTogglePinned}
      />,
    );

    const pinButton = screen.getByRole('button', {
      name: `상단 고정 ${item.title}`,
    });
    expect(pinButton).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: '상단 고정' }),
    ).not.toBeInTheDocument();

    fireEvent.click(pinButton);
    expect(onTogglePinned).toHaveBeenCalledWith(item);
  });

  it('uses title and body clicks as the read entry point when more is unavailable', () => {
    const onToggleExpand = vi.fn();
    const item = {
      ...noticeFeed[0],
      title: '짧은 공지 제목',
      body: '짧은 공지 내용',
      summary: '짧은 공지 내용',
    };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        onToggleExpand={onToggleExpand}
      />,
    );

    fireEvent.click(screen.getByText('짧은 공지 제목'));
    fireEvent.click(screen.getByText('짧은 공지 내용'));

    expect(onToggleExpand).toHaveBeenCalledTimes(2);
    expect(onToggleExpand).toHaveBeenCalledWith(item.id);
  });

  it('keeps the more button as the only read entry point when more is available', () => {
    const onToggleExpand = vi.fn();
    const item = noticeFeed[0];

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        onToggleExpand={onToggleExpand}
      />,
    );

    fireEvent.click(screen.getByText(item.title));
    fireEvent.click(screen.getByText(item.summary));

    expect(onToggleExpand).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
    expect(onToggleExpand).toHaveBeenCalledWith(item.id);
  });

  it('opens an image viewer when the user clicks a feed image preview', async () => {
    const onNoticeInteract = vi.fn();
    const item = {
      ...noticeFeed[0],
      bodyHtml:
        '<p>공지 내용</p><p><img src="https://example.com/notice-image.png" alt="원본 이미지" /></p>',
      summary: '공지 내용',
    };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        expandedNoticeId={item.id}
        onNoticeInteract={onNoticeInteract}
        onToggleExpand={() => undefined}
        onToggleLike={() => undefined}
        onToggleBookmark={() => undefined}
        onAddComment={() => undefined}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onDownload={() => undefined}
      />,
    );

    fireEvent.click(screen.getByAltText('원본 이미지'));

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: '이미지 보기' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('img', { name: '원본 이미지' }),
      ).toBeInTheDocument();
    });
    expect(onNoticeInteract).not.toHaveBeenCalled();
  });

  it('records an interaction from image and attachment areas when more is unavailable', () => {
    const onNoticeInteract = vi.fn();
    const onDownload = vi.fn();
    const item = {
      ...noticeFeed[0],
      body: '짧은 공지',
      summary: '짧은 공지',
      bodyHtml:
        '<p><img src="https://example.com/short-notice.png" alt="공지 이미지" /></p>',
      attachments: ['안내문.pdf'],
      attachmentDetails: [{ id: 'file-1', name: '안내문.pdf' }],
    };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        onNoticeInteract={onNoticeInteract}
        onDownload={onDownload}
      />,
    );

    fireEvent.click(screen.getByAltText('공지 이미지'));
    fireEvent.click(screen.getByRole('button', { name: '첨부 파일 다운로드' }));

    expect(onNoticeInteract).toHaveBeenCalledTimes(2);
    expect(onNoticeInteract).toHaveBeenCalledWith(item.id);
    expect(onDownload).toHaveBeenCalledWith(
      item.id,
      expect.objectContaining({ name: '안내문.pdf' }),
    );
  });

  it('records a comment-area interaction only when more is unavailable', () => {
    const onNoticeInteract = vi.fn();
    const item = {
      ...noticeFeed[0],
      body: '짧은 공지',
      summary: '짧은 공지',
      comments: [],
    };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        onNoticeInteract={onNoticeInteract}
      />,
    );

    fireEvent.click(screen.getByRole('textbox', { name: '댓글 입력' }));

    expect(onNoticeInteract).toHaveBeenCalledTimes(1);
    expect(onNoticeInteract).toHaveBeenCalledWith(item.id);
  });

  it('shows multiple embedded images in order without introducing scroll controls', () => {
    const item = {
      ...noticeFeed[0],
      bodyHtml:
        '<p>공지 내용</p><p><img src="https://example.com/notice-image-1.png" alt="첫 번째 이미지" /><img src="https://example.com/notice-image-2.png" alt="두 번째 이미지" /></p>',
      summary: '공지 요약',
    };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        onToggleExpand={() => undefined}
        onToggleLike={() => undefined}
        onToggleBookmark={() => undefined}
        onAddComment={() => undefined}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onDownload={() => undefined}
      />,
    );

    expect(screen.getByAltText('첫 번째 이미지')).toBeInTheDocument();
    expect(screen.getByAltText('두 번째 이미지')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '다음 이미지' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '이전 이미지' }),
    ).not.toBeInTheDocument();
  });

  it('does not render duplicate comment keys when the API repeats a comment', () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            comments: [
              { id: 2, author: '첫 댓글', time: '오늘', content: '첫 댓글' },
              {
                id: 2,
                author: '중복 댓글',
                time: '오늘',
                content: '중복 댓글',
              },
            ],
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
      />,
    );

    const duplicateKeyWarning = errorSpy.mock.calls.some((call) =>
      call.some((argument) =>
        String(argument).includes('Encountered two children with the same key'),
      ),
    );
    expect(duplicateKeyWarning).toBe(false);

    errorSpy.mockRestore();
  });

  it('does not render duplicate keys when nested replies share an ID', () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            comments: [
              {
                id: 1,
                author: '원댓글',
                time: '오늘',
                content: '원댓글',
                replies: [
                  {
                    id: 4,
                    author: '첫 답글',
                    time: '오늘',
                    content: '첫 답글',
                    replies: [
                      {
                        id: 4,
                        author: '중복 답글',
                        time: '오늘',
                        content: '중복 답글',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /답글 1개/i }));

    const duplicateKeyWarning = errorSpy.mock.calls.some((call) =>
      call.some((argument) =>
        String(argument).includes('Encountered two children with the same key'),
      ),
    );
    expect(duplicateKeyWarning).toBe(false);

    errorSpy.mockRestore();
  });

  it('opens a composer with title, body, toolbar, and attachment area', async () => {
    render(
      <DashboardContent
        selectedModule={{
          id: 'groupware',
          name: '그룹웨어',
          icon: <span aria-hidden="true">G</span>,
          tree: [],
          menus: [],
          path: '/groupware',
        }}
        currentMenuName="공지사항"
        currentPageKey="notice"
        breadcrumbItems={['그룹웨어', '커뮤니티', '공지사항']}
        content={{
          title: '공지사항',
          description: '최근 공지 내용을 빠르게 확인합니다.',
          cards: [],
          items: [],
        }}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /새 공지 작성/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /새 공지 작성/i }));

    expect(screen.getAllByLabelText(/제목/i)[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText(/본문/i)[0]).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /툴바 열기/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /첨부 링크/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /툴바 열기/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^굵게$/i }),
      ).toBeInTheDocument();
    });
  });

  it('adds a nested reply to an existing comment thread', async () => {
    render(
      <NoticeFeedList
        items={[noticeFeed[0]]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onToggleExpand={() => undefined}
        onToggleLike={() => undefined}
        onToggleBookmark={() => undefined}
        onAddComment={vi.fn()}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onDownload={() => undefined}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /^답글$/i })[0]);

    const replyInput = await screen.findByLabelText(/답글 입력/i);
    fireEvent.input(replyInput, {
      target: { innerHTML: '<p>확인했습니다.</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^답글 등록$/i }));

    expect(
      screen.getByRole('button', { name: /^답글 등록$/i }),
    ).toBeInTheDocument();
  });

  it('edits and deletes a comment from the thread', async () => {
    render(
      <NoticeFeedList
        items={[noticeFeed[0]]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onToggleExpand={() => undefined}
        onToggleLike={() => undefined}
        onToggleBookmark={() => undefined}
        onAddComment={vi.fn()}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onDownload={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /댓글 메뉴 김영식/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const editInput = await screen.findByLabelText(/댓글 수정 입력/i);
    fireEvent.input(editInput, {
      target: { innerHTML: '<p>수정된 코멘트입니다.</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '수정' }));

    fireEvent.click(screen.getByRole('button', { name: /댓글 메뉴 김영식/i }));
    expect(screen.getByRole('menuitem', { name: '삭제' })).toBeInTheDocument();
  });

  it('hides the previous-comments loader when there are fewer than three root comments', () => {
    const onLoadPreviousComments = vi.fn();

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            comments: [
              { id: 11, author: '첫 댓글', time: '오늘', content: '첫 댓글' },
              {
                id: 12,
                author: '둘째 댓글',
                time: '오늘',
                content: '둘째 댓글',
              },
            ],
            commentCount: 2,
            hasPreviousComments: true,
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    expect(
      screen.queryByRole('button', { name: '이전 댓글 불러오기' }),
    ).not.toBeInTheDocument();
  });

  it('shows the previous-comments loader from three root comments', () => {
    const onLoadPreviousComments = vi.fn();

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            comments: [
              { id: 11, author: '첫 댓글', time: '오늘', content: '첫 댓글' },
              {
                id: 12,
                author: '둘째 댓글',
                time: '오늘',
                content: '둘째 댓글',
              },
              {
                id: 13,
                author: '셋째 댓글',
                time: '오늘',
                content: '셋째 댓글',
              },
            ],
            commentCount: 3,
            hasPreviousComments: true,
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    expect(
      screen.getByRole('button', { name: '이전 댓글 불러오기' }),
    ).toBeInTheDocument();
  });

  it('requests the previous cursor once and renders merged older comments without duplicates', async () => {
    const onLoadPreviousComments = vi.fn().mockResolvedValue({
      comments: [
        {
          id: 2,
          author: '이전 작성자',
          time: '어제',
          content: '이전 댓글',
          replies: [
            {
              id: 20,
              author: '이전 답글',
              time: '어제',
              content: '이전 답글 내용',
            },
          ],
        },
        {
          id: 4,
          author: '중복 작성자',
          time: '어제',
          content: '중복 댓글',
        },
      ],
      hasPrevious: false,
      nextBeforeCommentId: null,
    });

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            nextBeforeCommentId: 3,
            comments: [
              {
                id: 4,
                author: '중복 작성자',
                time: '오늘',
                content: '중복 댓글',
              },
              {
                id: 5,
                author: '두번째 작성자',
                time: '오늘',
                content: '두번째 댓글',
              },
              {
                id: 6,
                author: '세번째 작성자',
                time: '오늘',
                content: '세번째 댓글',
                replies: [
                  {
                    id: 60,
                    author: '세번째 답글',
                    time: '오늘',
                    content: '남아있는 답글',
                  },
                ],
              },
            ],
            commentCount: 5,
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    expect(screen.queryByText('이전 댓글')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '이전 댓글 불러오기' }));

    expect(await screen.findByText('이전 댓글')).toBeInTheDocument();
    expect(screen.getByText('이전 답글 내용')).toBeInTheDocument();
    expect(screen.getByText('남아있는 답글')).toBeInTheDocument();
    expect(screen.getAllByText('중복 댓글')).toHaveLength(1);
    expect(onLoadPreviousComments).toHaveBeenCalledWith(1, 3);
    expect(
      screen.queryByRole('button', { name: '이전 댓글 불러오기' }),
    ).not.toBeInTheDocument();

    expect(onLoadPreviousComments).toHaveBeenCalledTimes(1);
  });

  it('uses the response cursor and stops when the backend repeats it', async () => {
    const onLoadPreviousComments = vi
      .fn()
      .mockResolvedValueOnce({
        comments: [
          {
            id: 2,
            author: '이전 작성자',
            time: '어제',
            content: '이전 댓글',
          },
        ],
        hasPrevious: true,
        nextBeforeCommentId: 3,
      })
      .mockResolvedValueOnce({
        comments: [],
        hasPrevious: false,
        nextBeforeCommentId: null,
      });

    render(
      <NoticeFeedList
        items={[{ ...noticeFeed[0], nextBeforeCommentId: 3 }]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: '이전 댓글 불러오기' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: '이전 댓글 불러오기' }),
    );

    await waitFor(() =>
      expect(onLoadPreviousComments).toHaveBeenCalledTimes(1),
    );
    expect(onLoadPreviousComments).toHaveBeenCalledWith(1, 3);
  });

  it('keeps current comments and reports a previous-comments fetch error', async () => {
    const onLoadPreviousComments = vi
      .fn()
      .mockRejectedValue(new Error('previous comments failed'));
    const onLoadPreviousCommentsError = vi.fn();

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            comments: [
              {
                id: 9,
                author: '현재 작성자',
                time: '오늘',
                content: '현재 댓글',
              },
              {
                id: 10,
                author: '다음 작성자',
                time: '오늘',
                content: '둘째 댓글',
              },
              {
                id: 11,
                author: '세 번째 작성자',
                time: '오늘',
                content: '셋째 댓글',
              },
            ],
            nextBeforeCommentId: 8,
            commentCount: 3,
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onLoadPreviousComments={onLoadPreviousComments}
        onLoadPreviousCommentsError={onLoadPreviousCommentsError}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '이전 댓글 불러오기' }));

    await waitFor(() => {
      expect(onLoadPreviousCommentsError).toHaveBeenCalledWith(
        expect.any(Error),
      );
    });
    expect(screen.getByText('현재 댓글')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '이전 댓글 불러오기' }),
    ).toBeInTheDocument();
    expect(onLoadPreviousComments).toHaveBeenCalledTimes(1);
  });

  it('falls back to the oldest visible root when cursor metadata is absent', async () => {
    const onLoadPreviousComments = vi.fn().mockResolvedValue({
      comments: [],
      hasPrevious: false,
      nextBeforeCommentId: null,
    });

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            nextBeforeCommentId: undefined,
            comments: [
              { id: 4, author: '첫 댓글', time: '오늘', content: '첫 댓글' },
              {
                id: 5,
                author: '둘째 댓글',
                time: '오늘',
                content: '둘째 댓글',
              },
              {
                id: 6,
                author: '셋째 댓글',
                time: '오늘',
                content: '셋째 댓글',
              },
              {
                id: 7,
                author: '넷째 댓글',
                time: '오늘',
                content: '넷째 댓글',
              },
            ],
            commentCount: 5,
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: '이전 댓글 불러오기' }),
    );

    await waitFor(() =>
      expect(onLoadPreviousComments).toHaveBeenCalledWith(1, 5),
    );
  });

  it('preserves loaded older roots and cursor when the server item changes locally', async () => {
    const onLoadPreviousComments = vi.fn().mockResolvedValue({
      comments: [
        { id: 2, author: '이전 작성자', time: '어제', content: '이전 댓글' },
      ],
      hasPrevious: true,
      nextBeforeCommentId: 1,
    });
    const serverItem = {
      ...noticeFeed[0],
      comments: [
        { id: 3, author: '현재 작성자', time: '오늘', content: '현재 댓글' },
      ],
      nextBeforeCommentId: 3,
      commentCount: 3,
    };

    const { rerender } = render(
      <NoticeFeedList
        items={[serverItem]}
        isDark={false}
        expandedNoticeId={serverItem.id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: '이전 댓글 불러오기' }),
    );
    expect(await screen.findByText('이전 댓글')).toBeInTheDocument();

    rerender(
      <NoticeFeedList
        items={[{ ...serverItem, title: '로컬 CRUD 반영 공지' }]}
        isDark={false}
        expandedNoticeId={serverItem.id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    expect(screen.getByText('이전 댓글')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '이전 댓글 불러오기' }));
    await waitFor(() =>
      expect(onLoadPreviousComments).toHaveBeenLastCalledWith(1, 1),
    );
  });
});
