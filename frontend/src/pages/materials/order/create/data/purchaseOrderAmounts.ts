import {
  calculateSalesOrderAmounts,
  roundSalesOrderAmount,
} from '../../../../sales/order/create/data/salesOrderAmounts';
import type { PurchaseOrderTaxType } from '../types/purchaseOrder.types';

export type PurchaseOrderAmounts = {
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
};

const ZERO: PurchaseOrderAmounts = { supplyAmt: 0, vatAmt: 0, totalAmt: 0 };

/** 영세·면세는 부가세가 없으므로 포함 여부와 세액 입력을 쓰지 않는다. */
export function isTaxable(taxType: PurchaseOrderTaxType): boolean {
  return taxType === 'TAXABLE';
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * 발주 행 금액. 서버(PurchaseOrderAmountCalculator)와 같은 규칙이다.
 * 과세·미포함: 공급가 = 수량×단가, 세액 = 공급가×10%
 * 과세·포함: 공급가 = 수량×단가÷1.1, 세액 = 수량×단가 − 공급가
 * 영세·면세: 세액 0. vatOverride가 있으면 과세일 때 세액을 대체하고 합계를 다시 계산한다.
 */
export function calculateOrderAmounts(
  qty: unknown,
  unitPrice: unknown,
  taxType: PurchaseOrderTaxType,
  vatIncluded: boolean,
  vatOverride: number | null = null,
): PurchaseOrderAmounts {
  const quantity = toNumber(qty);
  const price = toNumber(unitPrice);
  if (quantity === null || price === null || quantity < 0 || price < 0) return { ...ZERO };

  const gross = calculateSalesOrderAmounts(quantity, price).supplyAmount;
  if (!isTaxable(taxType)) {
    return { supplyAmt: gross, vatAmt: 0, totalAmt: gross };
  }
  let supplyAmt = gross;
  let vatAmt: number;
  if (vatIncluded) {
    supplyAmt = roundSalesOrderAmount(gross / 1.1);
    vatAmt = roundSalesOrderAmount(gross - supplyAmt);
  } else {
    vatAmt = roundSalesOrderAmount(supplyAmt / 10);
  }
  if (vatOverride !== null && vatOverride >= 0) {
    vatAmt = roundSalesOrderAmount(vatOverride);
    return { supplyAmt, vatAmt, totalAmt: roundSalesOrderAmount(supplyAmt + vatAmt) };
  }
  const totalAmt = vatIncluded ? gross : roundSalesOrderAmount(supplyAmt + vatAmt);
  return { supplyAmt, vatAmt, totalAmt };
}

export function sumOrderAmounts(rows: PurchaseOrderAmounts[]): PurchaseOrderAmounts {
  const cents = rows.reduce(
    (sum, row) => ({
      supplyAmt: sum.supplyAmt + Math.round(row.supplyAmt * 100),
      vatAmt: sum.vatAmt + Math.round(row.vatAmt * 100),
      totalAmt: sum.totalAmt + Math.round(row.totalAmt * 100),
    }),
    { supplyAmt: 0, vatAmt: 0, totalAmt: 0 },
  );
  return {
    supplyAmt: cents.supplyAmt / 100,
    vatAmt: cents.vatAmt / 100,
    totalAmt: cents.totalAmt / 100,
  };
}
