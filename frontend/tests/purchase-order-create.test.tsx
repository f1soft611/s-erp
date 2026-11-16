import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost } from '../src/shared/services/apiClient';
import {
  calculateOrderAmounts,
  sumOrderAmounts,
} from '../src/pages/materials/order/create/data/purchaseOrderAmounts';
import {
  buildDiffNote,
  recalculateRow,
} from '../src/pages/materials/order/create/data/purchaseOrderColumns';
import {
  buildOrderPayload,
  candidateToRow,
  createPurchaseOrder,
  distinctCandidateCurrencies,
  fetchMaterialDefault,
  searchOrderCandidates,
  validateOrderInput,
} from '../src/pages/materials/order/create/services/purchaseOrder.service';
import { PurchaseOrderCreatePage } from '../src/pages/materials/order/create/PurchaseOrderCreatePage';
import type { PurchaseOrderCandidate } from '../src/pages/materials/order/create/types/purchaseOrder.types';

vi.mock('../src/shared/services/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/shared/services/apiClient')>();
  return { ...actual, apiGet: vi.fn(), apiPost: vi.fn() };
});

vi.mock('../src/pages/co/master/warehouse/services/warehouseManagement.service', () => ({
  fetchWarehouses: vi.fn(async () => [{ warehouseId: 1, warehouseName: '자재창고' }]),
}));

vi.mock('../src/pages/co/master/common-code/services/commonCodeManagement.service', () => ({
  fetchCommonCodeGroups: vi.fn(async () => [
    { id: 7, groupCode: 'PURCHASE_ORDER_TYPE' },
    { id: 8, groupCode: 'PURCHASE_USE_TYPE' },
    { id: 9, groupCode: 'PURCHASE_TAX_TYPE' },
  ]),
  fetchCommonCodeItems: vi.fn(async (groupId: number) => {
    if (groupId === 9) {
      return [
        { itemCode: 'TAXABLE', itemNm: '과세', useAt: 'Y', sortOrder: 10 },
        { itemCode: 'ZERO_RATED', itemNm: '영세', useAt: 'Y', sortOrder: 20 },
        { itemCode: 'EXEMPT', itemNm: '면세', useAt: 'Y', sortOrder: 30 },
      ];
    }
    return [{ itemCode: 'RAW_MATERIAL', itemNm: '원자재', useAt: 'Y', sortOrder: 20 }];
  }),
}));

const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);

function candidate(detailId: number, supplierId: number, overrides: Partial<PurchaseOrderCandidate> = {}): PurchaseOrderCandidate {
  return {
    purchaseRequestDetailId: detailId,
    requestNo: `MR-20261112-000${detailId}`,
    confirmNo: 'MC-20261112-0001',
    confirmDt: '2026-11-12',
    supplierId,
    supplierCode: `S${supplierId}`,
    supplierName: `구매처${supplierId}`,
    materialId: 100 + detailId,
    materialCode: `M${detailId}`,
    materialName: `품목 ${detailId}`,
    materialSpec: null,
    unit: 'KG',
    materialTypeCode: 'RAW',
    inspectAt: 'N',
    confirmQty: 10,
    orderedQty: 0,
    remainQty: 10,
    requestDeliveryDt: '2026-11-19',
    confirmDeliveryDt: '2026-11-20',
    warehouseId: 1,
    warehouseName: '자재창고',
    unitPrice: 1000,
    currencyCode: 'KRW',
    orderType: 'RAW_MATERIAL',
    orderTypeName: '원자재',
    useType: 'PRODUCTION',
    useTypeName: '생산',
    remark: null,
    stockQty: null,
    ...overrides,
  };
}

describe('purchase order amounts', () => {
  it('taxable excluded adds 10% on supply', () => {
    expect(calculateOrderAmounts(3, 1200.5, 'TAXABLE', false)).toEqual({ supplyAmt: 3601.5, vatAmt: 360.15, totalAmt: 3961.65 });
  });

  it('taxable included splits gross into supply and vat', () => {
    expect(calculateOrderAmounts(10, 1100, 'TAXABLE', true)).toEqual({ supplyAmt: 10000, vatAmt: 1000, totalAmt: 11000 });
    expect(calculateOrderAmounts(1, 100, 'TAXABLE', true)).toEqual({ supplyAmt: 90.91, vatAmt: 9.09, totalAmt: 100 });
  });

  it('zero-rated and exempt have no vat even when included is requested', () => {
    expect(calculateOrderAmounts(2, 500, 'ZERO_RATED', true)).toEqual({ supplyAmt: 1000, vatAmt: 0, totalAmt: 1000 });
    expect(calculateOrderAmounts(2, 500, 'EXEMPT', false)).toEqual({ supplyAmt: 1000, vatAmt: 0, totalAmt: 1000 });
  });

  it('edited vat replaces the calculated vat and recalculates the total', () => {
    expect(calculateOrderAmounts(10, 1000, 'TAXABLE', false, 900)).toEqual({ supplyAmt: 10000, vatAmt: 900, totalAmt: 10900 });
  });

  it('missing price gives zero amounts and totals are summed in cents', () => {
    expect(calculateOrderAmounts(5, null, 'TAXABLE', false)).toEqual({ supplyAmt: 0, vatAmt: 0, totalAmt: 0 });
    expect(sumOrderAmounts([
      { supplyAmt: 0.1, vatAmt: 0.01, totalAmt: 0.11 },
      { supplyAmt: 0.2, vatAmt: 0.02, totalAmt: 0.22 },
    ])).toEqual({ supplyAmt: 0.3, vatAmt: 0.03, totalAmt: 0.33 });
  });
});

