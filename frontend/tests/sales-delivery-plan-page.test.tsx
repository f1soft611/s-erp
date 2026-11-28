import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createRef, type ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { DeliveryDetailGrid } from '../src/pages/sales/shipment/delivery/create/components/DeliveryDetailGrid';
import { newDeliveryRow } from '../src/pages/sales/shipment/delivery/create/services/salesDelivery.service';
import type { DeliveryRow } from '../src/pages/sales/shipment/delivery/create/types/salesDelivery.types';
import { SalesDeliveryPlanCreatePage } from '../src/pages/sales/shipment/deliveryplan/create/SalesDeliveryPlanCreatePage';
import { SalesDeliveryPlanStatusPage } from '../src/pages/sales/shipment/deliveryplan/status/SalesDeliveryPlanStatusPage';
import { createDeliveryPlan, getDeliveryPlan, getDeliveryPlanByOrder, getDeliveryPlanStatus, searchPlanSourceOrders, updateDeliveryPlan } from '../src/pages/sales/shipment/deliveryplan/services/salesDeliveryPlan.service';
import type { DeliveryPlanItem, DeliveryPlanStatusRow, PlanSourceOrderRow } from '../src/pages/sales/shipment/deliveryplan/types/salesDeliveryPlan.types';
import type { ModuleItem } from '../src/pages/dashboard/types/dashboard';
import type { F1GridRef } from '../src/shared/components/f1-grid';
import { AppSettingsContext } from '../src/shared/context/appSettings';
import { GridDecimalModuleProvider } from '../src/shared/components/f1-grid/core/GridDecimalPolicy';
import * as decimalPolicyService from '../src/shared/services/gridDecimalPolicy.service';
import * as decimalColumns from '../src/shared/services/decimalColumnContract';

vi.setConfig({ testTimeout: 15000 });

const notification = vi.hoisted(() => ({ showSuccess: vi.fn(), showWarning: vi.fn(), showError: vi.fn() }));
// 성공 문구는 공통 토스트(showSuccess)로 표시된다.
vi.mock('../src/shared/context/notification', () => ({ useNotification: () => notification }));

vi.mock('../src/pages/sales/shipment/deliveryplan/services/salesDeliveryPlan.service', async (original) => ({
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
  salesDeliveryPlanId: 9, tenantId: 71, planNo: 'DP-9', createdBy: 'user01',
  details: [{
    salesDeliveryPlanDetailId: 90, salesDeliveryPlanId: 9, salesOrderId: 7,
    salesOrderDetailId: 70, orderNo: 'SO-7', orderDt: '2026-11-04', customerId: 10,
    customerCode: 'C10', customerName: '거래처', materialId: 20, materialCode: 'M20', materialName: '품목',
    unit: 'EA', lineNo: 1, planDt: '2026-11-08', plannedQty: 10,
    deliveredQty: 0, remainingQty: 10, orderQty: 10,
  }],
};
const statusRow: DeliveryPlanStatusRow = {
  salesDeliveryPlanId: 9, salesDeliveryPlanDetailId: 90, planNo: 'DP-9',
  salesOrderId: 7, salesOrderDetailId: 70, orderNo: 'SO-7', orderDt: '2026-11-04',
  customerId: 10, customerCode: 'C10', customerName: '거래처',
  materialId: 20, materialCode: 'M20', materialName: '품목', unit: 'EA', lineNo: 1,
  planDt: '2026-11-08', orderQty: 10, plannedQty: 10, deliveredQty: 0, remainingQty: 10,
};
const props = {
  selectedModule: { id: 'sales', tree: [] } as unknown as ModuleItem,
  currentMenuName: '출하계획', content: { title: '출하계획', description: '', cards: [], items: [] },
  breadcrumbItems: ['영업관리', '출하계획'],
  selectedMenuPermissions: { read: true, create: true, update: true, delete: false, excel: false },
};

function planCell(grid: HTMLElement, rowIndex: number, columnIndex: number) {
  const rows = within(grid).getAllByRole('row').filter((row) =>
    within(row).queryByRole('button', { name: '분할', exact: true }));
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

const defaultRule = { trailingZeros: 'AUTO' as const, rounding: 'HALF_UP' as const };
const defaultPolicy = { SALES: {
  number: { ...defaultRule, places: 6 }, decimal: { ...defaultRule, places: 6 }, currency: { ...defaultRule, places: 6 },
} };
// 영업 화면은 소수점 정책이 필수이므로 별도 지정이 없는 테스트도 기본 정책 공급자 아래에서 렌더링한다.
const renderReady = async (ui: ReactNode) => {
  const result = render(<GridDecimalModuleProvider moduleCode="SALES">{ui}</GridDecimalModuleProvider>);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  return result;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockResolvedValue(defaultPolicy);
  vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicy').mockResolvedValue(defaultPolicy);
  vi.mocked(searchPlanSourceOrders).mockResolvedValue([source]);
  vi.mocked(createDeliveryPlan).mockResolvedValue(plan);
  vi.mocked(getDeliveryPlanStatus).mockResolvedValue([statusRow]);
  vi.mocked(getDeliveryPlan).mockResolvedValue(plan);
  vi.mocked(getDeliveryPlanByOrder).mockResolvedValue(plan);
  vi.mocked(updateDeliveryPlan).mockResolvedValue(plan);
});

it('blocks plan editing and saving when the decimal policy cannot be loaded', async () => {
  const policy = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockRejectedValue(new Error('offline'));
  try {
    render(<GridDecimalModuleProvider moduleCode="SALES"><SalesDeliveryPlanCreatePage {...props} /></GridDecimalModuleProvider>);
    expect(await screen.findByText('소수점 정책을 불러오지 못했습니다. 다시 조회해 주세요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수주 선택' })).toBeDisabled();
  } finally { policy.mockRestore(); }
});

it('sends the loaded policy when saving a delivery plan', async () => {
  const rule = { places: 0, trailingZeros: 'FIXED', rounding: 'HALF_UP' } as const;
  const decimalPolicy = { number: rule, decimal: { ...rule, places: 3 }, currency: { ...rule, places: 3 } };
  const policy = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockResolvedValue({ SALES: decimalPolicy });
  try {
    render(<GridDecimalModuleProvider moduleCode="SALES"><SalesDeliveryPlanCreatePage {...props} deliveryPlanMode="AUTO" /></GridDecimalModuleProvider>);
    await waitFor(() => expect(screen.getByRole('button', { name: '수주 선택' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'SO-7', exact: true }));
    await waitFor(() => expect(screen.getByLabelText('계획번호')).toHaveValue('DP-9'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '수정 저장', exact: true }));
    await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
      decimalPolicy, decimalColumns: { plannedQty: { type: 'number' } },
    })));
  } finally { policy.mockRestore(); }
});

