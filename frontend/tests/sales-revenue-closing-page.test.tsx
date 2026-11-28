import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { CustomerClosingSummary } from '../src/pages/sales/revenue/closing/components/CustomerClosingSummary';
import { RevenueClosingPage } from '../src/pages/sales/revenue/closing/RevenueClosingPage';
import { RevenueClosingDetailGrid } from '../src/pages/sales/revenue/closing/components/RevenueClosingDetailGrid';
import { filterRevenueClosingDetails } from '../src/pages/sales/revenue/closing/data/revenueClosingFilters';
import {
  closeRevenueClosings,
  searchRevenueClosingCustomers,
  searchRevenueClosings,
} from '../src/pages/sales/revenue/closing/services/revenueClosing.service';
import { getSystemDate } from '../src/shared/services/systemDateService';
import type {
  RevenueClosingCustomerSummaryRow,
  RevenueClosingDetailRow,
} from '../src/pages/sales/revenue/closing/types/revenueClosing.types';
import type { ModuleItem } from '../src/pages/dashboard/types/dashboard';
import { searchOrderCustomers } from '../src/pages/sales/order/create/services/salesOrderMaster.service';
import { getDelivery } from '../src/pages/sales/shipment/delivery/create/services/salesDelivery.service';
import { getSalesOrder } from '../src/pages/sales/order/create/services/salesOrder.service';

const notification = vi.hoisted(() => ({ showSuccess: vi.fn(), showWarning: vi.fn(), showError: vi.fn() }));
// 성공 문구는 공통 토스트(showSuccess)로 표시된다.
vi.mock('../src/shared/context/notification', () => ({ useNotification: () => notification }));

vi.mock('../src/pages/sales/order/create/services/salesOrderMaster.service', () => ({
  searchOrderCustomers: vi.fn(async () => [
    { id: 11, code: 'C11', name: '가나다상사', details: [{ label: '사업자번호', value: '123-45-67890' }] },
    { id: 22, code: 'C22', name: '라마바산업' },
  ]),
}));
vi.mock('../src/pages/sales/shipment/delivery/create/services/salesDelivery.service', async (original) => ({
  ...await original<object>(), getDelivery: vi.fn(),
}));
vi.mock('../src/pages/sales/order/create/services/salesOrder.service', async (original) => ({
  ...await original<object>(), getSalesOrder: vi.fn(),
}));

vi.mock('../src/pages/sales/revenue/closing/services/revenueClosing.service', () => ({
  searchRevenueClosings: vi.fn(async () => ({ details: [], customerSummaries: [] })),
  searchRevenueClosingCustomers: vi.fn(async () => [
    { id: 11, code: 'C11', name: '가나다상사', progress: { label: '마감', done: 1, total: 3 } },
    { id: 22, code: 'C22', name: '라마바산업', progress: { label: '마감', done: 0, total: 3 } },
  ]),
  closeRevenueClosings: vi.fn(async () => ({ closedCount: 0, items: [] })),
}));

vi.mock('../src/shared/services/systemDateService', () => ({
  getSystemDate: vi.fn(async () => '2026-11-20'),
}));

const props = {
  selectedModule: { id: 'sales', tree: [] } as unknown as ModuleItem,
  currentMenuName: '매출마감관리',
  content: { title: '매출마감관리', description: '출하일 기준 매출마감 대상을 확인합니다.', cards: [], items: [] },
  breadcrumbItems: ['영업관리', '매출관리', '매출마감관리'],
  selectedMenuPermissions: { read: true, create: false, update: false, delete: false, excel: true },
};

const detailRows: RevenueClosingDetailRow[] = [
  {
    rowId: 1,
    salesDeliveryId: 100,
    deliveryNo: 'D-001',
    deliveryDt: '2026-11-03',
    orderNo: 'O-001',
    customerId: 11,
    customerCode: 'C11',
    customerName: '가나다상사',
    materialCode: 'M-01',
    materialName: '품목 A',
    closingStatus: 'CLOSED',
    quantity: 2,
    salesAmount: 100,
    vatAmount: 10,
    totalAmount: 110,
  },
  {
    rowId: 2,
    salesDeliveryId: 200,
    deliveryNo: 'D-002',
    deliveryDt: '2026-11-04',
    orderNo: 'O-002',
    customerId: 22,
    customerCode: 'C22',
    customerName: '라마바산업',
    materialCode: 'M-02',
    materialName: '품목 B',
    closingStatus: 'OPEN',
    quantity: 3,
    salesAmount: 200,
    vatAmount: 20,
    totalAmount: 220,
  },
];

