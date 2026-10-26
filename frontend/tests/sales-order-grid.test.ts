import { describe, expect, it, vi } from 'vitest';
import {
  createSalesOrderDetailColumns,
  createSalesOrderDetailRow,
} from '../src/pages/sales/order/create/data/salesOrderDetail';

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