it('uses the planned quantity column override for input and saving', async () => {
  const rule = { places: 0, trailingZeros: 'FIXED', rounding: 'DOWN' } as const;
  const decimalPolicy = { number: rule, decimal: { ...rule, places: 3 }, currency: { ...rule, places: 3 } };
  const strict = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockResolvedValue({ SALES: decimalPolicy });
  const standard = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicy').mockResolvedValue({ SALES: decimalPolicy });
  const columns = vi.spyOn(decimalColumns, 'getDecimalColumnContract').mockReturnValue({
    plannedQty: { type: 'number', places: 1 }, orderQty: { type: 'number' }, deliveryQty: { type: 'number' },
  });
  try {
    render(<GridDecimalModuleProvider moduleCode="SALES"><SalesDeliveryPlanCreatePage {...props} deliveryPlanMode="AUTO" /></GridDecimalModuleProvider>);
    await waitFor(() => expect(screen.getByRole('button', { name: '수주 선택' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'SO-7', exact: true }));
    await waitFor(() => expect(screen.getByLabelText('계획번호')).toHaveValue('DP-9'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const grid = screen.getByRole('grid', { name: '출하계획 상세 목록' });
    const cell = planCell(grid, 0, 5);
    fireEvent.doubleClick(cell);
    const editor = cell.querySelector('input')!;
    fireEvent.change(editor, { target: { value: '7.12' } });
    expect(editor).not.toHaveValue(7.12);
    fireEvent.change(editor, { target: { value: '7.1' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '수정 저장', exact: true }));
    await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
      decimalColumns: { plannedQty: { type: 'number', places: 1 }, orderQty: { type: 'number' }, deliveryQty: { type: 'number' } },
      details: [expect.objectContaining({ plannedQty: '7.1' })],
    })));
  } finally { columns.mockRestore(); strict.mockRestore(); standard.mockRestore(); }
}, 15000);

it('uses the standard grid for the registration details', async () => {
  await renderReady(<SalesDeliveryPlanCreatePage {...props} />);
  expect(screen.getByRole('region', { name: '출하계획 입력 내용' })).toHaveStyle({
    paddingTop: '16px',
    paddingLeft: '16px',
    paddingRight: '16px',
    paddingBottom: '16px',
  });
  expect(screen.getByRole('grid', { name: '출하계획 상세 목록' })).toBeInTheDocument();
  expect(screen.getByRole('grid', { name: '출하계획 상세 목록' }).parentElement).toHaveStyle({
    paddingLeft: '16px', paddingRight: '16px',
  });
  expect(within(screen.getByRole('region', { name: '출하계획 입력 내용' }))
    .getByRole('button', { name: '수주 선택' }).closest('.MuiInputAdornment-root')).not.toBeNull();
});

