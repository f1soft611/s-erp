import { describe, expect, it, vi } from 'vitest';
import {
  createSalesOrderDetailColumns,
  createSalesOrderDetailRow,
  duplicateSalesOrderDetailRow,
  resolveActiveSalesOrderRows,
} from '../src/pages/sales/order/create/data/salesOrderDetail';
import { validateGridRow } from '../src/shared/components/f1-grid/validation/GridValidation';

describe('sales order detail duplicate', () => {
  it('copies material, quantity, price and amounts with a new row id and resets shipment', () => {
    const source = {
      ...createSalesOrderDetailRow(),
      rowId: 'source',
      materialId: 20,
      materialCode: 'M-20',
      materialName: '품목 20',
      orderQty: 2,
      unitPrice: 100,
      supplyAmount: 200,
      vatAmount: 20,
      totalAmount: 220,
      deliveryDt: '2026-11-01',
      shippedQty: 1,
      lineStatus: '출하',
    };

    const copy = duplicateSalesOrderDetailRow(source);

    expect(copy.rowId).not.toBe('source');
    expect(copy.rowId).toMatch(/^order-line-/);
    expect(copy).toMatchObject({
      materialId: 20,
      materialCode: 'M-20',
      orderQty: 2,
      unitPrice: 100,
      totalAmount: 220,
      deliveryDt: '2026-11-01',
      shippedQty: 0,
      lineStatus: '대기',
    });
  });
});

describe('sales order active detail rows', () => {
  it('applies grid updates, deletions and insertions to the loaded rows', () => {
    const first = { ...createSalesOrderDetailRow(), rowId: 'a', totalAmount: 10 };
    const second = { ...createSalesOrderDetailRow(), rowId: 'b', totalAmount: 20 };
    const inserted = { ...createSalesOrderDetailRow(), rowId: 'c', totalAmount: 30 };

    const active = resolveActiveSalesOrderRows([first, second], {
      insertedRows: [inserted],
      updatedRows: [{ ...first, totalAmount: 11 }],
      deletedRows: [second],
    });

    expect(active.map((row) => [row.rowId, row.totalAmount])).toEqual([
      ['a', 11],
      ['c', 30],
    ]);
  });
});

describe('sales order detail grid', () => {
  it('recalculates VAT on quantity or price changes after a manual VAT edit', () => {
    const row = {
      ...createSalesOrderDetailRow(),
      orderQty: 3,
      unitPrice: 10.25,
    };
    const columns = createSalesOrderDetailColumns(() => undefined);
    const quantityColumn = columns.find((column) => column.field === 'orderQty');
    const priceColumn = columns.find((column) => column.field === 'unitPrice');
    const vatColumn = columns.find((column) => column.field === 'vatAmount');

    const amountPatch = priceColumn?.onValueChange?.(row, 10.25);
    expect(amountPatch).toMatchObject({
      supplyAmount: 30.75,
      vatAmount: 3.08,
      totalAmount: 33.83,
    });

    const manualVatPatch = vatColumn?.onValueChange?.(
      { ...row, ...amountPatch },
      2.5,
    );
    expect(manualVatPatch).toEqual({ vatAmount: 2.5, totalAmount: 33.25 });

    expect(
      quantityColumn?.onValueChange?.(
        { ...row, ...amountPatch, ...manualVatPatch },
        4,
      ),
    ).toMatchObject({
      supplyAmount: 41,
      vatAmount: 4.1,
      totalAmount: 45.1,
    });
  });

  it('marks material, quantity and price as required and validates them through F1-Grid rules', () => {
    const columns = createSalesOrderDetailColumns(() => undefined);
    const requiredFields = columns
      .filter((column) => column.required)
      .map((column) => column.field);
    expect(requiredFields).toEqual(['materialCode', 'orderQty', 'unitPrice']);

    const emptyErrors = validateGridRow(createSalesOrderDetailRow(), columns);
    expect(emptyErrors).toMatchObject({
      materialCode: '품목코드은(는) 필수입니다.',
      orderQty: '주문수량은 0보다 커야 합니다.',
    });
    expect(emptyErrors.unitPrice).toBeUndefined();

    expect(
      validateGridRow(
        {
          ...createSalesOrderDetailRow(),
          materialId: 20,
          materialCode: 'M-20',
          orderQty: 1,
          unitPrice: 0,
        },
        columns,
      ),
    ).toEqual({});
  });

  it('forwards the row patch callback to the material picker opener', () => {
    const onOpenMaterialPicker = vi.fn();
    const applyPatch = vi.fn();
    const row = createSalesOrderDetailRow();
    const codeColumn = createSalesOrderDetailColumns(onOpenMaterialPicker).find(
      (column) => column.field === 'materialCode',
    );

    codeColumn?.onOpenCodePicker?.(row, applyPatch);

    expect(onOpenMaterialPicker).toHaveBeenCalledWith(applyPatch);
  });
});
