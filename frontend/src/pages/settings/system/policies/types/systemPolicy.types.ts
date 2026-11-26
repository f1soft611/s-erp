export type PolicyValueType = 'BOOLEAN' | 'NUMBER' | 'SELECT' | 'TEXT' | 'DATE' | 'USER_LIST';
export type GridDecimalPolicyValue = {
  places: number;
  trailingZeros: 'FIXED' | 'AUTO';
  rounding: 'HALF_UP' | 'UP' | 'DOWN';
};
export type GridDecimalTypeValues = Record<'number' | 'decimal' | 'currency', GridDecimalPolicyValue>;
export type PolicyValue = boolean | number | string | number[] | GridDecimalPolicyValue | GridDecimalTypeValues;
export type PolicyOption = { value: string; label: string };
export type PolicyPayload = {
  policyCode: string;
  policyName: string;
  category: string;
  description: string;
  valueType: PolicyValueType;
  value: PolicyValue;
  options: PolicyOption[];
  minValue: number | null;
  maxValue: number | null;
  unit: string;
};
export type SystemPolicy = PolicyPayload & {
  policyId: number;
  version: number;
  systemPolicy: boolean;
  updatedAt: string;
};
export type PolicyUser = { userId: number; userName: string };
export type PolicyHistory = {
  action: string;
  changedBy: string;
  changedAt: string;
  beforeValue: unknown;
  afterValue: unknown;
};
export const POLICY_TYPES: Record<PolicyValueType, string> = {
  BOOLEAN: '사용 여부', NUMBER: '숫자', SELECT: '선택값',
  TEXT: '문자열', DATE: '날짜', USER_LIST: '사용자 목록',
};
export function newPolicy(): PolicyPayload {
  return {
    policyCode: '', policyName: '', category: '공통', description: '',
    valueType: 'BOOLEAN', value: false, options: [], minValue: null, maxValue: null, unit: '',
  };
}
export function initialPolicyValue(type: PolicyValueType): PolicyValue {
  if (type === 'BOOLEAN') return false;
  if (type === 'NUMBER') return 0;
  if (type === 'USER_LIST') return [];
  return '';
}
export const ZERO_MODE_LABELS = { FIXED: '항상 표시 (예: 1.50)', AUTO: '있을 때만 표시 (예: 1.5)' } as const;
export const ROUNDING_LABELS = { HALF_UP: '반올림', UP: '올림', DOWN: '내림' } as const;

