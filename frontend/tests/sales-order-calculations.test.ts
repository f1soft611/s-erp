import { describe, expect, it } from 'vitest';
import {
  calculateSalesOrderAmounts,
  sumSalesOrderAmounts,
} from '../src/pages/sales/order/create/data/salesOrderAmounts';

describe('sales order amount calculations', () => {
  it('rounds supply and 10 percent VAT to two decimal places', () => {
    expect(calculateSalesOrderAmounts(3, 10.25)).toEqual({
      supplyAmount: 30.75,
      vatAmount: 3.08,
      totalAmount: 33.83,
    });
  });

  it('rounds half-cent supply amounts consistently for decimal inputs', () => {
    expect(calculateSalesOrderAmounts(401.5, 0.01)).toEqual({
      supplyAmount: 4.02,
      vatAmount: 0.4,
      totalAmount: 4.42,
    });
  });

  it('sums line amounts without recalculating manually overridden VAT', () => {
    expect(
      sumSalesOrderAmounts([
        { supplyAmount: 30.75, vatAmount: 2.5, totalAmount: 33.25 },
        { supplyAmount: 10, vatAmount: 1, totalAmount: 11 },
      ]),
    ).toEqual({
      supplyAmount: 40.75,
      vatAmount: 3.5,
      totalAmount: 44.25,
    });
  });

  it('rejects non-finite and negative inputs instead of producing invalid amounts', () => {
    expect(() => calculateSalesOrderAmounts(Number.POSITIVE_INFINITY, 10)).toThrow(
      '주문수량과 단가는 0 이상의 유한한 숫자여야 합니다.',
    );
    expect(() => calculateSalesOrderAmounts(1, -1)).toThrow(
      '주문수량과 단가는 0 이상의 유한한 숫자여야 합니다.',
    );
    expect(() => calculateSalesOrderAmounts(Number.MAX_VALUE, 2)).toThrow(
      '계산된 공급가 계산 결과가 지원 범위를 초과했습니다.',
    );
  });
});
