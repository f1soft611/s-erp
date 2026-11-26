import { describe, expect, it } from 'vitest';
import {
  buildBodyView,
  countComments,
  hasCommentContent,
  toBodyHtml,
  toFeedComments,
  toFileItems,
  toListItems,
} from '../src/pages/groupware/community/workspace/data/workspaceFeedAdapter';
import {
  MAX_INLINE_FILE_BYTES,
  dataUrlToBlob,
  MAX_INLINE_IMAGE_BYTES,
  fileToAttachment,
  imageToEditorImage,
} from '../src/pages/groupware/community/workspace/data/workspaceFiles';
import { createSampleStore } from '../src/pages/groupware/community/workspace/data/workspaceSamples';
import type { WorkspaceComment } from '../src/pages/groupware/community/workspace/types/workspace.types';

const comment = (overrides: Partial<WorkspaceComment> = {}): WorkspaceComment => ({
  id: 'c1',
  authorId: 'u1',
  body: '<p>안녕하세요</p>',
  createdAt: '2026-11-26T09:00:00',
  replies: [],
  ...overrides,
});

describe('toBodyHtml', () => {
  it('keeps rich text but removes scripts', () => {
    const html = toBodyHtml('<p>본문</p><script>alert(1)</script>');
    expect(html).toContain('<p>본문</p>');
    expect(html).not.toContain('script');
  });

  it('turns legacy plain text into escaped paragraphs with line breaks', () => {
    expect(toBodyHtml('첫 줄\n둘째 줄 <b>')).toBe('<p>첫 줄<br>둘째 줄 &lt;b&gt;</p>');
  });

  it('returns an empty string for an empty body', () => {
    expect(toBodyHtml('   ')).toBe('');
  });
});

describe('buildBodyView', () => {
  const withImage = '<p>사진입니다</p><p><img src="data:image/png;base64,AAAA" alt="현장 사진"></p>';

  it('removes images from the collapsed html and lists them as previews', () => {
    const view = buildBodyView(withImage);
    expect(view.collapsedHtml).not.toContain('<img');
    expect(view.expandedHtml).toContain('<img');
    expect(view.images).toEqual([{ src: 'data:image/png;base64,AAAA', alt: '현장 사진' }]);
    expect(view.hasMore).toBe(true);
  });

  it('offers more only when there is something hidden', () => {
    expect(buildBodyView('<p>짧은 글</p>').hasMore).toBe(false);
    expect(buildBodyView(`<p>${'가'.repeat(300)}</p>`).hasMore).toBe(true);
    expect(buildBodyView('<p>1</p><p>2</p><p>3</p><p>4</p>').hasMore).toBe(true);
  });
});

describe('hasCommentContent', () => {
  it('accepts text, an image or an attachment and rejects blank html', () => {
    expect(hasCommentContent('<p>내용</p>', 0)).toBe(true);
    expect(hasCommentContent('<p><img src="data:image/png;base64,AAAA"></p>', 0)).toBe(true);
    expect(hasCommentContent('<p></p>', 1)).toBe(true);
    expect(hasCommentContent('<p>  </p>', 0)).toBe(false);
    expect(hasCommentContent('', 0)).toBe(false);
  });
});

describe('countComments', () => {
  it('counts replies and ignores deleted comments', () => {
    const tree = [
      comment({ id: 'a', replies: [comment({ id: 'a1' }), comment({ id: 'a2', deleted: true, body: '' })] }),
      comment({ id: 'b', deleted: true, body: '' }),
    ];
    expect(countComments(tree)).toBe(2);
  });
});

