import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { StatementPrint } from '../src/pages/sales/shipment/statement/components/StatementPrint';
import type { StatementItem } from '../src/pages/sales/shipment/statement/types/salesStatement.types';

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
