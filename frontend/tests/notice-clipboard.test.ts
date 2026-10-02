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

  it('preserves line breaks within spreadsheet cells', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><tbody><tr><td>첫 줄<br>둘째 줄</td></tr></tbody></table>',
    );

    expect(normalized).toContain('<td>첫 줄<br>둘째 줄</td>');
  });

  it('preserves paragraph boundaries within spreadsheet cells', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><tbody><tr><td><p>첫 문단</p><p>둘째 문단</p></td></tr></tbody></table>',
    );

    expect(normalized).toContain('<td><p>첫 문단</p><p>둘째 문단</p></td>');
  });

  it('preserves safe Excel font styles and emphasis markup', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      `<style>.excel-cell { font-family: Arial; font-size: 10pt; }</style><table><tbody><tr><td class="excel-cell"><span style="font-family: 'Malgun Gothic'; font-size: 8pt; color: #ff0000;"><strong>굵게</strong> <em>기울임</em></span></td></tr></tbody></table>`,
    );

    expect(normalized).toContain('font-family:Arial');
    expect(normalized).toContain('font-size:10pt');
    expect(normalized).toContain('<span');
    expect(normalized).toContain('font-family:');
    expect(normalized).toContain('font-size:8pt');
    expect(normalized).toContain('<strong>굵게</strong>');
    expect(normalized).toContain('<em>기울임</em>');
  });

  it('maps Excel column widths onto Tiptap table cell column widths', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><colgroup><col style="width:15pt"><col style="width:30px"><col width="40"></colgroup><tbody><tr><td rowspan="2">A</td><td colspan="2">B</td></tr><tr><td>C</td></tr></tbody></table>',
    );

    expect(normalized).toContain('<td rowspan="2" colwidth="20">A</td>');
    expect(normalized).toContain('<td colspan="2" colwidth="30,40">B</td>');
    expect(normalized).toContain('<td colwidth="30">C</td>');
  });

  it('does not count nested table cells as cells in the outer row', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><tbody><tr><td>외부 A<table><tbody><tr><td>내부 A</td><td>내부 B</td></tr></tbody></table></td><td>외부 B</td></tr><tr><td>다음</td><td>행</td></tr></tbody></table>',
    );
    const document = new DOMParser().parseFromString(normalized, 'text/html');
    const outerTable = document.querySelector('table');
    const outerRows = Array.from(
      outerTable?.querySelectorAll('tr') ?? [],
    ).filter((row) => row.closest('table') === outerTable);
    const firstRowCells = Array.from(
      outerRows[0]?.querySelectorAll('td, th') ?? [],
    ).filter((cell) => cell.parentElement === outerRows[0]);

    expect(outerRows).toHaveLength(2);
    expect(firstRowCells).toHaveLength(2);
    expect(firstRowCells.map((cell) => cell.textContent)).toEqual([
      '외부 A내부 A내부 B',
      '외부 B',
    ]);
  });

  it('normalizes plain clipboard text line endings and tab-separated cells', () => {
    expect(normalizeClipboardTextForEditor('첫째\t둘째\r\n셋째\t넷째')).toBe(
      '첫째 | 둘째\n셋째 | 넷째',
    );
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

  it('preserves empty rows before footer cells covered by a rowspan', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><tbody><tr><td rowspan="3">개선조치 방법</td><td rowspan="3">조치 내용</td></tr><tr></tr><tr></tr><tr><td>이탈일자</td><td>이탈사항</td></tr></tbody></table>',
    );
    const document = new DOMParser().parseFromString(normalized, 'text/html');
    const rows = Array.from(document.querySelectorAll('table tr'));

    expect(rows).toHaveLength(4);
    expect(rows[1].querySelector('td')).toBeNull();
    expect(rows[2].querySelector('td')).toBeNull();
    expect(rows[3].textContent).toContain('이탈일자');
  });
});
