import type { ItemPriceOverviewRow, ItemPriceSideKey } from '../types/itemPriceOverview.types';
import type { ItemPartnerPriceCodeOption, ItemPartnerPriceExcelOptions } from './itemPartnerPriceExcel.service';

const maxFileBytes = 10 * 1024 * 1024;
const maxRows = 1000;
const SIDE_TITLES: Record<ItemPriceSideKey, string> = { purchase: '매입', sales: '매출' };
const SIDE_PARTS = ['원화단가', '부가세구분', '부가세포함', '외화단가', '통화', '적용일'] as const;

export const itemPriceOverviewHeaders = [
  '품목코드',
  '품목명(참고)',
  ...(['purchase', 'sales'] as ItemPriceSideKey[]).flatMap((side) =>
    SIDE_PARTS.map((part) => `${SIDE_TITLES[side]}${part}`)),
];

function labelOf(value: string, options?: ItemPartnerPriceCodeOption[]): string {
  return options?.find((option) => option.value === value)?.label ?? value;
}

function toCode(raw: string, options?: ItemPartnerPriceCodeOption[]): string {
  const value = raw.trim();
  if (!value || !options) return value;
  return options.find((option) => option.label === value)?.value ?? value;
}

function cellText(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' ? value.trim() : '';
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validAmount(value: string): boolean {
  return /^\d{1,13}(?:\.\d{1,2})?$/.test(value);
}

function sideValue(row: ItemPriceOverviewRow, side: ItemPriceSideKey, suffix: string): unknown {
  return (row as unknown as Record<string, unknown>)[`${side}${suffix}`];
}

export async function createItemPriceOverviewTemplateBlob(
  rows: ItemPriceOverviewRow[],
  options: ItemPartnerPriceExcelOptions = {},
): Promise<Blob> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('품목기준단가');
  sheet.addRow(itemPriceOverviewHeaders);
  sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 2 }];
  sheet.columns = itemPriceOverviewHeaders.map((_header, index) => ({
    width: index === 0 ? 18 : index === 1 ? 28 : 15,
    style: index === 0 ? { numFmt: '@' } : undefined,
  }));
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF245A85' } };
  for (const row of rows.filter((item) => item.parentId === null)) {
    const values: (string | number | null)[] = [row.materialCode, row.materialName];
    for (const side of ['purchase', 'sales'] as ItemPriceSideKey[]) {
      const price = sideValue(row, side, 'PriceId');
      const unit = sideValue(row, side, 'UnitPrice') as number | null;
      const foreign = sideValue(row, side, 'ForeignUnitPrice') as number | null;
      values.push(
        unit,
        price == null ? null : labelOf(String(sideValue(row, side, 'TaxType')), options.taxTypes),
        price == null ? null : (sideValue(row, side, 'VatIncludedAt') === 'Y' ? 'Y' : 'N'),
        foreign,
        foreign == null ? null : labelOf(String(sideValue(row, side, 'Currency')), options.currencies),
        price == null ? null : String(sideValue(row, side, 'StartDt')),
      );
    }
    sheet.addRow(values);
  }
  const guide = workbook.addWorksheet('사용 안내');
  [
    ['항목', '입력 안내'],
    ['대상', '조회된 품목의 공통단가(거래처 공통)입니다. 거래처 특별단가는 화면의 트리 또는 단가 목록 탭에서 입력합니다.'],
    ['빈 칸', '비어 있거나 현재 값과 같은 칸은 무시합니다. 단가를 지울 수는 없습니다.'],
    ['변경 방법', '값만 바꾸면 현재 적용 중인 단가를 정정합니다. 적용일을 더 늦은 날짜로 바꾸면 그 날짜부터 새 단가가 적용되고 직전 단가는 전날로 종료됩니다.'],
    ['신규 단가', '단가가 없던 칸에 값을 넣으면 새로 등록합니다. 적용일을 비우면 서버 오늘 날짜로 등록합니다.'],
    ['부가세구분', `${options.taxTypes?.map((option) => `${option.label}(${option.value})`).join(', ') || '공통코드 PURCHASE_TAX_TYPE'} 중 이름 또는 코드`],
    ['부가세포함', 'Y 또는 N'],
    ['외화단가 / 통화', `외화단가를 입력하면 통화가 필요합니다. 통화: ${options.currencies?.map((option) => `${option.label}(${option.value})`).join(', ') || '공통코드 CURRENCY'}`],
    ['품목명', '참고용이며 업로드할 때 읽지 않습니다. 품목코드는 텍스트로 유지해 주세요.'],
  ].forEach((row) => guide.addRow(row));
  guide.getRow(1).font = { bold: true };
  guide.columns = [{ width: 22 }, { width: 100 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function downloadItemPriceOverviewTemplate(
  rows: ItemPriceOverviewRow[],
  options: ItemPartnerPriceExcelOptions = {},
): Promise<void> {
  const blob = await createItemPriceOverviewTemplateBlob(rows, options);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = '품목기준단가_양식.xlsx';
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export type ItemPriceOverviewImportResult = {
  /** 값이 바뀐 품목(부모) 행. 변경 집합 생성에 그대로 쓴다. */
  updatedRows: ItemPriceOverviewRow[];
  errors: string[];
};

/**
 * 양식을 읽어 현재 조회된 품목 행에 적용한 결과를 만든다. 빈 칸·같은 값은 무시한다.
 * 오류가 하나라도 있으면 호출한 쪽이 반영하지 않는다.
 */
export async function parseItemPriceOverviewWorkbook(
  file: File,
  currentRows: ItemPriceOverviewRow[],
  options: ItemPartnerPriceExcelOptions = {},
): Promise<ItemPriceOverviewImportResult> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('.xlsx 파일만 업로드할 수 있습니다.');
  if (file.size > maxFileBytes) throw new Error('엑셀 파일은 10 MiB 이하만 업로드할 수 있습니다.');
  if (!file.size) throw new Error('비어 있는 파일은 업로드할 수 없습니다.');
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('엑셀 첫 번째 시트를 확인할 수 없습니다.');

  const headerCells: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    headerCells[columnNumber - 1] = cellText(cell.value);
  });
  const filled = headerCells.filter(Boolean);
  if (new Set(filled).size !== filled.length) throw new Error('엑셀 헤더에 중복된 항목이 있습니다.');
  if (itemPriceOverviewHeaders.some((header) => !filled.includes(header)) ||
      filled.some((header) => !itemPriceOverviewHeaders.includes(header))) {
    throw new Error(`엑셀 헤더 ${itemPriceOverviewHeaders.length}개를 양식과 동일하게 입력해 주세요.`);
  }
  const column = new Map(headerCells.map((header, index) => [header, index + 1]));
  const byCode = new Map(currentRows.filter((row) => row.parentId === null).map((row) => [row.materialCode, row]));

  const errors: string[] = [];
  const updatedRows: ItemPriceOverviewRow[] = [];
  const seen = new Set<string>();
  let dataRows = 0;
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const read = (header: string) => cellText(sheet.getRow(rowNumber).getCell(column.get(header)!).value);
    const code = read('품목코드');
    if (itemPriceOverviewHeaders.every((header) => !read(header))) continue;
    dataRows += 1;
    if (dataRows > maxRows) throw new Error('엑셀은 한 번에 1,000행까지 반영할 수 있습니다.');
    const original = byCode.get(code);
    if (!code || !original) {
      errors.push(`엑셀 ${rowNumber}행: 조회된 품목에 없는 품목코드입니다(${code || '비어 있음'}).`);
      continue;
    }
    if (seen.has(code)) {
      errors.push(`엑셀 ${rowNumber}행: 품목코드 ${code}가 파일에 중복되었습니다.`);
      continue;
    }
    seen.add(code);
    let edited = { ...original } as unknown as Record<string, unknown>;
    let changed = false;
    for (const side of ['purchase', 'sales'] as ItemPriceSideKey[]) {
      const title = SIDE_TITLES[side];
      const unit = read(`${title}원화단가`);
      const tax = toCode(read(`${title}부가세구분`), options.taxTypes);
      const vat = read(`${title}부가세포함`).toUpperCase();
      const foreign = read(`${title}외화단가`);
      const currency = toCode(read(`${title}통화`), options.currencies);
      const start = read(`${title}적용일`);
      const prefix = `엑셀 ${rowNumber}행 ${title}`;
      if (!unit && !tax && !vat && !foreign && !currency && !start) continue;
      if (!unit && !foreign && !original[`${side}PriceId`]) {
        errors.push(`${prefix}: 단가가 없는 칸은 원화단가 또는 외화단가를 함께 입력해 주세요.`);
        continue;
      }
      if (unit && !validAmount(unit)) errors.push(`${prefix}: 원화단가는 0 이상, 소수 둘째 자리까지 입력해 주세요.`);
      if (foreign && !validAmount(foreign)) errors.push(`${prefix}: 외화단가는 0 이상, 소수 둘째 자리까지 입력해 주세요.`);
      if (vat && vat !== 'Y' && vat !== 'N') errors.push(`${prefix}: 부가세포함은 Y 또는 N이어야 합니다.`);
      const nextTax = tax || (original[`${side}TaxType`] as string);
      const nextVat = vat || (original[`${side}VatIncludedAt`] as string);
      if (nextVat === 'Y' && nextTax !== 'TAXABLE') {
        errors.push(`${prefix}: 부가세 포함은 과세일 때만 선택할 수 있습니다.`);
      }
      if (start && !validDate(start)) errors.push(`${prefix}: 적용일은 YYYY-MM-DD 형식이어야 합니다.`);
      if (tax && options.taxTypes && !options.taxTypes.some((option) => option.value === tax)) {
        errors.push(`${prefix}: 부가세구분이 공통코드에 없습니다(${tax}).`);
      }
      if (currency && options.currencies && !options.currencies.some((option) => option.value === currency)) {
        errors.push(`${prefix}: 통화가 공통코드에 없습니다(${currency}).`);
      }
      const nextForeign = foreign ? Number(foreign) : (original[`${side}ForeignUnitPrice`] as number | null);
      const nextCurrency = currency || (original[`${side}Currency`] as string);
      if (nextForeign !== null && !nextCurrency) errors.push(`${prefix}: 외화단가를 입력하면 통화가 필요합니다.`);
      const next: Record<string, unknown> = {
        [`${side}UnitPrice`]: unit ? Number(unit) : original[`${side}UnitPrice`],
        [`${side}TaxType`]: tax || original[`${side}TaxType`],
        [`${side}VatIncludedAt`]: vat || original[`${side}VatIncludedAt`],
        [`${side}ForeignUnitPrice`]: nextForeign,
        [`${side}Currency`]: nextForeign === null ? '' : nextCurrency,
        [`${side}StartDt`]: start || original[`${side}StartDt`],
      };
      for (const [key, value] of Object.entries(next)) {
        if (edited[key] !== value) changed = true;
      }
      edited = { ...edited, ...next };
    }
    if (changed) updatedRows.push(edited as unknown as ItemPriceOverviewRow);
  }
  if (!dataRows) throw new Error('엑셀에 반영할 품목 행이 없습니다.');
  return { updatedRows, errors };
}
