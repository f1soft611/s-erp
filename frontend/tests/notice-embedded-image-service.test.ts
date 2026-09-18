import { describe, expect, it } from 'vitest';
import { normalizeNoticeEmbeddedImage } from '../src/pages/groupware/community/notice/services/noticeBoardService';
import {
  extractNoticeEmbeddedImagePreviews,
  removeNoticeEmbeddedImages,
} from '../src/pages/groupware/community/notice/components/NoticeFeedList';

describe('notice embedded image upload response', () => {
  it('normalizes the upload item for editor image metadata', () => {
    expect(
      normalizeNoticeEmbeddedImage({
        uploadToken: 'token-1',
        fileId: 12,
        fileName: 'pasted.png',
        fileSize: '128',
        mimeType: 'image/png',
        objectKey: 'tenant/1/notice-temp/token-1/pasted.png',
        bucketName: 'document-attachments',
        imageUrl:
          'https://cdn.example.com/document-attachments/tenant/1/pasted.png',
      }),
    ).toEqual({
      uploadToken: 'token-1',
      fileId: 12,
      fileName: 'pasted.png',
      fileSize: 128,
      mimeType: 'image/png',
      objectKey: 'tenant/1/notice-temp/token-1/pasted.png',
      bucketName: 'document-attachments',
      imageUrl:
        'https://cdn.example.com/document-attachments/tenant/1/pasted.png',
    });
  });

  it('extracts collapsed previews and removes images from the collapsed body', () => {
    const html =
      '<p>앞 문장</p><p><img src="https://cdn.test/a.png" alt="안내" /></p><p>뒤 문장</p>';

    expect(extractNoticeEmbeddedImagePreviews(html)).toEqual([
      { src: 'https://cdn.test/a.png', alt: '안내' },
    ]);
    expect(removeNoticeEmbeddedImages(html)).not.toContain('<img');
    expect(removeNoticeEmbeddedImages(html)).toContain('앞 문장');
    expect(removeNoticeEmbeddedImages(html)).toContain('뒤 문장');
  });
});
