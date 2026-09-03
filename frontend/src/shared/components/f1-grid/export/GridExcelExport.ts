import type { F1GridColumn } from '../types/grid.types';
import { getCellDisplayValue } from '../utils/grid.utils';

/** 화면에 보이는 컬럼/행 기준으로 .xlsx 파일을 생성해 즉시 다운로드한다. */
export async function exportGridRowsToExcel<T extends object>(
  columns: F1GridColumn<T>[],
  rows: T[],
  fileName: string,
): Promise<void> {
  const ExcelJS = await import('exceljs');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  worksheet.columns = columns.map((column) => ({
    header: column.headerName,
    key: String(column.field),
  }));
  rows.forEach((row) => {
    const values = columns.map((column) => {
      const rawValue = column.getValue?.(row) ?? row[column.field];
      return getCellDisplayValue(column, rawValue as T[keyof T]);
    });
    worksheet.addRow(values);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${fileName}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
