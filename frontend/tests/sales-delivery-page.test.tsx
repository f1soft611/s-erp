import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { SalesDeliveryCreatePage } from '../src/pages/sales/delivery/create/SalesDeliveryCreatePage';
import { SalesDeliveryStatusPage } from '../src/pages/sales/delivery/status/SalesDeliveryStatusPage';
import { SourceOrderPicker } from '../src/pages/sales/delivery/create/components/SourceOrderPicker';
import { createDelivery, getDelivery, updateDelivery, getDeliveryStatus, searchSourceOrders, deleteDelivery, OverDeliveryConfirmationRequired } from '../src/pages/sales/delivery/create/services/salesDelivery.service';
import type { ModuleItem } from '../src/pages/dashboard/types/dashboard';

vi.mock('../src/pages/sales/delivery/create/services/salesDelivery.service', async (original) => ({
  ...await original<object>(), createDelivery: vi.fn(), getDelivery: vi.fn(), updateDelivery: vi.fn(),
  getDeliveryStatus: vi.fn(), searchSourceOrders: vi.fn(), deleteDelivery: vi.fn(),
}));
vi.mock('../src/pages/sales/order/create/services/salesOrderMaster.service', () => ({
  searchOrderCustomers: vi.fn(async () => [{ id: 10, code: 'C10', name: '거래처' }]),
  searchOrderMaterials: vi.fn(async () => [{ id: 20, code: 'M20', name: '품목' }]),
}));
const item = {
  salesDeliveryId: 1, deliveryNo: 'SD-1', deliveryDt: '2026-11-04', deliveryType: 'DIRECT',
  customerId: 10, customerCode: 'C10', customerName: '거래처', salesOrderId: null, orderNo: null,
  deliveryPlace: '원래 장소', deliveryMethod: '', remark: '', totalAmt: 220, writer: false,
  details: [{ salesDeliveryDetailId: 2, lineNo: 1, materialId: 20, materialCode: 'M20', materialName: '품목',
    unit: 'EA', salesOrderDetailId: null, salesDeliveryPlanDetailId: null,
    deliveryQty: 2, unitPrice: 100, supplyAmt: 200, vatAmt: 20, totalAmt: 220 }],
};
const props = {
  selectedModule: { id: 'sales', tree: [] } as unknown as ModuleItem,
  currentMenuName: '출하등록', content: { title: '출하등록', description: '', cards: [], items: [] },
  breadcrumbItems: ['영업관리', '출하등록'],
  selectedMenuPermissions: { read: true, create: true, update: true, delete: true, excel: false },
};
function mount(node: React.ReactNode) {
  render(<RouterProvider router={createMemoryRouter([{ path: '/', element: node }])} />);
}
async function openStatusDocument(mode: 'view' | 'edit') {
  fireEvent.click(await screen.findByRole('button', { name: 'SD-1 상세 보기' }));
  const panel = await screen.findByRole('region', { name: '출하 상세' });
  expect(await within(panel).findByRole('table', { name: '출하 품목 목록' })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(within(panel).getByRole('button', { name: '출하 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: mode === 'edit' ? '수정' : '자세히보기' }));
  return screen.findByRole('dialog', { name: mode === 'edit' ? '출하 수정' : '출하 상세보기' });
}
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear();
  vi.mocked(getDelivery).mockResolvedValue(item as Awaited<ReturnType<typeof getDelivery>>);
  vi.mocked(getDeliveryStatus).mockResolvedValue([]);
});
it('opens the shipment plan selector using the icon inside the order field', () => {
  mount(<SalesDeliveryCreatePage {...props} />);
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '출하구분' }));
  fireEvent.click(screen.getByRole('option', { name: '수주출하' }));
  expect(screen.getByRole('button', { name: '계획 선택' }).closest('.MuiInputAdornment-root')).not.toBeNull();
});
it('preserves edits on failed save and permits update without writer ownership', async () => {
  vi.mocked(updateDelivery).mockRejectedValue(new Error('잔량 초과'));
  mount(<SalesDeliveryCreatePage {...props} salesDeliveryId={1} />);
  await screen.findByDisplayValue('SD-1');
  expect(screen.getByRole('button', { name: '거래처 선택' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('출하장소'), { target: { value: '수정 장소' } });
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await screen.findByText('잔량 초과');
  expect(screen.getByLabelText('출하장소')).toHaveValue('수정 장소');
  expect(updateDelivery).toHaveBeenCalledTimes(1);
}, 15000);
it('prevents duplicate save and reloads authoritative server amounts', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof updateDelivery>>) => void;
  vi.mocked(updateDelivery).mockImplementation(() => new Promise((done) => { resolve = done; }));
  mount(<SalesDeliveryCreatePage {...props} salesDeliveryId={1} />);
  await screen.findByDisplayValue('SD-1');
  const save = screen.getByRole('button', { name: '저장', exact: true });
  fireEvent.click(save); fireEvent.click(save);
  expect(updateDelivery).toHaveBeenCalledTimes(1);
  resolve(item as Awaited<ReturnType<typeof updateDelivery>>);
  await waitFor(() => expect(getDelivery).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText('출하 금액 합계')).toHaveTextContent('220.00');
});
it('preserves input when overdelivery confirmation is cancelled and requests fresh confirmation on the next save', async () => {
  vi.mocked(updateDelivery).mockRejectedValue(new OverDeliveryConfirmationRequired('수주수량 100 / 누적출하 105 / 초과 5'));
  mount(<SalesDeliveryCreatePage {...props} salesDeliveryId={1} />);
  await screen.findByDisplayValue('SD-1');
  fireEvent.change(screen.getByLabelText('출하장소'), { target: { value: '추가 생산분' } });
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  const dialog = await screen.findByRole('dialog', { name: '초과출하 확인' });
  expect(dialog).toHaveTextContent('초과 5');
  expect(screen.getByLabelText('출하장소')).toBeDisabled();
  fireEvent.click(within(dialog).getByRole('button', { name: '취소', exact: true }));
  expect(screen.getByLabelText('출하장소')).toHaveValue('추가 생산분');
  expect(screen.getByLabelText('출하장소')).toBeEnabled();
  expect(updateDelivery).toHaveBeenCalledTimes(1);
  fireEvent.click(await screen.findByRole('button', { name: '저장', exact: true }));
  await screen.findByRole('dialog', { name: '초과출하 확인' });
  expect(vi.mocked(updateDelivery).mock.calls.every(([, payload]) => !payload.overDeliveryConfirmed)).toBe(true);
}, 15000);
it('resubmits only the warned snapshot with explicit confirmation and prevents duplicate confirmed saves', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof updateDelivery>>) => void;
  vi.mocked(updateDelivery)
    .mockRejectedValueOnce(new OverDeliveryConfirmationRequired('계획수량 2 / 누적출하 3 / 초과 1'))
    .mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  mount(<SalesDeliveryCreatePage {...props} salesDeliveryId={1} />);
  await screen.findByDisplayValue('SD-1');
  fireEvent.change(screen.getByLabelText('출하장소'), { target: { value: '확인된 입력' } });
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  const dialog = await screen.findByRole('dialog', { name: '초과출하 확인' });
  const confirm = within(dialog).getByRole('button', { name: '초과출하 저장', exact: true });
  fireEvent.click(confirm); fireEvent.click(confirm);
  expect(updateDelivery).toHaveBeenCalledTimes(2);
  const initialPayload = vi.mocked(updateDelivery).mock.calls[0][1];
  expect(vi.mocked(updateDelivery).mock.calls[1][1]).toEqual({ ...initialPayload, overDeliveryConfirmed: true });
  expect(await screen.findByRole('button', { name: '저장', exact: true })).toBeDisabled();
  resolve(item as Awaited<ReturnType<typeof updateDelivery>>);
  await waitFor(() => expect(getDelivery).toHaveBeenCalledTimes(2));
}, 15000);
it('does not expose mutations without permissions', async () => {
  mount(<SalesDeliveryCreatePage {...props} selectedMenuPermissions={{ read: true }} salesDeliveryId={1} />);
  await screen.findByDisplayValue('SD-1');
  expect(screen.queryByRole('button', { name: '저장', exact: true })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '삭제', exact: true })).not.toBeInTheDocument();
  expect(screen.getByLabelText('출하장소')).toBeDisabled();
});
it('loads status with mandatory current-month period and renders required chip', async () => {
  mount(<SalesDeliveryStatusPage {...props} />);
  await waitFor(() => expect(getDeliveryStatus).toHaveBeenCalledWith(expect.objectContaining({
    deliveryDtFrom: expect.stringMatching(/^\d{4}-\d{2}-01$/), deliveryDtTo: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
  })));
  expect(screen.getByRole('grid', { name: '출하현황 목록' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /출하일.*삭제/ })).not.toBeInTheDocument();
});
it('aligns delivery status codes and names centrally and numeric values to the right', async () => {
  vi.mocked(getDeliveryStatus).mockResolvedValue(
    [{ ...item, ...item.details[0] }] as Awaited<ReturnType<typeof getDeliveryStatus>>,
  );
  mount(<SalesDeliveryStatusPage {...props} />);
  const grid = await screen.findByRole('grid', { name: '출하현황 목록' });

  expect(within(grid).getByRole('gridcell', { name: 'C10' })).toHaveStyle({ justifyContent: 'center' });
  expect(within(grid).getByRole('gridcell', { name: '거래처' })).toHaveStyle({ justifyContent: 'center' });
  expect(within(grid).getByRole('gridcell', { name: 'SD-1' })).toHaveStyle({ justifyContent: 'center' });
  expect(within(grid).getByRole('gridcell', { name: '원래 장소' })).toHaveStyle({ justifyContent: 'flex-start' });
});
it.each(['missing', 'read-denied'] as const)('opens read-only status detail when registration menu is %s', async (registration) => {
  vi.mocked(getDeliveryStatus).mockResolvedValue([{ ...item, ...item.details[0] }] as Awaited<ReturnType<typeof getDeliveryStatus>>);
  const tree = registration === 'missing' ? [] : [{
    id: 'delivery-create', name: '출하등록', pageKey: 'delivery-create',
    permissions: { read: false, create: false, update: false, delete: false },
  }];
  mount(<SalesDeliveryStatusPage {...props}
    selectedModule={{ ...props.selectedModule, tree }}
    selectedMenuPermissions={{ read: true, create: false, update: false, delete: false }} />);
  const link = await screen.findByRole('button', { name: 'SD-1 상세 보기' });
  expect(link).toBeEnabled();
  const dialog = await openStatusDocument('view');
  await within(dialog).findByDisplayValue('SD-1');
  expect(getDelivery).toHaveBeenCalledWith(1);
  expect(within(dialog).getByLabelText('출하장소')).toBeDisabled();
  expect(within(dialog).queryByRole('button', { name: '저장', exact: true })).not.toBeInTheDocument();
  expect(within(dialog).queryByRole('button', { name: '삭제', exact: true })).not.toBeInTheDocument();
}, 15000);
it('retains only registration-menu update and delete capabilities in status detail', async () => {
  vi.mocked(getDeliveryStatus).mockResolvedValue([{ ...item, ...item.details[0] }] as Awaited<ReturnType<typeof getDeliveryStatus>>);
  mount(<SalesDeliveryStatusPage {...props}
    selectedModule={{ ...props.selectedModule, tree: [{
      id: 'delivery-create', name: '출하등록', pageKey: 'delivery-create',
      permissions: { read: false, create: false, update: true, delete: true },
    }] }}
    selectedMenuPermissions={{ read: true, create: false, update: false, delete: false }} />);
  const dialog = await openStatusDocument('edit');
  await within(dialog).findByDisplayValue('SD-1');
  expect(within(dialog).getByLabelText('출하장소')).toBeEnabled();
  expect(within(dialog).getByRole('button', { name: '저장', exact: true })).toBeEnabled();
  expect(within(dialog).getByRole('button', { name: '삭제', exact: true })).toBeEnabled();
  const footer = within(dialog).getByTestId('common-dialog-actions');
  expect(within(footer).getByRole('button', { name: '저장', exact: true })).toBeInTheDocument();
  expect(within(within(dialog).getByTestId('common-dialog-footer-start')).getByRole('button', { name: '삭제', exact: true })).toBeInTheDocument();
  expect(within(footer).getByRole('button', { name: '취소', exact: true })).toBeInTheDocument();
  const input = within(dialog).getByRole('region', { name: '출하 입력 내용' });
  expect(within(input).queryByRole('button', { name: '저장', exact: true })).not.toBeInTheDocument();
}, 15000);
it('creates direct delivery from shared customer/material pickers with edited quantity and price', async () => {
  vi.mocked(createDelivery).mockResolvedValue(item as Awaited<ReturnType<typeof createDelivery>>);
  mount(<SalesDeliveryCreatePage {...props} />);
  fireEvent.click(screen.getByRole('button', { name: '거래처 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'C10 거래처 선택' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: '상세 행 추가' }));
  fireEvent.click(screen.getByRole('button', { name: '품목 선택', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'M20 품목 선택' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  const edit = (index: number, value: string) => {
    const row = screen.getByRole('row', { name: /delivery-.*행 선택/ });
    fireEvent.doubleClick(within(row).getAllByRole('gridcell')[index]);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
  };
  edit(4, '2'); edit(5, '100');
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(createDelivery).toHaveBeenCalledWith(expect.objectContaining({
    deliveryType: 'DIRECT', customerId: 10, salesOrderId: null,
    details: [{ materialId: 20, salesOrderDetailId: null, salesDeliveryPlanDetailId: null,
      deliveryQty: 2, unitPrice: 100, vatAmt: 20 }],
  })));
}, 15000);
it('selects one order, populates remaining lines and prevents source identity editing', async () => {
  vi.mocked(searchSourceOrders).mockResolvedValue([{
    salesOrderId: 7, salesOrderDetailId: 70, salesDeliveryPlanDetailId: 700, orderNo: 'SO-7', orderDt: '2026-11-04',
    customerId: 10, customerCode: 'C10', customerName: '거래처', planNo: 'DP-1', planDt: '2026-11-08',
    deliveryPlace: '창고', deliveryMethod: '택배',
    lineNo: 1, materialId: 20, materialCode: 'M20', materialName: '품목', unit: 'EA',
    orderQty: 10, shippedQty: 4, plannedQty: 6, deliveredQty: 0, remainingQty: 6, unitPrice: 100,
  }]);
  vi.mocked(createDelivery).mockResolvedValue({ ...item, deliveryType: 'ORDER' } as Awaited<ReturnType<typeof createDelivery>>);
  mount(<SalesDeliveryCreatePage {...props} />);
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('option', { name: '수주출하' }));
  fireEvent.click(screen.getByRole('button', { name: '계획 선택', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  const sourceGrid = await screen.findByRole('grid', { name: '출하 대상 계획 목록' });
  expect(within(sourceGrid).getByRole('gridcell', { name: '거래처' })).toHaveStyle({ justifyContent: 'center' });
  expect(within(sourceGrid).getByRole('gridcell', { name: 'M20' })).toHaveStyle({ justifyContent: 'center' });
  expect(within(sourceGrid).getByRole('gridcell', { name: '품목' })).toHaveStyle({ justifyContent: 'center' });
  const sourceRow = within(sourceGrid).getByRole('gridcell', { name: 'M20' }).closest('[role="row"]')!;
  fireEvent.mouseDown(within(sourceRow as HTMLElement).getByRole('gridcell', { name: 'M20' }), { button: 0 });
  expect(sourceRow.querySelector('[data-row-selection-overlay]')).not.toBeNull();
  expect(screen.getByRole('dialog', { name: '출하계획 선택' })).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'DP-1', exact: true }));
  expect(screen.getByLabelText('연결 수주번호')).toHaveValue('SO-7');
  const deliveryGrid = screen.getByRole('grid', { name: '출하 상세 목록' });
  const deliveryCells = within(deliveryGrid).getAllByRole('gridcell');
  expect(within(deliveryGrid).getByRole('gridcell', { name: 'M20' })).toHaveStyle({ justifyContent: 'center' });
  expect(within(deliveryGrid).getByRole('gridcell', { name: '품목' })).toHaveStyle({ justifyContent: 'center' });
  expect(deliveryCells[4]).toHaveStyle({ justifyContent: 'flex-end' });
  expect(screen.getByLabelText('출하장소')).toHaveValue('창고');
  expect(screen.getByRole('button', { name: '거래처 선택' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: '품목 선택', exact: true })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(createDelivery).toHaveBeenCalledWith(expect.objectContaining({
    salesOrderId: 7, deliveryType: 'ORDER',
    details: [{ materialId: 20, salesOrderDetailId: 70, salesDeliveryPlanDetailId: 700,
      deliveryQty: 6, unitPrice: 100, vatAmt: 60 }],
  })));
}, 15000);
it('keeps source-order search controls together in a full-width modal form', async () => {
  vi.mocked(searchSourceOrders).mockResolvedValue([]);
  mount(<SalesDeliveryCreatePage {...props} />);
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('option', { name: '수주출하' }));
  fireEvent.click(screen.getByRole('button', { name: '계획 선택', exact: true }));
  const searchForm = await screen.findByRole('form', { name: '출하계획 선택 검색' });
  const searchInput = within(searchForm).getByRole('textbox', { name: '계획번호·수주번호·거래처 검색' });
  const searchButton = within(searchForm).getByRole('button', { name: '검색', exact: true });
  const searchField = searchInput.closest('.MuiOutlinedInput-root');
  expect(searchField).not.toBeNull();
  expect(getComputedStyle(searchField!).height).toBe('40px');
  expect(getComputedStyle(searchButton).height).toBe('40px');
  fireEvent.change(searchInput, { target: { value: 'SO-찾기' } });
  fireEvent.submit(searchForm);
  await waitFor(() => expect(searchSourceOrders).toHaveBeenCalledWith('SO-찾기'));
});
it('selects all plan rows belonging to the clicked order only', async () => {
  const base = {
    salesOrderId: 7, salesOrderDetailId: 70, salesDeliveryPlanDetailId: 700, orderNo: 'SO-7', orderDt: '2026-11-04',
    customerId: 10, customerCode: 'C10', customerName: '거래처', planNo: 'DP-1', planDt: '2026-11-08',
    deliveryPlace: '창고', deliveryMethod: '택배', lineNo: 1, materialId: 20, materialCode: 'M20',
    materialName: '품목', unit: 'EA', orderQty: 10, shippedQty: 0, plannedQty: 5, deliveredQty: 0, remainingQty: 5, unitPrice: 100,
  };
  const rows = [base, { ...base, salesOrderDetailId: 71, salesDeliveryPlanDetailId: 701 },
    { ...base, salesOrderId: 8, salesOrderDetailId: 80, salesDeliveryPlanDetailId: 800, planNo: 'DP-2' }];
  vi.mocked(searchSourceOrders).mockResolvedValue(rows);
  const onSelect = vi.fn();
  render(<SourceOrderPicker open onClose={() => undefined} onSelect={onSelect} />);
  fireEvent.click(screen.getByRole('button', { name: '검색' }));
  const buttons = await screen.findAllByRole('button', { name: 'DP-1', exact: true });
  fireEvent.click(buttons[0]);
  expect(onSelect).toHaveBeenCalledWith(rows.slice(0, 2));
});
it('confirms deletion before requesting and resets to a new direct document', async () => {
  vi.mocked(deleteDelivery).mockResolvedValue();
  mount(<SalesDeliveryCreatePage {...props} salesDeliveryId={1} />);
  await screen.findByDisplayValue('SD-1');
  fireEvent.click(screen.getByRole('button', { name: '삭제', exact: true }));
  expect(deleteDelivery).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '계속', exact: true }));
  await waitFor(() => expect(deleteDelivery).toHaveBeenCalledWith(1));
  await screen.findByDisplayValue('저장 시 자동 채번');
});
it('matches order registration sections and keeps document actions in the page header', () => {
  mount(<SalesDeliveryCreatePage {...props} />);
  const input = screen.getByRole('region', { name: '출하 입력 내용' });
  expect(within(input).getByText('출하 기본정보')).toBeInTheDocument();
  expect(within(input).getByText('출하 상세')).toBeInTheDocument();
  expect(input).not.toContainElement(screen.getByRole('button', { name: '저장', exact: true }));
  expect(screen.getByRole('button', { name: '삭제', exact: true })).toBeDisabled();
  const toolbar = screen.getByTestId('sales-delivery-detail-toolbar');
  expect(within(toolbar).getByRole('button', { name: '상세 행 추가' })).toBeInTheDocument();
  expect(within(toolbar).getByRole('button', { name: '품목 선택', exact: true })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '선택 행 삭제' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('비고').tagName).toBe('TEXTAREA');
  expect(screen.getByLabelText('출하 금액 합계')).toHaveTextContent('부가세 합계');
});
it('matches order status quick search behavior and result message', async () => {
  mount(<SalesDeliveryStatusPage {...props} />);
  await waitFor(() => expect(getDeliveryStatus).toHaveBeenCalledTimes(1));
  const input = screen.getByRole('textbox', { name: '출하현황 빠른 검색' });
  fireEvent.change(input, { target: { value: '출하검색' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(getDeliveryStatus).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: '출하검색' })));
  fireEvent.click(screen.getByRole('button', { name: '출하현황 검색어 초기화' }));
  expect(input).toHaveValue('');
  expect(screen.getByRole('columnheader', { name: 'No' })).toBeInTheDocument();
  expect(await screen.findByText('조회 결과가 없습니다. 조회 기간을 넓히거나 검색 조건을 변경해 주세요.')).toBeInTheDocument();
});
