import {
  itemPartnerPriceHeaders,
  type ItemPartnerPriceImportRow,
} from '../types/itemPartnerPrice.types';

export type ItemPartnerPriceCodeOption = { value: string; label: string };
export type ItemPartnerPriceExcelOptions = {
  /** 화면의 거래구분. 지정하면 양식 열(매출은 발주구분·기본거래처 없음)과 행 거래구분 검증을 그 구분에 맞춘다. */
  tradeType?: '매입' | '매출';
  taxTypes?: ItemPartnerPriceCodeOption[];
  currencies?: ItemPartnerPriceCodeOption[];
  orderTypes?: ItemPartnerPriceCodeOption[];
};

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
  // 소수 자릿수는 정책(계약)이 정하며 서버 검증이 확인한다. 여기서는 0 이상의 숫자 형식만 확인한다.
  return /^[0-9]{1,13}(?:\.[0-9]+)?$/.test(value);
}

/** 엑셀에는 공통코드 이름(예: 과세) 또는 코드를 쓸 수 있다. 이름이면 코드로 바꾼다. */
function toCode(raw: string, options?: ItemPartnerPriceCodeOption[]): string {
  const value = raw.trim();
  if (!value || !options) return value;
  const byLabel = options.find((option) => option.label === value);
  return byLabel ? byLabel.value : value;
}

function headersFor(tradeType?: '매입' | '매출'): string[] {
  return tradeType === '매출' ? itemPartnerPriceHeaders.slice(0, 12) : [...itemPartnerPriceHeaders];
}

function rowErrors(row: ItemPartnerPriceImportRow, screenTradeType?: '매입' | '매출'): string[] {
  const errors: string[] = [];
  if (row.tradeType !== '매입' && row.tradeType !== '매출') {
    errors.push('거래구분은 매입 또는 매출이어야 합니다.');
  } else if (screenTradeType && row.tradeType !== screenTradeType) {
    errors.push(`이 화면은 ${screenTradeType} 단가만 등록할 수 있습니다.`);
  }
  if (!row.materialCode || row.materialCode.length > 20) {
    errors.push('품목코드는 텍스트로 입력해 주세요(최대 20자).');
  }
  if (!row.customerCode || row.customerCode.length > 20) {
    errors.push('거래처코드는 텍스트로 입력해 주세요(최대 20자). 단가는 거래처별로 등록합니다.');
  }
  if (!row.unitPrice && !row.foreignUnitPrice) {
    errors.push('원화단가 또는 외화단가를 입력해 주세요.');
  } else if (row.unitPrice && !validAmount(row.unitPrice, false)) {
    errors.push('원화단가는 0 이상의 숫자로 입력해 주세요.');
  }
  if (row.vatIncludedAt && row.vatIncludedAt !== 'Y' && row.vatIncludedAt !== 'N') {
    errors.push('부가세포함은 Y 또는 N이어야 합니다.');
  } else if (row.vatIncludedAt === 'Y' && row.taxType && row.taxType !== 'TAXABLE') {
    errors.push('부가세 포함은 과세일 때만 선택할 수 있습니다.');
  }
  if (!validAmount(row.foreignUnitPrice, true)) {
    errors.push('외화단가는 0 이상의 숫자로 입력해 주세요.');
  } else if (row.foreignUnitPrice && !row.currency) {
    errors.push('외화단가를 입력하면 통화가 필요합니다.');
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
    errors.push('최소주문수량은 0 이상의 숫자로 입력해 주세요.');
  }
  if (row.useAt !== 'Y' && row.useAt !== 'N') {
    errors.push('사용여부는 Y 또는 N이어야 합니다.');
  }
  if (row.orderType.length > 50) errors.push('발주구분이 올바르지 않습니다.');
  else if (row.orderType && row.tradeType !== '매입') errors.push('발주구분은 매입 단가에만 입력할 수 있습니다.');
  if (row.defaultSupplier && row.defaultSupplier !== 'Y' && row.defaultSupplier !== 'N') {
    errors.push('기본거래처는 Y 또는 N이어야 합니다.');
  } else if (row.defaultSupplier === 'Y' && (row.tradeType !== '매입' || !row.customerCode)) {
    errors.push('기본 거래처는 거래처가 있는 매입 단가에만 지정할 수 있습니다.');
  }
  return errors;
}

export function validateItemPartnerPriceImportRows(
  input: ItemPartnerPriceImportRow[],
  tradeType?: '매입' | '매출',
): ItemPartnerPriceImportRow[] {
  const rows = input.map((row) => ({ ...row, errors: rowErrors(row, tradeType) }));
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.materialCode &&
        (row.tradeType === '매입' || row.tradeType === '매출') &&
        isValidDate(row.startDt)) {
      const key = `${row.materialCode}|${row.customerCode}|${row.tradeType}|${row.startDt}`;
      if (seen.has(key)) row.errors.push('파일 내 다른 행과 같은 단가 키가 중복되었습니다.');
      else seen.add(key);
    }
  }
  return rows;
}

