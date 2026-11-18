import { sanitizeHtml } from '../../utils/sanitizeHtml';

export const sanitizeCommentHtml = sanitizeHtml;

export function isCommentSubmitKey(event: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
}): boolean {
  return event.key === 'Enter' && !event.shiftKey && !event.isComposing;
}
