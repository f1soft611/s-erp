import { apiGet, apiPost, apiPut } from '../../../../shared/services/apiClient';
import { localDate } from '../../delivery/create/services/salesDelivery.service';
import type {
  DeliveryPlanDetail, DeliveryPlanFilters, DeliveryPlanItem, DeliveryPlanRequest, DeliveryPlanStatusRow, PlanRow, PlanSourceOrderRow,
} from '../types/salesDeliveryPlan.types';

const PATH = '/api/v1/sales/delivery-plans';

export function planRowsFromDetails(details: DeliveryPlanDetail[]): PlanRow[] {
  return details.map((detail) => ({
    rowId: String(detail.salesDeliveryPlanDetailId),
    salesDeliveryPlanDetailId: detail.salesDeliveryPlanDetailId,
    salesOrderDetailId: detail.salesOrderDetailId,
    planDt: detail.planDt,
    plannedQty: Number(detail.plannedQty),
    materialId: detail.materialId,
    materialCode: detail.materialCode,
    materialName: detail.materialName,
    unit: detail.unit,
    orderQty: Number(detail.orderQty),
  }));
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime()) && localDate(parsed) === value;
}

export function defaultDeliveryPlanFilters(date = new Date()): DeliveryPlanFilters {
  return {
    planDtFrom: localDate(new Date(date.getFullYear(), date.getMonth(), 1)),
    planDtTo: localDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
    keyword: '',
  };
}

export function validDeliveryPlanPeriod(filters: Pick<DeliveryPlanFilters, 'planDtFrom' | 'planDtTo'>) {
  return validDate(filters.planDtFrom) && validDate(filters.planDtTo)
    && filters.planDtFrom <= filters.planDtTo;
}

export function validateDeliveryPlan(request: DeliveryPlanRequest, sourceRows: Pick<PlanSourceOrderRow, 'salesOrderDetailId' | 'orderQty'>[]) {
  if (!request.salesOrderId || !Number.isSafeInteger(request.salesOrderId)) return '수주를 선택해 주세요.';
  if (!request.details.length) return '계획 상세를 1건 이상 입력해 주세요.';
  const validLines = new Map(sourceRows.map((row) => [row.salesOrderDetailId, row]));
  const totals = new Map<number, number>();
  for (const detail of request.details) {
    if (!validLines.has(detail.salesOrderDetailId)) return '수주에 포함되지 않은 상세 항목입니다.';
    if (!Number.isFinite(detail.plannedQty) || detail.plannedQty <= 0
      || detail.plannedQty > 9_999_999_999_999.99
      || Math.abs(detail.plannedQty * 100 - Math.round(detail.plannedQty * 100)) >= 0.01) {
      return '계획수량은 0보다 큰 소수 둘째 자리 값이어야 합니다.';
    }
    if (detail.planDt !== null && !validDate(detail.planDt)) return '계획일자를 확인해 주세요.';
    totals.set(detail.salesOrderDetailId,
      (totals.get(detail.salesOrderDetailId) ?? 0) + detail.plannedQty);
  }
  for (const [detailId, total] of totals) {
    const source = validLines.get(detailId);
    if (source && total > Number(source.orderQty)) return '계획수량 합계가 수주수량을 초과했습니다.';
  }
  return '';
}

export async function searchPlanSourceOrders(keyword: string) {
  const response = await apiGet<{ items?: PlanSourceOrderRow[] }>(
    `${PATH}/source-orders?${new URLSearchParams({ keyword })}`,
  );
  if (!Array.isArray(response.items)) throw new Error('계획 대상 수주 응답을 확인해 주세요.');
  return response.items;
}

export async function createDeliveryPlan(request: DeliveryPlanRequest) {
  const response = await apiPost<{ item?: DeliveryPlanItem }>(PATH, request);
  if (!response.item) throw new Error('출하계획 응답에 문서 정보가 없습니다.');
  return response.item;
}

export async function getDeliveryPlan(id: number) {
  const response = await apiGet<{ item?: DeliveryPlanItem }>(`${PATH}/${id}`);
  if (!response.item) throw new Error('출하계획 응답에 문서 정보가 없습니다.');
  return response.item;
}

export async function getDeliveryPlanByOrder(salesOrderId: number) {
  const response = await apiGet<{ item?: DeliveryPlanItem }>(`${PATH}/by-order/${salesOrderId}`);
  if (!response.item) throw new Error('출하계획 응답에 문서 정보가 없습니다.');
  return response.item;
}

export async function updateDeliveryPlan(id: number, request: DeliveryPlanRequest) {
  const response = await apiPut<{ item?: DeliveryPlanItem }>(`${PATH}/${id}`, request);
  if (!response.item) throw new Error('출하계획 응답에 문서 정보가 없습니다.');
  return response.item;
}

export async function getDeliveryPlanStatus(filters: DeliveryPlanFilters) {
  if (!validDeliveryPlanPeriod(filters)) throw new Error('계획일 기간의 시작일과 종료일을 확인해 주세요.');
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
  const response = await apiGet<{ items?: DeliveryPlanStatusRow[] }>(`${PATH}/status?${params}`);
  if (!Array.isArray(response.items)) throw new Error('출하계획 현황 응답을 확인해 주세요.');
  return response.items;
}