it('persists registration and status detail layouts separately', async () => {
  const createKey = 'sales-delivery-plan-create-details-v1';
  const statusKey = 'sales-delivery-plan-status-details-v1';
  localStorage.removeItem(createKey);
  localStorage.removeItem(statusKey);
  const create = await renderReady(<SalesDeliveryPlanCreatePage {...props} />);
  expect(localStorage.getItem(createKey)).not.toBeNull();
  create.unmount();
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  await screen.findByRole('grid', { name: '출하계획 상세 목록' });
  expect(localStorage.getItem(statusKey)).not.toBeNull();
  expect(localStorage.getItem(createKey)).not.toBeNull();
  localStorage.removeItem(createKey);
  localStorage.removeItem(statusKey);
});

it('opens plan details by clicking the plan number like shipment status', async () => {
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  const panel = await screen.findByRole('region', { name: '출하계획 상세' });
  expect(within(panel).getByRole('button', { name: '출하계획 더보기' })).toBeInTheDocument();
});

it('formats status detail quantities and decimal differences using the quantity policy', async () => {
    const policy = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockResolvedValue({
      SALES: {
        number: { places: 3, rounding: 'DOWN', trailingZeros: 'FIXED' },
        decimal: { places: 3, rounding: 'HALF_UP', trailingZeros: 'FIXED' },
        currency: { places: 3, rounding: 'HALF_UP', trailingZeros: 'FIXED' },
      },
    });
    vi.mocked(getDeliveryPlan).mockResolvedValue({
      ...plan, details: [{ ...plan.details[0], orderQty: 0.3, plannedQty: 0.3, deliveredQty: 0.1 }],
    });
    try {
      render(<GridDecimalModuleProvider moduleCode="SALES"><SalesDeliveryPlanStatusPage {...props} /></GridDecimalModuleProvider>);
      fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
      const table = await screen.findByRole('table', { name: '출하계획 상세 목록' });
      await waitFor(() => {
        const cells = within(within(table).getAllByRole('row')[1]).getAllByRole('cell');
        expect(cells.slice(3).map((cell) => cell.textContent)).toEqual(['0.300', '0.300', '0.100', '0.200', '0.000']);
      });
    } finally { policy.mockRestore(); }
});

