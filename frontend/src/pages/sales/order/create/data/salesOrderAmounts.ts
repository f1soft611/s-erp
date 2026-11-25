export type SalesOrderAmounts = {
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
};

export type SalesAmountRule = {
  places: number;
  rounding: 'HALF_UP' | 'UP' | 'DOWN';
  trailingZeros?: 'FIXED' | 'AUTO';
};

export type SalesAmountColumnRules = {
  supplyAmount: SalesAmountRule;
  vatAmount: SalesAmountRule;
  totalAmount: SalesAmountRule;
};

export function formatSalesOrderAmount(value: number | string, rule?: SalesAmountRule): string {
  if (typeof value === 'string') {
    return formatExactSalesDecimal(value, rule ?? { places: 2, rounding: 'HALF_UP' });
  }
  const places = rule?.places ?? 2;
  return (rule ? roundSalesOrderAmount(value, '금액', rule) : value).toLocaleString('ko-KR', {
    minimumFractionDigits: rule?.trailingZeros === 'AUTO' ? 0 : places,
    maximumFractionDigits: places,
  });
}

function decimalParts(value: number): { digits: bigint; scale: number } {
  const [coefficient, exponentText] = value.toString().toLowerCase().split('e');
  const [integer, fraction = ''] = coefficient.split('.');
  return { digits: BigInt(integer + fraction), scale: fraction.length - Number(exponentText ?? 0) };
}

export function isSalesPolicyNumber(value: number, places: number): boolean {
  if (!Number.isFinite(value) || value < 0 || value >= 10_000_000_000_000) return false;
  const parsed = decimalParts(value);
  return parsed.scale <= places || parsed.digits % 10n ** BigInt(parsed.scale - places) === 0n;
}

function applyRule(digits: bigint, sourceScale: number, rule: SalesAmountRule): bigint {
  const shift = rule.places - sourceScale;
  if (shift >= 0) return digits * 10n ** BigInt(shift);
  const divisor = 10n ** BigInt(-shift);
  const quotient = digits / divisor;
  const remainder = digits % divisor;
  return quotient + (
    (rule.rounding === 'UP' && remainder > 0n) ||
    (rule.rounding === 'HALF_UP' && remainder * 2n >= divisor) ? 1n : 0n
  );
}

function exactParts(value: string): { digits: bigint; scale: number } {
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) || value.length > 256) {
    throw new Error('0 이상의 유효한 십진수를 입력해 주세요.');
  }
  const [integer, fraction = ''] = value.split('.');
  return { digits: BigInt((integer || '0') + fraction), scale: fraction.length };
}

function exactResult(units: bigint, places: number): string {
  if (units < 0n || units >= 10_000_000_000_000n * 10n ** BigInt(places)) {
    throw new Error('계산 결과가 지원 범위를 초과했습니다.');
  }
  const text = units.toString().padStart(places + 1, '0');
  return places ? `${text.slice(0, -places)}.${text.slice(-places)}` : text;
}

export function isExactSalesPolicyNumber(value: string, places: number): boolean {
  if (!Number.isInteger(places) || places < 0 || places > 6) return false;
  try {
    const parsed = exactParts(value);
    if (parsed.digits >= 10_000_000_000_000n * 10n ** BigInt(parsed.scale)) return false;
    return parsed.scale <= places || parsed.digits % 10n ** BigInt(parsed.scale - places) === 0n;
  } catch {
    return false;
  }
}

export function addExactSalesDecimals(left: string, right: string, rule: SalesAmountRule): string {
  const first = exactParts(left);
  const second = exactParts(right);
  const scale = Math.max(first.scale, second.scale);
  const sum = first.digits * 10n ** BigInt(scale - first.scale)
    + second.digits * 10n ** BigInt(scale - second.scale);
  return exactResult(applyRule(sum, scale, rule), rule.places);
}

export function subtractExactSalesDecimals(left: string, right: string, rule: SalesAmountRule): string {
  const first = exactParts(left);
  const second = exactParts(right);
  const scale = Math.max(first.scale, second.scale);
  const difference = first.digits * 10n ** BigInt(scale - first.scale)
    - second.digits * 10n ** BigInt(scale - second.scale);
  return exactResult(applyRule(difference > 0n ? difference : 0n, scale, rule), rule.places);
}

export function multiplyExactSalesDecimals(left: string, right: string, rule: SalesAmountRule): string {
  const first = exactParts(left);
  const second = exactParts(right);
  return exactResult(applyRule(first.digits * second.digits, first.scale + second.scale, rule), rule.places);
}

