import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { SalesDeliveryPlanCreatePage } from '../src/pages/sales/delivery-plan/create/SalesDeliveryPlanCreatePage';
import { SalesDeliveryPlanStatusPage } from '../src/pages/sales/delivery-plan/status/SalesDeliveryPlanStatusPage';
import { createDeliveryPlan, getDeliveryPlan, getDeliveryPlanByOrder, getDeliveryPlanStatus, searchPlanSourceOrders, updateDeliveryPlan } from '../src/pages/sales/delivery-plan/services/salesDeliveryPlan.service';
import type { DeliveryPlanItem, PlanSourceOrderRow } from '../src/pages/sales/delivery-plan/types/salesDeliveryPlan.types';
import type { ModuleItem } from '../src/pages/dashboard/types/dashboard';

vi.mock('../src/pages/sales/delivery-plan/services/salesDeliveryPlan.service', async (original) => ({
  ...await original<object>(),
  createDeliveryPlan: vi.fn(), getDeliveryPlan: vi.fn(), getDeliveryPlanByOrder: vi.fn(), getDeliveryPlanStatus: vi.fn(),
  searchPlanSourceOrders: vi.fn(), updateDeliveryPlan: vi.fn(),
  defaultDeliveryPlanFilters: () => ({
    planDtFrom: '2026-11-01', planDtTo: '2026-11-30', keyword: '',
  }), validDeliveryPlanPeriod: () => true,
}));

const source: PlanSourceOrderRow = {
  salesOrderId: 7, salesOrderDetailId: 70, orderNo: 'SO-7', orderDt: '2026-11-04',
  customerId: 10, customerCode: 'C10', customerName: '거래처', deliveryPlace: '창고',
  deliveryMethod: '택배', lineNo: 1, materialId: 20, materialCode: 'M20',
  materialName: '품목', unit: 'EA', orderQty: 10, shippedQty: 0, unitPrice: 100,
  planDt: '2026-11-08',
};
const plan: DeliveryPlanItem = {
  salesDeliveryPlanId: 9, tenantId: 71, planNo: 'DP-9', salesOrderId: 7,
  orderNo: 'SO-7', orderDt: '2026-11-04', customerId: 10, customerCode: 'C10',
  customerName: '거래처', createdBy: 'user01',
  details: [{
    salesDeliveryPlanDetailId: 90, salesDeliveryPlanId: 9, salesOrderId: 7,
    salesOrderDetailId: 70, materialId: 20, materialCode: 'M20', materialName: '품목',
    unit: 'EA', lineNo: 1, planDt: '2026-11-08', plannedQty: 10,
    deliveredQty: 0, remainingQty: 10, orderQty: 10,
  }],
};
const props = {
  selectedModule: { id: 'sales', tree: [] } as unknown as ModuleItem,
  currentMenuName: '출하계획', content: { title: '출하계획', description: '', cards: [], items: [] },
  breadcrumbItems: ['영업관리', '출하계획'],
  selectedMenuPermissions: { read: true, create: true, update: true, delete: false, excel: false },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(searchPlanSourceOrders).mockResolvedValue([source]);
  vi.mocked(createDeliveryPlan).mockResolvedValue(plan);
  vi.mocked(getDeliveryPlanStatus).mockResolvedValue([plan]);
  vi.mocked(getDeliveryPlan).mockResolvedValue(plan);
  vi.mocked(getDeliveryPlanByOrder).mockResolvedValue(plan);
  vi.mocked(updateDeliveryPlan).mockResolvedValue(plan);
});

it('uses the standard grid for the registration details', () => {
  render(<SalesDeliveryPlanCreatePage {...props} />);
  expect(screen.getByRole('grid', { name: '출하계획 상세 목록' })).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: '출하계획 입력 내용' }))
    .getByRole('button', { name: '수주 선택' }).closest('.MuiInputAdornment-root')).not.toBeNull();
});

it('opens plan details by clicking the plan number like shipment status', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  const panel = await screen.findByRole('region', { name: '출하계획 상세' });
  expect(within(panel).getByRole('button', { name: '출하계획 더보기' })).toBeInTheDocument();
});

it('uses the standard grid for the status list', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  expect(await screen.findByRole('grid', { name: '출하계획 현황 목록' })).toBeInTheDocument();
});

it('edits plan quantity as a native grid cell and saves it', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByText('DP-9 · SO-7');
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 수정' });
  const grid = within(dialog).getByRole('grid', { name: '출하계획 상세 목록' });
  const row = within(grid).getAllByRole('row').find((item) => within(item).queryByText('M20'))!;
  const quantityCell = within(row).getAllByRole('gridcell')[5];
  expect(quantityCell.querySelector('input')).toBeNull();
  fireEvent.doubleClick(quantityCell);
  const editor = quantityCell.querySelector('input')!;
  expect(editor).not.toBeNull();
  fireEvent.change(editor, { target: { value: '8' } });
  fireEvent.keyDown(editor, { key: 'Enter' });
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
    details: [expect.objectContaining({ plannedQty: 8 })],
  })));
});

