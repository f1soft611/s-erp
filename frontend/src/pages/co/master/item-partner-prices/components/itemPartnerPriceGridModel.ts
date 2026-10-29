import type { F1GridColumn } from '../../../../../shared/components/f1-grid';
import type {
  ItemPartnerPriceRow,
  ItemPartnerPriceTradeType,
} from '../types/itemPartnerPrice.types';

export type ItemPartnerPricePickerKind = 'material' | 'customer';

const tradeOptions = [
  { value: '매입', label: '매입' },
  { value: '매출', label: '매출' },
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
    currency: 'KRW',
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

export function createItemPartnerPriceColumns(
  canEdit: boolean | ((row: ItemPartnerPriceRow) => boolean),
  onChooseMaster?: (
    kind: ItemPartnerPricePickerKind,
    row: ItemPartnerPriceRow,
    applyPatch: (changes: Partial<ItemPartnerPriceRow>) => void,
  ) => void,
): F1GridColumn<ItemPartnerPriceRow>[] {
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
      required: true,
      options: tradeOptions,
      editable: canEdit,
      form: { group: '거래조건', order: 1 },
      search: { label: '거래구분', order: 1 },
    },
    {
      field: 'materialId',
      headerName: '품목 선택',
      type: 'code',
      width: 170,
      required: true,
      editable: canEdit,
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
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'materialName',
      headerName: '품목명',
      width: 170,
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'customerId',
      headerName: '거래처 선택',
      type: 'code',
      width: 190,
      required: true,
      editable: canEdit,
      getValue: (row) => row.customerCode
        ? `${row.customerCode} · ${row.customerName}`
        : '',
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
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'customerName',
      headerName: '거래처명',
      width: 170,
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'unitPrice',
      headerName: '단가',
      type: 'decimal',
      width: 130,
      align: 'right',
      decimalPlaces: 2,
      min: 0,
      required: true,
      editable: canEdit,
      validate: (value) => validateAmount(value, false, '단가'),
      form: { group: '단가조건', order: 1 },
      search: { hidden: true },
    },
    {
      field: 'currency',
      headerName: '통화',
      width: 85,
      align: 'center',
      required: true,
      editable: canEdit,
      validate: (value) => typeof value === 'string' && value.trim().length <= 10
        ? true : '통화는 10자 이하여야 합니다.',
      form: { group: '단가조건', order: 2 },
      search: { hidden: true },
    },
    {
      field: 'startDt',
      headerName: '적용 시작일',
      type: 'date',
      width: 130,
      required: true,
      editable: canEdit,
      validate: (value) => isValidDate(value) || '적용 시작일을 YYYY-MM-DD 형식으로 입력해 주세요.',
      form: { group: '단가조건', order: 3 },
      search: { label: '적용 기준일', order: 3 },
    },
    {
      field: 'endDt',
      headerName: '적용 종료일',
      type: 'date',
      width: 130,
      editable: canEdit,
      validate: (value, row) => {
        if (value == null || value === '') return true;
        if (!isValidDate(value)) return '적용 종료일을 YYYY-MM-DD 형식으로 입력해 주세요.';
        if (!isValidDate(row.startDt) || value < row.startDt) return '종료일은 시작일 이후여야 합니다.';
        return true;
      },
      form: { group: '단가조건', order: 4 },
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
      validate: (value) => validateAmount(value, true, '최소주문수량'),
      form: { group: '단가조건', order: 5 },
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
      form: { group: '단가조건', order: 6 },
      search: { label: '사용여부', order: 4 },
    },
  ];
}

export type { ItemPartnerPriceTradeType };
