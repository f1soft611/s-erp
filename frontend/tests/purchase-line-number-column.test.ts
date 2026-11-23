import { describe, expect, it } from 'vitest';
import { createPurchaseArrivalStatusColumns } from '../src/pages/materials/arrival/status/data/purchaseArrivalStatusColumns';
import { createPurchaseOrderStatusColumns } from '../src/pages/materials/order/status/data/purchaseOrderStatusColumns';
import { createClosingSupplierColumns } from '../src/pages/materials/receipt/closing/data/purchaseReceiptClosingColumns';
import { createPurchaseReceiptStatusColumns } from '../src/pages/materials/receipt/status/data/purchaseReceiptStatusColumns';
import { createPurchaseRequestConfirmColumns } from '../src/pages/materials/request/confirm/data/purchaseRequestConfirmColumns';
import { createPurchaseRequestDetailColumns } from '../src/pages/materials/request/create/data/purchaseRequestDetail';
import { createPurchaseRequestStatusColumns } from '../src/pages/materials/request/status/data/purchaseRequestStatusColumns';
import { createQualityInspectionStatusColumns } from '../src/pages/quality/inspect/status/data/qualityInspectionStatusColumns';

type AnyColumn = { field: unknown; headerName: string; type?: string; decimalPlaces?: number; decimal?: { places?: number } };

const lineNoColumn = (columns: AnyColumn[]) => columns.find((column) => column.field === 'lineNo');

describe('구매자재·수입검사 순번 열', () => {
  it.each([
    ['구매요청 현황', () => createPurchaseRequestStatusColumns()],
    ['구매 확정', () => createPurchaseRequestConfirmColumns({
      confirmEditable: true, closeEditable: true, warehouseOptions: [], orderTypeOptions: [],
    })],
    ['발주 현황', () => createPurchaseOrderStatusColumns()],
    ['가입고 현황', () => createPurchaseArrivalStatusColumns()],
    ['입고 현황', () => createPurchaseReceiptStatusColumns()],
    ['수입검사 현황', () => createQualityInspectionStatusColumns()],
  ])('%s: "행"이 아니라 "순번"이고 정책 소수점과 무관하게 정수로 보인다', (_name, create) => {
    const column = lineNoColumn(create() as unknown as AnyColumn[]);
    expect(column).toBeDefined();
    expect(column?.headerName).toBe('순번');
    expect(column?.type).toBe('number');
    expect(column?.decimalPlaces).toBe(0);
  });

  it('구매요청 등록의 행 번호 열 머리글도 순번이다', () => {
    const columns = createPurchaseRequestDetailColumns([], false) as unknown as AnyColumn[];
    expect(columns[0]).toMatchObject({ field: 'rowId', headerName: '순번', type: 'rownumber' });
    expect(columns.some((column) => column.headerName === '행')).toBe(false);
  });

  it('매입마감 왼쪽 구매처 요약은 No 열로 시작한다', () => {
    const columns = createClosingSupplierColumns() as unknown as AnyColumn[];
    expect(columns[0]).toMatchObject({ field: 'supplierId', headerName: 'No', type: 'rownumber' });
    expect(columns[1].headerName).toBe('구매처');
  });
});