describe('toFeedComments', () => {
  const options = { currentUserId: 'u1', canEdit: true, getAttachmentUrl: () => undefined };

  it('maps author name, time, html content and nested replies', () => {
    const [item] = toFeedComments([comment({ replies: [comment({ id: 'c2', authorId: 'u2' })] })], options);
    expect(item).toMatchObject({ id: 'c1', author: '김민수', content: '<p>안녕하세요</p>' });
    expect(item.time).not.toBe('');
    expect(item.replies?.[0]).toMatchObject({ id: 'c2', author: '이서연' });
  });

  it('lets only the author edit, and only with write permission', () => {
    const own = toFeedComments([comment()], options)[0];
    const other = toFeedComments([comment({ authorId: 'u2' })], options)[0];
    const readOnly = toFeedComments([comment()], { ...options, canEdit: false })[0];
    expect(own.isEditable).toBe(true);
    expect(other.isEditable).toBe(false);
    expect(readOnly.isEditable).toBe(false);
  });

  it('marks deleted comments and hides their content', () => {
    const [item] = toFeedComments([comment({ deleted: true, body: '' })], options);
    expect(item.isDeleted).toBe(true);
  });

  it('exposes attachment preview urls for images', () => {
    const attachment = { name: 'a.png', size: 3, type: 'image/png', dataUrl: 'data:image/png;base64,AAAA' };
    const [item] = toFeedComments([comment({ attachments: [attachment] })], {
      ...options,
      getAttachmentUrl: () => 'blob:preview',
    });
    expect(item.attachments?.[0]).toMatchObject({ name: 'a.png', mimeType: 'image/png', previewUrl: 'blob:preview' });
  });
});

describe('fileToAttachment', () => {
  it('stores small files as data urls so they can be previewed and downloaded', async () => {
    const attachment = await fileToAttachment(new File(['hello'], 'a.txt', { type: 'text/plain' }));
    expect(attachment).toMatchObject({ name: 'a.txt', size: 5, type: 'text/plain' });
    expect(attachment.dataUrl?.startsWith('data:')).toBe(true);
  });

  it('keeps only the metadata for files over the inline limit', async () => {
    const big = new File([new Uint8Array(MAX_INLINE_FILE_BYTES + 1)], 'big.bin');
    const attachment = await fileToAttachment(big);
    expect(attachment.dataUrl).toBeUndefined();
    expect(attachment.size).toBe(MAX_INLINE_FILE_BYTES + 1);
  });
});

describe('dataUrlToBlob', () => {
  it('decodes a base64 data url into a blob with its type', async () => {
    const blob = dataUrlToBlob('data:text/plain;base64,aGVsbG8=');
    expect(blob.type).toBe('text/plain');
    expect(blob.size).toBe(5);
  });
});

describe('toListItems', () => {
  const store = createSampleStore();
  const room = store.rooms[0];
  const posts = store.posts.filter((post) => post.roomId === room.id);

  it('maps posts to list rows with the column as status and the comment count as category', () => {
    const items = toListItems(posts, room);
    const contract = items.find((item) => item.id === 'post-2');
    expect(contract).toMatchObject({
      title: '계약서 검토',
      authorLabel: '박지훈',
      dateLabel: '2026.11.26',
      statusLabel: '진행중',
      categoryLabel: '댓글 2',
    });
    const shipped = items.find((item) => item.id === 'post-3');
    expect(shipped?.categoryLabel).toBeUndefined();
  });

  it('omits the status for a room without columns', () => {
    const design = store.rooms[1];
    const [item] = toListItems(store.posts.filter((post) => post.roomId === design.id), design);
    expect(item.statusLabel).toBeUndefined();
  });
});

describe('toFileItems', () => {
  it('lists post and comment attachments with owner, date and size', () => {
    const store = createSampleStore();
    const posts = store.posts.filter((post) => post.roomId === 'room-sales');
    const items = toFileItems(posts);
    const quote = items.find((item) => item.name === 'A사_견적요청.xlsx');
    expect(quote).toMatchObject({ ownerLabel: '이서연', dateLabel: '2026.11.25', description: '견적 문의 - A사' });
    expect(quote?.sizeLabel).toContain('B');
    expect(items.every((item) => typeof item.id === 'string')).toBe(true);
  });
});

describe('imageToEditorImage', () => {
  it('turns a small image into an editor image with a data url and its name as alt', async () => {
    const image = await imageToEditorImage(new File([new Uint8Array([1, 2, 3])], 'site.png', { type: 'image/png' }));
    expect(image.alt).toBe('site.png');
    expect(image.src?.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('rejects unsupported formats and images over the size limit', async () => {
    await expect(imageToEditorImage(new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }))).rejects.toThrow(
      '지원하지 않는 이미지 형식입니다.',
    );
    const big = new File([new Uint8Array(MAX_INLINE_IMAGE_BYTES + 1)], 'big.png', { type: 'image/png' });
    await expect(imageToEditorImage(big)).rejects.toThrow('2MB 이하');
  });
});
