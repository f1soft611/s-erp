export type SalesOrderAmounts = {
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
};

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

export function roundSalesOrderAmount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('금액은 0 이상의 유한한 숫자여야 합니다.');
  }
  return fromMinorUnits(toMinorUnits(value), '금액');
}

export function calculateSalesOrderAmounts(
  quantity: number,
  unitPrice: number,
): SalesOrderAmounts {
  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(unitPrice) ||
    quantity < 0 ||
    unitPrice < 0
  ) {
    throw new Error('주문수량과 단가는 0 이상의 유한한 숫자여야 합니다.');
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
): SalesOrderAmounts {
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
