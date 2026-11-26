import { useCallback, useEffect, useRef } from 'react';
import { dataUrlToBlob } from '../data/workspaceFiles';
import type { WorkspaceAttachment } from '../types/workspace.types';

/**
 * 공통 첨부 목록은 이미지 미리보기에 blob 주소를 요구한다. 보관된 data URL을 blob 주소로 바꿔 주고,
 * 화면이 사라질 때 한꺼번에 해제한다. 이미지가 아니거나 보관된 데이터가 없으면 undefined다.
 */
export function useWorkspaceAttachmentUrls() {
  const cache = useRef(new Map<string, string>());

  useEffect(() => {
    const urls = cache.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  return useCallback((attachment: WorkspaceAttachment): string | undefined => {
    if (!attachment.dataUrl || !attachment.type.startsWith('image/')) return undefined;
    const cached = cache.current.get(attachment.dataUrl);
    if (cached) return cached;
    const url = URL.createObjectURL(dataUrlToBlob(attachment.dataUrl));
    cache.current.set(attachment.dataUrl, url);
    return url;
  }, []);
}
