export {
  hasSpreadsheetClipboardContent,
  normalizeClipboardHtmlForEditor,
  normalizeClipboardTextForEditor,
} from '../../../../../shared/components/rich-text-editor/clipboard';
export {
  calculateImageResize as calculateNoticeImageResize,
  calculateImageResizeWidth as calculateNoticeImageResizeWidth,
} from '../../../../../shared/components/rich-text-editor/imageResize';

export function serializeNoticeEditorJson(
  editor: { getJSON: () => unknown } | null | undefined,
): string | undefined {
  return editor ? JSON.stringify(editor.getJSON()) : undefined;
}
