import type { F1GridColumn } from '../../../../../shared/components/f1-grid';
import { renderBlankWhenEmpty } from './blankWhenEmptyCell';
import type {
  ItemPartnerPriceRow,
  ItemPartnerPriceTradeType,
} from '../types/itemPartnerPrice.types';

export type ItemPartnerPricePickerKind = 'material' | 'customer';

const tradeOptions = [
  { value: '매입', label: '매입' },
  { value: '매출', label: '매출' },
];
const vatIncludedOptions = [
  { value: 'N', label: '미포함' },
  { value: 'Y', label: '포함' },
];
const statusOptions = [
  { value: 'current', label: '적용 중' },
  { value: 'future', label: '예정' },
  { value: 'past', label: '종료' },
];
const useOptions = [
  { value: 'Y', label: '사용' },
  { value: 'N', label: '미사용' },
];

export function createItemPartnerPriceRow(): ItemPartnerPriceRow {
  return {
    priceId: `new-price-${crypto.randomUUID()}`,
    materialId: null,
    materialCode: '',
    materialName: '',
    customerId: null,
    customerCode: '',
    customerName: '',
    tradeType: '',
    unitPrice: null,
    taxType: 'TAXABLE',
    vatIncludedAt: 'N',
    foreignUnitPrice: null,
    currency: '',
    startDt: '',
    endDt: null,
    moq: null,
    useAt: 'Y',
  };
}

