import { apiGet } from './apiClient';

export type GridDecimalRule = {
  places: number;
  trailingZeros: 'FIXED' | 'AUTO';
  rounding: 'HALF_UP' | 'UP' | 'DOWN';
};
export type GridDecimalTypeRules = Record<'number' | 'decimal' | 'currency', GridDecimalRule>;
export type GridDecimalModuleRule = GridDecimalRule | GridDecimalTypeRules;
export type GridDecimalPolicy = Record<string, GridDecimalModuleRule>;

const endpoint = '/api/v1/system/policies/grid-decimals';
let cached: Promise<GridDecimalPolicy> | null = null;
const listeners = new Set<() => void>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRule(value: unknown): value is GridDecimalRule {
  return isRecord(value) && Number.isInteger(value.places)
    && (value.places as number) >= 0 && (value.places as number) <= 6
    && (value.trailingZeros === 'FIXED' || value.trailingZeros === 'AUTO')
    && (value.rounding === 'HALF_UP' || value.rounding === 'UP' || value.rounding === 'DOWN');
}

function isPolicy(value: unknown): value is GridDecimalPolicy {
  return isRecord(value) && Object.values(value).every((module) =>
    isRule(module) || (isRecord(module) && isRule(module.number)
      && isRule(module.decimal) && isRule(module.currency)));
}

export function fetchGridDecimalPolicyStrict(): Promise<GridDecimalPolicy> {
  if (!cached) {
    const request = apiGet<{ item?: unknown }>(endpoint)
      .then((response) => {
        if (!isPolicy(response?.item)) throw new Error('소수점 정책 응답을 확인해 주세요.');
        return response.item;
      })
      .catch((cause: unknown) => {
        if (cached === request) cached = null;
        throw cause;
      });
    cached = request;
  }
  return cached;
}

// 일반 그리드는 조회 실패 시 기존 기본값을 유지한다.
export function fetchGridDecimalPolicy(): Promise<GridDecimalPolicy> {
  return fetchGridDecimalPolicyStrict().catch(() => ({}));
}

export function resetGridDecimalPolicyCache() {
  cached = null;
  listeners.forEach((listener) => listener());
}

export function subscribeGridDecimalPolicy(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
