import type {
  F1EditorExtension,
  F1EditorNode,
  F1EditorTableNode,
} from '../types';

export function createTableExtension(): F1EditorExtension {
  return {
    id: 'f1-table',
    name: 'Table',
    enabled: true,
    commands: {
      insertTable: (rows: number, cols: number, editor) => {
        const table: F1EditorTableNode = {
          type: 'table',
          attrs: {
            rows,
            cols,
          },
          content: Array.from({ length: rows }, (_, rowIndex) => ({
            type: 'tableRow',
            content: Array.from({ length: cols }, (_, colIndex) => ({
              type: 'tableCell',
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: 'text',
                  text: rowIndex === 0 && colIndex === 0 ? '제목' : '',
                },
              ],
            })),
          })),
        };

        editor.insertNode(table as F1EditorNode);
      },
    },
  };
}