describe('purchase order rows and payload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults a confirm row to the remaining quantity and confirmed values', () => {
    const row = candidateToRow(candidate(51, 4, { confirmQty: 10, orderedQty: 4, remainQty: 6 }), 'TAXABLE', false, 4);
    expect(row).toMatchObject({
      purchaseRequestDetailId: 51, orderQty: 6, unitPrice: 1000, deliveryDt: '2026-11-20', warehouseId: '1',
      supplyAmt: 6000, vatAmt: 600, totalAmt: 6600, diffNote: '',
    });
  });

  it('marks rows that differ from the confirmation without blocking', () => {
    const row = candidateToRow(candidate(51, 4), 'TAXABLE', false, 4);
    expect(buildDiffNote({ ...row, unitPrice: 900 }, 4)).toBe('확정과 다름: 단가');
    expect(buildDiffNote({ ...row, orderQty: 12 }, 4)).toBe('확정과 다름: 수량 초과');
    expect(buildDiffNote({ ...row, deliveryDt: '2026-12-01', warehouseId: '2' }, 5))
      .toBe('확정과 다름: 구매처, 납기일, 창고');
    expect(buildDiffNote({ ...row, purchaseRequestDetailId: null }, 4)).toBe('');
    expect(recalculateRow({ ...row, unitPrice: 1100 }, 'TAXABLE', true, 4))
      .toMatchObject({ supplyAmt: 10000, vatAmt: 1000, totalAmt: 11000 });
  });

  it('builds confirm and direct payloads', () => {
    const row = candidateToRow(candidate(51, 4), 'TAXABLE', false, 4);
    const base = {
      orderDt: '2026-11-13', supplierId: 4, currencyCode: 'KRW', warehouseId: '', taxType: 'TAXABLE' as const,
      vatIncluded: true, remark: ' 비고 ', orderType: 'RAW_MATERIAL', useType: 'PRODUCTION',
    };
    expect(buildOrderPayload({ ...base, sourceType: 'CONFIRM' }, [row])).toMatchObject({
      sourceType: 'CONFIRM', warehouseId: null, vatIncludedAt: 'Y', remark: '비고', orderType: null, useType: null,
      details: [{ purchaseRequestDetailId: 51, materialId: null, orderQty: 10, unitPrice: 1000, warehouseId: 1, inspectAt: 'N' }],
    });
    const direct = buildOrderPayload({ ...base, sourceType: 'DIRECT', taxType: 'EXEMPT' }, [{ ...row, purchaseRequestDetailId: null }]);
    expect(direct).toMatchObject({
      sourceType: 'DIRECT', vatIncludedAt: 'N', orderType: 'RAW_MATERIAL', useType: 'PRODUCTION',
      details: [{ purchaseRequestDetailId: null, materialId: 151 }],
    });
  });

  it('validates required header and row values', () => {
    const row = { ...candidateToRow(candidate(51, 4), 'TAXABLE', false, 4), warehouseId: '', deliveryDt: '', orderQty: 0 };
    expect(validateOrderInput(
      { orderDt: '', supplierId: null, taxType: '', sourceType: 'DIRECT', orderType: '', useType: '' }, [row],
    )).toEqual([
      '발주일을 입력해 주세요.', '구매처를 선택해 주세요.', '부가세구분을 선택해 주세요.',
      '발주구분을 선택해 주세요.', '사용용도를 선택해 주세요.', '발주수량은 0보다 커야 합니다.',
      '납기일을 입력해 주세요.', '입고창고를 선택해 주세요.',
    ]);
    expect(validateOrderInput(
      { orderDt: '2026-11-13', supplierId: 4, taxType: 'TAXABLE', sourceType: null, orderType: '', useType: '' }, [],
    )).toEqual(['발주할 품목을 불러오거나 추가해 주세요.']);
  });

  it('detects mixed currencies and calls the order endpoints', async () => {
    expect(distinctCandidateCurrencies([candidate(51, 4), candidate(52, 4, { currencyCode: 'USD' })])).toEqual(['KRW', 'USD']);
    apiGetMock.mockResolvedValue({ resultList: [] });
    await searchOrderCandidates({ fromDt: '2026-11-01', toDt: '', keyword: ' MC ' });
    expect(apiGetMock).toHaveBeenLastCalledWith(
      '/api/v1/materials/purchase-orders/candidates?fromDt=2026-11-01&keyword=MC');
    apiGetMock.mockResolvedValue({ item: { materialId: 9, materialTypeCode: 'RAW', inspectAt: 'Y' } });
    expect(await fetchMaterialDefault(9)).toMatchObject({ inspectAt: 'Y' });
    expect(apiGetMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-orders/material-default?materialId=9');
    apiPostMock.mockResolvedValue({ item: { purchaseOrderId: 1, orderNo: 'PO-20261113-0001' } });
    const payload = buildOrderPayload({
      sourceType: 'CONFIRM', orderDt: '2026-11-13', supplierId: 4, currencyCode: 'KRW', warehouseId: '',
      taxType: 'TAXABLE', vatIncluded: false, remark: '', orderType: '', useType: '',
    }, []);
    await createPurchaseOrder(payload);
    expect(apiPostMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-orders', payload);
    apiPostMock.mockResolvedValue({ item: null });
    await expect(createPurchaseOrder(payload)).rejects.toThrow('발주 등록 응답에 발주 정보가 없습니다.');
  });
});