function validateAmount(value: unknown, optional: boolean, label: string): string | true {
  if (value == null || value === '') return optional ? true : `${label}은 필수입니다.`;
  if (typeof value !== 'number' && typeof value !== 'string') return `${label} 숫자를 확인해 주세요.`;
  const raw = String(value);
  if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(raw)) {
    return `${label}은 0 이상, 소수 둘째 자리까지 입력해 주세요.`;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? true : `${label} 숫자를 확인해 주세요.`;
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

export type ItemPartnerPriceCodeOptions = {
  taxTypes?: { value: string; label: string }[];
  currencies?: { value: string; label: string }[];
};

const isNewRow = (row: ItemPartnerPriceRow) => String(row.priceId).startsWith('new-price-');

export function createItemPartnerPriceColumns(
  canEditRow: boolean | ((row: ItemPartnerPriceRow) => boolean),
  onChooseMaster?: (
    kind: ItemPartnerPricePickerKind,
    row: ItemPartnerPriceRow,
    applyPatch: (changes: Partial<ItemPartnerPriceRow>) => void,
  ) => void,
  codeOptions: ItemPartnerPriceCodeOptions = {},
  /** 조회 전용 화면은 false로 두어 헤더의 필수 표시(*)를 숨긴다. */
  markRequired = true,
  /** 거래처 기준 화면처럼 거래처가 고정된 화면은 true로 두어 거래처 컬럼과 품목 코드·명 중복 컬럼을 숨긴다. */
  customerFixed = false,
): F1GridColumn<ItemPartnerPriceRow>[] {
  const allowed = (row: ItemPartnerPriceRow) =>
    typeof canEditRow === 'function' ? canEditRow(row) : canEditRow;
  // 종료된 과거 단가는 수정할 수 없다. 적용 중인 단가는 키(거래구분·품목·거래처·적용 시작일)를 바꿀 수 없다.
  const canEdit = (row: ItemPartnerPriceRow) =>
    allowed(row) && (isNewRow(row) || row.priceStatus !== 'past');
  const canEditKey = (row: ItemPartnerPriceRow) =>
    allowed(row) && (isNewRow(row) || row.priceStatus === 'future');
  return [
    {
      field: 'priceId',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'tradeType',
      headerName: '거래구분',
      type: 'select',
      width: 90,
      align: 'center',
      required: markRequired,
      options: tradeOptions,
      editable: canEditKey,
      form: { group: '거래조건', order: 1 },
      search: { hidden: true },
    },
    {
      field: 'materialId',
      headerName: '품목 선택',
      type: 'code',
      hidden: !markRequired,
      width: 170,
      required: markRequired,
      editable: canEditKey,
      getValue: (row) => row.materialCode
        ? `${row.materialCode} · ${row.materialName}`
        : '',
      onOpenCodePicker: (row, applyPatch) => {
        onChooseMaster?.('material', row, applyPatch);
        return undefined;
      },
      onValueChange: () => { throw new Error('품목 선택 창에서 품목을 선택해 주세요.'); },
      form: { group: '거래조건', order: 2 },
      search: { hidden: true },
    },
    {
      field: 'materialCode',
      headerName: '품목코드',
      width: 120,
      align: 'center',
      hidden: customerFixed,
      editable: false,
      highlightSearch: true,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'materialName',
      headerName: '품목명',
      width: 170,
      hidden: customerFixed,
      editable: false,
      highlightSearch: true,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'materialSpec',
      headerName: '규격',
      width: 130,
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'customerId',
      headerName: '거래처 선택',
      type: 'code',
      hidden: !markRequired || customerFixed,
      width: 190,
      editable: canEditKey,
      getValue: (row) => row.customerCode
        ? `${row.customerCode} · ${row.customerName}`
        : '기본단가(거래처 공통)',
      onOpenCodePicker: (row, applyPatch) => {
        onChooseMaster?.('customer', row, applyPatch);
        return undefined;
      },
      onValueChange: () => { throw new Error('거래처 선택 창에서 거래처를 선택해 주세요.'); },
      form: { group: '거래조건', order: 3 },
      search: { hidden: true },
    },
    {
      field: 'customerCode',
      headerName: '거래처코드',
      width: 120,
      align: 'center',
      hidden: customerFixed,
      editable: false,
      highlightSearch: true,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'customerName',
      headerName: '거래처명',
      width: 170,
      hidden: customerFixed,
      getValue: (row) => row.customerName || (markRequired ? '' : '기본단가(거래처 공통)'),
      editable: false,
      highlightSearch: true,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'unitPrice',
      headerName: '원화단가',
      type: 'decimal',
      width: 130,
      align: 'right',
      decimalPlaces: 2,
      min: 0,
      requiredMark: markRequired,
      editable: canEdit,
      renderCell: renderBlankWhenEmpty,
      // 원화단가와 외화단가 중 하나 이상 입력해야 한다(둘 다 비면 오류).
      validate: (value, row) => {
        const empty = value == null || value === '';
        if (empty && row.foreignUnitPrice == null) return '원화단가 또는 외화단가를 입력해 주세요.';
        return validateAmount(value, true, '원화단가');
      },
      form: { group: '단가조건', order: 1 },
      search: { hidden: true },
    },
    {
      field: 'taxType',
      headerName: '부가세구분',
      type: 'select',
      width: 100,
      align: 'center',
      options: codeOptions.taxTypes ?? [],
      editable: canEdit,
      // 부가세포함은 과세일 때만 가능하므로 과세가 아니면 미포함으로 되돌린다.
      onValueChange: (_row, value) => ({
        taxType: String(value ?? ''),
        ...(value === 'TAXABLE' ? {} : { vatIncludedAt: 'N' as const }),
      }),
      form: { group: '단가조건', order: 2 },
      search: { hidden: true },
    },
    {
      field: 'vatIncludedAt',
      headerName: '부가세포함',
      type: 'select',
      width: 100,
      align: 'center',
      options: vatIncludedOptions,
      editable: canEdit,
      validate: (value, row) => value === 'Y' && row.taxType !== 'TAXABLE'
        ? '부가세 포함은 과세일 때만 선택할 수 있습니다.' : true,
      form: { group: '단가조건', order: 3 },
      search: { hidden: true },
    },
    {
      field: 'foreignUnitPrice',
      headerName: '외화단가',
      type: 'decimal',
      width: 120,
      align: 'right',
      decimalPlaces: 2,
      min: 0,
      requiredMark: markRequired,
      editable: canEdit,
      renderCell: renderBlankWhenEmpty,
      validate: (value) => validateAmount(value, true, '외화단가'),
      form: { group: '단가조건', order: 4 },
      search: { hidden: true },
    },
    {
      field: 'currency',
      headerName: '통화',
      type: 'select',
      width: 90,
      align: 'center',
      options: codeOptions.currencies ?? [],
      editable: canEdit,
      validate: (value, row) => row.foreignUnitPrice != null && !String(value ?? '').trim()
        ? '외화단가를 입력하면 통화를 선택해 주세요.' : true,
      form: { group: '단가조건', order: 5 },
      search: { hidden: true },
    },
    {
      field: 'materialUnit',
      headerName: '단위',
      width: 70,
      align: 'center',
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'startDt',
      headerName: '적용 시작일',
      type: 'date',
      width: 130,
      required: markRequired,
      editable: canEditKey,
      validate: (value) => isValidDate(value) || '적용 시작일을 YYYY-MM-DD 형식으로 입력해 주세요.',
      form: { group: '단가조건', order: 6 },
      search: { hidden: true },
    },
    {
      field: 'endDt',
      headerName: '적용 종료일',
      type: 'date',
      width: 130,
      editable: customerFixed ? false : canEdit,
      validate: (value, row) => {
        if (value == null || value === '') return true;
        if (!isValidDate(value)) return '적용 종료일을 YYYY-MM-DD 형식으로 입력해 주세요.';
        if (!isValidDate(row.startDt) || value < row.startDt) return '종료일은 시작일 이후여야 합니다.';
        return true;
      },
      form: { group: '단가조건', order: 7 },
      search: { hidden: true },
    },
    {
      field: 'moq',
      headerName: '최소주문수량',
      type: 'decimal',
      width: 130,
      align: 'right',
      decimalPlaces: 2,
      min: 0,
      editable: canEdit,
      renderCell: renderBlankWhenEmpty,
      validate: (value) => validateAmount(value, true, '최소주문수량'),
      form: { group: '단가조건', order: 8 },
      search: { hidden: true },
    },
    {
      field: 'useAt',
      headerName: '사용여부',
      type: 'select',
      width: 90,
      align: 'center',
      options: useOptions,
      editable: canEdit,
      form: { group: '단가조건', order: 9 },
      search: { hidden: true },
    },
    {
      field: 'priceStatus',
      headerName: '적용상태',
      type: 'select',
      width: 90,
      align: 'center',
      options: statusOptions,
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
  ];
}

export type { ItemPartnerPriceTradeType };