it('opens and closes the standard status detail panel', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  expect(await screen.findByLabelText('출하계획 상세')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));
  expect(screen.queryByLabelText('출하계획 상세')).not.toBeInTheDocument();
});

it('loads and updates an existing AUTO plan instead of creating another plan', async () => {
  const editedPlan: DeliveryPlanItem = {
    ...plan,
    details: [{ ...plan.details[0], planDt: '2026-11-12', plannedQty: 8, remainingQty: 8 }],
  };
  vi.mocked(getDeliveryPlanByOrder).mockResolvedValue(editedPlan);
  render(<SalesDeliveryPlanCreatePage {...props} deliveryPlanMode="AUTO" />);
  fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'SO-7', exact: true }));

  await waitFor(() => expect(getDeliveryPlanByOrder).toHaveBeenCalledWith(7));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByLabelText('계획번호')).toHaveValue('DP-9');
  expect(screen.getByDisplayValue('2026-11-12')).toBeInTheDocument();
  expect(screen.getByRole('spinbutton')).toHaveValue(8);
  fireEvent.click(screen.getByRole('button', { name: '수정 저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, {
    salesOrderId: 7,
    details: [{ salesDeliveryPlanDetailId: 90, salesOrderDetailId: 70,
      planDt: '2026-11-12', plannedQty: 8 }],
  }));
  expect(createDeliveryPlan).not.toHaveBeenCalled();
});

it('registers a plan from an order and includes its source detail identity', async () => {
  vi.mocked(searchPlanSourceOrders).mockResolvedValue([
    source, { ...source, salesOrderDetailId: 71, materialId: 21, materialCode: 'M21', materialName: '품목2', orderQty: 4 },
    { ...source, salesOrderId: 8, salesOrderDetailId: 80, orderNo: 'SO-8' },
  ]);
  render(<SalesDeliveryPlanCreatePage {...props}
    selectedMenuPermissions={{ read: true, create: true, update: false, delete: false, excel: false }} />);
  fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  fireEvent.click((await screen.findAllByRole('button', { name: 'SO-7', exact: true }))[0]);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByLabelText('수주번호')).toHaveValue('SO-7');
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(createDeliveryPlan).toHaveBeenCalledWith({
    salesOrderId: 7,
    details: [{ salesDeliveryPlanDetailId: null, salesOrderDetailId: 70,
      planDt: '2026-11-08', plannedQty: 10 }, { salesDeliveryPlanDetailId: null, salesOrderDetailId: 71,
      planDt: '2026-11-08', plannedQty: 4 }],
  }));
  expect(await screen.findByText('출하계획이 등록되었습니다. 계획번호: DP-9')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '신규', exact: true }));
  expect(screen.getByLabelText('계획번호')).toHaveValue('저장 시 자동 채번');
  expect(screen.getByLabelText('수주번호')).toHaveValue('');
});

it('matches search control dimensions and highlights an order row without selecting it', async () => {
  render(<SalesDeliveryPlanCreatePage {...props} />);
  fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
  const dialog = screen.getByRole('dialog', { name: '계획대상 수주 선택' });
  const input = within(dialog).getByRole('textbox', { name: '수주번호·거래처 검색' });
  const button = within(dialog).getByRole('button', { name: '검색' });
  expect(getComputedStyle(input.closest('.MuiOutlinedInput-root')!).height).toBe('40px');
  expect(getComputedStyle(button).height).toBe('40px');
  expect(getComputedStyle(button).minWidth).toBe('88px');
  fireEvent.submit(input.closest('form')!);
  const number = await within(dialog).findByRole('button', { name: 'SO-7', exact: true });
  const row = number.closest('[role="row"]')!;
  fireEvent.mouseDown(within(row as HTMLElement).getByRole('gridcell', { name: '품목' }), { button: 0 });
  expect(row.querySelector('[data-row-selection-overlay]')).not.toBeNull();
  expect(dialog).toBeInTheDocument();
  fireEvent.click(number);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByLabelText('수주번호')).toHaveValue('SO-7');
});

it('loads, edits, and saves plan quantities from the status detail', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  await waitFor(() => expect(getDeliveryPlanStatus).toHaveBeenCalled());
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByText('DP-9 · SO-7');
  expect(getDeliveryPlan).toHaveBeenCalledWith(9);
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const detailTable = screen.getByRole('grid', { name: '출하계획 상세 목록' });
  fireEvent.change(within(detailTable).getByRole('spinbutton'), { target: { value: '8' } });
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, {
    salesOrderId: 7,
    details: [{ salesDeliveryPlanDetailId: 90, salesOrderDetailId: 70,
      planDt: '2026-11-08', plannedQty: 8 }],
  }));
});

