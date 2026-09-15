import type { F1EditorExtension, F1EditorTableNode } from '../types';

export function parseExcelTableFromClipboard(
  text: string,
  html?: string,
): F1EditorTableNode | null {
  if (html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');

    if (table) {
      const rows = Array.from(table.querySelectorAll('tr'));
      const matrix = rows.map((row) =>
        Array.from(row.querySelectorAll('td,th')).map(
          (cell) => cell.textContent?.trim() ?? '',
        ),
      );

      if (matrix.length === 0) {
        return null;
      }

      const cols = Math.max(...matrix.map((row) => row.length));
      const normalized = matrix.map((row) =>
        Array.from({ length: cols }, (_, index) => row[index] ?? ''),
      );

      return {
        type: 'table',
        attrs: {
          rows: normalized.length,
          cols,
        },
        content: normalized.map((row) => ({
          type: 'tableRow',
          content: row.map((cell) => ({
            type: 'tableCell',
            content: [{ type: 'text', text: String(cell) }],
          })),
        })),
      };
    }
  }

  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return null;
  }

  const rows = lines.map((line) => line.split(/\t/));
  const cols = Math.max(...rows.map((row) => row.length));

  return {
    type: 'table',
    attrs: {
      rows: rows.length,
      cols,
    },
    content: rows.map((row) => ({
      type: 'tableRow',
      content: Array.from({ length: cols }, (_, index) => ({
        type: 'tableCell',
        content: [{ type: 'text', text: row[index] ?? '' }],
      })),
    })),
  };
}

export const excelPasteExtension: F1EditorExtension = {
  id: 'f1-excel-paste',
  name: 'Excel Paste',
  enabled: true,
  onPaste: (event, editor) => {
    const html = event.clipboardData?.getData('text/html');
    const text = event.clipboardData?.getData('text/plain') ?? '';

    if (!html && !text) {
      return false;
    }

    const isTableLike =
      /<table|^\s*[\w\s]+(\t|\r?\n)/.test(html ?? '') ||
      /(\t|\r?\n)/.test(text);

    if (!isTableLike) {
      return false;
    }

    const nextTable = parseExcelTableFromClipboard(text, html);
    if (!nextTable) {
      return false;
    }

    editor.insertNode(nextTable);
    return true;
  },
};