const summaryRows: RevenueClosingCustomerSummaryRow[] = [
  { customerId: 11, customerCode: 'C11', customerName: '가나다상사', totalCount: 1, closedCount: 1, openCount: 0 },
  { customerId: 22, customerCode: 'C22', customerName: '라마바산업', totalCount: 1, closedCount: 0, openCount: 1 },
];

function FilterHarness() {
  const [customerId, setCustomerId] = useState<number | null>(null);
  const filteredRows = filterRevenueClosingDetails(detailRows, customerId);
  return (
    <>
      <CustomerClosingSummary rows={summaryRows} onSelectCustomer={setCustomerId} />
      <RevenueClosingDetailGrid rows={filteredRows} selectedMenuPermissions={props.selectedMenuPermissions} />
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

it('allows selecting detail rows through the grid selection column', () => {
  const onSelectionChange = vi.fn();
  render(
    <RevenueClosingDetailGrid
      rows={detailRows}
      selectedMenuPermissions={props.selectedMenuPermissions}
      onSelectionChange={onSelectionChange}
    />,
  );

  const selectionCheckboxes = within(screen.getByRole('grid', { name: '매출대상 상세 목록' }))
    .getAllByRole('checkbox');
  fireEvent.click(selectionCheckboxes[2]);

  expect(onSelectionChange).toHaveBeenLastCalledWith([2]);
});

it('counts and closes selected open detail lines independently for the same delivery', async () => {
  const openRow = { ...detailRows[1], salesDeliveryId: 200 };
  vi.mocked(searchRevenueClosings).mockResolvedValueOnce({
    details: [
      openRow,
      { ...openRow, rowId: 3, materialCode: 'M-03', materialName: '품목 C' },
      { ...detailRows[0], rowId: 4, salesDeliveryId: 300 },
    ],
    customerSummaries: summaryRows,
  });
  render(
    <RevenueClosingPage
      {...props}
      selectedMenuPermissions={{ ...props.selectedMenuPermissions, create: true }}
    />,
  );
  await screen.findByRole('gridcell', { name: '품목 C' });

  const checkboxes = within(screen.getByRole('grid', { name: '매출대상 상세 목록' }))
    .getAllByRole('checkbox');
  checkboxes.slice(1).forEach((checkbox) => fireEvent.click(checkbox));

  expect(screen.getByRole('button', { name: '마감 (2건)' })).toBeEnabled();
});

it('disables closed-row selection and renders status badges', () => {
  render(
    <RevenueClosingDetailGrid
      rows={detailRows}
      selectedMenuPermissions={props.selectedMenuPermissions}
    />,
  );
  const grid = screen.getByRole('grid', { name: '매출대상 상세 목록' });
  const checkboxes = within(grid).getAllByRole('checkbox');
  expect(checkboxes[1]).toBeDisabled();
  expect(checkboxes[2]).toBeEnabled();

  const closedRow = screen.getByRole('row', { name: /D-001/ });
  expect(within(closedRow).getByText('마감').closest('.MuiChip-root')).toBeInTheDocument();
  const openRow = screen.getByRole('row', { name: /D-002/ });
  expect(within(openRow).getByText('미마감').closest('.MuiChip-root')).toBeInTheDocument();
});

it('selects only open rows when the grid select-all checkbox is used', () => {
  const onSelectionChange = vi.fn();
  render(
    <RevenueClosingDetailGrid
      rows={detailRows}
      selectedMenuPermissions={props.selectedMenuPermissions}
      onSelectionChange={onSelectionChange}
    />,
  );
  const checkboxes = within(screen.getByRole('grid', { name: '매출대상 상세 목록' }))
    .getAllByRole('checkbox');

  fireEvent.click(checkboxes[0]);

  expect(onSelectionChange).toHaveBeenLastCalledWith([2]);
});

it('keeps long customer summary lists independently scrollable', () => {
  const manyRows = Array.from({ length: 20 }, (_, index) => ({
    ...summaryRows[0],
    customerId: 100 + index,
    customerCode: `C${100 + index}`,
    customerName: `거래처 ${index + 1}`,
  }));
  render(<CustomerClosingSummary rows={manyRows} onSelectCustomer={vi.fn()} />);

  expect(screen.getByText('출하 상세 기준')).toBeInTheDocument();
  const customerList = screen.getByTestId('customer-summary-list');
  expect(getComputedStyle(customerList).overflowY).toBe('auto');
  expect(within(customerList).getByRole('button', { name: '거래처 1 거래처 요약' })).toBeInTheDocument();
  expect(within(customerList).getByRole('button', { name: '거래처 20 거래처 요약' })).toBeInTheDocument();
});

it('filters details by a customer row and clears the filter from the all-summary row', () => {
  render(<FilterHarness />);

  const detailGrid = screen.getByRole('grid', { name: '매출대상 상세 목록' });
  expect(within(detailGrid).getByText('D-001')).toBeInTheDocument();
  expect(within(detailGrid).getByText('D-002')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /가나다상사/ }));
  expect(within(detailGrid).getByText('D-001')).toBeInTheDocument();
  expect(within(detailGrid).queryByText('D-002')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '전체' }));
  expect(within(detailGrid).getByText('D-001')).toBeInTheDocument();
  expect(within(detailGrid).getByText('D-002')).toBeInTheDocument();
});

