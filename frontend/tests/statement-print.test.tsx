import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { StatementPrint } from '../src/pages/sales/shipment/statement/components/StatementPrint';
import { StatementDetailPanel } from '../src/pages/sales/shipment/statement/status/components/StatementDetailPanel';
import { createStatementStatusColumns } from '../src/pages/sales/shipment/statement/status/data/statementStatusColumns';
import type { StatementItem } from '../src/pages/sales/shipment/statement/types/salesStatement.types';
import * as decimalContext from '../src/shared/components/f1-grid/core/gridDecimalPolicyContext';
import * as decimalColumns from '../src/shared/services/decimalColumnContract';

const item: StatementItem = {
  salesStatementId: 3,
  salesDeliveryId: 1,
  statementNo: 'TS-1',
  statementDt: '2026-11-09',
  deliveryNo: 'SD-1',
  deliveryDt: '2026-11-09',
  deliveryType: 'DIRECT',
  orderNo: null,
  supplierName: '공급자',
  customerName: '거래처',
  totalAmt: 220,
  details: [{
    salesStatementDetailId: 2,
    lineNo: 1,
    materialCode: 'M1',
    materialName: '품목',
    materialSpec: '규격',
    unit: 'EA',
    deliveryQty: 2,
    unitPrice: 100,
    supplyAmt: 200,
    vatAmt: 20,
    totalAmt: 220,
  }],
};

beforeEach(() => {
  document.body.classList.remove('statement-printing');
  window.print = vi.fn();
});

it('prints copied shipment detail values using their source column rules', () => {
  const rule = { places: 3, rounding: 'DOWN', trailingZeros: 'FIXED' } as const;
  const policy = vi.spyOn(decimalContext, 'usePolicyDecimalRule').mockReturnValue({ number: rule, decimal: rule, currency: rule });
  const original = decimalColumns.getDecimalColumnContract('sales.delivery');
  const contract = vi.spyOn(decimalColumns, 'getDecimalColumnContract').mockReturnValue({
    ...original, deliveryQty: { type: 'number', places: 1 }, unitPrice: { type: 'decimal', places: 2 },
    supplyAmt: { type: 'currency', places: 1 }, vatAmt: { type: 'currency', places: 2 },
  });
  try {
    render(<StatementPrint item={item} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: '거래명세표 미리보기' });
    const cells = dialog.querySelectorAll('.statement-print-items tbody tr:first-child td');
    expect(cells[2]).toHaveTextContent('2.0 EA');
    expect(cells[3]).toHaveTextContent(/^100\.00$/);
    expect(cells[4]).toHaveTextContent(/^200\.0$/);
    expect(cells[5]).toHaveTextContent(/^20\.00$/);
    expect(within(dialog).getAllByText('₩220.000')).toHaveLength(2);
  } finally { contract.mockRestore(); policy.mockRestore(); }
});

it('uses shipment source rules in statement detail and status columns', async () => {
  const rule = { places: 3, rounding: 'DOWN', trailingZeros: 'FIXED' } as const;
  const policy = vi.spyOn(decimalContext, 'usePolicyDecimalRule').mockReturnValue({ number: rule, decimal: rule, currency: rule });
  const original = decimalColumns.getDecimalColumnContract('sales.delivery');
  const contract = vi.spyOn(decimalColumns, 'getDecimalColumnContract').mockReturnValue({
    ...original, deliveryQty: { type: 'number', places: 1 }, unitPrice: { type: 'decimal', places: 2 },
    totalAmt: { type: 'currency', places: 2 },
  });
  try {
    const { statementDetailColumns } = await import('../src/pages/sales/shipment/statement/create/data/statementDetailColumns');
    expect(statementDetailColumns.find((column) => column.field === 'unitPrice')).toMatchObject({ decimal: { places: 2 } });
    expect(createStatementStatusColumns(() => undefined).find((column) => column.field === 'lineTotalAmt'))
      .toMatchObject({ decimal: { places: 2 } });
    render(<StatementDetailPanel item={item} loading={false} error="" canEdit={false} onClose={vi.fn()}
      onView={vi.fn()} onEdit={vi.fn()} onPrint={vi.fn()} />);
    const table = screen.getByRole('table', { name: '거래명세서 품목 목록' });
    expect(within(table).getByText('2.0', { exact: true })).toBeInTheDocument();
    expect(within(table).getByText('100.00', { exact: true })).toBeInTheDocument();
    expect(within(table).getByText('220.00', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('220.000', { exact: true })).toBeInTheDocument();
  } finally { contract.mockRestore(); policy.mockRestore(); }
});

it('uses the shared amount wording and limits the body print class to the print call', () => {
  window.print = vi.fn(() => {
    expect(document.body.classList.contains('statement-printing')).toBe(true);
  });
  render(<StatementPrint item={item} onClose={vi.fn()} />);

  const dialog = screen.getByRole('dialog', { name: '거래명세표 미리보기' });
  expect(within(dialog).getAllByText('이백이십원 정')).toHaveLength(2);

  fireEvent.click(within(dialog).getByRole('button', { name: '인쇄' }));

  expect(window.print).toHaveBeenCalledOnce();
  expect(document.body.classList.contains('statement-printing')).toBe(false);
});

it('preserves a statement print class owned by its caller', () => {
  document.body.classList.add('statement-printing');
  render(<StatementPrint item={item} onClose={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: '인쇄' }));

  expect(window.print).toHaveBeenCalledOnce();
  expect(document.body.classList.contains('statement-printing')).toBe(true);
});
