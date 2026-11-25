import { apiDelete, apiGetWithExactDecimals, apiPostWithExactDecimals, apiPutWithExactDecimals } from '../../../../../../shared/services/apiClient';
import { ApiResponseError } from '../../../../../../shared/services/apiErrors';
import type { DeliveryFilters, DeliveryForm, DeliveryItem, DeliveryPayload, DeliveryRow, DeliveryStatusRow, SourceOrderRow, SourceOrderSearchFilters } from '../types/salesDelivery.types';
import { addExactSalesDecimals, addSalesOrderAmounts, calculateExactSalesAmounts, calculateSalesOrderAmounts, isExactSalesPolicyNumber, type SalesAmountRule } from '../../../../order/create/data/salesOrderAmounts';
import { compareGridExactDecimals } from '../../../../../../shared/components/f1-grid/utils/gridExactDecimal';
import type { GridDecimalModuleRule } from '../../../../../../shared/services/gridDecimalPolicy.service';
import { getDecimalColumnContract, resolveDecimalColumn } from '../../../../../../shared/services/decimalColumnContract';

const PATH = '/api/v1/sales/deliveries';
const DELIVERY_DECIMAL_FIELDS = ['deliveryQty', 'unitPrice', 'supplyAmt', 'vatAmt', 'totalAmt'] as const;
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function emptyDelivery(deliveryDt = ''): DeliveryForm {
  return { deliveryDt, deliveryType: 'DIRECT', customerId: null, customerCode: '', customerName: '',
    salesOrderId: null, orderNo: '', deliveryPlace: '', deliveryMethod: '', remark: '', details: [] };
}
export function deliveryAmounts(qty: number | string, price: number | string, vat?: number | string, rule?: SalesAmountRule, policy?: GridDecimalModuleRule) {
  const contract = getDecimalColumnContract('sales.delivery');
  const source = policy ?? (rule && { ...rule, trailingZeros: rule.trailingZeros ?? 'FIXED' as const });
  const columns = source && {
    supplyAmount: resolveDecimalColumn(contract.supplyAmt, source),
    vatAmount: resolveDecimalColumn(contract.vatAmt, source),
    totalAmount: resolveDecimalColumn(contract.totalAmt, source),
  };
  if (rule && (typeof qty === 'string' || typeof price === 'string' || typeof vat === 'string')) {
    const calculated = calculateExactSalesAmounts(String(qty), String(price), rule, columns);
    const vatAmt = vat === undefined ? calculated.vatAmount : String(vat);
    return { supplyAmt: calculated.supplyAmount, vatAmt,
      totalAmt: addExactSalesDecimals(calculated.supplyAmount, vatAmt, columns?.totalAmount ?? rule) };
  }
  const numericQty = Number(qty);
  const numericPrice = Number(price);
  const numericVat = vat === undefined ? undefined : Number(vat);
  if (rule) {
    const calculated = calculateSalesOrderAmounts(numericQty, numericPrice, rule, columns);
    const vatAmt = numericVat ?? calculated.vatAmount;
    return { supplyAmt: calculated.supplyAmount, vatAmt,
      totalAmt: addSalesOrderAmounts(calculated.supplyAmount, vatAmt, columns?.totalAmount ?? rule, '출하 합계') };
  }
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const supplyAmt = round(numericQty * numericPrice);
  const vatAmt = numericVat === undefined ? round(supplyAmt * 0.1) : numericVat;
  return { supplyAmt, vatAmt, totalAmt: round(supplyAmt + vatAmt) };
}
export function newDeliveryRow(): DeliveryRow {
  return { rowId: `delivery-${crypto.randomUUID()}`, materialId: null, materialCode: '', materialName: '', unit: '',
    salesOrderId: null, salesOrderDetailId: null, salesDeliveryPlanDetailId: null,
    deliveryQty: 0, unitPrice: 0, ...deliveryAmounts(0, 0) };
}
export function sourceOrderForm(rows: SourceOrderRow[], deliveryDt: string, rule?: SalesAmountRule, policy?: GridDecimalModuleRule): DeliveryForm {
  if (!rows.length) throw new Error('수주를 선택해 주세요.');
  const source = rows[0];
  const orderNos = [...new Set(rows.map((row) => row.orderNo))];
  return { ...emptyDelivery(deliveryDt), deliveryType: 'ORDER', customerId: source.customerId,
    customerCode: source.customerCode, customerName: source.customerName, salesOrderId: source.salesOrderId,
    orderNo: orderNos.join(', '), deliveryPlace: source.deliveryPlace ?? '', deliveryMethod: source.deliveryMethod ?? '',
    details: rows.map((row) => {
      const quantity = Number(row.remainingQty) > 0 ? row.remainingQty : typeof row.remainingQty === 'string' ? '0' : 0;
      return ({
      ...newDeliveryRow(), materialId: row.materialId, materialCode: row.materialCode, materialName: row.materialName,
      unit: row.unit, salesOrderId: row.salesOrderId, salesOrderDetailId: row.salesOrderDetailId,
      salesDeliveryPlanDetailId: row.salesDeliveryPlanDetailId, deliveryQty: quantity,
      unitPrice: row.unitPrice, ...deliveryAmounts(quantity, row.unitPrice, undefined, rule, policy),
    }); }) };
}
export function deliveryForm(item: DeliveryItem): DeliveryForm {
  return { deliveryDt: item.deliveryDt, deliveryType: item.deliveryType, customerId: item.customerId,
    customerCode: item.customerCode ?? '', customerName: item.customerName ?? '', salesOrderId: item.salesOrderId,
    orderNo: item.orderNo ?? '', deliveryPlace: item.deliveryPlace ?? '', deliveryMethod: item.deliveryMethod ?? '',
    remark: item.remark ?? '', details: item.details.map((row) => ({
      ...row, rowId: `delivery-${row.salesDeliveryDetailId}`,
    })) };
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime()) && localDate(parsed) === value;
}
export function validateDelivery(form: DeliveryForm, policy?: GridDecimalModuleRule): string {
  if (!validDate(form.deliveryDt)) return '출하일자를 입력해 주세요.';
  if (!form.customerId || !Number.isSafeInteger(form.customerId)) return '거래처를 선택해 주세요.';
  if (form.deliveryType === 'ORDER' && !form.salesOrderId) return '수주를 선택해 주세요.';
  if (!form.details.length) return '품목 상세를 1건 이상 입력해 주세요.';
  if (form.deliveryPlace.length > 200 || form.deliveryMethod.length > 50 || form.remark.length > 500) return '입력 가능한 글자 수를 초과했습니다.';
  const planIds = new Set<number>();
  const numeric = (value: number) => Number.isFinite(value) && value >= 0 && value <= 9_999_999_999_999.99
    && Math.abs(value * 100 - Math.round(value * 100)) < 0.01;
  const contract = getDecimalColumnContract('sales.delivery');
  const quantityRule = policy && resolveDecimalColumn(contract.deliveryQty, policy);
  const priceRule = policy && resolveDecimalColumn(contract.unitPrice, policy);
  const amountRule = policy && ('places' in policy ? policy : policy.currency);
  const supplyRule = policy && resolveDecimalColumn(contract.supplyAmt, policy);
  const vatRule = policy && resolveDecimalColumn(contract.vatAmt, policy);
  const totalRule = policy && resolveDecimalColumn(contract.totalAmt, policy);
  const quantityNumeric = (value: number | string) => quantityRule ? isExactSalesPolicyNumber(String(value), quantityRule.places) : numeric(Number(value));
  const amountNumeric = (value: number | string, places?: number) => places !== undefined
    ? isExactSalesPolicyNumber(String(value), places) : numeric(Number(value));
  const priceNumeric = (value: number | string) => priceRule ? isExactSalesPolicyNumber(String(value), priceRule.places) : numeric(Number(value));
  for (const row of form.details) {
    if (!row.materialId || !Number.isSafeInteger(row.materialId)) return '모든 상세 행의 품목을 선택해 주세요.';
    if (!quantityNumeric(row.deliveryQty) || Number(row.deliveryQty) <= 0) return '출하수량의 자릿수와 범위를 확인해 주세요.';
    if (!priceNumeric(row.unitPrice)) return '단가의 자릿수와 범위를 확인해 주세요.';
    if (!amountNumeric(row.vatAmt, vatRule?.places)) return 'VAT의 자릿수와 범위를 확인해 주세요.';
    if (!amountNumeric(row.supplyAmt, supplyRule?.places) || !amountNumeric(row.totalAmt, totalRule?.places)) return '계산된 금액이 허용 범위를 초과했습니다.';
    if (amountRule) {
      try {
        const amounts = deliveryAmounts(row.deliveryQty, row.unitPrice, row.vatAmt, amountRule, policy);
        if (compareGridExactDecimals(row.supplyAmt, amounts.supplyAmt) !== 0 || compareGridExactDecimals(row.totalAmt, amounts.totalAmt) !== 0) {
          return '현재 정책에 맞게 금액을 재계산해 주세요.';
        }
      } catch {
        return '계산된 금액이 허용 범위 또는 정밀도를 초과했습니다.';
      }
    }
    if (form.deliveryType === 'ORDER') {
      if (!(row.salesOrderId ?? form.salesOrderId) || !row.salesOrderDetailId || !row.salesDeliveryPlanDetailId) {
        return '출하계획 상세를 선택해 주세요.';
      }
      if (planIds.has(row.salesDeliveryPlanDetailId)) return '중복 출하계획 상세는 사용할 수 없습니다.';
      planIds.add(row.salesDeliveryPlanDetailId);
    }
  }
  return '';
}
export function buildDeliveryPayload(form: DeliveryForm, decimalPolicy?: GridDecimalModuleRule): DeliveryPayload {
  return { ...(decimalPolicy ? { decimalPolicy, decimalColumns: getDecimalColumnContract('sales.delivery') } : {}), deliveryDt: form.deliveryDt, deliveryType: form.deliveryType, customerId: Number(form.customerId),
    salesOrderId: form.deliveryType === 'ORDER' ? form.salesOrderId : null,
    deliveryPlace: form.deliveryPlace.trim(), deliveryMethod: form.deliveryMethod.trim(), remark: form.remark.trim(),
    details: form.details.map((row) => ({ materialId: Number(row.materialId),
    salesOrderId: form.deliveryType === 'ORDER' ? row.salesOrderId ?? form.salesOrderId : null,
      salesOrderDetailId: form.deliveryType === 'ORDER' ? row.salesOrderDetailId : null,
      salesDeliveryPlanDetailId: form.deliveryType === 'ORDER' ? row.salesDeliveryPlanDetailId : null,
      deliveryQty: row.deliveryQty, unitPrice: row.unitPrice, vatAmt: row.vatAmt })) };
}
function requireItem(response: { item?: DeliveryItem | null }) {
  if (!response.item) throw new Error('출하 응답에 문서 정보가 없습니다.');
  return response.item;
}
export async function createDelivery(payload: DeliveryPayload) {
  return saveDelivery(() => apiPostWithExactDecimals<{ item?: DeliveryItem }>(PATH, payload, DELIVERY_DECIMAL_FIELDS));
}
export async function getDelivery(id: number) {
  return requireItem(await apiGetWithExactDecimals<{ item?: DeliveryItem }>(`${PATH}/${id}`, DELIVERY_DECIMAL_FIELDS));
}
export async function updateDelivery(id: number, payload: DeliveryPayload) {
  return saveDelivery(() => apiPutWithExactDecimals<{ item?: DeliveryItem }>(`${PATH}/${id}`, payload, DELIVERY_DECIMAL_FIELDS));
}
export class OverDeliveryConfirmationRequired extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OverDeliveryConfirmationRequired';
  }
}
async function saveDelivery(request: () => Promise<{ item?: DeliveryItem }>) {
  try {
    return requireItem(await request());
  } catch (cause) {
    const prefix = '[OVER_DELIVERY_CONFIRM_REQUIRED]';
    if (cause instanceof ApiResponseError && cause.status === 409 && cause.message.startsWith(prefix)) {
      throw new OverDeliveryConfirmationRequired(cause.message.slice(prefix.length).trim());
    }
    throw cause;
  }
}
export async function deleteDelivery(id: number) {
  await apiDelete(`${PATH}/${id}`);
}
export async function searchSourceOrders(filters: SourceOrderSearchFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) params.set(key, value.trim());
  });
  const response = await apiGetWithExactDecimals<{ items?: SourceOrderRow[] }>(
    `${PATH}/source-orders?${params}`, ['orderQty', 'shippedQty', 'plannedQty', 'deliveredQty', 'remainingQty', 'unitPrice'],
  );
  if (!Array.isArray(response.items)) throw new Error('수주 목록 응답을 확인해 주세요.');
  return response.items;
}
export function defaultDeliveryFilters(date = new Date()): DeliveryFilters {
  return { deliveryDtFrom: localDate(new Date(date.getFullYear(), date.getMonth(), 1)),
    deliveryDtTo: localDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)), keyword: '', deliveryType: '',
    customerKeyword: '', materialKeyword: '', deliveryNo: '' };
}
export function validDeliveryPeriod(filters: Pick<DeliveryFilters, 'deliveryDtFrom' | 'deliveryDtTo'>) {
  return validDate(filters.deliveryDtFrom) && validDate(filters.deliveryDtTo) && filters.deliveryDtFrom <= filters.deliveryDtTo;
}
export function restoreDeliveryFilters(value: unknown, fallback: DeliveryFilters): DeliveryFilters {
  if (!value || typeof value !== 'object') return fallback;
  const candidate = value as Record<string, unknown>;
  if (!Object.keys(fallback).every((key) => typeof candidate[key] === 'string')) return fallback;
  const filters = candidate as DeliveryFilters;
  return validDeliveryPeriod(filters) && ['', 'DIRECT', 'ORDER'].includes(filters.deliveryType) ? filters : fallback;
}
export async function getDeliveryStatus(filters: DeliveryFilters): Promise<DeliveryStatusRow[]> {
  if (!validDeliveryPeriod(filters)) throw new Error('출하일 기간의 시작일과 종료일을 확인해 주세요.');
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
  const response = await apiGetWithExactDecimals<{ items?: DeliveryStatusRow[] }>(`${PATH}/status?${params}`, DELIVERY_DECIMAL_FIELDS);
  if (!Array.isArray(response.items)) throw new Error('출하현황 응답을 확인해 주세요.');
  return response.items;
}