it('shows accessible empty detail and summary states without fabricated totals', async () => {
  render(<RevenueClosingPage {...props} />);

  expect(screen.getByRole('button', { name: '페이지 설명 접기' })).toBeInTheDocument();
  expect(screen.getByRole('grid', { name: '매출대상 상세 목록' })).toBeInTheDocument();
  expect(await screen.findByText('거래처 요약 데이터가 없습니다.')).toBeInTheDocument();
  expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument();
  expect(screen.queryByText('전체 0')).not.toBeInTheDocument();
});

it('hides the close action without CREATE permission and disables it with no selected details', async () => {
  const { rerender } = render(<RevenueClosingPage {...props} />);
  expect(screen.queryByRole('button', { name: /^마감 \(/ })).not.toBeInTheDocument();

  rerender(
    <RevenueClosingPage
      {...props}
      selectedMenuPermissions={{ ...props.selectedMenuPermissions, create: true }}
    />,
  );
  await screen.findByRole('grid', { name: '매출대상 상세 목록' });
  expect(screen.getByRole('button', { name: '마감 (0건)' })).toBeDisabled();
});

it('shows the 100-detail limit before opening a close confirmation', async () => {
  vi.mocked(searchRevenueClosings).mockResolvedValueOnce({
    details: Array.from({ length: 101 }, (_, index) => ({ ...detailRows[1], rowId: index + 1 })),
    customerSummaries: summaryRows,
  });
  render(<RevenueClosingPage {...props}
    selectedMenuPermissions={{ ...props.selectedMenuPermissions, create: true }} />);
  await screen.findAllByRole('gridcell', { name: '품목 B' });
  fireEvent.click(within(screen.getByRole('grid', { name: '매출대상 상세 목록' })).getAllByRole('checkbox')[0]);
  fireEvent.click(await screen.findByRole('button', { name: '마감 (101건)' }));
  expect(await screen.findByText(/100건/)).toBeInTheDocument();
  expect(screen.queryByRole('dialog', { name: '매출 마감' })).not.toBeInTheDocument();
  expect(getSystemDate).not.toHaveBeenCalled();
  expect(closeRevenueClosings).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('grid', { name: '매출대상 상세 목록' })).getAllByRole('checkbox')[1]);
  fireEvent.click(await screen.findByRole('button', { name: '마감 (100건)' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: '매출 마감' }))
    .getByRole('button', { name: '마감 처리' }));
  await waitFor(() => expect(closeRevenueClosings).toHaveBeenCalledWith(
    Array.from({ length: 100 }, (_, index) => index + 2), '2026-11-20',
  ));
}, 15000);

