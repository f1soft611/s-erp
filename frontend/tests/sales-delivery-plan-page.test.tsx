import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { SalesDeliveryPlanCreatePage } from '../src/pages/sales/delivery-plan/create/SalesDeliveryPlanCreatePage';
import { SalesDeliveryPlanStatusPage } from '../src/pages/sales/delivery-plan/status/SalesDeliveryPlanStatusPage';
import { createDeliveryPlan, getDeliveryPlan, getDeliveryPlanByOrder, getDeliveryPlanStatus, searchPlanSourceOrders, updateDeliveryPlan } from '../src/pages/sales/delivery-plan/services/salesDeliveryPlan.service';
import type { DeliveryPlanItem, PlanSourceOrderRow } from '../src/pages/sales/delivery-plan/types/salesDeliveryPlan.types';
import type { ModuleItem } from '../src/pages/dashboard/types/dashboard';

vi.mock('../src/pages/sales/delivery-plan/services/salesDeliveryPlan.service', () => ({
  createDeliveryPlan: vi.fn(), getDeliveryPlan: vi.fn(), getDeliveryPlanByOrder: vi.fn(), getDeliveryPlanStatus: vi.fn(),
  searchPlanSourceOrders: vi.fn(), updateDeliveryPlan: vi.fn(), validateDeliveryPlan: () => '',
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

it('loads and updates an existing AUTO plan instead of creating another plan', async () => {
  const editedPlan: DeliveryPlanItem = {
    ...plan,
    details: [{ ...plan.details[0], planDt: '2026-11-12', plannedQty: 8, remainingQty: 8 }],
  };
  vi.mocked(getDeliveryPlanByOrder).mockResolvedValue(editedPlan);
  render(<SalesDeliveryPlanCreatePage {...props} deliveryPlanMode="AUTO" />);
  fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: '선택', exact: true }));

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
  render(<SalesDeliveryPlanCreatePage {...props}
    selectedMenuPermissions={{ read: true, create: true, update: false, delete: false, excel: false }} />);
  fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: '선택', exact: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByLabelText('수주번호')).toHaveValue('SO-7');
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(createDeliveryPlan).toHaveBeenCalledWith({
    salesOrderId: 7,
    details: [{ salesDeliveryPlanDetailId: null, salesOrderDetailId: 70,
      planDt: '2026-11-08', plannedQty: 10 }],
  }));
  expect(await screen.findByText('출하계획이 등록되었습니다. 계획번호: DP-9')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '신규', exact: true }));
  expect(screen.getByLabelText('계획번호')).toHaveValue('저장 시 자동 채번');
  expect(screen.getByLabelText('수주번호')).toHaveValue('');
});

it('loads, edits, and saves plan quantities from the status detail', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  await waitFor(() => expect(getDeliveryPlanStatus).toHaveBeenCalled());
  fireEvent.click(await screen.findByRole('button', { name: '상세 보기' }));
  await screen.findByText('DP-9 · SO-7');
  expect(getDeliveryPlan).toHaveBeenCalledWith(9);
  fireEvent.click(screen.getByRole('button', { name: '수정' }));
  const detailTable = screen.getByRole('table', { name: '출하계획 상세 목록' });
  fireEvent.change(within(detailTable).getByRole('spinbutton'), { target: { value: '8' } });
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, {
    salesOrderId: 7,
    details: [{ salesDeliveryPlanDetailId: 90, salesOrderDetailId: 70,
      planDt: '2026-11-08', plannedQty: 8 }],
  }));
});

it('shows excess separately and permits preserving the planned baseline when delivered quantity exceeds it', async () => {
  vi.mocked(getDeliveryPlan).mockResolvedValue({
    ...plan, details: [{ ...plan.details[0], deliveredQty: 15, remainingQty: -5 }],
  });
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: '상세 보기' }));
  const table = await screen.findByRole('table', { name: '출하계획 상세 목록' });
  await within(table).findByText('15');
  expect(within(table).getByRole('columnheader', { name: '미출하수량' })).toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: '초과출하' })).toBeInTheDocument();
  expect(within(table).queryByText('-5')).not.toBeInTheDocument();
  expect(within(table).getByText('5')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '수정' }));
  expect(within(table).getByRole('spinbutton')).toHaveAttribute('min', '0.01');
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
    details: [expect.objectContaining({ plannedQty: 10 })],
  })));
});
