import type { F1EditorExtension } from '../types';

type UploadImage = (file: File) => Promise<string>;

export function createImagePasteExtension(
  uploadImage: UploadImage,
): F1EditorExtension {
  return {
    id: 'f1-image-paste',
    name: 'Image Paste',
    enabled: true,
    onPaste: async (event, editor) => {
      const items = event.clipboardData?.items ?? [];
      const imageItem = Array.from(items).find((item) =>
        item.type.startsWith('image/'),
      );

      if (!imageItem) {
        return false;
      }

      const file = imageItem.getAsFile();
      if (!file) {
        return false;
      }

      try {
        const src = await uploadImage(file);

        editor.insertNode({
          type: 'image',
          attrs: {
            src,
            alt: file.name,
            width: 720,
            align: 'center',
          },
        });

        return true;
      } catch (error) {
        console.error('이미지 업로드 실패:', error);
        return false;
      }
    },
  };
}
