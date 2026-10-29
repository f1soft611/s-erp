import { describe, expect, it } from 'vitest';
import {
  createItemPartnerPriceTemplateBlob,
  parseItemPartnerPriceWorkbook,
} from '../src/pages/co/master/item-partner-prices/services/itemPartnerPriceExcel.service';

const headers = [
  '거래구분', '품목코드', '거래처코드', '단가', '통화',
  '적용시작일', '적용종료일', '최소주문수량', '사용여부',
];

async function workbookFile(rows: unknown[][], name = 'prices.xlsx'): Promise<File> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('단가');
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([new Uint8Array(buffer)], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('item partner price Excel import', () => {
  it('creates a downloadable workbook with the documented header columns', async () => {
    const blob = await createItemPartnerPriceTemplateBlob();
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    expect(workbook.worksheets[0].getRow(1).values.slice(1)).toEqual(headers);
    expect(workbook.worksheets.some((sheet) => sheet.name === '사용 안내')).toBe(true);
  }, 20000);

  it('preserves leading-zero text codes and original worksheet row numbers', async () => {
    const file = await workbookFile([
      headers,
      ['매입', '000101', '000201', 1250.5, 'KRW', new Date('2026-10-01'), null, null, 'Y'],
    ]);
    const parsed = await parseItemPartnerPriceWorkbook(file);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      sourceRowNumber: 2,
      materialCode: '000101',
      customerCode: '000201',
      unitPrice: '1250.5',
      startDt: '2026-10-01',
      errors: [],
    });
  });

  it('keeps malformed rows visible and rejects invalid date/amount values', async () => {
    const file = await workbookFile([
      headers,
      ['매입', '101', '201', '-2', 'KRW', '2026-13-40', null, null, 'X'],
    ]);
    const parsed = await parseItemPartnerPriceWorkbook(file);
    expect(parsed[0].sourceRowNumber).toBe(2);
    expect(parsed[0].errors.join(' ')).toContain('단가');
    expect(parsed[0].errors.join(' ')).toContain('적용 시작일');
    expect(parsed[0].errors.join(' ')).toContain('사용여부');
  });

  it('rejects unsupported extensions and duplicate or missing headers', async () => {
    const csv = new File(['prices'], 'prices.csv');
    await expect(parseItemPartnerPriceWorkbook(csv)).rejects.toThrow('.xlsx');
    const duplicateHeaders = [...headers];
    duplicateHeaders[2] = headers[1];
    await expect(parseItemPartnerPriceWorkbook(
      await workbookFile([duplicateHeaders, []]),
    )).rejects.toThrow();
    await expect(parseItemPartnerPriceWorkbook(
      await workbookFile([headers.slice(1), []]),
    )).rejects.toThrow();
  });
});
