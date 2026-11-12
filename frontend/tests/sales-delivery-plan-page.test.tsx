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
  planDt: '2026-11-08', remainingPlanQty: 10,
};
const plan: DeliveryPlanItem = {
  salesDeliveryPlanId: 9, tenantId: 71, planNo: 'DP-9', salesOrderId: 7,
  orderNo: 'SO-7', orderDt: '2026-11-04', customerId: 10, customerCode: 'C10',
  customerName: '거래처', createdBy: 'user01',
  details: [{
    salesDeliveryPlanDetailId: 90, salesDeliveryPlanId: 9, salesOrderId: 7,
    salesOrderDetailId: 70, orderNo: 'SO-7', orderDt: '2026-11-04', customerId: 10,
    customerCode: 'C10', customerName: '거래처', materialId: 20, materialCode: 'M20', materialName: '품목',
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

function planCell(grid: HTMLElement, rowIndex: number, columnIndex: number) {
  const rows = within(grid).getAllByRole('row').filter((row) => within(row).queryByText('M20'));
  return within(rows[rowIndex]).getAllByRole('gridcell')[columnIndex];
}

function editCell(grid: HTMLElement, rowIndex: number, columnIndex: number, value: string) {
  const cell = planCell(grid, rowIndex, columnIndex);
  fireEvent.doubleClick(cell);
  const input = cell.querySelector('input');
  if (!input) throw new Error('Grid cell editor did not open');
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

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
  expect(screen.getByRole('region', { name: '출하계획 입력 내용' })).toHaveStyle({
    paddingTop: '8px',
    paddingBottom: '16px',
  });
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

it('shows the detail response writer profile instead of the status list writer', async () => {
  vi.mocked(getDeliveryPlan).mockResolvedValue({
    ...plan, createdByName: '검증 작성자',
    createdByProfileImage: 'data:image/png;base64,c3ludGhldGlj', createdAt: '2026-11-09 10:30',
  } as DeliveryPlanItem);
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  const panel = await screen.findByRole('region', { name: '출하계획 상세' });
  const avatar = await within(panel).findByRole('img', { name: '검증 작성자' });
  expect(avatar).toHaveAttribute('src', 'data:image/png;base64,c3ludGhldGlj');
  expect(within(panel).getByText('작성자 · 등록 2026-11-09 10:30')).toBeInTheDocument();
});

it('uses the standard grid for the status list', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  const grid = await screen.findByRole('grid', { name: '출하계획 현황 목록' });
  expect(screen.getByTestId('sales-status-content')).toHaveStyle({
    paddingTop: '8px',
    paddingBottom: '16px',
  });
  expect(grid.parentElement).not.toHaveClass('MuiPaper-outlined');
  expect(grid).toHaveStyle({ borderWidth: '1px' });
});

it('edits plan quantity as a native grid cell and saves it', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
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

it('matches shipment form row height and basic information spacing', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '자세히보기' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 상세보기' });
  const grid = within(dialog).getByRole('grid', { name: '출하계획 상세 목록' });
  const body = grid.querySelector('[data-f1-grid-selecting]')!;
  expect(getComputedStyle(body).gridTemplateRows).toContain('32px');
  const infoGrid = within(dialog).getByLabelText('계획번호').closest('.MuiFormControl-root')!.parentElement!;
  expect(getComputedStyle(infoGrid).rowGap).toBe('8px');
  expect(getComputedStyle(infoGrid).columnGap).toBe('16px');
});

it('commits a cell when save is clicked without pressing Enter', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 수정' });
  const cell = planCell(within(dialog).getByRole('grid'), 0, 5);
  fireEvent.doubleClick(cell);
  fireEvent.change(cell.querySelector('input')!, { target: { value: '7' } });
  const save = within(dialog).getByRole('button', { name: '저장', exact: true });
  fireEvent.mouseDown(save);
  fireEvent.click(save);
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
    details: [expect.objectContaining({ plannedQty: 7 })],
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
  const grid = screen.getByRole('grid', { name: '출하계획 상세 목록' });
  expect(planCell(grid, 0, 4)).toHaveTextContent('2026-11-12');
  expect(planCell(grid, 0, 5)).toHaveTextContent('8');
  editCell(grid, 0, 4, '2026-11-13');
  editCell(grid, 0, 5, '7');
  fireEvent.click(screen.getByRole('button', { name: '수정 저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, {
    details: [{ salesDeliveryPlanDetailId: 90, salesOrderId: 7, salesOrderDetailId: 70,
      planDt: '2026-11-13', plannedQty: 7 }],
  }));
  expect(createDeliveryPlan).not.toHaveBeenCalled();
});

it('registers only selected source item rows from multiple orders with their remaining quantities', async () => {
  vi.mocked(searchPlanSourceOrders).mockResolvedValue([
    { ...source, remainingPlanQty: 6 },
    { ...source, salesOrderDetailId: 71, materialId: 21, materialCode: 'M21', materialName: '품목2',
      orderQty: 4, remainingPlanQty: 4 },
    { ...source, salesOrderId: 8, salesOrderDetailId: 80, orderNo: 'SO-8', materialId: 30,
      materialCode: 'M30', materialName: '품목3', orderQty: 5, remainingPlanQty: 3 },
  ]);
  render(<SalesDeliveryPlanCreatePage {...props}
    selectedMenuPermissions={{ read: true, create: true, update: false, delete: false, excel: false }} />);
  fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  const sourceGrid = await screen.findByRole('grid', { name: '계획대상 수주 품목 목록' });
  const rows = within(sourceGrid).getAllByRole('row');
  const firstRow = rows.find((row) => within(row).queryByText('품목', { exact: true })) as HTMLElement;
  const secondOrderRow = rows.find((row) => within(row).queryByText('품목3', { exact: true })) as HTMLElement;
  fireEvent.click(within(firstRow).getByRole('checkbox'));
  fireEvent.click(within(secondOrderRow).getByRole('checkbox'));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '선택', exact: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(within(screen.getByRole('region', { name: '출하계획 입력 내용' }))
    .getByRole('textbox', { name: '수주번호' })).toHaveValue('SO-7, SO-8');
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(createDeliveryPlan).toHaveBeenCalledWith({
    details: [
      { salesDeliveryPlanDetailId: null, salesOrderId: 7, salesOrderDetailId: 70,
        planDt: '2026-11-08', plannedQty: 6 },
      { salesDeliveryPlanDetailId: null, salesOrderId: 8, salesOrderDetailId: 80,
        planDt: '2026-11-08', plannedQty: 3 },
    ],
  }));
  expect(await screen.findByText('출하계획이 등록되었습니다. 계획번호: DP-9')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '신규', exact: true }));
  expect(screen.getByLabelText('계획번호')).toHaveValue('저장 시 자동 채번');
  expect(within(screen.getByRole('region', { name: '출하계획 입력 내용' }))
    .getByRole('textbox', { name: '수주번호' })).toHaveValue('');
});

