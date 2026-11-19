import { toItemPartnerPricePayload } from '../hooks/useItemPartnerPriceManagement';
import type { ItemPartnerPriceBatchPayload, ItemPartnerPriceRow } from '../types/itemPartnerPrice.types';

type RowChanges = {
  insertedRows: ItemPartnerPriceRow[];
  updatedRows: ItemPartnerPriceRow[];
  deletedRows: ItemPartnerPriceRow[];
};

/**
 * 거래처 기준 화면의 변경(신규 행·셀/폼 수정)을 일괄 저장 변경 집합으로 바꾼다. 한 행 = 품목 + 거래구분이다.
 * 정정/새 기간 판단 규칙은 품목 기준 화면과 같고, 겹침·자동 종료·과거 잠금 검증은 서버가 한다.
 */
export function buildCustomerPriceBatch(
  changes: RowChanges,
  sourceRows: ItemPartnerPriceRow[],
  customerId: number,
  today: string,
  newId: () => string = () => `new-price-${crypto.randomUUID()}`,
): ItemPartnerPriceBatchPayload {
  const source = new Map(sourceRows.map((row) => [String(row.priceId), row]));
  const needToday = () => {
    if (!today) throw new Error('서버 날짜를 확인하지 못했습니다. 다시 조회한 뒤 저장해 주세요.');
    return today;
  };
  const insertedRows: ItemPartnerPriceBatchPayload['prices']['insertedRows'] = [];
  const updatedRows: ItemPartnerPriceBatchPayload['prices']['updatedRows'] = [];

  for (const row of changes.insertedRows) {
    insertedRows.push({
      ...toItemPartnerPricePayload({ ...row, customerId, startDt: row.startDt || needToday(), endDt: null }),
      priceId: String(row.priceId),
    });
  }

  for (const row of changes.updatedRows) {
    const original = source.get(String(row.priceId));
    if (!original) continue;
    const name = `${row.materialCode} ${row.tradeType}`;
    if (original.priceStatus === 'past') {
      throw new Error(`${name}: 종료된 과거 단가는 수정할 수 없습니다. 새 적용일로 단가를 추가해 주세요.`);
    }
    const startDt = row.startDt || needToday();
    if (original.priceStatus === 'future' || startDt === original.startDt) {
      updatedRows.push({
        ...toItemPartnerPricePayload({ ...row, customerId, startDt, endDt: original.endDt }),
        priceId: String(row.priceId),
      });
    } else if (startDt > original.startDt) {
      insertedRows.push({
        ...toItemPartnerPricePayload({ ...row, customerId, startDt, endDt: null, moq: original.moq }),
        priceId: newId(),
      });
    } else {
      throw new Error(`${name}: 적용 중인 단가의 적용일을 앞당길 수 없습니다. 정정은 같은 적용일로 입력해 주세요.`);
    }
  }

  const deletedRows: { priceId: string }[] = [];
  for (const row of changes.deletedRows) {
    // 저장하지 않은 신규 행은 화면에서만 지워지고 서버로 보내지 않는다.
    if (String(row.priceId).startsWith('new-price-')) continue;
    const original = source.get(String(row.priceId)) ?? row;
    if (original.priceStatus === 'past') {
      throw new Error(`${row.materialCode} ${row.tradeType}: 종료된 과거 단가는 삭제할 수 없습니다.`);
    }
    deletedRows.push({ priceId: String(row.priceId) });
  }

  return { prices: { insertedRows, updatedRows, deletedRows } };
}