export function sumExactSalesAmounts(
  lines: { supplyAmount: number | string; vatAmount: number | string; totalAmount: number | string }[],
  rule: SalesAmountRule,
  columns?: SalesAmountColumnRules,
): { supplyAmount: string; vatAmount: string; totalAmount: string } {
  const sum = (field: 'supplyAmount' | 'vatAmount' | 'totalAmount') =>
    sumExactSalesDecimals(lines.map((row) => String(row[field])), columns?.[field] ?? rule);
  return { supplyAmount: sum('supplyAmount'), vatAmount: sum('vatAmount'), totalAmount: sum('totalAmount') };
}

export function sumExactSalesDecimals(values: string[], rule: SalesAmountRule): string {
  const parts = values.map(exactParts);
  const scale = parts.reduce((max, value) => Math.max(max, value.scale), 0);
  const total = parts.reduce((acc, value) => acc + value.digits * 10n ** BigInt(scale - value.scale), 0n);
  return exactResult(applyRule(total, scale, rule), rule.places);
}

export function calculateExactSalesAmounts(
  quantity: string,
  unitPrice: string,
  rule: SalesAmountRule,
  columns?: SalesAmountColumnRules,
): { supplyAmount: string; vatAmount: string; totalAmount: string } {
  const supply = multiplyExactSalesDecimals(quantity, unitPrice, columns?.supplyAmount ?? rule);
  const vat = multiplyExactSalesDecimals(supply, '0.1', columns?.vatAmount ?? rule);
  return {
    supplyAmount: supply,
    vatAmount: vat,
    totalAmount: addExactSalesDecimals(supply, vat, columns?.totalAmount ?? rule),
  };
}

export function formatExactSalesDecimal(value: string, rule: SalesAmountRule): string {
  const parsed = exactParts(value);
  const digits = applyRule(parsed.digits, parsed.scale, rule).toString().padStart(rule.places + 1, '0');
  const integer = rule.places ? digits.slice(0, -rule.places) : digits;
  const fraction = rule.places ? digits.slice(-rule.places) : '';
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const displayedFraction = rule.trailingZeros === 'AUTO' ? fraction?.replace(/0+$/, '') : fraction;
  return displayedFraction ? `${grouped}.${displayedFraction}` : grouped;
}

function policyResult(value: bigint, rule: SalesAmountRule, label: string): number {
  const numeric = Number(`${value}e${-rule.places}`);
  if (!Number.isFinite(numeric) || numeric >= 10_000_000_000_000) {
    throw new Error(`${label} 계산 결과가 지원 범위를 초과했습니다.`);
  }
  const parsed = decimalParts(numeric);
  if (applyRule(parsed.digits, parsed.scale, { places: rule.places, rounding: 'DOWN' }) !== value) {
    throw new Error(`${label} 계산 결과의 정밀도를 표현할 수 없습니다.`);
  }
  return numeric;
}

export function addSalesOrderAmounts(left: number, right: number, rule: SalesAmountRule, label: string): number {
  const first = decimalParts(left);
  const second = decimalParts(right);
  const scale = Math.max(first.scale, second.scale);
  const sum = first.digits * 10n ** BigInt(scale - first.scale)
    + second.digits * 10n ** BigInt(scale - second.scale);
  return policyResult(applyRule(sum, scale, rule), rule, label);
}

export function subtractSalesOrderAmounts(left: number, right: number, rule: SalesAmountRule, label: string): number {
  if (!Number.isFinite(left) || !Number.isFinite(right) || left < 0 || right < 0) {
    throw new Error('수량은 0 이상의 유한한 숫자여야 합니다.');
  }
  const first = decimalParts(left);
  const second = decimalParts(right);
  const scale = Math.max(first.scale, second.scale);
  const difference = first.digits * 10n ** BigInt(scale - first.scale)
    - second.digits * 10n ** BigInt(scale - second.scale);
  return policyResult(applyRule(difference > 0n ? difference : 0n, scale, rule), rule, label);
}

export function multiplySalesOrderAmount(left: number, right: number, rule: SalesAmountRule, label: string): number {
  if (!Number.isFinite(left) || !Number.isFinite(right) || left < 0 || right < 0) {
    throw new Error('수량과 단가는 0 이상의 유한한 숫자여야 합니다.');
  }
  const first = decimalParts(left);
  const second = decimalParts(right);
  return policyResult(applyRule(first.digits * second.digits, first.scale + second.scale, rule), rule, label);
}