it('matches search control dimensions and provides explicit item selection actions', async () => {
  render(<SalesDeliveryPlanCreatePage {...props} />);
  fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
  const dialog = screen.getByRole('dialog', { name: '계획대상 수주 품목 선택' });
  const input = within(dialog).getByRole('textbox', { name: '수주번호·거래처 검색' });
  const button = within(dialog).getByRole('button', { name: '검색' });
  expect(getComputedStyle(input.closest('.MuiOutlinedInput-root')!).height).toBe('40px');
  expect(getComputedStyle(button).height).toBe('40px');
  expect(getComputedStyle(button).minWidth).toBe('88px');
  fireEvent.submit(input.closest('form')!);
  const grid = await within(dialog).findByRole('grid', { name: '계획대상 수주 품목 목록' });
  expect(within(grid).getAllByRole('checkbox')).toHaveLength(2);
  expect(within(dialog).getByRole('button', { name: '선택', exact: true })).toBeDisabled();
  expect(dialog).toBeInTheDocument();
});

it('loads, edits, and saves plan quantities from the status detail', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  await waitFor(() => expect(getDeliveryPlanStatus).toHaveBeenCalled());
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  expect(getDeliveryPlan).toHaveBeenCalledWith(9);
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const detailTable = screen.getByRole('grid', { name: '출하계획 상세 목록' });
  editCell(detailTable, 0, 5, '8');
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, {
    details: [{ salesDeliveryPlanDetailId: 90, salesOrderId: 7, salesOrderDetailId: 70,
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
  await screen.findByRole('group', { name: '출하계획 정보' });
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
  await screen.findByRole('group', { name: '출하계획 정보' });
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
  expect(planCell(within(screen.getByRole('dialog')).getByRole('grid'), 0, 5)).toHaveTextContent('10');
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
    details: [expect.objectContaining({ plannedQty: 10 })],
  })));
});