it('keeps selection and makes no request when close confirmation is cancelled', async () => {
  vi.mocked(searchRevenueClosings).mockResolvedValueOnce({
    details: [{ ...detailRows[1], rowId: 7 }],
    customerSummaries: summaryRows,
  });
  render(
    <RevenueClosingPage
      {...props}
      selectedMenuPermissions={{ ...props.selectedMenuPermissions, create: true }}
    />,
  );
  await screen.findByRole('gridcell', { name: '품목 B' });
  const grid = within(screen.getByRole('grid', { name: '매출대상 상세 목록' }));
  fireEvent.click(grid.getAllByRole('checkbox')[1]);
  fireEvent.click(screen.getByRole('button', { name: '마감 (1건)' }));

  const dialog = screen.getByRole('dialog', { name: '매출 마감' });
  expect(within(dialog).getByText(/1개 상세/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));

  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: '매출 마감' })).not.toBeInTheDocument();
  });
  expect(closeRevenueClosings).not.toHaveBeenCalled();
  expect(await screen.findByRole('button', { name: '마감 (1건)' })).toBeEnabled();
});

it('does not close selected rows when the server date cannot be loaded', async () => {
  vi.mocked(searchRevenueClosings).mockResolvedValueOnce({
    details: [{ ...detailRows[1], rowId: 8 }],
    customerSummaries: summaryRows,
  });
  vi.mocked(getSystemDate).mockRejectedValueOnce(new Error('offline'));
  render(
    <RevenueClosingPage
      {...props}
      selectedMenuPermissions={{ ...props.selectedMenuPermissions, create: true }}
    />,
  );
  await screen.findByRole('gridcell', { name: '품목 B' });
  fireEvent.click(within(screen.getByRole('grid', { name: '매출대상 상세 목록' }))
    .getAllByRole('checkbox')[1]);
  fireEvent.click(screen.getByRole('button', { name: '마감 (1건)' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: '매출 마감' }))
    .getByRole('button', { name: '마감 처리' }));

  expect(await screen.findByText(/offline/)).toBeInTheDocument();
  expect(closeRevenueClosings).not.toHaveBeenCalled();
  expect(await screen.findByRole('button', { name: '마감 (1건)' })).toBeEnabled();
});

it('retains the selection and shows the API error when a close request fails', async () => {
  vi.mocked(searchRevenueClosings).mockResolvedValueOnce({
    details: [{ ...detailRows[1], rowId: 9 }],
    customerSummaries: summaryRows,
  });
  vi.mocked(closeRevenueClosings).mockRejectedValueOnce(new Error('마감 실패'));
  render(
    <RevenueClosingPage
      {...props}
      selectedMenuPermissions={{ ...props.selectedMenuPermissions, create: true }}
    />,
  );
  await screen.findByRole('gridcell', { name: '품목 B' });
  fireEvent.click(within(screen.getByRole('grid', { name: '매출대상 상세 목록' }))
    .getAllByRole('checkbox')[1]);
  fireEvent.click(screen.getByRole('button', { name: '마감 (1건)' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: '매출 마감' }))
    .getByRole('button', { name: '마감 처리' }));

  expect(await screen.findByText('마감 실패')).toBeInTheDocument();
  expect(closeRevenueClosings).toHaveBeenCalledWith([9], '2026-11-20');
  expect(await screen.findByRole('button', { name: '마감 (1건)' })).toBeEnabled();
});

it('prevents duplicate close submissions and reloads after a successful line-level close', async () => {
  vi.mocked(searchRevenueClosings).mockResolvedValue({
    details: [{ ...detailRows[1], rowId: 10 }, { ...detailRows[1], rowId: 11 }],
    customerSummaries: summaryRows,
  });
  let resolveClose: (result: { closedCount: number; items: [] }) => void = () => undefined;
  vi.mocked(closeRevenueClosings).mockReturnValueOnce(new Promise((resolve) => {
    resolveClose = resolve;
  }));
  render(
    <RevenueClosingPage
      {...props}
      selectedMenuPermissions={{ ...props.selectedMenuPermissions, create: true }}
    />,
  );
  const grid = within(screen.getByRole('grid', { name: '매출대상 상세 목록' }));
  await waitFor(() => expect(grid.getAllByRole('gridcell', { name: '품목 B' })).toHaveLength(2));
  fireEvent.click(grid.getAllByRole('checkbox')[1]);
  fireEvent.click(within(screen.getByRole('grid', { name: '매출대상 상세 목록' }))
    .getAllByRole('checkbox')[2]);
  fireEvent.click(screen.getByRole('button', { name: '마감 (2건)' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: '매출 마감' }))
    .getByRole('button', { name: '마감 처리' }));

  const closeButton = await screen.findByRole('button', { name: '마감 (2건)' });
  await waitFor(() => expect(closeButton).toBeDisabled());
  fireEvent.click(closeButton);
  expect(closeRevenueClosings).toHaveBeenCalledTimes(1);
  expect(closeRevenueClosings).toHaveBeenCalledWith([10, 11], '2026-11-20');

  await act(async () => resolveClose({ closedCount: 2, items: [] }));
  await waitFor(() => expect(notification.showSuccess).toHaveBeenCalledWith('2개 상세의 매출마감이 완료되었습니다.'));
  await waitFor(() => expect(searchRevenueClosings).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('button', { name: '마감 (0건)' })).toBeDisabled();
});

