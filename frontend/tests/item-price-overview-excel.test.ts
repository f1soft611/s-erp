import { describe, expect, it } from 'vitest';
import {
  createItemPriceOverviewTemplateBlob,
  itemPriceOverviewHeaders,
  parseItemPriceOverviewWorkbook,
} from '../src/pages/co/master/item-partner-prices/services/itemPriceOverviewExcel.service';
import { normalizeItemPriceOverviewRow } from '../src/pages/co/master/item-partner-prices/services/itemPriceOverview.service';
import type { ItemPriceOverviewRow } from '../src/pages/co/master/item-partner-prices/types/itemPriceOverview.types';

const options = {
  taxTypes: [{ value: 'TAXABLE', label: '과세' }, { value: 'ZERO_RATED', label: '영세' }],
  currencies: [{ value: 'USD', label: '미국 달러' }],
};

const purchase = {
  priceId: 10, unitPrice: '1000', taxType: 'TAXABLE', vatIncludedAt: 'N', foreignUnitPrice: null,
  currency: null, moq: null, startDt: '2026-11-01', endDt: null, priceStatus: 'current',
};

function item(id: number, code: string, withPrice: boolean): ItemPriceOverviewRow {
  return normalizeItemPriceOverviewRow({
    rowId: `item-${id}`, parentId: null, materialId: id, materialCode: code, materialName: `품목${code}`,
    specialCount: 0, purchase: withPrice ? purchase : null, sales: null,
  });
}

const rows = [item(1, '000101', true), item(2, '000102', false)];

async function file(data: unknown[][], name = 'prices.xlsx'): Promise<File> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('단가');
  data.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([new Uint8Array(buffer)], name);
}

const blank = (n: number) => Array.from({ length: n }, () => null);
function line(code: string, overrides: Record<number, unknown> = {}): unknown[] {
  const values: unknown[] = [code, null, ...blank(itemPriceOverviewHeaders.length - 2)];
  Object.entries(overrides).forEach(([index, value]) => { values[Number(index)] = value; });
  return values;
}
// 열 위치: 0 코드, 1 품명, 2~7 매입(단가,세구분,포함,외화,통화,적용일), 8~13 매출

describe('item price overview Excel', () => {
  it('builds a template with every loaded item and its current default price', async () => {
    const blob = await createItemPriceOverviewTemplateBlob(rows, options);
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    const sheet = workbook.worksheets[0];
    expect(sheet.getRow(1).values).toEqual([undefined, ...itemPriceOverviewHeaders]);
    expect(sheet.rowCount).toBe(3);
    expect(sheet.getRow(2).getCell(1).value).toBe('000101');
    expect(sheet.getRow(2).getCell(3).value).toBe(1000);
    expect(sheet.getRow(2).getCell(4).value).toBe('과세');
    expect(sheet.getRow(3).getCell(3).value).toBeNull();
    expect(workbook.worksheets.some((s) => s.name === '사용 안내')).toBe(true);
  }, 20000);

  it('ignores blank and unchanged cells and keeps only changed items', async () => {
    const parsed = await parseItemPriceOverviewWorkbook(await file([
      itemPriceOverviewHeaders,
      line('000101', { 2: 1000, 3: '과세', 4: 'N', 7: '2026-11-01' }),
      line('000102'),
    ]), rows, options);
    expect(parsed.errors).toEqual([]);
    expect(parsed.updatedRows).toEqual([]);
  });

  it('applies changed values, maps tax and currency names to codes, and sets new prices', async () => {
    const parsed = await parseItemPriceOverviewWorkbook(await file([
      itemPriceOverviewHeaders,
      line('000101', { 2: 1200, 3: '영세', 4: 'N', 5: 9.5, 6: '미국 달러', 7: '2026-12-01' }),
      line('000102', { 8: 700 }),
    ]), rows, options);
    expect(parsed.errors).toEqual([]);
    expect(parsed.updatedRows).toHaveLength(2);
    expect(parsed.updatedRows[0]).toMatchObject({
      materialCode: '000101', purchaseUnitPrice: 1200, purchaseTaxType: 'ZERO_RATED', purchaseVatIncludedAt: 'N',
      purchaseForeignUnitPrice: 9.5, purchaseCurrency: 'USD', purchaseStartDt: '2026-12-01',
    });
    expect(parsed.updatedRows[1]).toMatchObject({ materialCode: '000102', salesUnitPrice: 700, salesStartDt: '' });
  });

  it('accepts a foreign-price-only new side and blocks VAT included for a non-taxable type', async () => {
    const parsed = await parseItemPriceOverviewWorkbook(await file([
      itemPriceOverviewHeaders,
      line('000102', { 11: 8.5, 12: 'USD' }),
      line('000101', { 3: '영세', 4: 'Y' }),
    ]), rows, options);
    expect(parsed.updatedRows.find((r) => r.materialCode === '000102')).toMatchObject({
      materialCode: '000102', salesUnitPrice: null, salesForeignUnitPrice: 8.5, salesCurrency: 'USD',
    });
    expect(parsed.errors.join('\n')).toContain('엑셀 3행 매입: 부가세 포함은 과세');
  });

  it('reports unknown items, duplicates and invalid values with Excel row numbers', async () => {
    const parsed = await parseItemPriceOverviewWorkbook(await file([
      itemPriceOverviewHeaders,
      line('999999', { 2: 100 }),
      line('000101', { 2: -5, 4: 'X', 7: '2026-13-40' }),
      line('000101', { 2: 100 }),
      line('000102', { 3: '과세' }),
    ]), rows, options);
    const text = parsed.errors.join('\n');
    expect(text).toContain('엑셀 2행');
    expect(text).toContain('품목코드');
    expect(text).toContain('엑셀 3행 매입: 원화단가');
    expect(text).toContain('부가세포함');
    expect(text).toContain('적용일');
    expect(text).toContain('엑셀 4행');
    expect(text).toContain('중복');
    expect(text).toContain('엑셀 5행 매입: 단가가 없는 칸');
  });

  it('rejects other extensions, wrong headers and empty files', async () => {
    await expect(parseItemPriceOverviewWorkbook(new File(['x'], 'a.csv'), rows)).rejects.toThrow('.xlsx');
    await expect(parseItemPriceOverviewWorkbook(await file([['품목코드'], ['1']]), rows)).rejects.toThrow('헤더');
    await expect(parseItemPriceOverviewWorkbook(await file([itemPriceOverviewHeaders]), rows)).rejects.toThrow('품목 행');
  });
});
