import { apiGet } from './apiClient';

export type GridDecimalRule = {
  places: number;
  trailingZeros: 'FIXED' | 'AUTO';
  rounding: 'HALF_UP' | 'UP' | 'DOWN';
};
export type GridDecimalPolicy = Record<string, GridDecimalRule>;

const endpoint = '/api/v1/system/policies/grid-decimals';
let cached: Promise<GridDecimalPolicy> | null = null;

// 정책 조회는 세션당 1회만 수행하고 실패 시 빈 정책으로 화면 기본값을 유지한다.
export function fetchGridDecimalPolicy(): Promise<GridDecimalPolicy> {
  if (!cached) {
    cached = apiGet<{ item?: GridDecimalPolicy }>(endpoint)
      .then((response) => response.item ?? {})
      .catch(() => {
        cached = null;
        return {};
      });
  }
  return cached;
}

export function resetGridDecimalPolicyCache() {
  cached = null;
}