it('displays the planned quantity with its column override in status detail', async () => {
  const rule = { places: 0, trailingZeros: 'FIXED', rounding: 'DOWN' } as const;
  const strict = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockResolvedValue({
    SALES: { number: rule, decimal: rule, currency: rule },
  });
  const columns = vi.spyOn(decimalColumns, 'getDecimalColumnContract').mockReturnValue({
    plannedQty: { type: 'number', places: 2 }, orderQty: { type: 'number' }, deliveryQty: { type: 'number' },
  });
  vi.mocked(getDeliveryPlan).mockResolvedValue({
    ...plan, details: [{ ...plan.details[0], plannedQty: '1.25' }],
  });
  try {
    render(<GridDecimalModuleProvider moduleCode="SALES"><SalesDeliveryPlanStatusPage {...props} /></GridDecimalModuleProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
    const table = await screen.findByRole('table', { name: '출하계획 상세 목록' });
    await waitFor(() => {
      const cells = within(within(table).getAllByRole('row')[1]).getAllByRole('cell');
      expect(cells[4]).toHaveTextContent(/^1\.25$/);
    });
  } finally { columns.mockRestore(); strict.mockRestore(); }
});

it('displays exact plan quantities and their small difference in status detail', async () => {
  const rules = { SALES: {
    number: { places: 6, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
    decimal: { places: 6, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
    currency: { places: 3, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
  } };
  const strict = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockResolvedValue(rules);
  const standard = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicy').mockResolvedValue(rules);
  vi.mocked(getDeliveryPlan).mockResolvedValue({ ...plan, details: [{ ...plan.details[0],
    orderQty: '1234567890123.100001', plannedQty: '1234567890123.100001', deliveredQty: '1234567890123.100000' }] });
  try {
    render(<GridDecimalModuleProvider moduleCode="SALES"><SalesDeliveryPlanStatusPage {...props} /></GridDecimalModuleProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
    const table = await screen.findByRole('table', { name: '출하계획 상세 목록' });
    await waitFor(() => {
      const cells = within(table).getAllByRole('row')[1].querySelectorAll('td');
      expect(cells[4]).toHaveTextContent('1,234,567,890,123.100001');
      expect(cells[6]).toHaveTextContent('0.000001');
    });
  } finally { strict.mockRestore(); standard.mockRestore(); }
});

it('shows the detail response writer profile instead of the status list writer', async () => {
  vi.mocked(getDeliveryPlan).mockResolvedValue({
    ...plan, createdByName: '검증 작성자',
    createdByProfileImage: 'data:image/png;base64,c3ludGhldGlj', createdAt: '2026-11-09 10:30',
  } as DeliveryPlanItem);
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  const panel = await screen.findByRole('region', { name: '출하계획 상세' });
  const avatar = await within(panel).findByRole('img', { name: '검증 작성자' });
  expect(avatar).toHaveAttribute('src', 'data:image/png;base64,c3ludGhldGlj');
  expect(within(panel).getByText('작성자 · 등록 2026-11-09 10:30')).toBeInTheDocument();
});

it('uses the standard grid for the status list', async () => {
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
  const grid = await screen.findByRole('grid', { name: '출하계획 현황 목록' });
  expect(screen.getByTestId('sales-status-content')).toHaveStyle({
    paddingTop: '16px',
    paddingLeft: '16px',
    paddingRight: '16px',
    paddingBottom: '16px',
  });
  expect(grid.parentElement).not.toHaveClass('MuiPaper-outlined');
  expect(grid).toHaveStyle({ borderWidth: '1px' });
  fireEvent.click(within(screen.getByRole('status')).getByRole('button', { name: 'Close' }));
  expect(screen.getByTestId('sales-status-content')).toHaveStyle({ paddingTop: '16px' });
});

it('renders each item status row for one plan and opens the containing plan', async () => {
  const statusRows = [
    { ...statusRow, materialName: '품목1' },
    { ...statusRow, salesDeliveryPlanDetailId: 91, salesOrderId: 8, salesOrderDetailId: 80,
      orderNo: 'SO-8', materialId: 30, materialCode: 'M30', materialName: '품목2' },
  ];
  vi.mocked(getDeliveryPlanStatus).mockResolvedValue(statusRows);
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);

  const grid = await screen.findByRole('grid', { name: '출하계획 현황 목록' });
  expect(await within(grid).findByText('M20')).toBeInTheDocument();
  expect(within(grid).getByText('M30')).toBeInTheDocument();
  expect(within(grid).getAllByRole('button', { name: 'DP-9 상세 보기' })).toHaveLength(1);
  fireEvent.click(within(grid).getByRole('button', { name: 'DP-9 상세 보기' }));
  await waitFor(() => expect(getDeliveryPlan).toHaveBeenCalledWith(9));
});

it('edits plan quantity as a native grid cell and saves it', async () => {
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
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

it.each([[null, 28.8], [1.2, 38.4]])(
  'matches shipment form row height and spacing at display scale %s',
  async (scale, expectedHeight) => {
    const wrap = (node: ReactNode) => scale === null ? node : (
      <AppSettingsContext.Provider value={{
        themeMode: 'light', setThemeMode: vi.fn(), displayScale: scale, setDisplayScale: vi.fn(),
      }}>{node}</AppSettingsContext.Provider>
    );
    const shipment = await renderReady(wrap(<DeliveryDetailGrid rows={[newDeliveryRow()]}
      gridRef={createRef<F1GridRef<DeliveryRow>>()} disabled={false} source={false}
      onChanges={vi.fn()} onSelection={vi.fn()} onMaterial={vi.fn()} />));
    const shipmentGrid = screen.getByRole('grid', { name: '출하 상세 목록' });
    const shipmentHeight = Number(within(shipmentGrid)
      .getByRole('button', { name: /행 높이 조절/ }).getAttribute('aria-valuenow'));
    expect(shipmentHeight).toBeCloseTo(expectedHeight);
    expect(getComputedStyle(shipmentGrid.querySelector('[data-f1-grid-selecting]')!)
      .gridTemplateRows).toContain(`${shipmentHeight}px`);
    shipment.unmount();

    await renderReady(wrap(<SalesDeliveryPlanStatusPage {...props} />));
    fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
    await screen.findByRole('group', { name: '출하계획 정보' });
    fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '자세히보기' }));
    const dialog = screen.getByRole('dialog', { name: '출하계획 상세보기' });
    const grid = within(dialog).getByRole('grid', { name: '출하계획 상세 목록' });
    const planHeight = Number(within(grid).getByRole('button', { name: /행 높이 조절/ })
      .getAttribute('aria-valuenow'));
    expect(planHeight).toBeCloseTo(shipmentHeight);
    expect(getComputedStyle(grid.querySelector('[data-f1-grid-selecting]')!)
      .gridTemplateRows).toContain(`${planHeight}px`);
    const infoGrid = within(dialog).getByLabelText('계획번호').closest('.MuiFormControl-root')!.parentElement!;
    expect(getComputedStyle(infoGrid).rowGap).toBe('8px');
    expect(getComputedStyle(infoGrid).columnGap).toBe('16px');
  },
);

it('commits a cell when save is clicked without pressing Enter', async () => {
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
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

it('shows a save failure only inside the edit dialog and keeps it off the status page', async () => {
  vi.mocked(updateDeliveryPlan).mockRejectedValueOnce(new Error('계획 저장 서버 오류'));
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 수정' });
  const cell = planCell(within(dialog).getByRole('grid'), 0, 5);
  fireEvent.doubleClick(cell);
  fireEvent.change(cell.querySelector('input')!, { target: { value: '7' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));

  expect(await within(dialog).findByText('계획 저장 서버 오류')).toBeInTheDocument();
  expect(screen.getAllByText('계획 저장 서버 오류')).toHaveLength(1);
  // 등록 화면처럼 오류 영역이 별도 여백 래퍼 없이 기본정보 패널과 같은 본문 레이아웃(gap)에 놓인다.
  const dialogAlert = within(dialog).getByRole('alert');
  expect(dialogAlert.parentElement).toContainElement(within(dialog).getByText('출하계획 기본정보'));
  expect(notification.showSuccess).not.toHaveBeenCalled();

  fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
  const discard = await screen.findByRole('dialog', { name: /확인|닫기/ }).catch(() => null);
  if (discard) fireEvent.click(within(discard).getAllByRole('button').at(-1)!);
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '출하계획 수정' })).not.toBeInTheDocument());
  expect(screen.queryByText('계획 저장 서버 오류')).not.toBeInTheDocument();
});

it('keeps the status list quiet while saving in the edit dialog and while reloading after the save', async () => {
  let finishSave!: (value: DeliveryPlanItem) => void;
  let finishReload!: (value: DeliveryPlanStatusRow[]) => void;
  vi.mocked(updateDeliveryPlan).mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
  const grid = screen.getByRole('grid', { name: '출하계획 현황 목록' });
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 수정' });
  const cell = planCell(within(dialog).getByRole('grid'), 0, 5);
  fireEvent.doubleClick(cell);
  fireEvent.change(cell.querySelector('input')!, { target: { value: '7' } });
  const save = within(dialog).getByRole('button', { name: '저장', exact: true });
  fireEvent.click(save);

  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledTimes(1));
  expect(save).toBeDisabled();
  expect(grid).not.toHaveAttribute('aria-busy');
  expect(grid).toHaveTextContent('DP-9');

  vi.mocked(getDeliveryPlanStatus).mockImplementationOnce(() => new Promise((resolve) => { finishReload = resolve; }));
  await act(async () => finishSave({ ...plan, details: [{ ...plan.details[0], plannedQty: 7 }] }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '출하계획 수정' })).not.toBeInTheDocument());
  await waitFor(() => expect(getDeliveryPlanStatus).toHaveBeenCalledTimes(2));
  expect(grid).not.toHaveAttribute('aria-busy');
  expect(grid).toHaveTextContent('DP-9');
  await act(async () => finishReload([statusRow]));
});

