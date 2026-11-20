/** 선택한 이미지를 브라우저에서 줄여 JPEG 데이터 URL로 만든다(이미지 칸의 `imageOptions.compress`). */
export const COMPRESS_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const COMPRESS_MAX_INPUT_BYTES = 10 * 1024 * 1024;
const QUALITIES = [0.85, 0.7, 0.55];

export type ImageCompressOptions = {
  /** 긴 변의 최대 픽셀. 이보다 크면 비율을 유지해 줄인다. */
  maxSide: number;
  /** 결과 데이터 URL의 최대 길이(문자 수). 넘으면 품질을 낮춰 다시 만든다. */
  maxLength: number;
};

export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function validateCompressInput(file: { type: string; size: number }): string | null {
  if (!COMPRESS_ACCEPTED_TYPES.includes(file.type)) return 'PNG, JPEG, WEBP 이미지만 선택할 수 있습니다.';
  if (file.size === 0 || file.size > COMPRESS_MAX_INPUT_BYTES) return '이미지 파일은 10MB 이하여야 합니다.';
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

export async function resizeImageToDataUrl(file: File, options: ImageCompressOptions): Promise<string> {
  const invalid = validateCompressInput(file);
  if (invalid) throw new Error(invalid);
  const image = await loadImage(file);
  const size = fitWithin(image.naturalWidth, image.naturalHeight, options.maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('이 브라우저에서는 이미지를 처리할 수 없습니다.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(image, 0, 0, size.width, size.height);
  for (const quality of QUALITIES) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= options.maxLength) return dataUrl;
  }
  throw new Error('이미지 용량이 너무 큽니다. 더 작은 이미지를 선택해 주세요.');
}
