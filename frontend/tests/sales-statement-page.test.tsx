import { Profiler } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { SalesStatementCreatePage } from '../src/pages/sales/shipment/statement/create/SalesStatementCreatePage';
import { SalesStatementStatusPage } from '../src/pages/sales/shipment/statement/status/SalesStatementStatusPage';
import { createStatement, getStatement, getStatementStatus, searchStatementSources, updateStatement } from '../src/pages/sales/shipment/statement/services/salesStatement.service';
import { getDelivery } from '../src/pages/sales/shipment/delivery/create/services/salesDelivery.service';
import type { ModuleItem } from '../src/pages/dashboard/types/dashboard';
import { getSystemDate } from '../src/shared/services/systemDateService';
import type { StatementItem, StatementStatusRow } from '../src/pages/sales/shipment/statement/types/salesStatement.types';

vi.mock('../src/shared/services/systemDateService', () => ({
  getSystemDate: vi.fn(),
}));
vi.mock('../src/pages/sales/shipment/statement/services/salesStatement.service', () => ({
  createStatement: vi.fn(), updateStatement: vi.fn(), deleteStatement: vi.fn(),
  getStatement: vi.fn(), getStatementStatus: vi.fn(), searchStatementSources: vi.fn(),
}));
vi.mock('../src/pages/sales/shipment/delivery/create/services/salesDelivery.service', async (original) => ({
  ...await original<object>(), getDelivery: vi.fn(),
}));
const source = { salesDeliveryId: 1, deliveryNo: 'SD-1', deliveryDt: '2026-11-09',
  deliveryType: 'DIRECT' as const, customerId: 5, customerName: '거래처', totalAmt: 220,
  salesDeliveryDetailIds: [2] };
const secondSource = { ...source, salesDeliveryId: 4, deliveryNo: 'SD-2', deliveryDt: '2026-11-10',
  salesDeliveryDetailIds: [3] };