it('opens and closes the standard status detail panel', async () => {
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
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
  await renderReady(<SalesDeliveryPlanCreatePage {...props} deliveryPlanMode="AUTO" />);
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
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
    details: [{ salesDeliveryPlanDetailId: 90, salesOrderId: 7, salesOrderDetailId: 70,
      planDt: '2026-11-13', plannedQty: '7' }],
  })));
  expect(createDeliveryPlan).not.toHaveBeenCalled();
});

it('splits a fully planned AUTO order and can save the split again', async () => {
  vi.mocked(searchPlanSourceOrders).mockResolvedValue([{ ...source, remainingPlanQty: 0 }]);
  const splitPlan: DeliveryPlanItem = {
    ...plan,
    details: [
      { ...plan.details[0], plannedQty: 5 },
      { ...plan.details[0], salesDeliveryPlanDetailId: 91, planDt: null, plannedQty: 5 },
    ],
  };
  vi.mocked(updateDeliveryPlan).mockResolvedValue(splitPlan);
  await renderReady(<SalesDeliveryPlanCreatePage {...props} deliveryPlanMode="AUTO" />);
  fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'SO-7', exact: true }));
  await waitFor(() => expect(screen.getByLabelText('계획번호')).toHaveValue('DP-9'));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  let grid = await screen.findByRole('grid', { name: '출하계획 상세 목록' });
  editCell(grid, 0, 5, '5');
  fireEvent.click(within(grid).getByRole('button', { name: '분할' }));
  grid = screen.getByRole('grid', { name: '출하계획 상세 목록' });
  editCell(grid, 1, 5, '5');
  fireEvent.click(screen.getByRole('button', { name: '수정 저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
    details: [
      { salesDeliveryPlanDetailId: 90, salesOrderId: 7, salesOrderDetailId: 70, planDt: '2026-11-08', plannedQty: '5' },
      { salesDeliveryPlanDetailId: null, salesOrderId: 7, salesOrderDetailId: 70, planDt: null, plannedQty: '5' },
    ],
  })));
  fireEvent.click(screen.getByRole('button', { name: '수정 저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledTimes(2));
}, 15000);

it('excludes quantities in other plans from an AUTO plan update limit', async () => {
  vi.mocked(searchPlanSourceOrders).mockResolvedValue([{ ...source, remainingPlanQty: 2 }]);
  vi.mocked(getDeliveryPlanByOrder).mockResolvedValue({
    ...plan, details: [{ ...plan.details[0], plannedQty: 5 }],
  });
  vi.mocked(updateDeliveryPlan).mockResolvedValue({
    ...plan, details: [{ ...plan.details[0], plannedQty: 7 }],
  });
  await renderReady(<SalesDeliveryPlanCreatePage {...props} deliveryPlanMode="AUTO" />);
  fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'SO-7', exact: true }));
  await waitFor(() => expect(screen.getByLabelText('계획번호')).toHaveValue('DP-9'));
  let grid = await screen.findByRole('grid', { name: '출하계획 상세 목록' });
  editCell(grid, 0, 5, '7');
  fireEvent.click(screen.getByRole('button', { name: '수정 저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(notification.showSuccess).toHaveBeenCalledWith(expect.stringMatching(/출하계획이 수정되었습니다/)));
  grid = screen.getByRole('grid', { name: '출하계획 상세 목록' });
  editCell(grid, 0, 5, '8');
  fireEvent.click(screen.getByRole('button', { name: '수정 저장', exact: true }));
  const alert = screen.getByText('계획수량 합계가 수주수량을 초과했습니다.').closest('[role="alert"]') as HTMLElement;
  expect(alert).toHaveTextContent('계획수량 합계가 수주수량을 초과했습니다.');
  expect(alert.parentElement).toBe(screen.getByRole('region', { name: '출하계획 입력 내용' }));
  expect(alert.parentElement).toHaveStyle({ paddingTop: '16px', paddingBottom: '16px' });
  expect(updateDeliveryPlan).toHaveBeenCalledTimes(1);
}, 15000);

it('allows an AUTO plan to use the exact decimal remaining capacity', async () => {
  vi.mocked(searchPlanSourceOrders).mockResolvedValue([{ ...source, orderQty: 1, remainingPlanQty: 0.3 }]);
  vi.mocked(getDeliveryPlanByOrder).mockResolvedValue({
    ...plan, details: [{ ...plan.details[0], orderQty: 1, plannedQty: 0.6 }],
  });
  await renderReady(<SalesDeliveryPlanCreatePage {...props} deliveryPlanMode="AUTO" />);
  fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'SO-7', exact: true }));
  await waitFor(() => expect(screen.getByLabelText('계획번호')).toHaveValue('DP-9'));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  editCell(screen.getByRole('grid', { name: '출하계획 상세 목록' }), 0, 5, '0.9');
  fireEvent.click(screen.getByRole('button', { name: '수정 저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
    details: [expect.objectContaining({ plannedQty: '0.9' })],
  })));
});

