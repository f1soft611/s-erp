import { describe, expect, it } from 'vitest';
import {
  hasSpreadsheetClipboardContent,
  normalizeClipboardHtmlForEditor,
  normalizeClipboardTextForEditor,
} from '../src/pages/groupware/community/notice/utils/noticeClipboard';

describe('notice clipboard normalization', () => {
  it('normalizes embedded cell styles without mutating the global document head', () => {
    const initialHeadStyles = Array.from(
      document.head.querySelectorAll('style'),
    );
    const headObserver = new MutationObserver(() => undefined);
    headObserver.observe(document.head, { childList: true });

    try {
      const normalized = normalizeClipboardHtmlForEditor(
        '<style>td { color: red; }</style><table><tbody><tr><td>업무</td></tr></tbody></table>',
      );
      const headMutations = headObserver
        .takeRecords()
        .flatMap((record) => [
          ...Array.from(record.addedNodes),
          ...Array.from(record.removedNodes),
        ])
        .filter((node) => node instanceof HTMLStyleElement);

      expect(normalized).toContain('<td style="color:red">업무</td>');
      expect(Array.from(document.head.querySelectorAll('style'))).toEqual(
        initialHeadStyles,
      );
      expect(headMutations).toHaveLength(0);
    } finally {
      headObserver.disconnect();
    }
  });

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