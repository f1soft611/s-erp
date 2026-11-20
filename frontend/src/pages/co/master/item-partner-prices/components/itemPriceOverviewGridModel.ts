import type { F1GridColumn } from '../../../../../shared/components/f1-grid';
import { renderBlankWhenEmpty } from './blankWhenEmptyCell';
import type { ItemPartnerPriceCodeOptions } from './itemPartnerPriceGridModel';
import type { ItemPriceOverviewRow, ItemPriceSideKey } from '../types/itemPriceOverview.types';

// 기준정보(co) 모듈에는 소수점 정책(GRID_DECIMAL_*)이 연결되어 있지 않아 단가 화면은 이전처럼 2자리로 고정한다.
export const PRICE_DECIMAL_PLACES = 2;

export const NEW_CHILD_PREFIX = 'new-child-';

const vatIncludedOptions = [
  { value: 'N', label: '미포함' },
  { value: 'Y', label: '포함' },
];

export const isNewChildRow = (row: ItemPriceOverviewRow) => row.rowId.startsWith(NEW_CHILD_PREFIX);

/** 특별단가 추가용 빈 자식 행. 품목 정보는 부모 행에서 가져온다. 거래처는 선택 창에서 고른다. */
export function createItemPriceChildRow(parent: ItemPriceOverviewRow): ItemPriceOverviewRow {
  const empty = (side: ItemPriceSideKey) => ({
    [`${side}PriceId`]: null,
    [`${side}UnitPrice`]: null,
    [`${side}TaxType`]: 'TAXABLE',
    [`${side}VatIncludedAt`]: 'N',
    [`${side}ForeignUnitPrice`]: null,
    [`${side}Currency`]: '',
    [`${side}Moq`]: null,
    [`${side}StartDt`]: '',
    [`${side}EndDt`]: null,
    [`${side}Status`]: '',
    [`${side}OrderType`]: '',
    [`${side}OrderTypeName`]: '',
    [`${side}DefaultSupplier`]: false,
  });
  return {
    rowId: `${NEW_CHILD_PREFIX}${crypto.randomUUID()}`,
    parentId: parent.rowId,
    materialId: parent.materialId,
    materialCode: parent.materialCode,
    materialName: parent.materialName,
    materialSpec: '',
    materialUnit: '',
    customerId: null,
    customerCode: '',
    customerName: '',
    displayName: '(거래처를 선택하세요)',
    specialCount: 0,
    specialLabel: '',
    defaultSupplierId: null,
    defaultSupplierName: '',
    ...empty('purchase'),
    ...empty('sales'),
  } as ItemPriceOverviewRow;
}

const hasPurchasePrice = (row: ItemPriceOverviewRow) =>
  row.purchaseUnitPrice != null || row.purchaseForeignUnitPrice != null;

function validateAmount(value: unknown, label: string): string | true {
  if (value == null || value === '') return true;
  if (typeof value !== 'number' && typeof value !== 'string') return `${label} 숫자를 확인해 주세요.`;
  return /^\d{1,13}(?:\.\d{1,2})?$/.test(String(value))
    ? true : `${label}은 0 이상, 소수 둘째 자리까지 입력해 주세요.`;
}

type ColumnOptions = {
  canEdit: boolean;
  /** 서버 오늘. 단가를 입력하면 비어 있는 적용일을 이 값으로 채운다. */
  today: string;
  codeOptions?: ItemPartnerPriceCodeOptions;
  onPickCustomer?: (
    row: ItemPriceOverviewRow,
    applyPatch: (changes: Partial<ItemPriceOverviewRow>) => void,
  ) => void;
};

