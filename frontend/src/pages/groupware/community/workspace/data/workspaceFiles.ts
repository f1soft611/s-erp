import type { RichTextEditorImage } from '../../../../../shared/components/rich-text-editor/richTextEditor.types';
import type { WorkspaceAttachment } from '../types/workspace.types';

// 백엔드가 없어 파일 본문을 localStorage에 넣어야 하므로 작은 파일만 보관한다.
export const MAX_INLINE_FILE_BYTES = 1024 * 1024;
// 본문에 넣는 이미지는 서식 정리를 통과해야 하므로 래스터 형식만 허용한다.
export const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;
const EDITOR_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });

export async function fileToAttachment(file: File): Promise<WorkspaceAttachment> {
  const base = { name: file.name, size: file.size, type: file.type };
  if (file.size > MAX_INLINE_FILE_BYTES) return base;
  return { ...base, dataUrl: await readAsDataUrl(file) };
}

/** 서식 에디터의 이미지 삽입용. 백엔드 저장소가 없는 동안 data URL로 본문에 직접 넣는다. */
export async function imageToEditorImage(file: File): Promise<RichTextEditorImage> {
  if (!EDITOR_IMAGE_TYPES.includes(file.type)) throw new Error('지원하지 않는 이미지 형식입니다.');
  if (file.size > MAX_INLINE_IMAGE_BYTES) throw new Error('이미지는 2MB 이하만 넣을 수 있습니다.');
  return { src: await readAsDataUrl(file), alt: file.name, fileSize: file.size, mimeType: file.type };
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;,]*)(;base64)?,(.*)$/s);
  if (!match) return new Blob([]);
  const [, type, base64, payload] = match;
  if (!base64) return new Blob([decodeURIComponent(payload)], { type });
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

/** 보관된 데이터가 있으면 내려받고 true, 없으면(1MB 초과) 아무것도 하지 않고 false를 돌려준다. */
export function downloadAttachmentFile(attachment: WorkspaceAttachment): boolean {
  if (!attachment.dataUrl) return false;
  const url = URL.createObjectURL(dataUrlToBlob(attachment.dataUrl));
  const link = document.createElement('a');
  link.href = url;
  link.download = attachment.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
