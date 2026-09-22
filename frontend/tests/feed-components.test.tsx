import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AttachmentList } from '../src/shared/components/feed/AttachmentList';
import { getAttachmentIconMeta } from '../src/shared/components/feed/attachmentIconMeta';
import {
  CommentThread,
  isCommentSubmitKey,
} from '../src/shared/components/feed/CommentThread';

describe('shared feed components', () => {
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

  it('renders a file-type icon for spreadsheet attachments', () => {
    render(
      <AttachmentList
        files={[{ id: 'file-1', name: '업무일정.xlsx' }]}
        showActions={false}
      />,
    );

    expect(screen.getByTestId('attachment-icon-xlsx')).toBeInTheDocument();
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
    expect(screen.getByText('답글 2개')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '답글 2개' }));

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
    expect(
      screen.getByRole('button', { name: '답글 1개' }),
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
