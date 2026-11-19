/** 사원 사진을 목록 응답에 실어도 부담이 없도록 긴 변 320px JPEG로 줄인다(서버 한도는 700KB). */
export const PHOTO_MAX_SIDE = 320;
export const PHOTO_MAX_INPUT_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const SERVER_LIMIT_LENGTH = 700 * 1024;

export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function validatePhotoFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'PNG, JPEG, WEBP 이미지만 사진으로 등록할 수 있습니다.';
  if (file.size > PHOTO_MAX_INPUT_BYTES) return '사진 파일은 10MB 이하여야 합니다.';
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽지 못했습니다.'));
    };
    image.src = url;
  });
}

/** 선택한 이미지를 축소해 JPEG 데이터 URL로 돌려준다. */
export async function resizePhotoToDataUrl(file: File): Promise<string> {
  const invalid = validatePhotoFile(file);
  if (invalid) throw new Error(invalid);
  const image = await loadImage(file);
  const size = fitWithin(image.naturalWidth, image.naturalHeight, PHOTO_MAX_SIDE);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('이 브라우저에서는 사진을 처리할 수 없습니다.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(image, 0, 0, size.width, size.height);
  for (const quality of [0.85, 0.7, 0.55]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= SERVER_LIMIT_LENGTH) return dataUrl;
  }
  throw new Error('사진 용량이 너무 큽니다. 더 작은 이미지를 선택해 주세요.');
}
