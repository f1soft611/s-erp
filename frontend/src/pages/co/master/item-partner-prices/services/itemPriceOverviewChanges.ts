import type {
  ItemPartnerPriceBatchPayload,
  ItemPartnerPricePayload,
  ItemPartnerPriceTradeType,
} from '../types/itemPartnerPrice.types';
import type { ItemPriceOverviewRow, ItemPriceSideKey } from '../types/itemPriceOverview.types';

type RowChanges = {
  insertedRows: ItemPriceOverviewRow[];
  updatedRows: ItemPriceOverviewRow[];
  deletedRows: ItemPriceOverviewRow[];
};
type PriceRow = ItemPartnerPricePayload & { priceId: string };

const SIDES: { side: ItemPriceSideKey; tradeType: ItemPartnerPriceTradeType }[] = [
  { side: 'purchase', tradeType: '매입' },
  { side: 'sales', tradeType: '매출' },
];

type SideValues = {
  priceId: number | null;
  unitPrice: number | null;
  taxType: string;
  vatIncludedAt: 'Y' | 'N';
  foreignUnitPrice: number | null;
  currency: string;
  moq: number | null;
  startDt: string;
  endDt: string | null;
  status: 'current' | 'future' | '';
  orderType: string;
  defaultSupplier: boolean;
};

function sideValues(row: ItemPriceOverviewRow, side: ItemPriceSideKey): SideValues {
  const record = row as unknown as Record<string, unknown>;
  const read = <T,>(suffix: string) => record[`${side}${suffix}`] as T;
  return {
    priceId: read<number | null>('PriceId'),
    unitPrice: read<number | null>('UnitPrice'),
    taxType: read<string>('TaxType'),
    vatIncludedAt: read<'Y' | 'N'>('VatIncludedAt'),
    foreignUnitPrice: read<number | null>('ForeignUnitPrice'),
    currency: read<string>('Currency'),
    moq: read<number | null>('Moq'),
    startDt: read<string>('StartDt'),
    endDt: read<string | null>('EndDt'),
    status: read<'current' | 'future' | ''>('Status'),
    orderType: read<string>('OrderType') ?? '',
    defaultSupplier: read<boolean>('DefaultSupplier') === true,
  };
}

function sameSide(left: SideValues, right: SideValues): boolean {
  return left.unitPrice === right.unitPrice && left.taxType === right.taxType &&
    left.vatIncludedAt === right.vatIncludedAt && left.foreignUnitPrice === right.foreignUnitPrice &&
    left.currency === right.currency && left.startDt === right.startDt && left.orderType === right.orderType;
}

function label(row: ItemPriceOverviewRow, tradeType: string): string {
  return `${row.displayName} ${tradeType}`;
}

function payload(
  row: ItemPriceOverviewRow,
  tradeType: ItemPartnerPriceTradeType,
  values: SideValues,
  startDt: string,
  moq: number | null,
  endDt: string | null,
  priceId: string,
  useAt: 'Y' | 'N' = 'Y',
  withFlag = true,
): PriceRow {
  const foreign = values.foreignUnitPrice;
  const currency = values.currency.trim();
  if (foreign !== null && !currency) {
    throw new Error(`${label(row, tradeType)}: 외화단가를 입력하면 통화를 선택해 주세요.`);
  }
  const flag = tradeType === '매입' && row.customerId != null && withFlag;
  return {
    priceId,
    materialId: row.materialId,
    customerId: row.customerId,
    tradeType,
    unitPrice: values.unitPrice,
    taxType: values.taxType || 'TAXABLE',
    vatIncludedAt: values.vatIncludedAt,
    foreignUnitPrice: foreign,
    currency: foreign === null ? '' : currency,
    startDt,
    endDt,
    moq,
    useAt,
    orderType: tradeType === '매입' ? values.orderType.trim() : '',
    ...(flag ? { defaultSupplier: values.defaultSupplier } : {}),
  };
}

/**
 * 품목 기준 화면의 변경(셀 편집·자식 행 추가)을 기존 일괄 저장 변경 집합으로 바꾼다.
 * 겹침·자동 종료·과거 잠금 검증은 서버가 하고, 여기서는 정정/신규 판단과 입력 오류만 거른다.
 */