it('shows summary skeletons while loading and renders API details and customer summaries', async () => {
  let resolveSearch: (response: {
    details: RevenueClosingDetailRow[];
    customerSummaries: RevenueClosingCustomerSummaryRow[];
  }) => void = () => undefined;
  const pending = new Promise<{ details: RevenueClosingDetailRow[]; customerSummaries: RevenueClosingCustomerSummaryRow[] }>(
    (resolve) => { resolveSearch = resolve; },
  );
  vi.mocked(searchRevenueClosings).mockReturnValueOnce(pending);
  render(<RevenueClosingPage {...props} />);

  expect(await screen.findByRole('status', { name: '거래처 요약 불러오는 중' })).toBeInTheDocument();
  expect(screen.getByTestId('f1-grid-loading-overlay')).toBeInTheDocument();

  resolveSearch({
    details: detailRows,
    customerSummaries: summaryRows,
  });

  await waitFor(() => {
    expect(screen.getByText('D-001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '가나다상사 거래처 요약' })).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole('gridcell', { name: 'D-001', exact: true }));
  expect(screen.getByRole('gridcell', { name: 'D-001', exact: true })
    .closest('[role="row"]')).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('gridcell', { name: 'D-002', exact: true })
    .closest('[role="row"]')).toHaveAttribute('aria-selected', 'false');
});

it('highlights applied integrated-search matches in the detail grid', async () => {
  vi.mocked(searchRevenueClosings).mockResolvedValue({
    details: detailRows,
    customerSummaries: summaryRows,
  });
  render(<RevenueClosingPage {...props} />);
  await waitFor(() => expect(searchRevenueClosings).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByLabelText('거래처별 매출마감 요약')).toHaveAttribute('aria-busy', 'false'));

  const search = screen.getByRole('textbox', { name: '매출마감관리 빠른 검색' });
  fireEvent.change(search, { target: { value: 'D-001' } });
  fireEvent.keyDown(search, { key: 'Enter' });

  await waitFor(() => expect(searchRevenueClosings).toHaveBeenCalledTimes(2));
  await waitFor(() => {
    expect(document.querySelector('[data-f1-grid-highlight="true"]')).toHaveTextContent('D-001');
  });
});

it('applies customer drafts only on detail submit and reset clears selections and restores the current month', async () => {
  render(<RevenueClosingPage {...props} />);
  const waitForSearch = async (callCount: number) => {
    await waitFor(() => expect(searchRevenueClosings).toHaveBeenCalledTimes(callCount));
    await waitFor(() => expect(screen.getByLabelText('거래처별 매출마감 요약')).toHaveAttribute('aria-busy', 'false'));
  };
  await waitForSearch(1);

  fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
  const detailSearch = screen.getByRole('dialog', { name: '상세 검색' });
  const now = new Date();
  const toDateString = (value: Date) => [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
  const firstDay = toDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDay = toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  expect(within(detailSearch).getByLabelText('출하일 시작일')).toHaveValue(firstDay);
  expect(within(detailSearch).getByLabelText('출하일 종료일')).toHaveValue(lastDay);

  fireEvent.click(within(detailSearch).getByRole('button', { name: '거래처 선택' }));
  const picker = screen.getByRole('dialog', { name: '거래처 선택' });
  fireEvent.click(within(picker).getByRole('button', { name: '검색' }));
  const firstOption = await screen.findByRole('checkbox', { name: /C11 가나다상사 선택/ });
  expect(within(picker).getByText('사업자번호: 123-45-67890')).toBeInTheDocument();
  expect(within(picker).getAllByTestId('picker-progress')[0]).toHaveTextContent('마감 1/3');
  fireEvent.click(firstOption);
  fireEvent.click(within(picker).getByRole('button', { name: '적용' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '거래처 선택' })).not.toBeInTheDocument());

  const activeDetailSearch = screen.getByRole('dialog', { name: '상세 검색' });
  expect(within(activeDetailSearch).getByLabelText('거래처')).toHaveValue('C11 · 가나다상사');
  fireEvent.click(within(activeDetailSearch).getByText('조회', { exact: true }));
  await waitForSearch(2);
  expect(screen.getByRole('button', { name: '상세 검색 열기' })).toHaveAttribute(
    'aria-description',
    expect.stringContaining('적용된 상세 검색 조건'),
  );

  fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
  const reopenedSearch = screen.getByRole('dialog', { name: '상세 검색' });
  fireEvent.click(within(reopenedSearch).getByRole('button', { name: '거래처 선택' }));
  const reopenedPicker = screen.getByRole('dialog', { name: '거래처 선택' });
  fireEvent.click(within(reopenedPicker).getByRole('button', { name: '검색' }));
  fireEvent.click(await screen.findByRole('checkbox', { name: /C22 라마바산업 선택/ }));
  fireEvent.click(within(reopenedPicker).getByRole('button', { name: '적용' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '거래처 선택' })).not.toBeInTheDocument());
  const activeReopenedSearch = screen.getByRole('dialog', { name: '상세 검색' });
  fireEvent.click(within(activeReopenedSearch).getByRole('button', { name: '검색 닫기' }));

  fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
  const restoredSearch = screen.getByRole('dialog', { name: '상세 검색' });
  expect(within(restoredSearch).getByLabelText('거래처')).toHaveValue('C11 · 가나다상사');

  fireEvent.click(within(restoredSearch).getByRole('button', { name: '초기화' }));
  expect(within(restoredSearch).getByLabelText('거래처')).toHaveValue('');
  expect(within(restoredSearch).getByLabelText('출하일 시작일')).toHaveValue(firstDay);
  expect(within(restoredSearch).getByLabelText('출하일 종료일')).toHaveValue(lastDay);
  expect(searchOrderCustomers).toHaveBeenCalled();
  expect(searchRevenueClosingCustomers).toHaveBeenCalledWith(firstDay, lastDay, expect.any(String));
  await waitForSearch(3);
});

it('opens delivery and order detail panels from the closing grid links', async () => {
  vi.mocked(searchRevenueClosings).mockResolvedValue({
    details: [{ ...detailRows[0], salesOrderId: 7 }], customerSummaries: summaryRows,
  });
  vi.mocked(getDelivery).mockResolvedValue({ salesDeliveryId: 100, deliveryNo: 'D-001', deliveryDt: '2026-11-03',
    deliveryType: 'ORDER', customerId: 11, customerCode: 'C11', customerName: '가나다상사', salesOrderId: 7, orderNo: 'O-001',
    deliveryPlace: null, deliveryMethod: null, remark: null, totalAmt: 110, details: [] } as Awaited<ReturnType<typeof getDelivery>>);
  vi.mocked(getSalesOrder).mockResolvedValue({ salesOrderId: 7, orderNo: 'O-001', orderDt: '2026-11-01', customerId: 11,
    customerCode: 'C11', customerName: '가나다상사', salesDestinationId: null, destinationCode: null, destinationName: null,
    billingCustomerId: null, billingCustomerCode: null, billingCustomerName: null, quotNo: null, deliveryDt: null,
    deliveryPlace: null, deliveryMethod: null, status: '수주등록', totalAmt: 0, remark: null, details: [] });
  render(<RevenueClosingPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'D-001 출하 상세 보기' }));
  const deliveryPanel = await screen.findByRole('region', { name: '출하 상세' });
  expect(await within(deliveryPanel).findByText('출하번호: D-001')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'O-001 수주 상세 보기' }));
  const orderPanel = await screen.findByRole('region', { name: '수주 상세' });
  expect(await within(orderPanel).findByText('수주번호: O-001')).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: '출하 상세' })).not.toBeInTheDocument();
}, 15000);