export async function createItemPartnerPriceTemplateBlob(
  options: ItemPartnerPriceExcelOptions = {},
): Promise<Blob> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('품목거래처별단가');
  sheet.addRow(headersFor(options.tradeType));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.columns = [
    { width: 14 }, { width: 18, style: { numFmt: '@' } },
    { width: 18, style: { numFmt: '@' } }, { width: 16 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 10 },
    { width: 16 }, { width: 16 }, { width: 18 }, { width: 12 },
    ...(options.tradeType === '매출' ? [] : [{ width: 14 }, { width: 14 }]),
  ];
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF245A85' } };
  const guide = workbook.addWorksheet('사용 안내');
  [
    ['항목', '입력 안내'],
    ['거래구분', '매입 또는 매출'],
    ['품목코드 / 거래처코드', '코드는 텍스트 형식으로 입력하여 앞자리 0을 보존합니다.'],
    ['거래처코드 필수', '단가는 항상 거래처에 붙습니다. 품목마다 단가를 등록할 거래처코드를 입력하세요.'],
    ['단가', '원화단가입니다. 0 이상, 정수부 13자리 이하, 소수 둘째 자리까지 입력합니다.'],
    ['부가세구분', `${labelList(options.taxTypes) || '공통코드 PURCHASE_TAX_TYPE'} 중 이름 또는 코드. 공란이면 과세(TAXABLE)입니다.`],
    ['부가세포함', 'Y 또는 N. 공란이면 N입니다.'],
    ['외화단가 / 통화', `외화단가를 입력하면 통화가 필요합니다. 통화: ${labelList(options.currencies) || '공통코드 CURRENCY'}. 환율은 단가에서 계산하지 않습니다.`],
    ['최소주문수량', '0 이상, 정수부 13자리 이하, 소수 둘째 자리까지 입력합니다.'],
    ['적용 시작일 / 적용 종료일', 'YYYY-MM-DD 또는 Excel 날짜 셀로 입력합니다. 종료일은 시작일보다 빠를 수 없습니다.'],
    ['사용여부', 'Y 또는 N. 공란이면 Y로 처리합니다.'],
    ['등록 방식', '검증 오류가 한 행이라도 있으면 전체 행을 추가할 수 없습니다. 기존 단가 수정/업서트는 지원하지 않습니다.'],
    ['적용 기간', '같은 품목·거래처·거래구분에서 기간이 겹치면 저장되지 않습니다. 종료일이 없는 직전 단가는 새 적용시작일 전날로 자동 종료됩니다.'],
  ].forEach((row) => guide.addRow(row));
  if (options.tradeType !== '매출') {
    [
      ['발주구분', `매입 단가에만 입력합니다. ${labelList(options.orderTypes) || '공통코드 PURCHASE_ORDER_TYPE'} 중 이름 또는 코드. 공란이면 비워 둡니다.`],
      ['기본거래처', 'Y이면 그 품목의 매입 기본 거래처로 지정합니다(품목당 한 거래처). 한 품목의 거래처가 2곳 이상이면 기본 거래처가 반드시 있어야 하며, 공란 또는 N이면 기본 거래처를 바꾸지 않습니다.'],
    ].forEach((row) => guide.addRow(row));
  }
  guide.getRow(1).font = { bold: true };
  guide.columns = [{ width: 24 }, { width: 92 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function labelList(options?: ItemPartnerPriceCodeOption[]): string {
  return options?.map((option) => `${option.label}(${option.value})`).join(', ') ?? '';
}

export async function downloadItemPartnerPriceTemplate(
  options: ItemPartnerPriceExcelOptions = {},
): Promise<void> {
  const blob = await createItemPartnerPriceTemplateBlob(options);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = '품목거래처별단가_양식.xlsx';
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export async function parseItemPartnerPriceWorkbook(
  file: File,
  options: ItemPartnerPriceExcelOptions = {},
): Promise<ItemPartnerPriceImportRow[]> {
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
  // 발주구분·기본거래처 열은 선택이다(이전 12열 양식도 읽는다).
  const requiredHeaders = itemPartnerPriceHeaders.slice(0, 12);
  if (requiredHeaders.some((header) => !headerSet.has(header)) ||
      headerCells.some((header) => header && !itemPartnerPriceHeaders.includes(
        header as (typeof itemPartnerPriceHeaders)[number],
      ))) {
    throw new Error(`엑셀 헤더 ${requiredHeaders.length}개 이상을 양식과 동일하게 입력해 주세요.`);
  }
  const columnIndex = new Map(headerCells.map((header, index) => [header, index + 1]));
  const rows: ItemPartnerPriceImportRow[] = [];
  for (let sourceRowNumber = 2; sourceRowNumber <= sheet.rowCount; sourceRowNumber += 1) {
    const source = sheet.getRow(sourceRowNumber);
    const rawValues = itemPartnerPriceHeaders.map((header) =>
      columnIndex.has(header) ? source.getCell(columnIndex.get(header)!).value : null,
    );
    if (rawValues.every((value) => value == null || value === '')) continue;
    const [
      tradeType, materialCode, customerCode, amount, taxType, vatIncludedAt, foreignAmount,
      currency, startDate, endDate, moq, useAt, orderType, defaultSupplier,
    ] = rawValues;
    const row: ItemPartnerPriceImportRow = {
      sourceRowNumber,
      tradeType: cellValue(tradeType),
      materialCode: cellValue(materialCode),
      customerCode: cellValue(customerCode),
      unitPrice: cellAmount(amount),
      taxType: toCode(cellValue(taxType), options.taxTypes) || 'TAXABLE',
      vatIncludedAt: cellValue(vatIncludedAt) || 'N',
      foreignUnitPrice: cellAmount(foreignAmount),
      currency: toCode(cellValue(currency), options.currencies),
      startDt: cellDate(startDate),
      endDt: cellDate(endDate) || null,
      moq: cellAmount(moq) || null,
      useAt: cellValue(useAt) || 'Y',
      orderType: toCode(cellValue(orderType), options.orderTypes),
      defaultSupplier: cellValue(defaultSupplier).toUpperCase(),
      errors: [],
    };
    row.errors = rowErrors(row, options.tradeType);
    rows.push(row);
  }
  if (!rows.length) throw new Error('엑셀에 검증할 단가 행이 없습니다.');
  if (rows.length > maxRows) throw new Error('엑셀은 한 번에 1,000행까지 등록할 수 있습니다.');

  return validateItemPartnerPriceImportRows(rows, options.tradeType);
}