/** 그리드 소수점 정책(GRID_DECIMAL_*)은 자릿수 외에 0 표시·반올림 방식을 한 값(객체)으로 관리한다. */
export function isGridDecimalPolicy(policy: Pick<PolicyPayload, 'policyCode' | 'valueType'>): boolean {
  return policy.valueType === 'NUMBER' && policy.policyCode.startsWith('GRID_DECIMAL_');
}
export function toGridDecimalValue(value: PolicyValue): GridDecimalPolicyValue {
  if (value !== null && typeof value === 'object' && !Array.isArray(value) && 'places' in value) {
    return {
      places: Number(value.places),
      trailingZeros: value.trailingZeros === 'AUTO' ? 'AUTO' : 'FIXED',
      rounding: value.rounding === 'UP' || value.rounding === 'DOWN' ? value.rounding : 'HALF_UP',
    };
  }
  return { places: value === '' ? Number.NaN : Number(value), trailingZeros: 'FIXED', rounding: 'HALF_UP' };
}
export function isGridDecimalTypeValues(value: PolicyValue): value is GridDecimalTypeValues {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && 'number' in value && 'decimal' in value && 'currency' in value;
}
export function defaultGridDecimalTypeValues(): GridDecimalTypeValues {
  const rule = (places: number): GridDecimalPolicyValue => ({ places, trailingZeros: 'FIXED', rounding: 'HALF_UP' });
  return { number: rule(0), decimal: rule(3), currency: rule(3) };
}
export function toGridDecimalTypeValues(value: PolicyValue): GridDecimalTypeValues {
  if (isGridDecimalTypeValues(value)) return value;
  const rule = toGridDecimalValue(value);
  return { number: { ...rule }, decimal: { ...rule }, currency: { ...rule } };
}
export function policyValueLabel(policy: SystemPolicy): string {
  if (isGridDecimalPolicy(policy)) {
    if (isGridDecimalTypeValues(policy.value)) {
      const value = policy.value;
      return (['number', 'decimal', 'currency'] as const).map((type) => `${type}: ${value[type].places}${policy.unit || '자리'}`).join(' · ');
    }
    const rule = toGridDecimalValue(policy.value);
    return `${rule.places}${policy.unit || '자리'} · ${rule.trailingZeros === 'AUTO' ? '0 있을 때만' : '0 항상'} · ${ROUNDING_LABELS[rule.rounding]}`;
  }
  if (policy.valueType === 'BOOLEAN') return policy.value ? '사용' : '미사용';
  if (policy.valueType === 'USER_LIST') return `${Array.isArray(policy.value) ? policy.value.length : 0}명 선택`;
  if (policy.valueType === 'SELECT') return policy.options.find((item) => item.value === policy.value)?.label ?? String(policy.value);
  return `${policy.value}${policy.valueType === 'NUMBER' && policy.unit ? ` ${policy.unit}` : ''}`;
}
export function validatePolicy(draft: PolicyPayload): string {
  if (!/^[A-Z][A-Z0-9_]{1,79}$/.test(draft.policyCode)) return '정책 코드는 영문 대문자로 시작하는 2~80자의 영문·숫자·밑줄로 입력하세요.';
  if (!draft.policyName.trim() || draft.policyName.length > 100) return '정책 이름은 1~100자로 입력하세요.';
  if (!draft.category.trim() || draft.category.length > 80) return '분류는 1~80자로 입력하세요.';
  if (draft.description.length > 1000) return '설명은 1000자 이내로 입력하세요.';
  if (draft.valueType === 'NUMBER') {
    if (isGridDecimalPolicy(draft) && isGridDecimalTypeValues(draft.value)) {
      const rules = Object.values(draft.value);
      if (rules.some((rule) => !Number.isInteger(rule.places) || rule.places < 0 || rule.places > 6)) return '소수점 자릿수는 0~6의 정수로 입력하세요.';
      if (draft.minValue !== null && draft.maxValue !== null && draft.minValue > draft.maxValue) return '최솟값은 최댓값 이하여야 합니다.';
      if (rules.some((rule) => (draft.minValue !== null && rule.places < draft.minValue) || (draft.maxValue !== null && rule.places > draft.maxValue))) return '정책값이 허용 범위를 벗어났습니다.';
      return '';
    }
    const places = isGridDecimalPolicy(draft) ? toGridDecimalValue(draft.value).places : draft.value;
    if (places === '' || !Number.isFinite(Number(places))) return '정책값에 유효한 숫자를 입력하세요.';
    if (isGridDecimalPolicy(draft) && !Number.isInteger(Number(places))) return '소수점 자릿수는 정수로 입력하세요.';
    if (draft.minValue !== null && draft.maxValue !== null && draft.minValue > draft.maxValue) return '최솟값은 최댓값 이하여야 합니다.';
    if ((draft.minValue !== null && Number(places) < draft.minValue)
      || (draft.maxValue !== null && Number(places) > draft.maxValue)) return '정책값이 허용 범위를 벗어났습니다.';
  }
  if (draft.valueType === 'SELECT') {
    if (!draft.options.length || draft.options.length > 50
      || draft.options.some((option) => !option.value.trim() || !option.label.trim() || option.value.length > 100 || option.label.length > 100)
      || new Set(draft.options.map((option) => option.value.trim())).size !== draft.options.length) return '선택지의 값·표시명을 입력하고 중복된 값을 제거하세요.';
    if (!draft.options.some((option) => option.value.trim() === draft.value)) return '정책값을 선택하세요.';
  }
  if (draft.valueType === 'TEXT' && String(draft.value).length > 2000) return '정책값은 2000자 이내로 입력하세요.';
  if (draft.valueType === 'DATE' && (!/^\d{4}-\d{2}-\d{2}$/.test(String(draft.value))
    || !Number.isFinite(Date.parse(String(draft.value)))
    || new Date(String(draft.value)).toISOString().slice(0, 10) !== draft.value)) return '올바른 날짜를 입력하세요.';
  return '';
}
