import { apiGetWithExactDecimals, apiPostWithExactDecimals, apiPutWithExactDecimals } from '../../../../../shared/services/apiClient';
import { localDate } from '../../delivery/create/services/salesDelivery.service';
import { addExactSalesDecimals, isExactSalesPolicyNumber, type SalesAmountRule } from '../../../order/create/data/salesOrderAmounts';
import { compareGridExactDecimals } from '../../../../../shared/components/f1-grid/utils/gridExactDecimal';
import type {
  DeliveryPlanDetail, DeliveryPlanFilters, DeliveryPlanItem, DeliveryPlanRequest, DeliveryPlanStatusRow, PlanRow, PlanSourceOrderRow,
} from '../types/salesDeliveryPlan.types';

const PATH = '/api/v1/sales/delivery-plans';
const DECIMAL_FIELDS = ['plannedQty', 'orderQty', 'deliveredQty', 'remainingQty', 'remainingPlanQty', 'shippedQty', 'unitPrice'] as const;

export function planRowsFromDetails(details: DeliveryPlanDetail[]): PlanRow[] {
  const groups = new Map<string, PlanRow[]>();
  for (const detail of details) {
    const sourceKey = `${detail.salesOrderId}:${detail.salesOrderDetailId}`;
    const group = groups.get(sourceKey) ?? [];
    group.push({
      rowId: String(detail.salesDeliveryPlanDetailId),
      salesDeliveryPlanDetailId: detail.salesDeliveryPlanDetailId,
      salesOrderId: detail.salesOrderId,
      salesOrderDetailId: detail.salesOrderDetailId,
      planDt: detail.planDt,
      plannedQty: detail.plannedQty,
      materialId: detail.materialId,
      materialCode: detail.materialCode,
      materialName: detail.materialName,
      unit: detail.unit,
      orderNo: detail.orderNo,
      customerName: detail.customerName,
      orderQty: detail.orderQty,
      deliveredQty: detail.deliveredQty,
    });
    groups.set(sourceKey, group);
  }
  return Array.from(groups.values()).flat();
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

type PlanCapacitySource = Pick<PlanSourceOrderRow, 'salesOrderId' | 'salesOrderDetailId' | 'orderQty'>
  & { remainingPlanQty?: number | string };

export function validateDeliveryPlan(request: DeliveryPlanRequest, sourceRows: PlanCapacitySource[], quantityRule?: SalesAmountRule) {
  if (!request.details.length) return '계획 상세를 1건 이상 입력해 주세요.';
  const validLines = new Map(sourceRows.map((row) => [
    `${row.salesOrderId}:${row.salesOrderDetailId}`, row,
  ]));
  const totals = new Map<string, string>();
  for (const detail of request.details) {
    const sourceKey = `${detail.salesOrderId}:${detail.salesOrderDetailId}`;
    if (!validLines.has(sourceKey)) return '수주에 포함되지 않은 상세 항목입니다.';
    if (!isExactSalesPolicyNumber(String(detail.plannedQty), quantityRule?.places ?? 2) || Number(detail.plannedQty) <= 0) {
      return '계획수량의 자릿수와 범위를 확인해 주세요.';
    }
    if (detail.planDt !== null && !validDate(detail.planDt)) return '계획일자를 확인해 주세요.';
    try {
      totals.set(sourceKey, addExactSalesDecimals(totals.get(sourceKey) ?? '0', String(detail.plannedQty),
        quantityRule ?? { places: 2, rounding: 'HALF_UP' }));
    } catch {
      return '계획수량 합계의 범위 또는 정밀도를 확인해 주세요.';
    }
  }
  for (const [sourceKey, total] of totals) {
    const source = validLines.get(sourceKey);
    if (source && (compareGridExactDecimals(total, source.remainingPlanQty ?? source.orderQty) ?? 1) > 0) {
      return '계획수량 합계가 수주수량을 초과했습니다.';
    }
  }
  return '';
}

export async function searchPlanSourceOrders(keyword: string) {
  const response = await apiGetWithExactDecimals<{ items?: PlanSourceOrderRow[] }>(
    `${PATH}/source-orders?${new URLSearchParams({ keyword })}`,
    DECIMAL_FIELDS,
  );
  if (!Array.isArray(response.items)) throw new Error('계획 대상 수주 응답을 확인해 주세요.');
  return response.items;
}

export async function createDeliveryPlan(request: DeliveryPlanRequest) {
  const response = await apiPostWithExactDecimals<{ item?: DeliveryPlanItem }>(PATH, request, DECIMAL_FIELDS);
  if (!response.item) throw new Error('출하계획 응답에 문서 정보가 없습니다.');
  return response.item;
}

export async function getDeliveryPlan(id: number) {
  const response = await apiGetWithExactDecimals<{ item?: DeliveryPlanItem }>(`${PATH}/${id}`, DECIMAL_FIELDS);
  if (!response.item) throw new Error('출하계획 응답에 문서 정보가 없습니다.');
  return response.item;
}

export async function getDeliveryPlanByOrder(salesOrderId: number) {
  const response = await apiGetWithExactDecimals<{ item?: DeliveryPlanItem }>(`${PATH}/by-order/${salesOrderId}`, DECIMAL_FIELDS);
  if (!response.item) throw new Error('출하계획 응답에 문서 정보가 없습니다.');
  return response.item;
}

export async function updateDeliveryPlan(id: number, request: DeliveryPlanRequest) {
  const response = await apiPutWithExactDecimals<{ item?: DeliveryPlanItem }>(`${PATH}/${id}`, request, DECIMAL_FIELDS);
  if (!response.item) throw new Error('출하계획 응답에 문서 정보가 없습니다.');
  return response.item;
}

export async function getDeliveryPlanStatus(filters: DeliveryPlanFilters) {
  if (!validDeliveryPlanPeriod(filters)) throw new Error('계획일 기간의 시작일과 종료일을 확인해 주세요.');
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
  const response = await apiGetWithExactDecimals<{ items?: DeliveryPlanStatusRow[] }>(`${PATH}/status?${params}`, DECIMAL_FIELDS);
  if (!Array.isArray(response.items)) throw new Error('출하계획 현황 응답을 확인해 주세요.');
  return response.items;
}
