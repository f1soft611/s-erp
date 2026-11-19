/** 숫자 6자리(YYYYMM)이고 월이 01~12이면 그 값을, 아니면 빈 문자열을 돌려준다. `YYYY-MM` 입력도 받는다. */
export function normalizeMonthInput(input: string): string {
  const digits = input.trim().replace(/[^\d]/g, '');
  if (!/^\d{6}$/.test(digits)) return '';
  const month = Number(digits.slice(4));
  return month >= 1 && month <= 12 ? digits : '';
}

/** `YYYYMM` → `YYYY-MM`. 여섯 자리가 아니면 그대로 돌려준다. */
export function formatMonthValue(value: string): string {
  return /^\d{6}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4)}` : value;
}