const detail = { salesStatementDetailId: 2, salesDeliveryDetailId: 2, lineNo: 1, materialCode: 'M1', materialName: '품목',
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
  vi.mocked(getSystemDate).mockResolvedValue('2000-02-03');
  vi.mocked(searchStatementSources).mockResolvedValue([source]);
  vi.mocked(getStatement).mockResolvedValue(item);
  vi.mocked(getStatementStatus).mockResolvedValue([]);
});
it.each([false, true])('starts statement list loading in the first eligible page commit (initial permission: %s)', async (initialRead) => {
  const row: StatementStatusRow = { ...detail, salesStatementId: 3, statementNo: 'TS-1',
    statementDt: '2026-11-09', deliveryNo: 'SD-1', customerCode: 'C1', customerName: '거래처', lineTotalAmt: 220 };
  const requests: Array<{ resolve: (rows: StatementStatusRow[]) => void; reject: (error: Error) => void }> = [];
  vi.mocked(getStatementStatus).mockImplementation(() => new Promise<StatementStatusRow[]>((resolve, reject) => {
    requests.push({ resolve, reject });
  }));
  const commits: Array<boolean | null> = [];
  const page = (read: boolean) => <MemoryRouter><Profiler id="statement-list" onRender={() => {
    commits.push((screen.queryByRole('button', { name: '조회', exact: true }) as HTMLButtonElement | null)?.disabled ?? null);
  }}><SalesStatementStatusPage {...props} selectedMenuPermissions={{ ...props.selectedMenuPermissions, read }} /></Profiler></MemoryRouter>;
  const mounted = render(page(initialRead));
  if (!initialRead) {
    expect(requests).toHaveLength(0);
    commits.length = 0;
    mounted.rerender(page(true));
  }
  expect(commits[0]).toBe(true);
  await act(async () => requests[0].reject(new Error('Owned statement list failure')));
  expect(screen.getByText('Owned statement list failure')).toBeInTheDocument();
  commits.length = 0;
  fireEvent.click(screen.getByRole('button', { name: '조회', exact: true }));
  expect(commits[0]).toBe(true);
  await act(async () => requests[1].resolve([row]));
  const input = screen.getByRole('textbox', { name: '거래명세서현황 빠른 검색' });
  fireEvent.change(input, { target: { value: 'Owned changed' } });
  expect(requests).toHaveLength(2);
  commits.length = 0;
  fireEvent.click(screen.getByRole('button', { name: '조회', exact: true }));
  expect(commits[0]).toBe(true);
  mounted.rerender(page(false));
  mounted.rerender(page(true));
  expect(requests).toHaveLength(4);
  await act(async () => requests[2].resolve([{ ...row, statementNo: 'OWNED-STALE' }]));
  expect(screen.queryByRole('button', { name: 'OWNED-STALE 상세 보기' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '조회', exact: true })).toBeDisabled();
  await act(async () => requests[3].resolve([row]));
  expect(screen.getByRole('button', { name: 'TS-1 상세 보기' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '조회', exact: true })).toBeEnabled();
  expect(createStatement).not.toHaveBeenCalled();
  expect(updateStatement).not.toHaveBeenCalled();
});
it('starts statement detail loading in its first page commit and ignores a closed request on reopen', async () => {
  vi.mocked(getStatementStatus).mockResolvedValue([{ ...detail, salesStatementId: 3, statementNo: 'TS-1',
    statementDt: '2026-11-09', deliveryNo: 'SD-1', customerCode: 'C1', customerName: '거래처', lineTotalAmt: 220 }]);
  const requests: Array<{ resolve: (value: StatementItem) => void; reject: (error: Error) => void }> = [];
  vi.mocked(getStatement).mockImplementation(() => new Promise<StatementItem>((resolve, reject) => {
    requests.push({ resolve, reject });
  }));
  const commits: Array<{ loading: boolean; oldError: boolean }> = [];
  mount(<Profiler id="statement-detail" onRender={() => {
    const panel = screen.queryByRole('region', { name: '거래명세서 상세' });
    if (panel) commits.push({
      loading: Boolean(panel.querySelector('[data-testid="post-detail-panel-content"][role="status"]')),
      oldError: panel.textContent?.includes('Owned statement detail failure') ?? false,
    });
  }}><SalesStatementStatusPage {...props} /></Profiler>);
  const open = await screen.findByRole('button', { name: 'TS-1 상세 보기' });
  fireEvent.click(open);
  expect(commits[0]).toEqual({ loading: true, oldError: false });
  await act(async () => requests[0].reject(new Error('Owned statement detail failure')));
  expect(screen.getByText('Owned statement detail failure')).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('region', { name: '거래명세서 상세' })).getByRole('button', { name: '상세 닫기' }));
  commits.length = 0;
  fireEvent.click(open);
  expect(commits[0]).toEqual({ loading: true, oldError: false });
  fireEvent.click(within(screen.getByRole('region', { name: '거래명세서 상세' })).getByRole('button', { name: '상세 닫기' }));
  commits.length = 0;
  fireEvent.click(open);
  expect(commits[0]).toEqual({ loading: true, oldError: false });
  expect(requests).toHaveLength(3);
  await act(async () => requests[1].resolve({ ...item, statementNo: 'OWNED-STALE' }));
  const panel = screen.getByRole('region', { name: '거래명세서 상세' });
  expect(panel.querySelector('[data-testid="post-detail-panel-content"][role="status"]')).not.toBeNull();
  expect(panel).not.toHaveTextContent('OWNED-STALE');
  await act(async () => requests[2].resolve(item));
  expect(within(panel).getByRole('table', { name: '거래명세서 품목 목록' })).toBeInTheDocument();
  expect(createStatement).not.toHaveBeenCalled();
  expect(updateStatement).not.toHaveBeenCalled();
});
it('uses the server date as the initial statement date for a new statement', async () => {
  mount(<SalesStatementCreatePage {...props} />);

  expect(await screen.findByDisplayValue('2000-02-03')).toBeInTheDocument();
  expect(getSystemDate).toHaveBeenCalledOnce();
});
it('does not use the browser date when the server statement date cannot be loaded', async () => {
  vi.mocked(getSystemDate).mockRejectedValueOnce(new Error('offline'));
  mount(<SalesStatementCreatePage {...props} />);

  expect(await screen.findByText(/서버 기준일을 불러오지 못했습니다\./)).toBeInTheDocument();
  expect(screen.getByLabelText(/명세일/, { selector: 'input' })).toHaveValue('');
});
it('reloads the server date when starting a new statement', async () => {
  mount(<SalesStatementCreatePage {...props} />);
  const date = await screen.findByDisplayValue('2000-02-03');
  fireEvent.click(screen.getByRole('button', { name: '신규' }));

  await waitFor(() => expect(date).toHaveValue('2000-02-03'));
  expect(getSystemDate).toHaveBeenCalledTimes(2);
});
it('normalizes statement dates on blur and saves ISO without requiring blur', async () => {
  vi.mocked(updateStatement).mockResolvedValue(item);
  mount(<SalesStatementCreatePage {...props} statementId={3} />);
  await screen.findByDisplayValue('TS-1');
  expect(screen.getByRole('button', { name: '명세일 달력 열기' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '출하일자 달력 열기' })).toBeDisabled();
  const input = screen.getByLabelText(/명세일/, { selector: 'input' });
  fireEvent.change(input, { target: { value: '20261117' } });
  fireEvent.blur(input);
  expect(input).toHaveValue('2026-11-17');
  fireEvent.change(input, { target: { value: '261118' } });
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateStatement).toHaveBeenCalledWith(
    3, expect.objectContaining({ statementDt: '2026-11-18' }),
  ));
}, 15000);
it.each(['20260230', ''])('blocks an invalid or missing statement date: %s', async (value) => {
  mount(<SalesStatementCreatePage {...props} statementId={3} />);
  await screen.findByDisplayValue('TS-1');
  const input = screen.getByLabelText(/명세일/, { selector: 'input' });
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveValue(value);
  expect(updateStatement).not.toHaveBeenCalled();
});
it('disables the statement date and calendar in view mode', async () => {
  mount(<SalesStatementCreatePage {...props} statementId={3} mode="view" />);
  await screen.findByDisplayValue('TS-1');
  expect(screen.getByLabelText(/명세일/, { selector: 'input' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '명세일 달력 열기' })).toBeDisabled();
});
it('groups selected detail lines from multiple same-customer deliveries into one statement', async () => {
  vi.mocked(searchStatementSources).mockResolvedValue([source, secondSource]);
  vi.mocked(getDelivery)
    .mockResolvedValueOnce({
      ...source, customerCode: 'C1', salesOrderId: null, orderNo: null, deliveryPlace: '', deliveryMethod: '', remark: '',
      details: [
        { ...detail, salesDeliveryDetailId: 2, materialId: 4, salesOrderDetailId: null, salesDeliveryPlanDetailId: null },
        { ...detail, salesStatementDetailId: 99, salesDeliveryDetailId: 99, lineNo: 2, materialCode: 'ISSUED',
          materialId: 9, salesOrderDetailId: null, salesDeliveryPlanDetailId: null },
      ],
    })
    .mockResolvedValueOnce({
      ...secondSource, customerCode: 'C1', salesOrderId: null, orderNo: null, deliveryPlace: '', deliveryMethod: '', remark: '',
      details: [{ ...detail, salesStatementDetailId: 3, salesDeliveryDetailId: 3, lineNo: 1, materialCode: 'M2',
        materialId: 5, salesOrderDetailId: null, salesDeliveryPlanDetailId: null }],
    });
  vi.mocked(createStatement).mockResolvedValue(item);
  mount(<SalesStatementCreatePage {...props} />);
  expect(screen.getByRole('region', { name: '거래명세서 입력 내용' })).toHaveStyle({
    paddingTop: '16px',
    paddingLeft: '16px',
    paddingRight: '16px',
    paddingBottom: '16px',
  });
  expect(screen.getByRole('grid', { name: '거래명세서 상세 목록' }).parentElement).toHaveStyle({
    paddingLeft: '16px', paddingRight: '16px',
  });
  fireEvent.click(screen.getByRole('button', { name: '출하 선택' }));
  const picker = screen.getByRole('dialog', { name: '출하 선택' });
  fireEvent.keyDown(within(picker).getByRole('textbox', { name: '출하번호·거래처 검색' }), { key: 'Enter', code: 'Enter' });
  await within(picker).findByText('SD-1');
  fireEvent.click(within(picker).getByLabelText('1 행 선택'));
  fireEvent.click(within(picker).getByLabelText('4 행 선택'));
  fireEvent.click(within(picker).getByRole('button', { name: '선택 완료' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '출하 선택' })).not.toBeInTheDocument());
  await screen.findByDisplayValue(/SD-1.*SD-2/);
  const grid = screen.getByRole('grid', { name: '거래명세서 상세 목록' });
  expect(within(grid).queryByText('ISSUED')).not.toBeInTheDocument();
  fireEvent.click(await screen.findByLabelText('2 행 선택'));
  fireEvent.click(await screen.findByLabelText('3 행 선택'));
  fireEvent.click(await screen.findByRole('button', { name: '저장', exact: true }));
  await screen.findByDisplayValue('TS-1');
  expect(createStatement).toHaveBeenCalledWith(expect.objectContaining({
    salesDeliveryDetailIds: [2, 3],
  }));
  expect(grid).toHaveTextContent('규격');
});
it('prevents grouping deliveries from different customers', async () => {
  vi.mocked(searchStatementSources).mockResolvedValue([
    source, { ...secondSource, customerId: 7, customerName: '다른 거래처' },
  ]);
  mount(<SalesStatementCreatePage {...props} />);
  fireEvent.click(screen.getByRole('button', { name: '출하 선택' }));
  const picker = screen.getByRole('dialog', { name: '출하 선택' });
  fireEvent.keyDown(within(picker).getByRole('textbox', { name: '출하번호·거래처 검색' }), { key: 'Enter', code: 'Enter' });
  await within(picker).findByText('SD-1');
  fireEvent.click(within(picker).getByLabelText('1 행 선택'));

  expect(within(picker).getByLabelText('4 행 선택').querySelector('input')).toBeDisabled();
});
it('requires at least one selected detail before creating a statement', async () => {
  vi.mocked(getDelivery).mockResolvedValue({
    ...source, customerId: 5, customerCode: 'C1', salesOrderId: null,
    orderNo: null, deliveryPlace: '', deliveryMethod: '', remark: '',
    details: [{ ...detail, salesDeliveryDetailId: 2, materialId: 4,
      salesOrderDetailId: null, salesDeliveryPlanDetailId: null }],
  });
  mount(<SalesStatementCreatePage {...props} />);
  fireEvent.click(screen.getByRole('button', { name: '출하 선택' }));
  const picker = screen.getByRole('dialog', { name: '출하 선택' });
  fireEvent.keyDown(within(picker).getByRole('textbox', { name: '출하번호·거래처 검색' }), { key: 'Enter', code: 'Enter' });
  await within(picker).findByText('SD-1');
  fireEvent.click(within(picker).getByLabelText('1 행 선택'));
  fireEvent.click(within(picker).getByRole('button', { name: '선택 완료' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '출하 선택' })).not.toBeInTheDocument());
  await screen.findByDisplayValue('SD-1');
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));

  expect(await screen.findByText('거래명세서 상세를 선택해 주세요.')).toBeInTheDocument();
  expect(createStatement).not.toHaveBeenCalled();
});
it('shows the 100-detail limit before submitting a statement', async () => {
  const ids = Array.from({ length: 101 }, (_, index) => index + 1);
  vi.mocked(searchStatementSources).mockResolvedValue([{ ...source, salesDeliveryDetailIds: ids }]);
  vi.mocked(getDelivery).mockResolvedValue({
    ...source, customerCode: 'C1', salesOrderId: null, orderNo: null, deliveryPlace: '', deliveryMethod: '', remark: '',
    details: ids.map((id) => ({ ...detail, salesDeliveryDetailId: id, lineNo: id, materialId: id,
      salesOrderDetailId: null, salesDeliveryPlanDetailId: null })),
  });
  mount(<SalesStatementCreatePage {...props} />);
  fireEvent.click(screen.getByRole('button', { name: '출하 선택' }));
  const picker = screen.getByRole('dialog', { name: '출하 선택' });
  fireEvent.keyDown(within(picker).getByRole('textbox', { name: '출하번호·거래처 검색' }), { key: 'Enter', code: 'Enter' });
  await within(picker).findByText('SD-1');
  fireEvent.click(within(picker).getByLabelText('1 행 선택'));
  fireEvent.click(within(picker).getByRole('button', { name: '선택 완료' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '출하 선택' })).not.toBeInTheDocument());
  await screen.findByDisplayValue('SD-1');
  const grid = screen.getByRole('grid', { name: '거래명세서 상세 목록' });
  fireEvent.click(within(grid).getAllByRole('checkbox')[0]);
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  expect(await screen.findByText(/100건/)).toBeInTheDocument();
  expect(createStatement).not.toHaveBeenCalled();
  vi.mocked(createStatement).mockResolvedValueOnce(item);
  fireEvent.click(within(grid).getAllByRole('checkbox')[1]);
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(createStatement).toHaveBeenCalledWith(
    expect.objectContaining({ salesDeliveryDetailIds: ids.slice(1) }),
  ));
}, 20000);
it('opens the same registration form from status detail and prints its stored snapshot', async () => {
  vi.mocked(getStatementStatus).mockResolvedValue([{ ...detail, salesStatementId: 3, statementNo: 'TS-1',
    statementDt: '2026-11-09', deliveryNo: 'SD-1', customerCode: 'C1', customerName: '거래처', lineTotalAmt: 220 }]);
  mount(<SalesStatementStatusPage {...props} />);
  expect(screen.getByTestId('sales-status-content')).toHaveStyle({
    paddingTop: '16px',
    paddingBottom: '16px',
  });
  const status = await screen.findByRole('status');
  fireEvent.click(within(status).getByRole('button', { name: 'Close' }));
  expect(screen.getByTestId('sales-status-content')).toHaveStyle({ paddingTop: '16px' });
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
it('opens the source delivery detail panel from the status delivery number', async () => {
  vi.mocked(getStatementStatus).mockResolvedValue([{ ...detail, salesStatementId: 3, statementNo: 'TS-1',
    statementDt: '2026-11-09', deliveryNo: 'SD-1', sourceDeliveryId: 1, sourceDeliveryNo: 'SD-1',
    customerCode: 'C1', customerName: '거래처', lineTotalAmt: 220 }]);
  vi.mocked(getDelivery).mockResolvedValue({ salesDeliveryId: 1, deliveryNo: 'SD-1', deliveryDt: '2026-11-09',
    deliveryType: 'DIRECT', customerId: 5, customerCode: 'C1', customerName: '거래처', salesOrderId: null, orderNo: null,
    deliveryPlace: null, deliveryMethod: null, remark: null, totalAmt: 220, details: [] } as Awaited<ReturnType<typeof getDelivery>>);
  mount(<SalesStatementStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'SD-1 출하 상세 보기' }));
  const panel = await screen.findByRole('region', { name: '출하 상세' });
  expect(await within(panel).findByText('출하번호: SD-1')).toBeInTheDocument();
  expect(getDelivery).toHaveBeenCalledWith(1);
}, 15000);
it('shows amount totals under the statement detail grid without a row-number column', async () => {
  mount(<SalesStatementCreatePage {...props} statementId={3} />);
  const totals = await screen.findByLabelText('거래명세서 금액 합계');
  expect(within(totals).getByText('공급가 합계')).toBeInTheDocument();
  expect(within(totals).getByText('총 합계')).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: 'No' })).not.toBeInTheDocument();
}, 15000);
