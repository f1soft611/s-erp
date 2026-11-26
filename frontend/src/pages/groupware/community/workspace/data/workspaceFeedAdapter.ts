import type { FeedBodyImage } from '../../../../../shared/components/feed/FeedBodyContent';
import type { FeedCommentItem } from '../../../../../shared/components/feed/CommentThread';
import { sanitizeHtml } from '../../../../../shared/utils/sanitizeHtml';
import type { CommonFileViewItem, CommonViewItem } from '../../../../../shared/components/view-mode/commonViewTypes';
import { formatFileSize } from '../../../shared/utils/formatFileSize';
import { formatInboxDateTime } from '../../../shared/utils/formatInboxDateTime';
import type { WorkspaceAttachment, WorkspaceComment, WorkspacePost, WorkspaceRoom } from '../types/workspace.types';
import { getUserName } from './workspaceSamples';

const DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i;
const IMAGE_PLACEHOLDER = '/__workspace-image__/';
const COLLAPSED_TEXT_LIMIT = 180;
const COLLAPSED_BLOCK_LIMIT = 3;

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 공통 HTML 정리 함수는 data: 주소를 안전하지 않다고 보고 img src를 지운다.
// 백엔드 저장소가 없는 동안 본문 이미지는 data URL이므로, 정리하는 동안 자리표시자로 바꿨다가 되돌린다.
function sanitizeKeepingDataImages(html: string): string {
  const stash: string[] = [];
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.querySelectorAll('img').forEach((image) => {
    const src = image.getAttribute('src') ?? '';
    if (DATA_IMAGE.test(src)) {
      image.setAttribute('src', `${IMAGE_PLACEHOLDER}${stash.length}`);
      stash.push(src);
    }
  });
  const clean = new DOMParser().parseFromString(
    sanitizeHtml(parsed.body.innerHTML, { preserveTextStyles: true }),
    'text/html',
  );
  clean.querySelectorAll('img').forEach((image) => {
    const src = image.getAttribute('src') ?? '';
    if (src.startsWith(IMAGE_PLACEHOLDER)) {
      const original = stash[Number(src.slice(IMAGE_PLACEHOLDER.length))];
      if (original) image.setAttribute('src', original);
      else image.removeAttribute('src');
    }
  });
  return clean.body.innerHTML.trim();
}

/** 저장된 본문(서식 HTML 또는 옛 일반 텍스트)을 화면에 그릴 수 있는 안전한 HTML로 바꾼다. */
export function toBodyHtml(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('<')) return sanitizeKeepingDataImages(trimmed);
  return `<p>${escapeHtml(trimmed).replace(/\r?\n/g, '<br>')}</p>`;
}

export type WorkspaceBodyView = {
  collapsedHtml: string;
  expandedHtml: string;
  images: FeedBodyImage[];
  hasMore: boolean;
};

/** 접힘 상태는 이미지를 빼고 미리보기 줄로 보여주고, 펼치면 이미지까지 보여준다(문서작성 피드와 같은 방식). */
export function buildBodyView(body: string): WorkspaceBodyView {
  const expandedHtml = toBodyHtml(body);
  if (!expandedHtml) return { collapsedHtml: '', expandedHtml: '', images: [], hasMore: false };
  const parsed = new DOMParser().parseFromString(expandedHtml, 'text/html');
  const images: FeedBodyImage[] = Array.from(parsed.querySelectorAll('img')).map((image) => ({
    src: image.getAttribute('src') ?? '',
    alt: image.getAttribute('alt')?.trim() || '본문 이미지',
  }));
  const text = parsed.body.textContent?.trim() ?? '';
  const blocks = parsed.body.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, table').length;

  parsed.querySelectorAll('img').forEach((image) => image.remove());
  parsed.querySelectorAll('p').forEach((paragraph) => {
    if (!paragraph.textContent?.trim() && !paragraph.querySelector('br')) paragraph.remove();
  });

  return {
    collapsedHtml: parsed.body.innerHTML.trim(),
    expandedHtml,
    images,
    hasMore: images.length > 0 || text.length > COLLAPSED_TEXT_LIMIT || blocks > COLLAPSED_BLOCK_LIMIT,
  };
}