export function buildItemPriceBatch(
  changes: RowChanges,
  sourceRows: ItemPriceOverviewRow[],
  today: string,
  newId: () => string = () => `new-price-${crypto.randomUUID()}`,
): ItemPartnerPriceBatchPayload {
  const source = new Map(sourceRows.map((row) => [row.rowId, row]));
  const insertedRows: PriceRow[] = [];
  const updatedRows: PriceRow[] = [];
  const needToday = () => {
    if (!today) throw new Error('서버 날짜를 확인하지 못했습니다. 다시 조회한 뒤 저장해 주세요.');
    return today;
  };

  for (const row of changes.updatedRows) {
    const original = source.get(row.rowId);
    if (!original) continue;
    for (const { side, tradeType } of SIDES) {
      const before = sideValues(original, side);
      const after = sideValues(row, side);
      const flagChanged = tradeType === '매입' && row.customerId != null && before.defaultSupplier !== after.defaultSupplier;
      if (sameSide(before, after)) {
        // 기본 거래처 표시만 바뀐 경우: 단가 값은 그대로 보내고 서버가 단가 행을 갱신하지 않는다.
        if (flagChanged && before.priceId !== null) {
          updatedRows.push(payload(row, tradeType, after, before.startDt, before.moq, before.endDt, String(before.priceId)));
        }
        continue;
      }
      if (after.unitPrice === null && after.foreignUnitPrice === null) {
        if (before.priceId === null) continue;
        throw new Error(`${label(row, tradeType)}: 단가를 지울 수 없습니다. 원화단가 또는 외화단가 중 하나는 있어야 합니다.`);
      }
      const startDt = after.startDt || needToday();
      if (before.priceId === null) {
        insertedRows.push(payload(row, tradeType, after, startDt, null, null, newId()));
      } else if (before.status === 'future' || startDt === before.startDt) {
        updatedRows.push(payload(row, tradeType, after, startDt, before.moq, before.endDt, String(before.priceId)));
      } else if (startDt > before.startDt) {
        insertedRows.push(payload(row, tradeType, after, startDt, before.moq, null, newId()));
      } else {
        throw new Error(`${label(row, tradeType)}: 적용 중인 단가의 적용일을 앞당길 수 없습니다. 정정은 같은 적용일로 입력해 주세요.`);
      }
    }
  }

  for (const row of changes.insertedRows) {
    if (row.customerId === null || row.customerId === undefined) {
      throw new Error('특별단가 행의 거래처를 선택해 주세요.');
    }
    let count = 0;
    for (const { side, tradeType } of SIDES) {
      const values = sideValues(row, side);
      if (values.unitPrice === null && values.foreignUnitPrice === null) continue;
      count += 1;
      insertedRows.push(payload(row, tradeType, values, values.startDt || needToday(), null, null, newId()));
    }
    if (count === 0) throw new Error(`${row.customerName || '특별단가'} 행의 단가를 입력해 주세요.`);
  }

  return { prices: { insertedRows, updatedRows, deletedRows: [] } };
}

export type ItemPriceRemoveMode = 'delete' | 'deactivate';

/**
 * 품목 기준 화면에서 선택한 행의 구분(매입/매출) 단가를 삭제하거나 미사용 처리하는 변경 집합을 만든다.
 * 삭제는 `deletedRows`, 미사용은 같은 값으로 `useAt = N` 수정이다. 화면에 보이는 기준 행(적용 중·예정)만 대상이다.
 */
export function buildItemPriceRemoveBatch(
  row: ItemPriceOverviewRow,
  sides: ItemPriceSideKey[],
  mode: ItemPriceRemoveMode,
): ItemPartnerPriceBatchPayload {
  const deletedRows: { priceId: string }[] = [];
  const updatedRows: PriceRow[] = [];
  for (const { side, tradeType } of SIDES) {
    if (!sides.includes(side)) continue;
    const values = sideValues(row, side);
    if (values.priceId === null) continue;
    if (mode === 'delete') {
      deletedRows.push({ priceId: String(values.priceId) });
    } else {
      updatedRows.push(payload(row, tradeType, values, values.startDt, values.moq, values.endDt, String(values.priceId), 'N', false));
    }
  }
  if (!deletedRows.length && !updatedRows.length) {
    throw new Error('삭제하거나 미사용 처리할 단가를 선택해 주세요.');
  }
  return { prices: { insertedRows: [], updatedRows, deletedRows } };
}
