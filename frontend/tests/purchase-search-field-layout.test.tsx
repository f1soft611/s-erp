import { describe, expect, it } from 'vitest';
import { toPageSearchFields } from '../src/shared/components/page-search/searchFields';
import { createClosingSearchColumns } from '../src/pages/materials/receipt/closing/data/purchaseReceiptClosingColumns';
import { createPurchaseArrivalStatusColumns } from '../src/pages/materials/arrival/status/data/purchaseArrivalStatusColumns';
import { createPurchaseReceiptStatusColumns } from '../src/pages/materials/receipt/status/data/purchaseReceiptStatusColumns';
import { createPurchaseOrderStatusColumns } from '../src/pages/materials/order/status/data/purchaseOrderStatusColumns';
import { createPurchaseRequestStatusColumns } from '../src/pages/materials/request/status/data/purchaseRequestStatusColumns';
import { createQualityInspectionStatusColumns } from '../src/pages/quality/inspect/status/data/qualityInspectionStatusColumns';
import { createSalesOrderStatusColumns } from '../src/pages/sales/order/status/data/salesOrderStatusColumns';

type Layout = Array<[label: string, span: number, group: string]>;

const layoutOf = (columns: unknown[]): Layout =>
  toPageSearchFields(columns as never[]).map((field) => [field.label, field.searchSpan, field.group ?? '']);

/** 수주현황 기준: 날짜 기간 2칸, 텍스트·선택 1칸, 부가날짜 2칸. 줄은 날짜 → 텍스트 → 선택 → 부가날짜. */
describe('purchase status search fields follow the sales order status layout', () => {
  it('the reference (sales order status) uses span 2 for dates and span 1 for text/select', () => {
    const layout = layoutOf(createSalesOrderStatusColumns());
    expect(layout[0]).toEqual(['수주일자', 2, '수주일자']);
    expect(layout.filter(([, , group]) => group === '텍스트').every(([, span]) => span === 1)).toBe(true);
    expect(layout.filter(([, , group]) => group === '선택').every(([, span]) => span === 1)).toBe(true);
    expect(layout[layout.length - 1]).toEqual(['납기일자', 2, '부가날짜']);
  });

  it('purchase request status', () => {
    expect(layoutOf(createPurchaseRequestStatusColumns())).toEqual([
      ['요청일', 2, '요청일'],
      ['구매요청번호', 1, '텍스트'], ['요청자', 1, '텍스트'], ['품목', 1, '텍스트'],
      ['상태', 1, '선택'], ['사용용도', 1, '선택'],
      ['요청납기일', 2, '부가날짜'],
    ]);
  });

  it('purchase order status', () => {
    expect(layoutOf(createPurchaseOrderStatusColumns())).toEqual([
      ['발주일', 2, '발주일'],
      ['발주번호', 1, '텍스트'], ['구매처', 1, '텍스트'], ['품목', 1, '텍스트'],
      ['상태', 1, '선택'], ['출처', 1, '선택'], ['입고대기마감', 1, '선택'],
      ['납기일', 2, '부가날짜'],
    ]);
  });

  it('arrival status', () => {
    expect(layoutOf(createPurchaseArrivalStatusColumns())).toEqual([
      ['가입고일', 2, '가입고일'],
      ['가입고번호', 1, '텍스트'], ['구매처', 1, '텍스트'], ['발주번호', 1, '텍스트'], ['품목', 1, '텍스트'],
      ['상태', 1, '선택'],
    ]);
  });

  it('receipt status', () => {
    expect(layoutOf(createPurchaseReceiptStatusColumns())).toEqual([
      ['입고일', 2, '입고일'],
      ['입고번호', 1, '텍스트'], ['구매처', 1, '텍스트'], ['가입고번호', 1, '텍스트'], ['발주번호', 1, '텍스트'],
      ['품목', 1, '텍스트'],
      ['상태', 1, '선택'],
    ]);
  });

  it('inspection status', () => {
    expect(layoutOf(createQualityInspectionStatusColumns())).toEqual([
      ['검사일', 2, '검사일'],
      ['검사번호', 1, '텍스트'], ['검사자', 1, '텍스트'], ['가입고번호', 1, '텍스트'], ['구매처', 1, '텍스트'],
      ['발주번호', 1, '텍스트'], ['품목', 1, '텍스트'],
      ['상태', 1, '선택'],
    ]);
  });

  it('purchase closing', () => {
    expect(layoutOf(createClosingSearchColumns())).toEqual([
      ['입고일', 2, '입고일'],
      ['발주번호', 1, '텍스트'],
      ['마감월', 1, '선택'], ['조회구분', 1, '선택'],
    ]);
  });

  it('keeps the required, default and empty-choice settings of the status and date fields', () => {
    const fieldsOf = (columns: unknown[]) => toPageSearchFields(columns as never[]);
    for (const columns of [
      createPurchaseOrderStatusColumns(), createPurchaseArrivalStatusColumns(),
      createPurchaseReceiptStatusColumns(), createQualityInspectionStatusColumns(),
    ]) {
      const status = fieldsOf(columns).find((field) => field.label === '상태');
      expect(status).toMatchObject({ required: true, allowEmpty: false });
      const date = fieldsOf(columns)[0];
      expect(date).toMatchObject({ type: 'date', required: true });
      expect(date.defaultValue).toBeDefined();
    }
    const closing = fieldsOf(createClosingSearchColumns());
    expect(closing.find((field) => field.label === '마감월')).toMatchObject({ type: 'month', required: true });
    expect(closing.find((field) => field.label === '조회구분')).toMatchObject({ required: true, allowEmpty: false });
  });
});
