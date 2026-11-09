import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { StatementPrint } from '../src/pages/sales/statement/StatementPrint';
import type { StatementItem } from '../src/pages/sales/statement/types';

it('prints two identical copies on each sheet and preserves all item rows and the saved seal', () => {
  const rows = Array.from({ length: 25 }, (_, index) => ({
    salesStatementDetailId: index + 1, lineNo: index + 1, materialCode: `M${index + 1}`,
    materialName: `테스트품목${index + 1}`, materialSpec: '규격', unit: 'EA',
    deliveryQty: 1, unitPrice: 100, supplyAmt: 100, vatAmt: 10, totalAmt: 110,
  }));
  const item: StatementItem = {
    salesStatementId: 1, salesDeliveryId: 1, statementNo: 'TS-1', statementDt: '2026-11-09',
    deliveryNo: 'SD-1', deliveryDt: '2026-11-09', deliveryType: 'DIRECT', orderNo: null,
    supplierName: '공급자', customerName: '거래처', supplierStampImage: 'data:image/png;base64,seal',
    totalAmt: 2750, details: rows,
  };
  render(<StatementPrint item={item} onClose={vi.fn()} />);
  const preview = screen.getByRole('dialog', { name: '거래명세표 미리보기' });
  const pages = preview.querySelectorAll('.statement-print-page');
  expect(pages).toHaveLength(3);
  expect(within(preview).getAllByText('이천칠백오십원 정')).toHaveLength(6);
  for (const page of pages) {
    expect(page.querySelectorAll('.statement-print-copy')).toHaveLength(2);
    expect(within(page as HTMLElement).getAllByAltText('회사 직인')).toHaveLength(2);
  }
  for (const row of rows) {
    expect(within(preview).getAllByText(new RegExp(`^${row.materialName} \\[`))).toHaveLength(2);
  }
});

it('reserves extra printable lines for long item names instead of putting twelve on one page', () => {
  const rows = Array.from({ length: 4 }, (_, index) => ({
    salesStatementDetailId: index + 1, lineNo: index + 1, materialCode: 'M',
    materialName: `품목${index + 1}${'긴품명'.repeat(60)}`, materialSpec: '규격', unit: 'EA',
    deliveryQty: 1, unitPrice: 100, supplyAmt: 100, vatAmt: 10, totalAmt: 110,
  }));
  const item: StatementItem = {
    salesStatementId: 1, salesDeliveryId: 1, statementNo: 'TS-1', statementDt: '2026-11-09',
    deliveryNo: 'SD-1', deliveryDt: '2026-11-09', deliveryType: 'DIRECT', orderNo: null,
    supplierName: '공급자', totalAmt: 440, details: rows,
  };
  render(<StatementPrint item={item} onClose={vi.fn()} />);
  const preview = screen.getByRole('dialog', { name: '거래명세표 미리보기' });
  expect(preview.querySelectorAll('.statement-print-page').length).toBeGreaterThan(1);
  for (const row of rows) expect(within(preview).getAllByText(new RegExp(`^품목${row.lineNo}긴품명`))).toHaveLength(2);
});
