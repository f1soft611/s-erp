import { apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import { GridSaveReconciliationError, resolveSavedGridRows, type F1GridSavedRow } from '../../../../../shared/components/f1-grid';
import type {
  WarehouseBatchPayload,
  WarehouseFilters,
  WarehousePayload,
  WarehouseRow,
  WarehouseUserOption,
} from '../types/warehouseManagement.types';

type ApiRow = Record<string, unknown>;

function isApiRow(value: unknown): value is ApiRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`창고 ${fieldName} 응답을 확인할 수 없습니다.`);
  }
  return parsed;
}

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: unknown): string {
  return value == null ? '' : String(value);
}

function toYn(value: unknown, fieldName: string): 'Y' | 'N' {
  if (value !== 'Y' && value !== 'N') {
    throw new Error(`창고 ${fieldName} 응답을 확인할 수 없습니다.`);
  }
  return value;
}

export function normalizeWarehouseRow(source: ApiRow): WarehouseRow {
  return {
    warehouseId: toNumber(source.warehouseId, 'ID'),
    tenantId: source.tenantId == null ? undefined : toNumber(source.tenantId, '테넌트 ID'),
    warehouseCode: toText(source.warehouseCode),
    warehouseName: toText(source.warehouseName),
    warehouseType: toText(source.warehouseType),
    deleteLockAt: toYn(source.deleteLockAt, '삭제불가여부'),
    disuseAt: toYn(source.disuseAt, '불용창고여부'),
    stockQtyDispAt: toYn(source.stockQtyDispAt, '현재고표시여부'),
    stockIoAt: toYn(source.stockIoAt, '수불처리여부'),
    safetyStockAlertAt: toYn(source.safetyStockAlertAt, '안전재고미달알림여부'),
    stockDefaultAt: toYn(source.stockDefaultAt, '재고현황기본조회여부'),
    plantId: toNullableNumber(source.plantId),
    customerId: toNullableNumber(source.customerId),
    managerUserId: toNullableNumber(source.managerUserId),
    managerUserName: toText(source.managerUserName),
    departmentId: toNullableNumber(source.departmentId),
    departmentName: toText(source.departmentName),
    telNo: toText(source.telNo),
    faxNo: toText(source.faxNo),
    address: toText(source.address),
    remark: toText(source.remark),
    createdBy: source.createdBy == null ? undefined : toNumber(source.createdBy, '등록자 ID'),
    createdAt: source.createdAt == null ? undefined : String(source.createdAt),
    updatedBy: source.updatedBy == null ? undefined : toNumber(source.updatedBy, '수정자 ID'),
    updatedAt: source.updatedAt == null ? undefined : String(source.updatedAt),
  };
}

function rowsFromResponse(value: unknown): WarehouseRow[] {
  if (!Array.isArray(value) || !value.every(isApiRow)) {
    throw new Error('창고 목록 응답을 확인할 수 없습니다.');
  }
  return value.map(normalizeWarehouseRow);
}

export async function fetchWarehouses(
  filters: WarehouseFilters = {},
): Promise<WarehouseRow[]> {
  const query = new URLSearchParams();
  if (filters.keyword?.trim()) query.set('keyword', filters.keyword.trim());
  if (filters.warehouseType?.trim())
    query.set('warehouseType', filters.warehouseType.trim());
  if (filters.disuseAt) query.set('disuseAt', filters.disuseAt);
  const queryString = query.toString();
  const result = await apiGet<{ resultList?: unknown }>(
    `/api/v1/co/master/warehouses${queryString ? `?${queryString}` : ''}`,
  );
  return rowsFromResponse(result.resultList);
}

export async function fetchWarehouseUserOptions(): Promise<WarehouseUserOption[]> {
  const result = await apiGet<{ resultList?: ApiRow[] }>(
    '/api/v1/co/master/warehouses/users',
  );
  return (result.resultList ?? []).map((user) => ({
    userId: String(user.userId ?? ''),
    departmentId: user.departmentId == null ? null : String(user.departmentId),
    departmentNm: String(user.departmentNm ?? ''),
    userNm: String(user.userNm ?? ''),
    profileImage: user.profileImage == null ? null : String(user.profileImage),
    levelNm: user.levelNm == null ? null : String(user.levelNm),
  }));
}

export async function createWarehouse(
  payload: WarehousePayload,
): Promise<WarehouseRow> {
  const result = await apiPost<{ item?: unknown }>(
    '/api/v1/co/master/warehouses',
    payload,
  );
  if (!isApiRow(result.item)) {
    throw new Error('창고 저장 응답을 확인할 수 없습니다.');
  }
  return normalizeWarehouseRow(result.item);
}

export async function updateWarehouse(
  warehouseId: number,
  payload: WarehousePayload,
): Promise<WarehouseRow> {
  const result = await apiPut<{ item?: unknown }>(
    `/api/v1/co/master/warehouses/${warehouseId}`,
    payload,
  );
  if (!isApiRow(result.item)) {
    throw new Error('창고 저장 응답을 확인할 수 없습니다.');
  }
  return normalizeWarehouseRow(result.item);
}

export async function saveWarehouseRows(
  payload: WarehouseBatchPayload,
  requested: WarehouseRow[],
): Promise<F1GridSavedRow<WarehouseRow>[]> {
  const result = await apiPost<{ item?: { warehouses?: unknown; rowIdMappings?: unknown } }>(
    '/api/v1/co/master/warehouses/save-batch', payload,
  );
  try {
    const warehouses = result.item?.warehouses;
    if (!Array.isArray(warehouses) || !warehouses.every(isApiRow)) {
      throw new Error('창고 일괄 저장 응답을 확인할 수 없습니다.');
    }
    return resolveSavedGridRows(
      requested,
      warehouses.map(normalizeWarehouseRow),
      result.item?.rowIdMappings,
      'warehouseId',
    );
  } catch (cause) {
    throw new GridSaveReconciliationError(cause);
  }
}
