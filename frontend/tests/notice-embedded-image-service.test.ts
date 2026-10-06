import { createElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeNoticeEmbeddedImage } from '../src/pages/groupware/community/notice/services/noticeBoardService';
import {
  AuthenticatedNoticeImage,
  extractNoticeEmbeddedImagePreviews,
  normalizeNoticeEmbeddedImageSources,
  removeNoticeEmbeddedImages,
} from '../src/pages/groupware/community/notice/components/NoticeFeedList';

const { apiGetBlob } = vi.hoisted(() => ({ apiGetBlob: vi.fn() }));

vi.mock('../src/shared/services/apiClient', () => ({ apiGetBlob }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

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

  it('removes stale upload tokens when hydrating a saved notice image', () => {
    const html =
      '<p><img src="blob:old-preview" data-upload-token="old-token" data-object-key="tenant/1/notice-temp/old-token/image.png"></p>';

    const normalized = normalizeNoticeEmbeddedImageSources(html, 42);

    expect(normalized).toContain(
      '/api/v1/groupware/boards/notice/posts/42/embedded-images',
    );
    expect(normalized).not.toContain('data-upload-token');
  });

  it('loads stable notice images through the authenticated blob API', async () => {
    apiGetBlob.mockResolvedValue(new Blob(['image']));
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:notice-preview'),
        revokeObjectURL: vi.fn(),
      }),
    );
    const source =
      '/api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey=tenant%2F1%2Fimage.png';

    render(
      createElement(AuthenticatedNoticeImage, {
        src: source,
        alt: '본문 이미지',
      }),
    );

    const image = screen.getByRole('img', { name: '본문 이미지' });
    await waitFor(() =>
      expect(image).toHaveAttribute('src', 'blob:notice-preview'),
    );
    expect(apiGetBlob).toHaveBeenCalledWith(source);
  });
});