describe('PurchaseOrderCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/materials/purchase-orders/candidates')) {
        return { resultList: [candidate(51, 4), candidate(52, 4), candidate(61, 5)] };
      }
      return { resultList: [] };
    });
    apiPostMock.mockResolvedValue({
      item: { purchaseOrderId: 1, orderNo: 'PO-20261113-0001', overOrderedLineNos: [] },
    });
  });

  async function openPicker() {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '확정 불러오기' }));
    const dialog = await screen.findByRole('dialog', { name: '확정 품목 선택' });
    const grid = within(dialog).getByRole('grid', { name: '발주 대상 확정 품목 목록' });
    await within(grid).findByText('품목 51');
    return { dialog, grid };
  }

  it('locks the supplier of the first checked row and drops other suppliers from the selection', async () => {
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('51 행 선택'));
    expect(await within(dialog).findByText('구매처: 구매처4')).toBeInTheDocument();
    fireEvent.click(within(grid).getByLabelText('61 행 선택'));
    expect(await within(dialog).findByText(/구매처 1곳만 담을 수 있습니다/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '선택 불러오기 (1)' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('구매처 선택 초기화'));
    await waitFor(() => expect(within(dialog).getByText(/첫 번째로 체크한 품목의 구매처로 고정/)).toBeInTheDocument());
  });

  it('loads confirmed rows of one supplier, shows totals and saves a confirm-sourced order', async () => {
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('51 행 선택'));
    fireEvent.click(within(grid).getByLabelText('52 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 불러오기 (2)' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '확정 품목 선택' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText('공급가액')).toHaveValue('20,000'));
    expect(screen.getByLabelText('부가세액')).toHaveValue('2,000');
    expect(screen.getByLabelText('합계액')).toHaveValue('22,000');
    expect(screen.getByRole('button', { name: '품목 추가' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    const [path, payload] = apiPostMock.mock.calls[0];
    expect(path).toBe('/api/v1/materials/purchase-orders');
    expect(payload).toMatchObject({
      sourceType: 'CONFIRM', supplierId: 4, currencyCode: 'KRW', taxType: 'TAXABLE', vatIncludedAt: 'N',
      details: [
        { purchaseRequestDetailId: 51, orderQty: 10, unitPrice: 1000, deliveryDt: '2026-11-20', warehouseId: 1 },
        { purchaseRequestDetailId: 52, orderQty: 10, unitPrice: 1000, deliveryDt: '2026-11-20', warehouseId: 1 },
      ],
    });
    expect(await screen.findByText(/발주번호: PO-20261113-0001/)).toBeInTheDocument();
  });

  it('exempt tax type disables the vat-included switch', async () => {
    renderPage();
    const taxSelect = await screen.findByRole('combobox', { name: /부가세구분/ });
    fireEvent.mouseDown(taxSelect);
    fireEvent.click(await screen.findByRole('option', { name: '면세' }));
    await waitFor(() => expect(screen.getByLabelText('부가세 포함')).toBeDisabled());
    expect(screen.getByText('부가세 없음(미포함 고정)')).toBeInTheDocument();
  });

  it('shows no save button without update permission', async () => {
    renderPage({ read: true });
    await screen.findByText('발주 기본정보');
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '확정 불러오기' })).not.toBeInTheDocument();
  });
});

function renderPage(permissions: { read: boolean; update?: boolean } = { read: true, update: true }) {
  const router = createMemoryRouter([{
    path: '/',
    element: (
      <PurchaseOrderCreatePage
        selectedModule={{ id: 'materials', name: '구매자재', icon: null, tree: [], menus: [] }}
        currentMenuName="발주등록"
        breadcrumbItems={['구매자재', '구매관리', '발주등록']}
        content={{ title: '발주등록', description: '', cards: [], items: [] }}
        selectedMenuPermissions={permissions}
      />
    ),
  }], { initialEntries: ['/'] });
  return render(<RouterProvider router={router} />);
}
