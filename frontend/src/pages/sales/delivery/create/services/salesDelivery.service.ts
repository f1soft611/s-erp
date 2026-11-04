import { apiDelete, apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type { DeliveryFilters, DeliveryForm, DeliveryItem, DeliveryPayload, DeliveryRow, DeliveryStatusRow, SourceOrderRow } from '../types/salesDelivery.types';

const PATH = '/api/v1/sales/deliveries';
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function emptyDelivery(): DeliveryForm {
  return { deliveryDt: localDate(), deliveryType: 'DIRECT', customerId: null, customerCode: '', customerName: '',
    salesOrderId: null, orderNo: '', deliveryPlace: '', deliveryMethod: '', remark: '', details: [] };
}
export function deliveryAmounts(qty: number, price: number, vat?: number) {
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const supplyAmt = round(qty * price);
  const vatAmt = vat === undefined ? round(supplyAmt * 0.1) : vat;
  return { supplyAmt, vatAmt, totalAmt: round(supplyAmt + vatAmt) };
}
export function newDeliveryRow(): DeliveryRow {
  return { rowId: `delivery-${crypto.randomUUID()}`, materialId: null, materialCode: '', materialName: '', unit: '',
    salesOrderDetailId: null, deliveryQty: 0, unitPrice: 0, ...deliveryAmounts(0, 0) };
}
export function sourceOrderForm(rows: SourceOrderRow[], deliveryDt: string): DeliveryForm {
  if (!rows.length) throw new Error('수주를 선택해 주세요.');
  const source = rows[0];
  return { ...emptyDelivery(), deliveryDt, deliveryType: 'ORDER', customerId: source.customerId,
    customerCode: source.customerCode, customerName: source.customerName, salesOrderId: source.salesOrderId,
    orderNo: source.orderNo, deliveryPlace: source.deliveryPlace ?? '', deliveryMethod: source.deliveryMethod ?? '',
    details: rows.filter((row) => row.salesOrderId === source.salesOrderId && Number(row.remainingQty) > 0).map((row) => ({
      ...newDeliveryRow(), materialId: row.materialId, materialCode: row.materialCode, materialName: row.materialName,
      unit: row.unit, salesOrderDetailId: row.salesOrderDetailId, deliveryQty: Number(row.remainingQty),
      unitPrice: Number(row.unitPrice), ...deliveryAmounts(Number(row.remainingQty), Number(row.unitPrice)),
    })) };
}
export function deliveryForm(item: DeliveryItem): DeliveryForm {
  return { deliveryDt: item.deliveryDt, deliveryType: item.deliveryType, customerId: item.customerId,
    customerCode: item.customerCode ?? '', customerName: item.customerName ?? '', salesOrderId: item.salesOrderId,
    orderNo: item.orderNo ?? '', deliveryPlace: item.deliveryPlace ?? '', deliveryMethod: item.deliveryMethod ?? '',
    remark: item.remark ?? '', details: item.details.map((row) => ({
      ...row, rowId: `delivery-${row.salesDeliveryDetailId}`, deliveryQty: Number(row.deliveryQty),
      unitPrice: Number(row.unitPrice), supplyAmt: Number(row.supplyAmt), vatAmt: Number(row.vatAmt), totalAmt: Number(row.totalAmt),
    })) };
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime()) && localDate(parsed) === value;
}
export function validateDelivery(form: DeliveryForm): string {
  if (!validDate(form.deliveryDt)) return '납품일자를 입력해 주세요.';
  if (!form.customerId || !Number.isSafeInteger(form.customerId)) return '거래처를 선택해 주세요.';
  if (form.deliveryType === 'ORDER' && !form.salesOrderId) return '수주를 선택해 주세요.';
  if (!form.details.length) return '품목 상세를 1건 이상 입력해 주세요.';
  if (form.deliveryPlace.length > 200 || form.deliveryMethod.length > 50 || form.remark.length > 500) return '입력 가능한 글자 수를 초과했습니다.';
  const sourceIds = new Set<number>();
  const numeric = (value: number) => Number.isFinite(value) && value >= 0 && value <= 9_999_999_999_999.99
    && Math.abs(value * 100 - Math.round(value * 100)) < 0.01;
  for (const row of form.details) {
    if (!row.materialId || !Number.isSafeInteger(row.materialId)) return '모든 상세 행의 품목을 선택해 주세요.';
    if (!numeric(row.deliveryQty) || row.deliveryQty <= 0) return '납품수량은 0보다 큰 소수 2자리 값이어야 합니다.';
    if (!numeric(row.unitPrice)) return '단가는 0 이상의 소수 2자리 값이어야 합니다.';
    if (!numeric(row.vatAmt)) return 'VAT는 0 이상의 소수 2자리 값이어야 합니다.';
    if (!numeric(row.supplyAmt) || !numeric(row.totalAmt)) return '계산된 금액이 허용 범위를 초과했습니다.';
    if (form.deliveryType === 'ORDER') {
      if (!row.salesOrderDetailId) return '수주 상세를 선택해 주세요.';
      if (sourceIds.has(row.salesOrderDetailId)) return '중복 수주 상세는 사용할 수 없습니다.';
      sourceIds.add(row.salesOrderDetailId);
    }
  }
  return '';
}
export function buildDeliveryPayload(form: DeliveryForm): DeliveryPayload {
  return { deliveryDt: form.deliveryDt, deliveryType: form.deliveryType, customerId: Number(form.customerId),
    salesOrderId: form.deliveryType === 'ORDER' ? form.salesOrderId : null,
    deliveryPlace: form.deliveryPlace.trim(), deliveryMethod: form.deliveryMethod.trim(), remark: form.remark.trim(),
    details: form.details.map((row) => ({ materialId: Number(row.materialId),
      salesOrderDetailId: form.deliveryType === 'ORDER' ? row.salesOrderDetailId : null,
      deliveryQty: row.deliveryQty, unitPrice: row.unitPrice, vatAmt: row.vatAmt })) };
}
function requireItem(response: { item?: DeliveryItem | null }) {
  if (!response.item) throw new Error('납품 응답에 문서 정보가 없습니다.');
  return response.item;
}
export async function createDelivery(payload: DeliveryPayload) {
  return requireItem(await apiPost<{ item?: DeliveryItem }>(PATH, payload));
}
export async function getDelivery(id: number) {
  return requireItem(await apiGet<{ item?: DeliveryItem }>(`${PATH}/${id}`));
}
export async function updateDelivery(id: number, payload: DeliveryPayload) {
  return requireItem(await apiPut<{ item?: DeliveryItem }>(`${PATH}/${id}`, payload));
}
export async function deleteDelivery(id: number) {
  await apiDelete(`${PATH}/${id}`);
}
export async function searchSourceOrders(keyword: string) {
  const response = await apiGet<{ items?: SourceOrderRow[] }>(`${PATH}/source-orders?${new URLSearchParams({ keyword })}`);
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
  if (!validDeliveryPeriod(filters)) throw new Error('납품일 기간의 시작일과 종료일을 확인해 주세요.');
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
  const response = await apiGet<{ items?: DeliveryStatusRow[] }>(`${PATH}/status?${params}`);
  if (!Array.isArray(response.items)) throw new Error('납품현황 응답을 확인해 주세요.');
  return response.items;
}