it('preserves the exact editable capacity of an AUTO plan', async () => {
    const rules = { SALES: {
      number: { places: 6, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
      decimal: { places: 6, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
      currency: { places: 3, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
    } };
    const strict = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockResolvedValue(rules);
    const standard = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicy').mockResolvedValue(rules);
    vi.mocked(searchPlanSourceOrders).mockResolvedValue([{ ...source, orderQty: '1234567890123.100001', remainingPlanQty: '0.000001' }]);
    vi.mocked(getDeliveryPlanByOrder).mockResolvedValue({
      ...plan, details: [{ ...plan.details[0], orderQty: '1234567890123.100001', plannedQty: '1234567890123.100000' }],
    });
    try {
      render(<GridDecimalModuleProvider moduleCode="SALES"><SalesDeliveryPlanCreatePage {...props} deliveryPlanMode="AUTO" /></GridDecimalModuleProvider>);
      await waitFor(() => expect(screen.getByRole('button', { name: '수주 선택' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
      fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
      fireEvent.click(await screen.findByRole('button', { name: 'SO-7', exact: true }));
      await waitFor(() => expect(screen.getByLabelText('계획번호')).toHaveValue('DP-9'));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      editCell(screen.getByRole('grid', { name: '출하계획 상세 목록' }), 0, 5, '1234567890123.100001');
      fireEvent.click(screen.getByRole('button', { name: '수정 저장', exact: true }));
      await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
        details: [expect.objectContaining({ plannedQty: '1234567890123.100001' })],
      })));
    } finally { strict.mockRestore(); standard.mockRestore(); }
}, 15000);

it('registers only selected source item rows from multiple orders with their remaining quantities', async () => {
  vi.mocked(searchPlanSourceOrders).mockResolvedValue([
    { ...source, remainingPlanQty: 6 },
    { ...source, salesOrderDetailId: 71, materialId: 21, materialCode: 'M21', materialName: '품목2',
      orderQty: 4, remainingPlanQty: 4 },
    { ...source, salesOrderId: 8, salesOrderDetailId: 80, orderNo: 'SO-8', materialId: 30,
      materialCode: 'M30', materialName: '품목3', orderQty: 5, remainingPlanQty: 3 },
  ]);
  await renderReady(<SalesDeliveryPlanCreatePage {...props}
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
  await waitFor(() => expect(createDeliveryPlan).toHaveBeenCalledWith(expect.objectContaining({
    details: [
      { salesDeliveryPlanDetailId: null, salesOrderId: 7, salesOrderDetailId: 70,
        planDt: '2026-11-08', plannedQty: 6 },
      { salesDeliveryPlanDetailId: null, salesOrderId: 8, salesOrderDetailId: 80,
        planDt: '2026-11-08', plannedQty: 3 },
    ],
  })));
  await waitFor(() => expect(notification.showSuccess).toHaveBeenCalledWith('출하계획이 등록되었습니다. 계획번호: DP-9'));
  fireEvent.click(screen.getByRole('button', { name: '신규', exact: true }));
  expect(screen.getByLabelText('계획번호')).toHaveValue('저장 시 자동 채번');
  expect(within(screen.getByRole('region', { name: '출하계획 입력 내용' }))
    .getByRole('textbox', { name: '수주번호' })).toHaveValue('');
});

it('preserves selected source capacity in a new plan request', async () => {
  const rules = { SALES: {
    number: { places: 6, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
    decimal: { places: 6, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
    currency: { places: 3, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
  } };
  const strict = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockResolvedValue(rules);
  const standard = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicy').mockResolvedValue(rules);
  vi.mocked(searchPlanSourceOrders).mockResolvedValue([{ ...source, orderQty: '1234567890123.100001',
    remainingPlanQty: '1234567890123.100001' }]);
  try {
    render(<GridDecimalModuleProvider moduleCode="SALES"><SalesDeliveryPlanCreatePage {...props}
      selectedMenuPermissions={{ read: true, create: true, update: false, delete: false, excel: false }} /></GridDecimalModuleProvider>);
    await waitFor(() => expect(screen.getByRole('button', { name: '수주 선택' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '수주 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
    const grid = await screen.findByRole('grid', { name: '계획대상 수주 품목 목록' });
    const row = within(grid).getAllByRole('row').find((entry) => within(entry).queryByText('품목', { exact: true }))!;
    expect(within(row).getAllByText('1,234,567,890,123.100001')).toHaveLength(2);
    fireEvent.click(within(row).getByRole('checkbox'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '선택', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(within(screen.getByRole('grid', { name: '출하계획 상세 목록' }))
      .getAllByText('1,234,567,890,123.100001').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
    await waitFor(() => expect(createDeliveryPlan).toHaveBeenCalledWith(expect.objectContaining({
      details: [expect.objectContaining({ plannedQty: '1234567890123.100001' })],
    })));
  } finally { strict.mockRestore(); standard.mockRestore(); }
}, 15000);

it('matches search control dimensions and provides explicit item selection actions', async () => {
  await renderReady(<SalesDeliveryPlanCreatePage {...props} />);
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
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
  await waitFor(() => expect(getDeliveryPlanStatus).toHaveBeenCalled());
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  expect(getDeliveryPlan).toHaveBeenCalledWith(9);
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const detailTable = screen.getByRole('grid', { name: '출하계획 상세 목록' });
  editCell(detailTable, 0, 5, '8');
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
    details: [{ salesDeliveryPlanDetailId: 90, salesOrderId: 7, salesOrderDetailId: 70,
      planDt: '2026-11-08', plannedQty: 8 }],
  })));
});

it('allows status editing with registration menu update permission', async () => {
  const selectedModule = { id: 'sales', tree: [{
    pageKey: 'delivery-plan-create', children: [],
    permissions: { read: true, create: true, update: true, delete: false, excel: false },
  }] } as unknown as ModuleItem;
  await renderReady(<SalesDeliveryPlanStatusPage {...props} selectedModule={selectedModule}
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
  await renderReady(<SalesDeliveryPlanStatusPage {...props} selectedModule={selectedModule}
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
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
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
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
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
  await waitFor(() => expect(planCell(splitGrid, 0, 6)).toHaveTextContent('10'));
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
    details: [
      { salesDeliveryPlanDetailId: 90, salesOrderId: 7, salesOrderDetailId: 70, planDt: '2026-11-08', plannedQty: 6 },
      { salesDeliveryPlanDetailId: null, salesOrderId: 7, salesOrderDetailId: 70, planDt: null, plannedQty: 4 },
    ],
  })));
});

it('prevents editing or splitting shipped rows while allowing unshipped siblings', async () => {
  vi.mocked(getDeliveryPlan).mockResolvedValue({
    ...plan,
    details: [
      { ...plan.details[0], plannedQty: 6, deliveredQty: 2 },
      { ...plan.details[0], salesDeliveryPlanDetailId: 91, plannedQty: 4, deliveredQty: 0 },
    ],
  });
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const grid = within(screen.getByRole('dialog', { name: '출하계획 수정' })).getByRole('grid');
  const shipped = planCell(grid, 0, 5);
  const shippedRow = shipped.closest('[role="row"]') as HTMLElement;
  expect(within(shippedRow).getByRole('button', { name: '분할' })).toBeDisabled();
  expect(within(shippedRow).getByRole('button', { name: '분할행 삭제' })).toBeDisabled();
  fireEvent.doubleClick(shipped);
  expect(shipped.querySelector('input')).toBeNull();
  const shippedDate = planCell(grid, 0, 4);
  fireEvent.doubleClick(shippedDate);
  expect(shippedDate.querySelector('input')).toBeNull();
  const unshippedRow = planCell(grid, 1, 5).closest('[role="row"]') as HTMLElement;
  expect(within(unshippedRow).getByRole('button', { name: '분할' })).toBeEnabled();
  expect(within(unshippedRow).getByRole('button', { name: '분할행 삭제' })).toBeEnabled();
});

it('inserts a split after its source and immediately edits the new quantity', async () => {
  vi.mocked(getDeliveryPlan).mockResolvedValue({
    ...plan, details: [
      { ...plan.details[0], plannedQty: 6 },
      { ...plan.details[0], salesDeliveryPlanDetailId: 91, salesOrderDetailId: 71,
        materialId: 21, materialCode: 'M21', materialName: '품목2', orderQty: 4, plannedQty: 4 },
    ],
  });
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const dialog = screen.getByRole('dialog', { name: '출하계획 수정' });
  let grid = within(dialog).getByRole('grid', { name: '출하계획 상세 목록' });
  fireEvent.click(within(grid).getAllByRole('button', { name: '분할', exact: true })[0]);
  grid = within(dialog).getByRole('grid', { name: '출하계획 상세 목록' });
  const itemRows = within(grid).getAllByRole('row').filter((row) =>
    within(row).queryByRole('button', { name: '분할', exact: true }));
  expect(itemRows.map((row) => within(row).getAllByRole('gridcell')[1].textContent))
    .toEqual(['M20', '', 'M21']);
  const editor = planCell(grid, 1, 5).querySelector('input');
  expect(editor).not.toBeNull();
  await waitFor(() => expect(editor).toHaveFocus());
  fireEvent.change(editor!, { target: { value: '4' } });
  fireEvent.keyDown(editor!, { key: 'Enter' });
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updateDeliveryPlan).toHaveBeenCalledWith(9, expect.objectContaining({
    details: [
      { salesDeliveryPlanDetailId: 90, salesOrderId: 7, salesOrderDetailId: 70, planDt: '2026-11-08', plannedQty: 6 },
      { salesDeliveryPlanDetailId: null, salesOrderId: 7, salesOrderDetailId: 70, planDt: null, plannedQty: '4' },
      { salesDeliveryPlanDetailId: 91, salesOrderId: 7, salesOrderDetailId: 71, planDt: '2026-11-08', plannedQty: 4 },
    ],
  })));
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
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await screen.findByRole('group', { name: '출하계획 정보' });
  fireEvent.click(screen.getByRole('button', { name: '출하계획 더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
  const grid = within(screen.getByRole('dialog')).getByRole('grid', { name: '출하계획 상세 목록' });
  const rows = within(grid).getAllByRole('row').filter((row) =>
    within(row).queryByRole('button', { name: '분할', exact: true }));
  expect(rows.map((row) => within(row).getAllByRole('gridcell')[1].textContent))
    .toEqual(['M20', '', 'M21']);
});

it('retains edited values after deleting a split row and warns before closing', async () => {
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
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
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
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
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
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
  await renderReady(<SalesDeliveryPlanStatusPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'DP-9 상세 보기' }));
  await within(screen.getByRole('region', { name: '출하계획 상세' })).findByText('상세 조회 실패');
  expect(screen.getByRole('button', { name: '출하계획 더보기' })).toBeDisabled();
});