/** 글자도 이미지도 첨부도 없으면 빈 댓글이다. */
export function hasCommentContent(html: string, attachmentCount: number): boolean {
  if (attachmentCount > 0) return true;
  if (!html.trim()) return false;
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return Boolean(parsed.body.textContent?.trim()) || parsed.querySelector('img') !== null;
}

export function countComments(comments: WorkspaceComment[]): number {
  return comments.reduce(
    (sum, comment) => sum + (comment.deleted ? 0 : 1) + countComments(comment.replies),
    0,
  );
}

type FeedCommentOptions = {
  currentUserId: string;
  /** 저장 권한이 있을 때만 수정할 수 있다. */
  canEdit: boolean;
  getAttachmentUrl: (attachment: WorkspaceAttachment) => string | undefined;
};

export function toFeedComments(comments: WorkspaceComment[], options: FeedCommentOptions): FeedCommentItem[] {
  return comments.map((comment) => ({
    id: comment.id,
    author: getUserName(comment.authorId),
    time: formatInboxDateTime(comment.createdAt),
    content: comment.deleted ? '' : toBodyHtml(comment.body),
    isDeleted: comment.deleted === true,
    isEditable: options.canEdit && !comment.deleted && comment.authorId === options.currentUserId,
    attachments: (comment.attachments ?? []).map((attachment, index) => ({
      id: String(index),
      name: attachment.name,
      size: attachment.size,
      mimeType: attachment.type,
      previewUrl: options.getAttachmentUrl(attachment),
    })),
    replies: toFeedComments(comment.replies, options),
  }));
}

const pad = (value: number) => String(value).padStart(2, '0');

/** 리스트·첨부 보기에서 쓰는 `YYYY.MM.DD` 날짜(문서작성 목록과 같은 표기). */
export function formatDotDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

/** 리스트형 보기: 컬럼은 상태 배지, 댓글 수는 보조 배지로 보여준다. */
export function toListItems(posts: WorkspacePost[], room: WorkspaceRoom): CommonViewItem[] {
  return posts.map((post) => {
    const columnName = room.columns.find((column) => column.id === post.columnId)?.name;
    const commentCount = countComments(post.comments);
    return {
      id: post.id,
      title: post.title,
      authorLabel: getUserName(post.authorId),
      dateLabel: formatDotDate(post.createdAt),
      ...(columnName ? { statusLabel: columnName, statusColor: 'info' as const } : {}),
      ...(commentCount > 0
        ? { categoryLabel: `댓글 ${commentCount}`, categoryVariant: 'outlined' as const }
        : {}),
    };
  });
}

export type WorkspaceFileItem = CommonFileViewItem & { id: string; postId: string; attachment: WorkspaceAttachment };

const collectCommentAttachments = (comments: WorkspaceComment[]): Array<{ comment: WorkspaceComment; attachment: WorkspaceAttachment }> =>
  comments.flatMap((comment) => [
    ...(comment.attachments ?? []).map((attachment) => ({ comment, attachment })),
    ...collectCommentAttachments(comment.replies),
  ]);

/** 첨부(파일형) 보기: 글과 댓글에 붙은 파일을 한곳에 모아 보여준다. */
export function toFileItems(posts: WorkspacePost[]): WorkspaceFileItem[] {
  return posts.flatMap((post) => {
    const own = post.attachments.map((attachment, index) => ({
      id: `${post.id}:post:${index}`,
      postId: post.id,
      attachment,
      ownerId: post.authorId,
      createdAt: post.createdAt,
    }));
    const fromComments = collectCommentAttachments(post.comments).map(({ comment, attachment }, index) => ({
      id: `${post.id}:comment:${comment.id}:${index}`,
      postId: post.id,
      attachment,
      ownerId: comment.authorId,
      createdAt: comment.createdAt,
    }));
    return [...own, ...fromComments].map((entry) => ({
      id: entry.id,
      postId: entry.postId,
      attachment: entry.attachment,
      name: entry.attachment.name,
      ownerLabel: getUserName(entry.ownerId),
      dateLabel: formatDotDate(entry.createdAt),
      sizeLabel: formatFileSize(entry.attachment.size),
      description: post.title,
    }));
  });
}
