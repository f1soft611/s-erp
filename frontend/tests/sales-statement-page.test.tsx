import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { SalesStatementCreatePage } from '../src/pages/sales/statement/SalesStatementCreatePage';
import { SalesStatementStatusPage } from '../src/pages/sales/statement/SalesStatementStatusPage';
import { createStatement, getStatement, getStatementStatus, searchStatementSources } from '../src/pages/sales/statement/statement.service';
import { getDelivery } from '../src/pages/sales/delivery/create/services/salesDelivery.service';
import type { ModuleItem } from '../src/pages/dashboard/types/dashboard';

vi.mock('../src/pages/sales/statement/statement.service', () => ({
  createStatement: vi.fn(), updateStatement: vi.fn(), deleteStatement: vi.fn(),
  getStatement: vi.fn(), getStatementStatus: vi.fn(), searchStatementSources: vi.fn(),
}));
vi.mock('../src/pages/sales/delivery/create/services/salesDelivery.service', async (original) => ({
  ...await original<object>(), getDelivery: vi.fn(),
}));
const source = { salesDeliveryId: 1, deliveryNo: 'SD-1', deliveryDt: '2026-11-09',
  deliveryType: 'DIRECT' as const, customerName: '거래처', totalAmt: 220 };
const detail = { salesStatementDetailId: 2, lineNo: 1, materialCode: 'M1', materialName: '품목',
  materialSpec: '규격', unit: 'EA', deliveryQty: 2, unitPrice: 100, supplyAmt: 200, vatAmt: 20, totalAmt: 220 };
const item = { ...source, salesStatementId: 3, statementNo: 'TS-1', statementDt: '2026-11-09',
  orderNo: null, supplierName: '공급자', supplierPostCode: '12345', supplierFacsimileNo: '02-555-0101',
  customerName: '거래처', customerPostCode: '54321', customerFacsimileNo: '02-555-0102', remark: '', details: [detail] };
const props = {
  selectedModule: { id: 'sales', tree: [{ pageKey: 'statement-create', permissions:
    { read: true, create: true, update: true, delete: true, excel: false } }] } as unknown as ModuleItem,
  currentMenuName: '거래명세서', content: { title: '거래명세서', description: '', cards: [], items: [] },
  breadcrumbItems: ['영업관리', '거래명세서'],
  selectedMenuPermissions: { read: true, create: true, update: true, delete: true, excel: false },
};
function mount(node: React.ReactNode) {
  render(<RouterProvider router={createMemoryRouter([{ path: '/', element: node }])} />);
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(searchStatementSources).mockResolvedValue([source]);
  vi.mocked(getStatement).mockResolvedValue(item);
  vi.mocked(getStatementStatus).mockResolvedValue([]);
});
it('selects one shipment and saves its server snapshot', async () => {
  vi.mocked(getDelivery).mockResolvedValue({
    ...source, salesDeliveryId: 1, customerId: 5, customerCode: 'C1', salesOrderId: null,
    orderNo: null, deliveryPlace: '', deliveryMethod: '', remark: '',
    details: [{ ...detail, salesDeliveryDetailId: 2, materialId: 4, salesOrderDetailId: null, salesDeliveryPlanDetailId: null }],
  });
  vi.mocked(createStatement).mockResolvedValue(item);
  mount(<SalesStatementCreatePage {...props} />);
  expect(screen.getByRole('region', { name: '거래명세서 입력 내용' })).toHaveStyle({
    paddingTop: '8px',
    paddingBottom: '16px',
  });
  fireEvent.click(screen.getByRole('button', { name: '출하 선택' }));
  const picker = screen.getByRole('dialog', { name: '출하 선택' });
  fireEvent.click(within(picker).getByRole('button', { name: '검색' }));
  fireEvent.click(await within(picker).findByRole('button', { name: 'SD-1' }));
  await screen.findByDisplayValue('SD-1');
  fireEvent.click(await screen.findByRole('button', { name: '저장', exact: true }));
  await screen.findByDisplayValue('TS-1');
  expect(createStatement).toHaveBeenCalledWith(expect.objectContaining({ salesDeliveryId: 1 }));
  expect(screen.getByRole('grid', { name: '거래명세서 상세 목록' })).toHaveTextContent('규격');
});
it('opens the same registration form from status detail and prints its stored snapshot', async () => {
  vi.mocked(getStatementStatus).mockResolvedValue([{ ...detail, salesStatementId: 3, statementNo: 'TS-1',
    statementDt: '2026-11-09', deliveryNo: 'SD-1', customerCode: 'C1', customerName: '거래처', lineTotalAmt: 220 }]);
  mount(<SalesStatementStatusPage {...props} />);
  expect(screen.getByTestId('sales-status-content')).toHaveStyle({
    paddingTop: '8px',
    paddingBottom: '16px',
  });
  fireEvent.click(await screen.findByRole('button', { name: 'TS-1 상세 보기' }));
  const panel = await screen.findByRole('region', { name: '거래명세서 상세' });
  await within(panel).findByRole('table', { name: '거래명세서 품목 목록' });
  fireEvent.click(within(panel).getByRole('button', { name: '거래명세서 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = await screen.findByRole('dialog', { name: '거래명세서 수정' });
  expect(await within(dialog).findByDisplayValue('TS-1')).toBeInTheDocument();
  expect(within(dialog).getByRole('grid', { name: '거래명세서 상세 목록' })).toHaveTextContent('규격');
  fireEvent.click(within(dialog).getByRole('button', { name: '출력' }));
  const print = await screen.findByRole('dialog', { name: '거래명세표 미리보기' });
  expect(within(print).getAllByText('공급자', { selector: 'td' })).toHaveLength(2);
  for (const value of ['규격', '12345', '54321', '02-555-0101', '02-555-0102', 'M1']) {
    expect(print).toHaveTextContent(value);
  }
  await waitFor(() => expect(getStatement).toHaveBeenCalledWith(3));
});
