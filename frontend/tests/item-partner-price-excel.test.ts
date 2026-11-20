import { describe, expect, it } from 'vitest';
import {
  createItemPartnerPriceTemplateBlob,
  parseItemPartnerPriceWorkbook,
} from '../src/pages/co/master/item-partner-prices/services/itemPartnerPriceExcel.service';

const headers = [
  '거래구분', '품목코드', '거래처코드', '단가', '부가세구분', '부가세포함', '외화단가', '통화',
  '적용시작일', '적용종료일', '최소주문수량', '사용여부',
];
const taxTypes = [
  { value: 'TAXABLE', label: '과세' },
  { value: 'ZERO_RATED', label: '영세' },
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
    expect(workbook.worksheets[0].getRow(1).values.slice(1)).toEqual([...headers, '발주구분', '기본거래처']);
    expect(workbook.worksheets.some((sheet) => sheet.name === '사용 안내')).toBe(true);
  }, 20000);

  it('preserves leading-zero text codes and original worksheet row numbers', async () => {
    const file = await workbookFile([
      headers,
      ['매입', '000101', '000201', 1250.5, '과세', 'Y', 9.5, 'USD', new Date('2026-10-01'), null, null, 'Y'],
    ]);
    const parsed = await parseItemPartnerPriceWorkbook(file, { taxTypes });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      sourceRowNumber: 2,
      materialCode: '000101',
      customerCode: '000201',
      unitPrice: '1250.5',
      taxType: 'TAXABLE',
      vatIncludedAt: 'Y',
      foreignUnitPrice: '9.5',
      currency: 'USD',
      startDt: '2026-10-01',
      errors: [],
    });
  });

  it('reads the optional order type and default supplier columns and validates them', async () => {
    const orderTypes = [{ value: 'DOMESTIC', label: '내수' }];
    const file = await workbookFile([
      [...headers, '발주구분', '기본거래처'],
      ['매입', '101', '201', 1000, null, null, null, null, '2026-10-01', null, null, 'Y', '내수', 'y'],
      ['매입', '102', null, 1000, null, null, null, null, '2026-10-01', null, null, 'Y', null, 'Y'],
      ['매출', '103', '201', 1000, null, null, null, null, '2026-10-01', null, null, 'Y', '내수', null],
    ]);
    const parsed = await parseItemPartnerPriceWorkbook(file, { orderTypes });
    expect(parsed[0]).toMatchObject({ orderType: 'DOMESTIC', defaultSupplier: 'Y', errors: [] });
    expect(parsed[1].errors.join(' ')).toContain('기본 거래처');
    expect(parsed[2].errors.join(' ')).toContain('발주구분');
  });

  it('treats a blank customer code as a default price and flags foreign price without currency', async () => {
    const file = await workbookFile([
      headers,
      ['매입', '000101', null, 1000, null, null, null, null, '2026-10-01', null, null, null],
      ['매입', '000102', '000201', 1000, null, 'X', 3, null, '2026-10-01', null, null, null],
    ]);
    const parsed = await parseItemPartnerPriceWorkbook(file);
    expect(parsed[0].errors).toEqual([]);
    expect(parsed[0]).toMatchObject({ customerCode: '', taxType: 'TAXABLE', vatIncludedAt: 'N', currency: '' });
    expect(parsed[1].errors.join(' ')).toContain('부가세포함');
    expect(parsed[1].errors.join(' ')).toContain('통화');
  });

  it('allows a foreign-price-only row, rejects rows without any price and VAT included on a non-taxable type', async () => {
    const file = await workbookFile([
      headers,
      ['매입', '101', '201', null, '과세', 'N', 9.5, 'USD', '2026-10-01', null, null, 'Y'],
      ['매입', '102', '201', null, '과세', 'N', null, null, '2026-10-01', null, null, 'Y'],
      ['매입', '103', '201', 100, '면세', 'Y', null, null, '2026-10-01', null, null, 'Y'],
    ]);
    const parsed = await parseItemPartnerPriceWorkbook(file, {
      taxTypes: [{ value: 'TAXABLE', label: '과세' }, { value: 'EXEMPT', label: '면세' }],
    });
    expect(parsed[0].errors).toEqual([]);
    expect(parsed[1].errors.join(' ')).toContain('원화단가 또는 외화단가');
    expect(parsed[2].errors.join(' ')).toContain('과세');
  });

  it('keeps malformed rows visible and rejects invalid date/amount values', async () => {
    const file = await workbookFile([
      headers,
      ['매입', '101', '201', '-2', null, null, null, null, '2026-13-40', null, null, 'X'],
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