it('uses the registration form in status editing and saves split rows', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 수정' });
  const grid = within(dialog).getByRole('grid', { name: '출하계획 상세 목록' });
  expect(within(grid).getByRole('columnheader', { name: '분할' })).toBeInTheDocument();
  editCell(grid, 0, 5, '6');
  fireEvent.click(within(grid).getByRole('button', { name: '분할' }));
  const splitGrid = within(dialog).getByRole('grid', { name: '출하계획 상세 목록' });
  const firstSplit = within(splitGrid).getAllByRole('button', { name: '분할', exact: true })[0];
  const deleteButton = within(splitGrid).getAllByRole('button', { name: '분할행 삭제' })[0];
  expect(getComputedStyle(firstSplit.parentElement!).justifyContent).toBe('center');
  expect(getComputedStyle(deleteButton).minWidth).toBe('0px');
  editCell(splitGrid, 1, 5, '4');
  expect(planCell(splitGrid, 0, 6)).toHaveTextContent('10');
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, {
    details: [
      { salesDeliveryPlanDetailId: 90, salesOrderId: 7, salesOrderDetailId: 70, planDt: '2026-11-08', plannedQty: 6 },
      { salesDeliveryPlanDetailId: null, salesOrderId: 7, salesOrderDetailId: 70, planDt: null, plannedQty: 4 },
    ],
  }));
});

it('inserts a split after its source and immediately edits the new quantity', async () => {
  vi.mocked(getDeliveryPlan).mockResolvedValue({
    ...plan, details: [
      { ...plan.details[0], plannedQty: 6 },
      { ...plan.details[0], salesDeliveryPlanDetailId: 91, salesOrderDetailId: 71,
        materialId: 21, materialCode: 'M21', materialName: '품목2', orderQty: 4, plannedQty: 4 },
    ],
  });
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 수정' });
  let grid = within(dialog).getByRole('grid', { name: '출하계획 상세 목록' });
  fireEvent.click(within(grid).getAllByRole('button', { name: '분할', exact: true })[0]);
  grid = within(dialog).getByRole('grid', { name: '출하계획 상세 목록' });
  const itemRows = within(grid).getAllByRole('row').filter((row) =>
    within(row).queryByText('M20') || within(row).queryByText('M21'));
  expect(itemRows.map((row) => within(row).getAllByRole('gridcell')[1].textContent))
    .toEqual(['M20', 'M20', 'M21']);
  const editor = planCell(grid, 1, 5).querySelector('input');
  expect(editor).not.toBeNull();
  await waitFor(() => expect(editor).toHaveFocus());
  fireEvent.change(editor!, { target: { value: '4' } });
  fireEvent.keyDown(editor!, { key: 'Enter' });
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, {
    details: [
      { salesDeliveryPlanDetailId: 90, salesOrderId: 7, salesOrderDetailId: 70, planDt: '2026-11-08', plannedQty: 6 },
      { salesDeliveryPlanDetailId: null, salesOrderId: 7, salesOrderDetailId: 70, planDt: null, plannedQty: 4 },
      { salesDeliveryPlanDetailId: 91, salesOrderId: 7, salesOrderDetailId: 71, planDt: '2026-11-08', plannedQty: 4 },
    ],
  }));
});

