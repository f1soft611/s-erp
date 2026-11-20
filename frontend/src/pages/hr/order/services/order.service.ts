import { apiGet, apiPost } from '../../../../shared/services/apiClient';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../../co/master/common-code/services/commonCodeManagement.service';
import type {
  OrderCodeOption,
  OrderCodeOptions,
  OrderEmployee,
  OrderHistoryFilters,
  OrderHistoryRow,
  OrderInputKind,
  OrderProcessPayload,
  OrderProcessResult,
  OrderTypeDef,
} from '../types/order.types';

const BASE_URL = '/api/v1/hr/orders';

type ApiRow = Record<string, unknown>;

function isApiRow(value: unknown): value is ApiRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return value == null ? '' : String(value);
}

function numberOf(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} 응답을 확인할 수 없습니다.`);
  }
  return parsed;
}

function inputKindOf(value: unknown): OrderInputKind {
  if (value === 'department' || value === 'code' || value === 'date') return value;
  throw new Error('인사명령 유형 응답을 확인할 수 없습니다.');
}

export function normalizeOrderType(source: ApiRow): OrderTypeDef {
  return {
    code: text(source.code),
    name: text(source.name),
    fieldCode: text(source.fieldCode),
    fieldName: text(source.fieldName),
    inputKind: inputKindOf(source.inputKind),
    codeGroup: text(source.codeGroup),
  };
}

export async function fetchOrderTypes(): Promise<OrderTypeDef[]> {
  const result = await apiGet<{ resultList?: unknown }>(`${BASE_URL}/types`);
  if (!Array.isArray(result.resultList) || !result.resultList.every(isApiRow)) {
    throw new Error('인사명령 유형 응답을 확인할 수 없습니다.');
  }
  return result.resultList.map(normalizeOrderType);
}

/** 명령 대상 사원의 현재 정보. 명령 전 값을 보여 주기 위해 선택한 사원마다 조회한다. */
export async function fetchOrderEmployee(userId: number): Promise<OrderEmployee> {
  const result = await apiGet<{ item?: unknown }>(`/api/v1/hr/employees/${userId}`);
  const item = result.item;
  if (!isApiRow(item)) throw new Error('사원 정보 응답을 확인할 수 없습니다.');
  return {
    userId: numberOf(item.userId, '사원 ID'),
    employeeNo: text(item.employeeNo),
    userNm: text(item.userNm),
    departmentNm: text(item.departmentNm),
    positionNm: text(item.positionNm),
    levelNm: text(item.levelNm),
    employmentTypeNm: text(item.employmentTypeNm),
    suspendDt: text(item.suspendDt),
    backDt: text(item.backDt),
    retireDt: text(item.retireDt),
    employmentStatus: text(item.employmentStatus),
  };
}

export async function processOrder(payload: OrderProcessPayload): Promise<OrderProcessResult> {
  const result = await apiPost<{ item?: unknown }>(`${BASE_URL}/process`, payload);
  const item = result.item;
  if (!isApiRow(item)) throw new Error('인사명령 처리 응답을 확인할 수 없습니다.');
  return {
    orderId: Number(item.orderId ?? 0),
    count: Number(item.count ?? 0),
    items: Array.isArray(item.items)
      ? item.items.filter(isApiRow).map((row) => ({
        userId: Number(row.userId ?? 0),
        userNm: text(row.userNm),
        fieldCode: text(row.fieldCode),
        preName: text(row.preName),
        postName: text(row.postName),
      }))
      : [],
  };
}

export function normalizeOrderHistory(source: ApiRow): OrderHistoryRow {
  return {
    orderDtId: numberOf(source.orderDtId, '처리 내역 ID'),
    orderId: numberOf(source.orderId, '명령 ID'),
    createdAt: text(source.createdAt),
    orderDt: text(source.orderDt),
    orderType: text(source.orderType),
    orderTypeName: text(source.orderTypeName),
    source: text(source.source),
    userId: Number(source.userId ?? 0),
    userNm: text(source.userNm),
    employeeNo: text(source.employeeNo),
    fieldCode: text(source.fieldCode),
    fieldName: text(source.fieldName),
    preName: text(source.preName),
    postName: text(source.postName),
    remark: text(source.remark),
    createdByName: text(source.createdByName),
  };
}

export async function fetchOrderHistory(filters: OrderHistoryFilters): Promise<OrderHistoryRow[]> {
  const query = new URLSearchParams();
  (Object.keys(filters) as Array<keyof OrderHistoryFilters>).forEach((key) => {
    const value = filters[key]?.trim();
    if (value) query.set(key, value);
  });
  const queryString = query.toString();
  const result = await apiGet<{ resultList?: unknown }>(`${BASE_URL}/history${queryString ? `?${queryString}` : ''}`);
  if (!Array.isArray(result.resultList) || !result.resultList.every(isApiRow)) {
    throw new Error('처리 내역 응답을 확인할 수 없습니다.');
  }
  return result.resultList.map(normalizeOrderHistory);
}

/** 명령 후 값 선택지. 직급(LEVEL)은 값이 공통코드 항목 ID이고 나머지는 항목 코드다. */
export async function fetchOrderCodeOptions(codeGroups: string[]): Promise<OrderCodeOptions> {
  const groups = await fetchCommonCodeGroups();
  const entries = await Promise.all(codeGroups.map(async (groupCode) => {
    const group = groups.find((candidate) => candidate.groupCode === groupCode);
    const items = group ? await fetchCommonCodeItems(group.id) : [];
    const options: OrderCodeOption[] = items
      .filter((item) => item.useAt === 'Y')
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item) => ({ value: groupCode === 'LEVEL' ? item.id : item.itemCode, label: item.itemNm }));
    return [groupCode, options] as const;
  }));
  return Object.fromEntries(entries);
}
