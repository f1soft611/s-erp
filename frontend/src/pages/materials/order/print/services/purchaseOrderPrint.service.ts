import { apiGet, apiPost } from '../../../../../shared/services/apiClient';
import type { PurchaseOrderItem } from '../../create/types/purchaseOrder.types';
import type { PurchaseOrderPrintData } from '../types/purchaseOrderPrint.types';

const ORDER_PATH = '/api/v1/materials/purchase-orders';

/** 발주서 출력 데이터. 취소된 발주는 서버가 409로 거부한다. */
export async function getPurchaseOrderPrint(purchaseOrderId: number): Promise<PurchaseOrderPrintData> {
  const result = await apiGet<{ item?: PurchaseOrderPrintData | null }>(`${ORDER_PATH}/${purchaseOrderId}/print`);
  if (!result.item) throw new Error('발주서 출력 응답에 출력 정보가 없습니다.');
  return result.item;
}

/** 인쇄 버튼을 눌렀을 때 출력했다고 기록한다(출력 여부, 출력 일시, 출력자). */
export async function markPurchaseOrderPrinted(purchaseOrderId: number): Promise<PurchaseOrderItem> {
  const result = await apiPost<{ item?: PurchaseOrderItem | null }>(`${ORDER_PATH}/${purchaseOrderId}/print-mark`, {});
  if (!result.item) throw new Error('발주서 출력 기록 응답에 발주 정보가 없습니다.');
  return result.item;
}

/** 부가세 구분·포함 여부에 따른 발주서 표기: VAT포함 / VAT별도 / 영세 / 면세 */
export function vatLabel(taxType: string, vatIncludedAt: string): string {
  if (taxType === 'ZERO_RATED') return '영세';
  if (taxType === 'EXEMPT') return '면세';
  return vatIncludedAt === 'Y' ? 'VAT포함' : 'VAT별도';
}