it('allows status editing with registration menu update permission', async () => {
  const selectedModule = { id: 'sales', tree: [{
    pageKey: 'delivery-plan-create', children: [],
    permissions: { read: true, create: true, update: true, delete: false, excel: false },
  }] } as unknown as ModuleItem;
  render(<SalesDeliveryPlanStatusPage {...props} selectedModule={selectedModule}
    selectedMenuPermissions={{ read: true, create: false, update: false, delete: false, excel: false }} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByText('DP-9 · SO-7');
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  expect(screen.getByRole('menuitem', { name: '수정' })).toBeEnabled();
});

it('does not expose status editing when registration menu read is denied', async () => {
  const selectedModule = { id: 'sales', tree: [{
    pageKey: 'delivery-plan-create', children: [],
    permissions: { read: false, create: false, update: true, delete: false, excel: false },
  }] } as unknown as ModuleItem;
  render(<SalesDeliveryPlanStatusPage {...props} selectedModule={selectedModule}
    selectedMenuPermissions={{ read: true, create: false, update: false, delete: false, excel: false }} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByText('DP-9 · SO-7');
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  expect(screen.queryByRole('menuitem', { name: '수정' })).not.toBeInTheDocument();
});

it('shows excess separately and permits preserving the planned baseline when delivered quantity exceeds it', async () => {
  vi.mocked(getDeliveryPlan).mockResolvedValue({
    ...plan, details: [{ ...plan.details[0], deliveredQty: 15, remainingQty: -5 }],
  });
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  const table = await screen.findByRole('table', { name: '출하계획 상세 목록' });
  await within(table).findByText('15');
  expect(within(table).getByRole('columnheader', { name: '미출하수량' })).toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: '초과출하' })).toBeInTheDocument();
  expect(within(table).queryByText('-5')).not.toBeInTheDocument();
  expect(within(table).getByText('5')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  expect(within(screen.getByRole('dialog')).getByRole('spinbutton')).toHaveAttribute('min', '0');
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
    details: [expect.objectContaining({ plannedQty: 10 })],
  })));
});

it('uses the registration form in status editing and saves split rows', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByText('DP-9 · SO-7');
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 수정' });
  const grid = within(dialog).getByRole('grid', { name: '출하계획 상세 목록' });
  expect(within(grid).getByRole('columnheader', { name: '분할' })).toBeInTheDocument();
  fireEvent.change(within(grid).getByRole('spinbutton'), { target: { value: '6' } });
  fireEvent.click(within(grid).getByRole('button', { name: '분할' }));
  const quantities = within(grid).getAllByRole('spinbutton');
  fireEvent.change(quantities[1], { target: { value: '4' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, {
    salesOrderId: 7,
    details: [
      { salesDeliveryPlanDetailId: 90, salesOrderDetailId: 70, planDt: '2026-11-08', plannedQty: 6 },
      { salesDeliveryPlanDetailId: null, salesOrderDetailId: 70, planDt: null, plannedQty: 4 },
    ],
  }));
});

it('applies registration quantity validation in status editing', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByText('DP-9 · SO-7');
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 수정' });
  fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '11' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  expect(within(dialog).getByText('계획수량 합계가 수주수량을 초과했습니다.')).toBeInTheDocument();
  expect(updateDeliveryPlan).not.toHaveBeenCalled();
});

it('opens a read-only detail dialog and keeps edits after a failed save', async () => {
  vi.mocked(updateDeliveryPlan).mockRejectedValue(new Error('저장 실패'));
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByText('DP-9 · SO-7');
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '자세히보기' }));
  expect(screen.getByRole('dialog', { name: '출하계획 상세보기' })).toBeInTheDocument();
  expect(within(screen.getByRole('dialog')).getByRole('spinbutton')).toBeDisabled();
  fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: '닫기', exact: true })[1]);
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 수정' });
  fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '8' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
  expect(await within(dialog).findByText('저장 실패')).toBeInTheDocument();
  expect(within(dialog).getByRole('spinbutton')).toHaveValue(8);
});

it('does not allow opening an empty editor when loading plan details fails', async () => {
  vi.mocked(getDeliveryPlan).mockRejectedValue(new Error('상세 조회 실패'));
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await within(screen.getByRole('region', { name: '출하계획 상세' })).findByText('상세 조회 실패');
  expect(screen.getByRole('button', { name: '출하계획 더보기' })).toBeDisabled();
});
