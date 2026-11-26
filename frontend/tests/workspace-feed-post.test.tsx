import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const thread = vi.hoisted(() => ({ props: null as null | Record<string, any> }));

vi.mock('../src/shared/components/feed/CommentThread', () => ({
  CommentThread: (props: Record<string, any>) => {
    thread.props = props;
    return <div data-testid="comment-thread-stub" />;
  },
}));

import { WorkspaceFeedPost } from '../src/pages/groupware/community/workspace/components/WorkspaceFeedPost';
import { createSampleStore } from '../src/pages/groupware/community/workspace/data/workspaceSamples';
import type { WorkspacePost } from '../src/pages/groupware/community/workspace/types/workspace.types';

const store = createSampleStore();
const salesRoom = store.rooms[0];
const designRoom = store.rooms[1];
const IMAGE = 'data:image/png;base64,iVBORw0KGgo=';

const basePost = store.posts.find((post) => post.id === 'post-2') as WorkspacePost;
const imagePost: WorkspacePost = {
  ...basePost,
  id: 'post-img',
  body: `<p>현장 사진입니다</p><p><img src="${IMAGE}" alt="현장 사진"></p>`,
  attachments: [
    { name: 'photo.png', size: 4, type: 'image/png', dataUrl: IMAGE },
    { name: 'spec.pdf', size: 99, type: 'application/pdf' },
  ],
};

const handlers = () => ({
  onAddComment: vi.fn().mockResolvedValue(undefined),
  onEditComment: vi.fn().mockResolvedValue(undefined),
  onDeleteComment: vi.fn().mockResolvedValue(undefined),
  onDownloadAttachment: vi.fn(),
});

const renderPost = (
  post: WorkspacePost,
  overrides: Partial<Parameters<typeof WorkspaceFeedPost>[0]> = {},
) => {
  const fns = handlers();
  render(
    <WorkspaceFeedPost
      room={salesRoom}
      post={post}
      currentUserId="u3"
      canWrite
      {...fns}
      {...overrides}
    />,
  );
  return fns;
};

describe('WorkspaceFeedPost', () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  beforeEach(() => {
    thread.props = null;
  });

  it('uses the shared feed card with author, date, status badge and title', () => {
    renderPost(basePost);
    const card = screen.getByTestId('workspace-feed-card');
    expect(within(card).getByText('박지훈')).toBeTruthy();
    expect(within(card).getByText('계약서 검토')).toBeTruthy();
    expect(within(card).getByText('진행중')).toBeTruthy();
  });

  it('paints the status badge with the column color', () => {
    const colored = { ...salesRoom, columns: salesRoom.columns.map((column) => (column.id === 'col-doing' ? { ...column, color: '#3b82f6' } : column)) };
    renderPost(basePost, { room: colored });
    expect(screen.getByText('진행중').closest('[data-column-color]')?.getAttribute('data-column-color')).toBe('#3b82f6');
  });

  it('shows no status badge for a room without columns', () => {
    renderPost({ ...basePost, columnId: null }, { room: designRoom });
    expect(screen.queryByText('진행중')).toBeNull();
  });

  it('collapses a body that has an image into text plus an image preview strip, and expands on demand', () => {
    renderPost(imagePost);
    const body = screen.getByTestId('workspace-post-body');
    expect(body.getAttribute('data-expanded')).toBe('false');
    expect(body.querySelector('img')).toBeNull();
    expect(screen.getByRole('button', { name: /본문 이미지 미리보기 1/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    const expanded = screen.getByTestId('workspace-post-body');
    expect(expanded.getAttribute('data-expanded')).toBe('true');
    expect(expanded.querySelector('img')?.getAttribute('src')).toBe(IMAGE);
  });

  it('opens the image viewer when a body image preview is clicked', () => {
    renderPost(imagePost);
    fireEvent.click(screen.getByRole('button', { name: /본문 이미지 미리보기 1/ }));
    expect(screen.getByRole('dialog', { name: '이미지 보기' })).toBeTruthy();
  });

  it('lists attachments with file icons, previews images and delegates downloads', () => {
    const { onDownloadAttachment } = renderPost(imagePost);
    const list = screen.getByTestId('workspace-attachment-list');
    expect(within(list).getByText('photo.png')).toBeTruthy();
    expect(within(list).getByText('spec.pdf')).toBeTruthy();
    expect(within(list).getByAltText('photo.png').getAttribute('src')).toBe('blob:preview');
    fireEvent.click(within(list).getAllByRole('button', { name: '첨부 파일 다운로드' })[1]);
    expect(onDownloadAttachment).toHaveBeenCalledWith(imagePost.attachments[1]);
  });

  it('passes mapped comments to the shared thread and lets only the author edit', () => {
    renderPost(basePost, { currentUserId: 'u1' });
    const comments = thread.props?.comments as Array<Record<string, any>>;
    expect(comments[0]).toMatchObject({ id: 'cm-2', author: '김민수', isEditable: true });
    expect(comments[0].replies[0]).toMatchObject({ id: 'cm-3', author: '박지훈', isEditable: false });
    expect(thread.props?.showComposer).toBe(true);
  });

  it('hides the comment composer for a user who cannot write', () => {
    renderPost(basePost, { canWrite: false });
    expect(thread.props?.showComposer).toBe(false);
    const comments = thread.props?.comments as Array<Record<string, any>>;
    expect(comments.every((comment) => comment.isEditable === false)).toBe(true);
  });

  it('wires comment submit, reply, edit and delete to the page handlers', async () => {
    const fns = renderPost(basePost, { currentUserId: 'u1' });
    const file = new File(['x'], 'a.txt');
    await thread.props?.onSubmitComment('<p>새 댓글</p>', [file]);
    expect(fns.onAddComment).toHaveBeenCalledWith('post-2', null, '<p>새 댓글</p>', [file]);
    await thread.props?.onSubmitReply('cm-2', '<p>답글</p>', [], 'cm-2');
    expect(fns.onAddComment).toHaveBeenCalledWith('post-2', 'cm-2', '<p>답글</p>', []);
    await thread.props?.onEditComment('cm-2', '<p>수정</p>', []);
    expect(fns.onEditComment).toHaveBeenCalledWith('post-2', 'cm-2', '<p>수정</p>', []);
    await thread.props?.onDeleteComment('cm-2');
    expect(fns.onDeleteComment).toHaveBeenCalledWith('post-2', 'cm-2');
  });

  it('has no divider above the reaction row, and one full-bleed divider right below it', () => {
    renderPost(basePost);
    const card = screen.getByTestId('workspace-feed-card');
    const separators = within(card).getAllByRole('separator');
    expect(separators).toHaveLength(1);
    const reaction = within(card).getByTestId('feed-reaction-bar');
    expect(Boolean(reaction.compareDocumentPosition(separators[0]) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    // 좌우 끝까지 닿는지(카드 안쪽 여백만큼의 음수 여백)는 jsdom이 반응형 스타일을 계산하지 못해
    // 실제 브라우저 검증에서 구분선 폭과 카드 폭을 재서 확인한다.
    expect(separators[0].getAttribute('data-testid')).toBe('feed-engagement-divider');
  });

  it('removes the comment list top margin, border and big padding so only the full-bleed divider remains', () => {
    renderPost(basePost);
    expect(thread.props?.commentListSx).toEqual({ mt: 0, borderTop: 0, pt: 0 });
  });

  it('shows the comment count in the reaction bar', () => {
    renderPost(basePost);
    expect(screen.getByText(/댓글\s*2/)).toBeTruthy();
  });

});
