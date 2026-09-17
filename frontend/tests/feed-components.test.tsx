import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AttachmentList } from '../src/shared/components/feed/AttachmentList';
import { CommentThread } from '../src/shared/components/feed/CommentThread';
import { FeedList } from '../src/shared/components/feed/FeedList';

describe('shared feed components', () => {
  it('renders feed, attachment and comment blocks via reusable shared components', () => {
    render(
      <>
        <FeedList
          items={[
            {
              id: 1,
              title: '공지사항 업데이트',
              meta: '운영팀 · 2026.09.16 · 조회 12',
              summary: '새로운 업데이트를 안내드립니다.',
            },
          ]}
          renderItem={(item) => <div>{item.title}</div>}
        />
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

    expect(screen.getByText('공지사항 업데이트')).toBeInTheDocument();
    expect(screen.getByText('공지사항_안내.pdf')).toBeInTheDocument();
    expect(screen.getByText('확인했습니다.')).toBeInTheDocument();
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
      screen.queryByRole('button', { name: /댓글 수정 작성자/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(
      screen.getByRole('menuitem', { name: /댓글 삭제 작성자/i }),
    );

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
    fireEvent.click(
      screen.getByRole('menuitem', { name: /댓글 수정 작성자/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: '첨부 파일 삭제' }));

    await waitFor(() => {
      expect(onDeleteAttachment).toHaveBeenCalledWith(1, 'file-1');
    });
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
    fireEvent.click(
      screen.getByRole('menuitem', { name: /댓글 수정 작성자/i }),
    );

    expect(
      screen.getByRole('button', { name: '첨부 파일 삭제' }),
    ).toBeInTheDocument();
  });
});
