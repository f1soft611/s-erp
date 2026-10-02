import { describe, expect, it } from 'vitest';
import {
  hasSpreadsheetClipboardContent,
  normalizeClipboardHtmlForEditor,
  normalizeClipboardTextForEditor,
} from '../src/pages/groupware/community/notice/utils/noticeClipboard';

describe('notice clipboard normalization', () => {
  it('preserves spreadsheet table rows while removing unsafe markup', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<script>alert(1)</script><table><tbody><tr><td>업무</td><td>담당</td></tr></tbody></table>',
    );

    expect(normalized).toContain('<table>');
    expect(normalized).toContain('<tr><td>업무</td><td>담당</td></tr>');
    expect(normalized).not.toContain('<script');
    expect(normalized).not.toContain('alert(1)');
  });

  it('normalizes plain clipboard text line endings and tab-separated cells', () => {
    expect(
      normalizeClipboardTextForEditor('첫째\t둘째\r\n셋째\t넷째'),
    ).toBe('첫째 | 둘째\n셋째 | 넷째');
  });

  it('detects spreadsheet HTML and tabular plain text', () => {
    expect(
      hasSpreadsheetClipboardContent({
        getData: (type) => (type === 'text/html' ? '<table></table>' : ''),
      } as DataTransfer),
    ).toBe(true);
    expect(
      hasSpreadsheetClipboardContent({
        getData: (type) =>
          type === 'text/plain' ? '첫째\t둘째\n셋째\t넷째' : '',
      } as DataTransfer),
    ).toBe(true);
    expect(
      hasSpreadsheetClipboardContent({
        getData: (type) => (type === 'text/plain' ? '일반 문장' : ''),
      } as DataTransfer),
    ).toBe(false);
    expect(hasSpreadsheetClipboardContent(null)).toBe(false);
  });
});