it('keeps split rows grouped with their order line after reopening a saved plan', async () => {
  vi.mocked(getDeliveryPlan).mockResolvedValue({
    ...plan, details: [
      { ...plan.details[0], plannedQty: 6 },
      { ...plan.details[0], salesDeliveryPlanDetailId: 91, salesOrderDetailId: 71,
        materialId: 21, materialCode: 'M21', materialName: '품목2', orderQty: 4, plannedQty: 4 },
      { ...plan.details[0], salesDeliveryPlanDetailId: 92, planDt: null, plannedQty: 4 },
    ],
  });
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const grid = within(screen.getByRole('dialog')).getByRole('grid', { name: '출하계획 상세 목록' });
  const rows = within(grid).getAllByRole('row').filter((row) =>
    within(row).queryByText('M20') || within(row).queryByText('M21'));
  expect(rows.map((row) => within(row).getAllByRole('gridcell')[1].textContent))
    .toEqual(['M20', 'M20', 'M21']);
});

it('retains edited values after deleting a split row and warns before closing', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 수정' });
  let grid = within(dialog).getByRole('grid');
  editCell(grid, 0, 5, '6');
  fireEvent.click(within(grid).getByRole('button', { name: '분할' }));
  grid = within(dialog).getByRole('grid');
  const secondRow = planCell(grid, 1, 5).closest('[role="row"]') as HTMLElement;
  fireEvent.click(within(secondRow).getByRole('button', { name: '분할행 삭제' }));
  grid = within(dialog).getByRole('grid');
  expect(planCell(grid, 0, 5)).toHaveTextContent('6');
  fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
  const confirmation = await screen.findByRole('dialog', { name: '확인' });
  expect(confirmation).toHaveTextContent('저장되지 않은 출하계획 내용이 있습니다.');
  fireEvent.click(within(confirmation).getByRole('button', { name: '취소' }));
  expect(dialog).toBeInTheDocument();
});

it('applies registration quantity validation in status editing', async () => {
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 수정' });
  editCell(within(dialog).getByRole('grid'), 0, 5, '11');
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  expect(within(dialog).getByText('계획수량 합계가 수주수량을 초과했습니다.')).toBeInTheDocument();
  expect(updateDeliveryPlan).not.toHaveBeenCalled();
});

it('opens a read-only detail dialog and keeps edits after a failed save', async () => {
  vi.mocked(updateDeliveryPlan).mockRejectedValue(new Error('저장 실패'));
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '자세히보기' }));
  expect(screen.getByRole('dialog', { name: '출하계획 상세보기' })).toBeInTheDocument();
  const readOnlyCell = planCell(within(screen.getByRole('dialog')).getByRole('grid'), 0, 5);
  fireEvent.doubleClick(readOnlyCell);
  expect(readOnlyCell.querySelector('input')).toBeNull();
  fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: '닫기', exact: true })[1]);
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 수정' });
  editCell(within(dialog).getByRole('grid'), 0, 5, '8');
  fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
  expect(await within(dialog).findByText('저장 실패')).toBeInTheDocument();
  expect(planCell(within(dialog).getByRole('grid'), 0, 5)).toHaveTextContent('8');
});

it('does not allow opening an empty editor when loading plan details fails', async () => {
  vi.mocked(getDeliveryPlan).mockRejectedValue(new Error('상세 조회 실패'));
  render(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await within(screen.getByRole('region', { name: '출하계획 상세' })).findByText('상세 조회 실패');
  expect(screen.getByRole('button', { name: '출하계획 더보기' })).toBeDisabled();
});
