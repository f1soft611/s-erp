import { normalizeDateInput } from './f1-grid/editing/dateInput';

/**
 * 저장 직전 검증용: 입력을 `YYYY-MM-DD`로 정규화한다.
 * `invalid`는 값이 비어 있지 않은데 올바른 날짜가 아닌 경우이며, 이때 `date`는 빈 문자열이다.
 */
export function normalizeFormDate(
  value: string,
): { date: string; invalid: boolean } {
  const date = value.trim() ? normalizeDateInput(value) : '';
  return { date, invalid: Boolean(value.trim()) && !date };
}