function sideColumns(
  side: ItemPriceSideKey,
  title: string,
  { canEdit, today, codeOptions }: ColumnOptions,
): F1GridColumn<ItemPriceOverviewRow>[] {
  const field = (suffix: string) => `${side}${suffix}` as keyof ItemPriceOverviewRow;
  const editable = () => canEdit;
  const startField = field('StartDt');
  const form = (order: number) => ({ group: `${title} 단가`, order });
  return [
    {
      field: field('UnitPrice'),
      headerName: `${title} 원화단가`,
      type: 'decimal',
      width: 120,
      align: 'right',
      decimalPlaces: PRICE_DECIMAL_PLACES,
      min: 0,
      requiredMark: true,
      form: form(1),
      editable,
      renderCell: renderBlankWhenEmpty,
      validate: (value) => validateAmount(value, `${title} 원화단가`),
      onValueChange: (row, value) => {
        const patch: Partial<ItemPriceOverviewRow> = { [field('UnitPrice')]: value } as Partial<ItemPriceOverviewRow>;
        const hasValue = value !== null && value !== undefined && value !== '';
        if (hasValue && today && !(row as unknown as Record<string, unknown>)[startField as string]) {
          (patch as Record<string, unknown>)[startField as string] = today;
        }
        return patch;
      },
      search: { hidden: true },
    },
    {
      field: field('TaxType'),
      headerName: `${title} 부가세구분`,
      type: 'select',
      width: 105,
      align: 'center',
      options: codeOptions?.taxTypes ?? [],
      form: form(2),
      editable,
      // 부가세포함은 과세일 때만 가능하므로 과세가 아니면 미포함으로 되돌린다.
      onValueChange: (_row, value) => ({
        [field('TaxType')]: String(value ?? ''),
        ...(value === 'TAXABLE' ? {} : { [field('VatIncludedAt')]: 'N' }),
      } as Partial<ItemPriceOverviewRow>),
      search: { hidden: true },
    },
    {
      field: field('VatIncludedAt'),
      headerName: `${title} 부가세포함`,
      type: 'select',
      width: 105,
      align: 'center',
      options: vatIncludedOptions,
      form: form(3),
      editable,
      validate: (value, row) => value === 'Y'
        && (row as unknown as Record<string, unknown>)[field('TaxType') as string] !== 'TAXABLE'
        ? `${title} 부가세 포함은 과세일 때만 선택할 수 있습니다.` : true,
      search: { hidden: true },
    },
    {
      field: field('ForeignUnitPrice'),
      headerName: `${title} 외화단가`,
      type: 'decimal',
      width: 110,
      align: 'right',
      decimalPlaces: PRICE_DECIMAL_PLACES,
      min: 0,
      requiredMark: true,
      form: form(4),
      editable,
      renderCell: renderBlankWhenEmpty,
      validate: (value) => validateAmount(value, `${title} 외화단가`),
      search: { hidden: true },
    },
    {
      field: field('Currency'),
      headerName: `${title} 통화`,
      type: 'select',
      width: 90,
      align: 'center',
      options: codeOptions?.currencies ?? [],
      form: form(5),
      editable,
      validate: (value, row) => (row as unknown as Record<string, unknown>)[field('ForeignUnitPrice') as string] != null
        && !String(value ?? '').trim() ? `${title} 외화단가를 입력하면 통화를 선택해 주세요.` : true,
      search: { hidden: true },
    },
    ...(side === 'purchase' ? [
      {
        field: field('OrderType'),
        headerName: `${title} 발주구분`,
        type: 'select' as const,
        width: 105,
        align: 'center' as const,
        options: codeOptions?.orderTypes ?? [],
        form: form(6),
        editable,
        search: { hidden: true },
      },
      {
        field: field('DefaultSupplier'),
        headerName: '기본 거래처',
        type: 'checkbox' as const,
        width: 100,
        align: 'center' as const,
        headerCheckbox: false,
        syncWithTreeCheckbox: false,
        // 거래처 칸의 오른쪽(품목 그룹)에 둔다. 거래처 행에서만 보이고, 매입 단가가 있어야 체크할 수 있다.
        form: {
          group: '품목',
          order: 2.5,
          visible: (row: ItemPriceOverviewRow) => row.parentId !== null,
          readOnly: (row: ItemPriceOverviewRow) => !canEdit || !hasPurchasePrice(row),
        },
        // 거래처 행이고 매입 단가가 있어야 체크할 수 있다.
        editable: (row: ItemPriceOverviewRow) => canEdit && row.parentId !== null && hasPurchasePrice(row),
        // 같은 품목의 다른 거래처 행 체크 해제는 변경이 반영된 뒤 트리(ItemPriceOverviewTree)가 처리한다(폼 취소 시 영향이 없도록).
        onValueChange: (_row: ItemPriceOverviewRow, checked: unknown) =>
          ({ purchaseDefaultSupplier: Boolean(checked) } as Partial<ItemPriceOverviewRow>),
        search: { hidden: true },
      },
    ] : []),
    {
      field: startField,
      headerName: `${title} 적용일`,
      type: 'date',
      width: 125,
      requiredMark: true,
      form: form(8),
      editable,
      search: { hidden: true },
    },
  ];
}

export function createItemPriceOverviewColumns(options: ColumnOptions): F1GridColumn<ItemPriceOverviewRow>[] {
  return [
    {
      field: 'rowId',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'displayName',
      headerName: '품목',
      width: 280,
      editable: false,
      pinned: 'left',
      // 품목(부모) 행의 폼에서만 보인다. 거래처(자식) 행은 아래 거래처 칸이 같은 자리에 보인다.
      form: { group: '품목', order: 1, visible: (row) => row.parentId === null, readOnly: true },
      search: { hidden: true },
    },
    {
      field: 'customerId',
      headerName: '거래처 선택',
      type: 'code',
      width: 170,
      requiredMark: true,
      // 수정 폼에서도 거래처 정보를 비활성(읽기 전용)으로 보여 주고, 신규 특별단가 행만 선택할 수 있다.
      form: { group: '품목', order: 2, visible: (row) => row.parentId !== null, readOnly: (row) => !isNewChildRow(row) },
      editable: (row) => options.canEdit && isNewChildRow(row),
      getValue: (row) => row.customerCode ? `${row.customerCode} · ${row.customerName}` : '',
      onOpenCodePicker: (row, applyPatch) => {
        options.onPickCustomer?.(row, applyPatch);
        return undefined;
      },
      onValueChange: () => { throw new Error('거래처 선택 창에서 거래처를 선택해 주세요.'); },
      search: { hidden: true },
    },
    { field: 'materialSpec', headerName: '규격', width: 130, editable: false, form: { group: '품목', order: 3 }, search: { hidden: true } },
    { field: 'materialUnit', headerName: '단위', width: 70, align: 'center', editable: false, form: { group: '품목', order: 4 }, search: { hidden: true } },
    { field: 'specialLabel', headerName: '특별단가', width: 90, align: 'center', editable: false, form: { hidden: true }, search: { hidden: true } },
    {
      field: 'defaultSupplierName', headerName: '매입 기본 거래처', width: 150, editable: false,
      form: { group: '품목', order: 5 }, search: { hidden: true },
    },
    ...sideColumns('purchase', '매입', options),
    ...sideColumns('sales', '매출', options),
  ];
}