function toMinorUnits(value: number): bigint {
  const [coefficient, exponentText] = value.toString().toLowerCase().split('e');
  const exponent = exponentText ? Number(exponentText) : 0;
  const negative = coefficient.startsWith('-');
  const unsigned = negative ? coefficient.slice(1) : coefficient;
  const [integerPart, fractionalPart = ''] = unsigned.split('.');
  const digits = BigInt(`${integerPart}${fractionalPart}`);
  const scale = 2 - fractionalPart.length + exponent;
  const absolute =
    scale >= 0
      ? digits * 10n ** BigInt(scale)
      : (digits + 10n ** BigInt(-scale) / 2n) /
        10n ** BigInt(-scale);
  return negative ? -absolute : absolute;
}

function roundMinorUnits(value: bigint, divisor: bigint): bigint {
  return (value + divisor / 2n) / divisor;
}

function fromMinorUnits(value: bigint, label: string): number {
  const numericValue = Number(value);
  if (!Number.isSafeInteger(numericValue)) {
    throw new Error(`${label} 계산 결과가 지원 범위를 초과했습니다.`);
  }
  return numericValue / 100;
}

export function roundSalesOrderAmount(value: number, label = '금액', rule?: SalesAmountRule): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('금액은 0 이상의 유한한 숫자여야 합니다.');
  }
  if (!rule) return fromMinorUnits(toMinorUnits(value), label);
  const parsed = decimalParts(value);
  return policyResult(applyRule(parsed.digits, parsed.scale, rule), rule, label);
}

export function calculateSalesOrderAmounts(
  quantity: number,
  unitPrice: number,
  rule?: SalesAmountRule,
  columns?: SalesAmountColumnRules,
): SalesOrderAmounts {
  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(unitPrice) ||
    quantity < 0 ||
    unitPrice < 0
  ) {
    throw new Error('주문수량과 단가는 0 이상의 유한한 숫자여야 합니다.');
  }
  if (rule) {
    if (columns) {
      const supplyAmount = multiplySalesOrderAmount(quantity, unitPrice, columns.supplyAmount, '계산된 공급가');
      const vatAmount = multiplySalesOrderAmount(supplyAmount, 0.1, columns.vatAmount, '계산된 부가세');
      return { supplyAmount, vatAmount,
        totalAmount: addSalesOrderAmounts(supplyAmount, vatAmount, columns.totalAmount, '계산된 합계') };
    }
    const qty = decimalParts(quantity);
    const price = decimalParts(unitPrice);
    const supply = applyRule(qty.digits * price.digits, qty.scale + price.scale, rule);
    const vat = applyRule(supply, rule.places + 1, rule);
    return {
      supplyAmount: policyResult(supply, rule, '계산된 공급가'),
      vatAmount: policyResult(vat, rule, '계산된 부가세'),
      totalAmount: policyResult(supply + vat, rule, '계산된 합계'),
    };
  }
  const supplyMinorUnits = roundMinorUnits(
    toMinorUnits(quantity) * toMinorUnits(unitPrice),
    100n,
  );
  const vatMinorUnits = roundMinorUnits(supplyMinorUnits, 10n);
  const totalMinorUnits = supplyMinorUnits + vatMinorUnits;
  return {
    supplyAmount: fromMinorUnits(supplyMinorUnits, '계산된 공급가'),
    vatAmount: fromMinorUnits(vatMinorUnits, '계산된 부가세'),
    totalAmount: fromMinorUnits(totalMinorUnits, '계산된 합계'),
  };
}

export function sumSalesOrderAmounts(
  lines: SalesOrderAmounts[],
  rule?: SalesAmountRule,
): SalesOrderAmounts {
  if (rule) {
    const sum = (field: keyof SalesOrderAmounts, label: string) => {
      const total = lines.reduce((acc, line) => {
        const parsed = decimalParts(line[field]);
        return acc + applyRule(parsed.digits, parsed.scale, rule);
      }, 0n);
      return policyResult(total, rule, label);
    };
    return {
      supplyAmount: sum('supplyAmount', '공급가 합계'),
      vatAmount: sum('vatAmount', '부가세 합계'),
      totalAmount: sum('totalAmount', '총 합계'),
    };
  }
  const totals = lines.reduce(
    (total, line) => ({
      supplyAmount: total.supplyAmount + toMinorUnits(line.supplyAmount),
      vatAmount: total.vatAmount + toMinorUnits(line.vatAmount),
      totalAmount: total.totalAmount + toMinorUnits(line.totalAmount),
    }),
    { supplyAmount: 0n, vatAmount: 0n, totalAmount: 0n },
  );
  return {
    supplyAmount: fromMinorUnits(totals.supplyAmount, '공급가 합계'),
    vatAmount: fromMinorUnits(totals.vatAmount, '부가세 합계'),
    totalAmount: fromMinorUnits(totals.totalAmount, '총 합계'),
  };
}
