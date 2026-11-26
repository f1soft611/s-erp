import { describe, expect, it, vi } from 'vitest';
import {
  createSalesOrderDetailColumns,
  createSalesOrderDetailRow,
  duplicateSalesOrderDetailRow,
  resolveActiveSalesOrderRows,
} from '../src/pages/sales/order/create/data/salesOrderDetail';
import { validateGridRow } from '../src/shared/components/f1-grid/validation/GridValidation';
import { createQuotationDetailColumns, calculateQuotationTotals } from '../src/pages/sales/quotation/create/data/quotationDetail';
import { createSalesOrderStatusColumns } from '../src/pages/sales/order/status/data/salesOrderStatusColumns';
import { createQuotationStatusColumns } from '../src/pages/sales/quotation/status/data/quotationStatusColumns';
import { statementDetailColumns } from '../src/pages/sales/shipment/statement/create/data/statementDetailColumns';
import * as decimalColumns from '../src/shared/services/decimalColumnContract';

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
  it('uses shared field rules for order and quotation status columns', () => {
    const order = decimalColumns.getDecimalColumnContract('sales.order');
    const quotation = decimalColumns.getDecimalColumnContract('sales.quotation');
    const spy = vi.spyOn(decimalColumns, 'getDecimalColumnContract').mockImplementation((document) =>
      document === 'sales.order'
        ? { ...order, supplyAmount: { type: 'currency', places: 1 } }
        : { ...quotation, lineAmt: { type: 'decimal', places: 2 } });
    try {
      expect(createSalesOrderStatusColumns().find((column) => column.field === 'supplyAmt')).toMatchObject({
        type: 'currency', decimal: { places: 1 },
      });
      expect(createQuotationStatusColumns().find((column) => column.field === 'lineAmt')).toMatchObject({
        type: 'decimal', decimal: { places: 2 },
      });
    } finally { spy.mockRestore(); }
  });
  it('uses number for quantities, decimal for prices and currency for amounts without changing automatic row numbers', () => {
    const groups = [
      { columns: createSalesOrderDetailColumns(() => undefined), quantity: 'orderQty', price: 'unitPrice', amount: 'supplyAmount', row: 'rowId' },
      { columns: createQuotationDetailColumns(() => undefined), quantity: 'quotationQty', price: 'unitPrice', amount: 'lineAmt', row: 'rowId' },
      { columns: createSalesOrderStatusColumns(), quantity: 'orderQty', price: 'unitPrice', amount: 'supplyAmt', row: 'salesOrderDetailId' },
      { columns: createQuotationStatusColumns(), quantity: 'quotationQty', price: 'unitPrice', amount: 'lineAmt', row: 'quotationDetailId' },
      { columns: statementDetailColumns, quantity: 'deliveryQty', price: 'unitPrice', amount: 'supplyAmt', row: null },
    ];
    for (const { columns, quantity, price, amount, row } of groups) {
      expect(columns.find((column) => column.field === quantity)?.type).toBe('number');
      expect(columns.find((column) => column.field === price)?.type).toBe('decimal');
      expect(columns.find((column) => column.field === amount)?.type).toBe('currency');
      if (row) expect(columns.find((column) => column.field === row)?.type).toBe('rownumber');
    }
  });

  it('initializes a newly added row with the current header delivery date', () => {
    expect(createSalesOrderDetailRow('2026-11-30').deliveryDt).toBe('2026-11-30');
  });

  it('uses the No and progress-state column labels', () => {
    const columns = createSalesOrderDetailColumns(() => undefined);

    expect(columns.find((column) => column.field === 'rowId')?.headerName).toBe('No');
    expect(columns.find((column) => column.field === 'lineStatus')?.headerName).toBe('진행상태');
  });

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

  it('uses the sales decimal rule for calculated and manually edited amounts', () => {
    const columns = createSalesOrderDetailColumns(
      () => undefined, false, [], undefined, { places: 3, rounding: 'DOWN' },
    );
    const row = { ...createSalesOrderDetailRow(), orderQty: 1.234, unitPrice: 1.235 };
    const calculated = columns.find((column) => column.field === 'unitPrice')?.onValueChange?.(row, 1.235);
    expect(calculated).toMatchObject({ supplyAmount: 1.523, vatAmount: 0.152, totalAmount: 1.675 });
    const edited = columns.find((column) => column.field === 'vatAmount')
      ?.onValueChange?.({ ...row, ...calculated }, 0.123);
    expect(edited).toEqual({ vatAmount: 0.123, totalAmount: 1.646 });
  });

  it('uses each configured column rule when calculating exact order amounts', async () => {
    const contracts = await import('../src/shared/services/decimalColumnContract');
    const original = contracts.getDecimalColumnContract('sales.order');
    const spy = vi.spyOn(contracts, 'getDecimalColumnContract').mockReturnValue({
      ...original,
      supplyAmount: { type: 'currency', places: 2, rounding: 'HALF_UP' },
      vatAmount: { type: 'currency', places: 1, rounding: 'HALF_UP' },
      totalAmount: { type: 'currency', places: 3, rounding: 'DOWN' },
    });
    try {
      const columns = createSalesOrderDetailColumns(
        () => undefined, false, [], undefined, { places: 3, rounding: 'DOWN', trailingZeros: 'FIXED' },
      );
      const row = { ...createSalesOrderDetailRow(), orderQty: '1' };
      expect(columns.find((column) => column.field === 'supplyAmount')?.decimal?.places).toBe(2);
      expect(columns.find((column) => column.field === 'unitPrice')?.onValueChange?.(row, '1.235')).toMatchObject({
        supplyAmount: '1.24', vatAmount: '0.1', totalAmount: '1.340',
      });
    } finally { spy.mockRestore(); }
  });

  it('keeps entered exact unit prices and calculated totals as decimal strings', () => {
    const columns = createSalesOrderDetailColumns(
      () => undefined, false, [], undefined, { places: 6, rounding: 'DOWN' },
    );
    const row = { ...createSalesOrderDetailRow(), orderQty: '1' };
    const price = columns.find((column) => column.field === 'unitPrice');
    expect(price?.exactDecimal).toBe(true);
    const patch = price?.onValueChange?.(row, '1234567890123.100001');
    expect(patch).toMatchObject({
      unitPrice: '1234567890123.100001',
      supplyAmount: '1234567890123.100001',
      vatAmount: '123456789012.310000',
      totalAmount: '1358024679135.410001',
    });
  });

  it('uses the sales decimal policy to calculate quotation line amounts', () => {
    const columns = createQuotationDetailColumns(() => undefined, false, [], { places: 3, rounding: 'DOWN' });
    const price = columns.find((column) => column.field === 'unitPrice');
    const row = { rowId: 'q', materialId: null, materialCode: '', materialName: '품목', materialSpec: '',
      unit: '', quotationQty: 1.234, unitPrice: 1, lineAmt: 0, remark: '' };
    expect(price?.onValueChange?.(row, 1.235)).toMatchObject({ unitPrice: 1.235, lineAmt: 1.523 });
  });

  it('uses shared quotation column rules for line, supply, VAT and total', async () => {
    const contracts = await import('../src/shared/services/decimalColumnContract');
    const original = contracts.getDecimalColumnContract('sales.quotation');
    const spy = vi.spyOn(contracts, 'getDecimalColumnContract').mockReturnValue({
      ...original,
      lineAmt: { type: 'currency', places: 2, rounding: 'HALF_UP' },
      supplyAmt: { type: 'currency', places: 1, rounding: 'DOWN' },
      vatAmt: { type: 'currency', places: 2, rounding: 'UP' },
      totalAmt: { type: 'currency', places: 3, rounding: 'DOWN' },
    });
    try {
      const rule = { places: 3, rounding: 'DOWN' as const, trailingZeros: 'FIXED' as const };
      const columns = createQuotationDetailColumns(() => undefined, false, [], rule);
      const row = { rowId: 'q', materialId: null, materialCode: '', materialName: '품목', materialSpec: '',
        unit: '', quotationQty: '1', unitPrice: '0', lineAmt: '0', remark: '' };
      expect(columns.find((column) => column.field === 'lineAmt')?.decimal?.places).toBe(2);
      expect(columns.find((column) => column.field === 'unitPrice')?.onValueChange?.(row, '1.255'))
        .toMatchObject({ lineAmt: '1.26' });
      expect(calculateQuotationTotals([{ lineAmt: '1.26' }], rule)).toEqual({
        supplyAmt: '1.2', vatAmt: '0.12', totalAmt: '1.320',
      });
    } finally { spy.mockRestore(); }
  });

  it('calculates quotation prices from exact decimal strings', () => {
    const columns = createQuotationDetailColumns(() => undefined, false, [], { places: 6, rounding: 'DOWN' });
    const row = { rowId: 'q', materialId: null, materialCode: '', materialName: '품목', materialSpec: '',
      unit: '', quotationQty: '1', unitPrice: 1, lineAmt: 0, remark: '' };
    const price = columns.find((column) => column.field === 'unitPrice');
    expect(price?.exactDecimal).toBe(true);
    expect(price?.onValueChange?.(row, '1234567890123.100001')).toMatchObject({
      unitPrice: '1234567890123.100001', lineAmt: '1234567890123.100001',
    });
    expect(calculateQuotationTotals([{ lineAmt: '1234567890123.100001' }], { places: 6, rounding: 'DOWN' }))
      .toEqual({ supplyAmt: '1234567890123.100001', vatAmt: '123456789012.310000', totalAmt: '1358024679135.410001' });
  });

  it('sums quotation lines before applying the VAT policy', () => {
    expect(calculateQuotationTotals([{ lineAmt: 1.523 }, { lineAmt: 0.111 }], { places: 3, rounding: 'DOWN' }))
      .toEqual({ supplyAmt: 1.634, vatAmt: 0.163, totalAmt: 1.797 });
  });

  it('sums numeric quotation lines exactly when line precision exceeds header precision', () => {
    const original = decimalColumns.getDecimalColumnContract('sales.quotation');
    const spy = vi.spyOn(decimalColumns, 'getDecimalColumnContract').mockReturnValue({
      ...original, lineAmt: { type: 'currency', places: 3 },
    });
    try {
      expect(calculateQuotationTotals([{ lineAmt: 1.005 }, { lineAmt: 1.005 }],
        { places: 2, rounding: 'HALF_UP' })).toEqual({
        supplyAmt: '2.01', vatAmt: '0.20', totalAmt: '2.21',
      });
    } finally { spy.mockRestore(); }
  });

  it('rejects amount overflow and reports it without throwing from the cell editor', () => {
    const onCalculationError = vi.fn();
    const columns = createSalesOrderDetailColumns(
      () => undefined,
      false,
      [],
      onCalculationError,
    );
    const quantityColumn = columns.find((column) => column.field === 'orderQty');
    const row = { ...createSalesOrderDetailRow(), orderQty: 1, unitPrice: 1 };

    const patch = quantityColumn?.onValueChange?.(row, Number.MAX_VALUE);

    expect(patch).toEqual({});
    expect(onCalculationError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '계산된 공급가 계산 결과가 지원 범위를 초과했습니다.',
      }),
    );
    expect(row.orderQty).toBe(1);
  });

  it('rejects VAT overflow and keeps the previous VAT value', () => {
    const onCalculationError = vi.fn();
    const columns = createSalesOrderDetailColumns(
      () => undefined,
      false,
      [],
      onCalculationError,
    );
    const vatColumn = columns.find((column) => column.field === 'vatAmount');
    const row = { ...createSalesOrderDetailRow(), vatAmount: 12, totalAmount: 12 };

    const patch = vatColumn?.onValueChange?.(row, Number.MAX_VALUE);

    expect(patch).toEqual({});
    expect(onCalculationError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '부가세 계산 결과가 지원 범위를 초과했습니다.',
      }),
    );
    expect(row.vatAmount).toBe(12);
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
