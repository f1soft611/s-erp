import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedCard } from '../src/shared/components/feed/FeedCard';
import { FeedCommentsSection } from '../src/shared/components/feed/FeedCommentsSection';
import { FeedBodyContent } from '../src/shared/components/feed/FeedBodyContent';
import { FeedReactionBar } from '../src/shared/components/feed/FeedReactionBar';
import { AttachmentList } from '../src/shared/components/feed/AttachmentList';
import { getAttachmentIconMeta } from '../src/shared/components/feed/attachmentIconMeta';
import {
  CommentThread,
  isCommentSubmitKey,
} from '../src/shared/components/feed/CommentThread';
import { PostDetailPanel } from '../src/shared/components/feed/PostDetailPanel';

describe('shared feed components', () => {
  it('centers detail loading in the shared panel content area', () => {
    render(
      <PostDetailPanel
        onClose={() => undefined}
        isLoading
        loadingLabel="상세 불러오는 중"
      >
        <p>상세 내용</p>
      </PostDetailPanel>,
    );

    const content = screen.getByTestId('post-detail-panel-content');
    expect(
      screen.getByRole('status', { name: '상세 불러오는 중' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('상세 내용')).not.toBeInTheDocument();
    expect(content).toHaveStyle({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
  });

  it('expands rich body content and shows untitled image previews', () => {
    const onToggleExpand = vi.fn();
    const onOpenImage = vi.fn();

    render(
      <FeedBodyContent
        hasMore
        isExpanded={false}
        onToggleExpand={onToggleExpand}
        richText={{
          collapsedHtml: '<p>요약된 본문</p>',
          expandedHtml: '<p>전체 본문<img src="blob:body-image" alt="영수증" /></p>',
          images: [{ src: 'blob:body-image', alt: '영수증' }],
          onOpenImage,
        }}
      />,
    );

    expect(screen.getByTestId('feed-body-content')).toHaveAttribute(
      'data-expanded',
      'false',
    );
    expect(screen.getByText('요약된 본문')).toBeInTheDocument();
    expect(screen.queryByText('본문 이미지', { exact: true })).not.toBeInTheDocument();
    const preview = screen.getByRole('button', {
      name: '본문 이미지 미리보기 1: 영수증',
    });
    expect(preview.querySelector('img')).toHaveAttribute('src', 'blob:body-image');

    fireEvent.click(preview);
    fireEvent.click(screen.getByRole('button', { name: '더보기' }));

    expect(onOpenImage).toHaveBeenCalledWith({
      src: 'blob:body-image',
      alt: '영수증',
    });
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('renders the complete hydrated rich body when expanded', () => {
    render(
      <FeedBodyContent
        hasMore
        isExpanded
        onToggleExpand={() => undefined}
        richText={{
          collapsedHtml: '<p>요약</p>',
          expandedHtml: '<p>전체 본문<img src="blob:body-image" alt="영수증" /></p>',
          images: [{ src: 'blob:body-image', alt: '영수증' }],
          onOpenImage: () => undefined,
        }}
      />,
    );

    expect(screen.getByTestId('feed-body-content')).toHaveAttribute(
      'data-expanded',
      'true',
    );
    expect(screen.getByTestId('feed-body-rich-content').querySelector('img')).toHaveAttribute(
      'src',
      'blob:body-image',
    );
    expect(screen.getByRole('button', { name: '접기' })).toBeInTheDocument();
  });

  it('clamps plain body text until the expand action is requested', () => {
    const onToggleExpand = vi.fn();

    render(
      <FeedBodyContent
        hasMore
        isExpanded={false}
        onToggleExpand={onToggleExpand}
        contentTestId="plain-feed-body"
        text={{
          collapsed: '요약 본문',
          expanded: '전체 본문',
        }}
      />,
    );

    expect(screen.getByTestId('plain-feed-body')).toHaveTextContent('요약 본문');
    expect(screen.getByTestId('plain-feed-body')).toHaveStyle({
      display: '-webkit-box',
      '-webkit-line-clamp': '3',
    });
    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('renders the shared feed-card slots in notice order', () => {
    render(
      <FeedCard
        author="관리자"
        meta="2026.10.13"
        avatar="관"
        badges={<span>결재대기</span>}
        actions={<button type="button">더보기</button>}
        title="문서 제목"
        summary="문서 요약"
      >
        <p>카드 본문</p>
      </FeedCard>,
    );

    const card = screen.getByTestId('feed-card');
    expect(card).toHaveTextContent('관리자');
    expect(card).toHaveTextContent('2026.10.13');
    expect(card).toHaveTextContent('결재대기');
    expect(card).toHaveTextContent('더보기');
    expect(card).toHaveTextContent('문서 제목');
    expect(card).toHaveTextContent('문서 요약');
    expect(card).toHaveTextContent('카드 본문');
  });

  it('forwards clicks from a clickable shared feed card', () => {
    const onClick = vi.fn();

    render(
      <FeedCard author="관리자" title="문서 제목" onClick={onClick}>
        <p>본문</p>
      </FeedCard>,
    );

    fireEvent.click(screen.getByTestId('feed-card'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders controlled reaction state and forwards reaction actions', () => {
    const onToggleLike = vi.fn();
    const onToggleBookmark = vi.fn();

    render(
      <FeedReactionBar
        liked={false}
        likeCount={4}
        bookmarked={false}
        commentCount={8}
        onToggleLike={onToggleLike}
        onToggleBookmark={onToggleBookmark}
      />,
    );

    expect(screen.getByText('댓글 8')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '좋아요 4' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: '좋아요 4' }));
    fireEvent.click(screen.getByRole('button', { name: '북마크' }));

    expect(onToggleLike).toHaveBeenCalledTimes(1);
    expect(onToggleBookmark).toHaveBeenCalledTimes(1);
  });

  it('renders and invokes the optional previous-comments action', () => {
    const onLoadPrevious = vi.fn();

    render(
      <FeedCommentsSection
        showPrevious
        isLoadingPrevious={false}
        onLoadPrevious={onLoadPrevious}
      >
        <p>최신 댓글</p>
      </FeedCommentsSection>,
    );

    expect(screen.getByText('최신 댓글')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '이전 댓글 보기' }));

    expect(onLoadPrevious).toHaveBeenCalledTimes(1);
  });

  it('shows the remaining previous-comment count in the control label', () => {
    render(
      <FeedCommentsSection showPrevious remainingPreviousCount={4}>
        <p>최신 댓글</p>
      </FeedCommentsSection>,
    );

    const previousCommentsButton = screen.getByRole('button', {
      name: '이전 댓글 보기 (4)',
    });
    expect(previousCommentsButton).toHaveTextContent('이전 댓글 보기 (4)');
    expect(previousCommentsButton).toHaveStyle({ whiteSpace: 'nowrap' });
  });

  it('renders feed, attachment and comment blocks via reusable shared components', () => {
    render(
      <>
        <AttachmentList
          files={[{ id: 'file-1', name: '공지사항_안내.pdf' }]}
          showActions={false}
        />
        <CommentThread
          comments={[
            {
              id: 1,
              author: '김철수',
              time: '2026-09-16 10:00',
              content: '확인했습니다.',
            },
          ]}
          onSubmitComment={() => undefined}
          showComposer={false}
        />
      </>,
    );

    expect(screen.getByText('공지사항_안내.pdf')).toBeInTheDocument();
    expect(screen.getByText('확인했습니다.')).toBeInTheDocument();
  });

  it('renders system timeline items without comment mutation controls', () => {
    render(
      <CommentThread
        comments={[{
          id: 'system-DRAFT_SAVED',
          author: '시스템',
          time: '2026-10-12 09:52',
          content: '문서가 임시저장되었습니다.',
          isSystemEvent: true,
        }]}
        showComposer={false}
      />,
    );

    expect(screen.getByText('문서가 임시저장되었습니다.')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '시스템 메시지' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('system-event-badge')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '댓글 메뉴 시스템' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '답글' })).not.toBeInTheDocument();
  });

  it('renders a file-type icon for spreadsheet attachments', () => {
    render(
      <AttachmentList
        files={[{ id: 'file-1', name: '업무일정.xlsx' }]}
        showActions={false}
      />,
    );

    expect(screen.getByTestId('attachment-icon-xlsx')).toBeInTheDocument();
  });

  it('renders a safe preview when an authenticated image URL is provided', () => {
    render(
      <AttachmentList
        files={[{
          id: 'file-image',
          name: '검토.png',
          mimeType: 'image/png',
          previewUrl: 'blob:test-image',
        }]}
        showActions={false}
      />,
    );

    expect(screen.getByRole('img', { name: '검토.png' })).toHaveAttribute(
      'src',
      'blob:test-image',
    );
  });

  it('maps known and unknown file extensions to icon metadata', () => {
    expect(getAttachmentIconMeta('guide.pdf').label).toBe('PDF');
    expect(getAttachmentIconMeta('archive.unknown').label).toBe('FILE');
    expect(getAttachmentIconMeta('README').label).toBe('FILE');
  });

  it('uses a Tiptap editor and submits sanitized HTML for a comment', async () => {
    const onSubmitComment = vi.fn();

    render(
      <CommentThread
        comments={[]}
        onSubmitComment={onSubmitComment}
        showComposer
      />,
    );

    const editor = screen.getByRole('textbox', { name: '댓글 입력' });
    expect(editor).toHaveAttribute('contenteditable', 'true');

    fireEvent.input(editor, {
      target: { innerHTML: '<p>새 댓글<script>alert(1)</script></p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => {
      expect(onSubmitComment).toHaveBeenCalledWith('<p>새 댓글</p>', []);
    });
  });

  it('hides replies by default and expands them from the compact reply summary', async () => {
    const onSubmitReply = vi.fn();

    render(
      <CommentThread
        comments={[
          {
            id: 1,
            author: '원댓글 작성자',
            time: '방금',
            content: '<p>원댓글</p>',
            replies: [
              {
                id: 2,
                author: '첫 답글 작성자',
                time: '방금',
                content: '<p>첫 답글</p>',
                replies: [
                  {
                    id: 3,
                    author: '두번째 답글 작성자',
                    time: '방금',
                    content: '<p>두번째 답글</p>',
                  },
                ],
              },
            ],
          },
        ]}
        onSubmitReply={onSubmitReply}
        showComposer={false}
      />,
    );

    expect(screen.queryByText('두번째 답글')).not.toBeInTheDocument();
    const replySummary = screen.getByRole('button', { name: '답글 2개' });
    expect(replySummary).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(replySummary).getByTestId('reply-collapsed-icon'),
    ).toBeInTheDocument();

    fireEvent.click(replySummary);

    expect(replySummary).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(replySummary).getByTestId('reply-expanded-icon'),
    ).toBeInTheDocument();
    expect(screen.getByText('첫 답글')).toBeInTheDocument();
    expect(screen.getByText('두번째 답글')).toBeInTheDocument();
    const replyButtons = screen.getAllByRole('button', { name: '답글' });
    expect(replyButtons).toHaveLength(3);

    fireEvent.click(replyButtons[2]);
    const replyEditor = await screen.findByRole('textbox', {
      name: '답글 입력',
    });
    fireEvent.input(replyEditor, {
      target: { innerHTML: '<p>새 답글</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '답글 등록' }));

    await waitFor(() => {
      expect(onSubmitReply).toHaveBeenCalledWith(3, '<p>새 답글</p>', [], 3);
    });
  });

  it('registers with Enter and keeps Shift+Enter for a line break', async () => {
    expect(
      isCommentSubmitKey({
        key: 'Enter',
        shiftKey: false,
        isComposing: false,
      }),
    ).toBe(true);
    expect(
      isCommentSubmitKey({
        key: 'Enter',
        shiftKey: true,
        isComposing: false,
      }),
    ).toBe(false);
    expect(
      isCommentSubmitKey({
        key: 'Enter',
        shiftKey: false,
        isComposing: true,
      }),
    ).toBe(false);
  });

  it('replaces the comment content with the edit editor instead of appending it', async () => {
    render(
      <CommentThread
        comments={[
          { id: 1, author: '작성자', time: '방금', content: '<p>댓글</p>' },
        ]}
        showComposer={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));

    expect(
      screen.getByRole('textbox', { name: '댓글 수정 입력' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '답글' }),
    ).not.toBeInTheDocument();
  });

  it('keeps comment edit and delete actions inside an accessible MoreVert menu', async () => {
    const onEditComment = vi.fn();
    const onDeleteComment = vi.fn();

    render(
      <CommentThread
        comments={[
          { id: 1, author: '작성자', time: '방금', content: '<p>댓글</p>' },
        ]}
        onEditComment={onEditComment}
        onDeleteComment={onDeleteComment}
        showComposer={false}
      />,
    );

    expect(
      screen.queryByRole('menuitem', { name: '수정' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '삭제' }));

    await waitFor(() => {
      expect(onDeleteComment).toHaveBeenCalledWith(1);
    });
  });

  it('fires the attachment delete callback when removal is allowed', async () => {
    const onDeleteAttachment = vi.fn();

    render(
      <CommentThread
        comments={[
          {
            id: 1,
            author: '작성자',
            time: '방금',
            content: '<p>댓글</p>',
            attachments: [{ id: 'file-1', name: '자료.pdf' }],
          },
        ]}
        onDeleteAttachment={onDeleteAttachment}
        showComposer={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    fireEvent.click(screen.getByRole('button', { name: '첨부 파일 삭제' }));

    await waitFor(() => {
      expect(onDeleteAttachment).toHaveBeenCalledWith(1, 'file-1');
    });
  });

  it('shows the deleted comment message when a comment has been removed by its author', () => {
    render(
      <CommentThread
        comments={[
          {
            id: 1,
            author: '삭제된 댓글',
            time: '방금',
            content: '[작성자에 의해 삭제 되었습니다.]',
            isDeleted: true,
          },
        ]}
        showComposer={false}
      />,
    );

    expect(
      screen.getByText('[작성자에 의해 삭제 되었습니다.]'),
    ).toBeInTheDocument();
  });

  it('counts only root comments and keeps replies collapsed behind a compact preview', () => {
    render(
      <CommentThread
        comments={[
          {
            id: 1,
            author: '작성자',
            time: '방금',
            content: '<p>댓글</p>',
            replies: [
              {
                id: 2,
                author: '답글 작성자',
                time: '방금',
                content: '<p>답글</p>',
              },
            ],
          },
        ]}
        showComposer={false}
      />,
    );

    expect(screen.getByText('답글')).toBeInTheDocument();
    expect(screen.getByText('답글 1개')).toBeInTheDocument();
    expect(screen.queryByText('답글 작성자')).not.toBeInTheDocument();
  });

  it('keeps the reply summary visible even when the parent comment is deleted', () => {
    render(
      <CommentThread
        comments={[
          {
            id: 1,
            author: '삭제된 댓글',
            time: '방금',
            content: '[작성자에 의해 삭제 되었습니다.]',
            isDeleted: true,
            replies: [
              {
                id: 2,
                author: '답글 작성자',
                time: '방금',
                content: '<p>답글</p>',
              },
            ],
          },
        ]}
        showComposer={false}
      />,
    );

    expect(
      screen.getByText('[작성자에 의해 삭제 되었습니다.]'),
    ).toBeInTheDocument();
    const replySummary = screen.getByRole('button', { name: '답글 1개' });
    expect(replySummary).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(replySummary).getByTestId('reply-collapsed-icon'),
    ).toBeInTheDocument();
    fireEvent.click(replySummary);
    expect(replySummary).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(replySummary).getByTestId('reply-expanded-icon'),
    ).toBeInTheDocument();
  });

  it('shows attachment deletion only during the explicit comment edit flow', () => {
    render(
      <CommentThread
        comments={[
          {
            id: 1,
            author: '작성자',
            time: '방금',
            content: '<p>댓글</p>',
            isEditable: true,
            attachments: [{ id: 'file-1', name: '자료.pdf' }],
          },
        ]}
        onDeleteAttachment={vi.fn()}
        onDownloadAttachment={vi.fn()}
        showComposer={false}
      />,
    );

    expect(
      screen.getByRole('button', { name: '첨부 파일 다운로드' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '첨부 파일 삭제' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));

    expect(
      screen.getByRole('button', { name: '첨부 파일 삭제' }),
    ).toBeInTheDocument();
  });
});
