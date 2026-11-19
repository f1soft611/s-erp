import type { NoticeCommentItem } from '../types/community.types';
import { resolveApiBaseUrl } from '../../../../../shared/services/authService';

export function mergeCommentTrees(
  current: NoticeCommentItem[],
  incoming: NoticeCommentItem[],
  incomingFirst = true,
): NoticeCommentItem[] {
  const primary = incomingFirst ? incoming : current;
  const secondary = incomingFirst ? current : incoming;
  const result = primary.map((comment) => ({
    ...comment,
    replies: mergeCommentTrees([], comment.replies ?? []),
  }));
  const byId = new Map(result.map((comment) => [String(comment.id), comment]));

  secondary.forEach((comment) => {
    const existing = byId.get(String(comment.id));
    if (!existing) {
      const copy = {
        ...comment,
        replies: mergeCommentTrees([], comment.replies ?? []),
      };
      byId.set(String(copy.id), copy);
      result.push(copy);
      return;
    }

    existing.replies = mergeCommentTrees(
      existing.replies ?? [],
      comment.replies ?? [],
    );
  });

  return result;
}

export type NoticeEmbeddedImagePreview = {
  src: string;
  alt: string;
};

export function extractNoticeEmbeddedImagePreviews(
  html: string,
): NoticeEmbeddedImagePreview[] {
  if (typeof DOMParser === 'undefined') {
    return Array.from(
      html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
    ).map((match) => ({ src: match[1], alt: '본문 이미지' }));
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(document.querySelectorAll('img'))
    .map((image) => ({
      src: image.getAttribute('src') ?? '',
      alt: image.getAttribute('alt') || '본문 이미지',
    }))
    .filter((image) => image.src);
}

export function normalizeNoticeEmbeddedImageSources(
  html: string,
  postId: number,
): string {
  if (!html || typeof DOMParser === 'undefined') {
    return html;
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('img').forEach((image) => {
    image.removeAttribute('data-upload-token');
    image.removeAttribute('data-upload-state');
    const objectKey = image.getAttribute('data-object-key');
    if (!objectKey) {
      return;
    }
    image.setAttribute(
      'src',
      `${resolveApiBaseUrl()}/api/v1/groupware/boards/notice/posts/${postId}/embedded-images?objectKey=${encodeURIComponent(objectKey)}`,
    );
  });
  return document.body.innerHTML;
}

export function removeNoticeEmbeddedImages(html: string): string {
  if (typeof DOMParser === 'undefined') {
    return html.replace(/<img\b[^>]*>/gi, '');
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('img').forEach((image) => image.remove());
  return document.body.innerHTML;
}
