import {
  itemPartnerPriceHeaders,
  type ItemPartnerPriceImportRow,
} from '../types/itemPartnerPrice.types';

const maxFileBytes = 10 * 1024 * 1024;
const maxRows = 1000;

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function cellValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cellDate(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return typeof value === 'string' ? value.trim() : '';
}

function cellAmount(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' ? value.trim() : '';
}

function validAmount(value: string, optional: boolean): boolean {
  if (!value) return optional;
  return /^[0-9]{1,13}(?:\.[0-9]{1,2})?$/.test(value);
}

function rowErrors(row: ItemPartnerPriceImportRow): string[] {
  const errors: string[] = [];
  if (row.tradeType !== '매입' && row.tradeType !== '매출') {
    errors.push('거래구분은 매입 또는 매출이어야 합니다.');
  }
  if (!row.materialCode || row.materialCode.length > 20) {
    errors.push('품목코드는 텍스트로 입력해 주세요(최대 20자).');
  }
  if (!row.customerCode || row.customerCode.length > 20) {
    errors.push('거래처코드는 텍스트로 입력해 주세요(최대 20자).');
  }
  if (!validAmount(row.unitPrice, false)) {
    errors.push('단가는 0 이상, 소수 둘째 자리까지 입력해 주세요.');
  }
  if (row.currency.length > 10) errors.push('통화는 10자 이하여야 합니다.');
  if (!isValidDate(row.startDt)) {
    errors.push('적용 시작일은 YYYY-MM-DD 형식이어야 합니다.');
  }
  if (row.endDt && (!isValidDate(row.endDt) ||
      isValidDate(row.startDt) && row.endDt < row.startDt)) {
    errors.push('적용 종료일은 시작일 이후의 YYYY-MM-DD여야 합니다.');
  }
  if (!validAmount(row.moq ?? '', true)) {
    errors.push('최소주문수량은 0 이상, 소수 둘째 자리까지 입력해 주세요.');
  }
  if (row.useAt !== 'Y' && row.useAt !== 'N') {
    errors.push('사용여부는 Y 또는 N이어야 합니다.');
  }
  return errors;
}

export function validateItemPartnerPriceImportRows(
  input: ItemPartnerPriceImportRow[],
): ItemPartnerPriceImportRow[] {
  const rows = input.map((row) => ({ ...row, errors: rowErrors(row) }));
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.materialCode && row.customerCode &&
        (row.tradeType === '매입' || row.tradeType === '매출') &&
        isValidDate(row.startDt)) {
      const key = `${row.materialCode}|${row.customerCode}|${row.tradeType}|${row.startDt}`;
      if (seen.has(key)) row.errors.push('파일 내 다른 행과 같은 단가 키가 중복되었습니다.');
      else seen.add(key);
    }
  }
  return rows;
}

export async function createItemPartnerPriceTemplateBlob(): Promise<Blob> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('품목거래처별단가');
  sheet.addRow([...itemPartnerPriceHeaders]);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.columns = [
    { width: 14 }, { width: 18, style: { numFmt: '@' } },
    { width: 18, style: { numFmt: '@' } }, { width: 16 },
    { width: 12 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 12 },
  ];
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF245A85' } };
  const guide = workbook.addWorksheet('사용 안내');
  [
    ['항목', '입력 안내'],
    ['거래구분', '매입 또는 매출'],
    ['품목코드 / 거래처코드', '코드는 텍스트 형식으로 입력하여 앞자리 0을 보존합니다.'],
    ['단가 / 최소주문수량', '0 이상, 정수부 13자리 이하, 소수 둘째 자리까지 입력합니다.'],
    ['적용 시작일 / 적용 종료일', 'YYYY-MM-DD 또는 Excel 날짜 셀로 입력합니다. 종료일은 시작일보다 빠를 수 없습니다.'],
    ['통화', '공란이면 KRW로 처리합니다. 최대 10자입니다.'],
    ['사용여부', 'Y 또는 N. 공란이면 Y로 처리합니다.'],
    ['등록 방식', '검증 오류가 한 행이라도 있으면 전체 행을 추가할 수 없습니다. 기존 단가 수정/업서트는 지원하지 않습니다.'],
  ].forEach((row) => guide.addRow(row));
  guide.getRow(1).font = { bold: true };
  guide.columns = [{ width: 24 }, { width: 92 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function downloadItemPartnerPriceTemplate(): Promise<void> {
  const blob = await createItemPartnerPriceTemplateBlob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = '품목거래처별단가_양식.xlsx';
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export async function parseItemPartnerPriceWorkbook(file: File): Promise<ItemPartnerPriceImportRow[]> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('.xlsx 파일만 업로드할 수 있습니다.');
  }
  if (file.size > maxFileBytes) throw new Error('엑셀 파일은 10 MiB 이하만 업로드할 수 있습니다.');
  if (!file.size) throw new Error('비어 있는 파일은 업로드할 수 없습니다.');

  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('엑셀 첫 번째 시트를 확인할 수 없습니다.');

  const headerCells: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    headerCells[columnNumber - 1] = cellValue(cell.value);
  });
  const headerSet = new Set(headerCells.filter(Boolean));
  if (headerSet.size !== headerCells.filter(Boolean).length) {
    throw new Error('엑셀 헤더에 중복된 항목이 있습니다.');
  }
  if (itemPartnerPriceHeaders.some((header) => !headerSet.has(header)) ||
      headerCells.some((header) => header && !itemPartnerPriceHeaders.includes(
        header as (typeof itemPartnerPriceHeaders)[number],
      ))) {
    throw new Error('엑셀 필수 헤더 9개를 양식과 동일하게 입력해 주세요.');
  }
  const columnIndex = new Map(headerCells.map((header, index) => [header, index + 1]));
  const rows: ItemPartnerPriceImportRow[] = [];
  for (let sourceRowNumber = 2; sourceRowNumber <= sheet.rowCount; sourceRowNumber += 1) {
    const source = sheet.getRow(sourceRowNumber);
    const rawValues = itemPartnerPriceHeaders.map((header) =>
      source.getCell(columnIndex.get(header)!).value,
    );
    if (rawValues.every((value) => value == null || value === '')) continue;
    const [tradeType, materialCode, customerCode, amount, currency, startDate, endDate, moq, useAt] =
      rawValues;
    const row: ItemPartnerPriceImportRow = {
      sourceRowNumber,
      tradeType: cellValue(tradeType),
      materialCode: cellValue(materialCode),
      customerCode: cellValue(customerCode),
      unitPrice: cellAmount(amount),
      currency: cellValue(currency) || 'KRW',
      startDt: cellDate(startDate),
      endDt: cellDate(endDate) || null,
      moq: cellAmount(moq) || null,
      useAt: cellValue(useAt) || 'Y',
      errors: [],
    };
    row.errors = rowErrors(row);
    rows.push(row);
  }
  if (!rows.length) throw new Error('엑셀에 검증할 단가 행이 없습니다.');
  if (rows.length > maxRows) throw new Error('엑셀은 한 번에 1,000행까지 등록할 수 있습니다.');

  return validateItemPartnerPriceImportRows(rows);
}
