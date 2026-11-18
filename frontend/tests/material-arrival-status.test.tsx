import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../src/shared/services/apiClient';
import { detailToRow } from '../src/pages/materials/arrival/create/services/materialArrival.service';
import type {
  MaterialArrivalDetailItem,
  MaterialArrivalItem,
} from '../src/pages/materials/arrival/create/types/materialArrival.types';
import { MaterialArrivalStatusPage } from '../src/pages/materials/arrival/status/MaterialArrivalStatusPage';
import {
  MATERIAL_ARRIVAL_STATUS_OPTIONS,
  searchMaterialArrivalStatus,
  toMaterialArrivalStatusFilters,
} from '../src/pages/materials/arrival/status/services/materialArrivalStatus.service';
import type { MaterialArrivalStatusRow } from '../src/pages/materials/arrival/status/types/materialArrivalStatus.types';

vi.mock('../src/shared/services/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/shared/services/apiClient')>();
  return { ...actual, apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn() };
});

vi.mock('../src/pages/co/master/warehouse/services/warehouseManagement.service', () => ({
  fetchWarehouses: vi.fn(async () => [{ warehouseId: 1, warehouseName: '자재창고' }]),
}));

vi.mock('../src/pages/co/master/common-code/services/commonCodeManagement.service', () => ({
  fetchCommonCodeGroups: vi.fn(async () => [{ id: 9, groupCode: 'PURCHASE_TAX_TYPE' }]),
  fetchCommonCodeItems: vi.fn(async () => [
    { itemCode: 'TAXABLE', itemNm: '과세', useAt: 'Y', sortOrder: 10 },
    { itemCode: 'EXEMPT', itemNm: '면세', useAt: 'Y', sortOrder: 30 },
  ]),
}));

vi.mock('../src/shared/hooks/usePageSearchDefaults', () => ({
  usePageSearchDefaults: () => ({
    values: { arrivalDt: { from: '2026-11-01', to: '2026-11-30' } },
    loading: false,
    error: null,
    retry: vi.fn(),
    initialLoad: { loading: false, error: null, hasLoaded: true },
  }),
}));

const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);
const apiPutMock = vi.mocked(apiPut);

describe('material arrival status service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps search values to API filters and calls the status endpoint', async () => {
    const filters = toMaterialArrivalStatusFilters(' MP ', {
      arrivalDt: { from: '2026-11-01', to: '2026-11-30' },
      arrivalNo: 'MP-2026',
      supplierName: '테스트',
      status: 'CANCELED',
      materialCode: 'M-1',
      orderNo: 'PO-1',
    });
    expect(filters).toEqual({
      keyword: 'MP', arrivalNo: 'MP-2026', arrivalDtFrom: '2026-11-01', arrivalDtTo: '2026-11-30',
      supplierKeyword: '테스트', status: 'CANCELED', materialKeyword: 'M-1', orderNo: 'PO-1',
    });
    apiGetMock.mockResolvedValue({ resultList: [] });
    await searchMaterialArrivalStatus({ keyword: 'MP', status: 'ACTIVE' });
    expect(apiGetMock).toHaveBeenLastCalledWith('/api/v1/materials/material-arrival-status?keyword=MP&status=ACTIVE');
  });

  it('turns a saved detail into a grid row with the order remaining as the upper limit', () => {
    expect(detailToRow(detail(21))).toMatchObject({
      materialArrivalDetailId: 21, purchaseOrderDetailId: 51, arrivalQty: 5, remainQty: 8, warehouseId: '1',
      unitPrice: 1000, lotNo: '',
    });
  });
});

describe('material arrival status choices', () => {
  it('offers normal (default), canceled and all as the status choices and keeps normal when none is chosen', () => {
    expect(MATERIAL_ARRIVAL_STATUS_OPTIONS).toEqual([
      { value: 'ACTIVE', label: '정상' },
      { value: 'CANCELED', label: '취소' },
      { value: 'ALL', label: '전체' },
    ]);
    expect(toMaterialArrivalStatusFilters('', { arrivalDt: { from: '2026-11-01', to: '2026-11-30' } }).status)
      .toBe('ACTIVE');
    expect(toMaterialArrivalStatusFilters('', { status: 'ALL' }).status).toBe('ALL');
  });
});

describe('MaterialArrivalStatusPage', () => {
  let current: MaterialArrivalItem;

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    current = arrivalItem('Y');
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/materials/material-arrival-status')) return { resultList: [row(21), row(22)] };
      if (path === '/api/v1/materials/material-arrivals/800') return { item: current };
      return { resultList: [] };
    });
    apiPutMock.mockResolvedValue({ item: arrivalItem('Y') });
    apiPostMock.mockResolvedValue({ item: arrivalItem('N') });
  });

  it('lists only the normal arrivals by default', async () => {
    renderPage();
    await screen.findByRole('grid', { name: '가입고현황 목록' });
    await waitFor(() => expect(apiGetMock).toHaveBeenCalled());
    const listCalls = apiGetMock.mock.calls
      .map(([path]) => path as string)
      .filter((path) => path.startsWith('/api/v1/materials/material-arrival-status'));
    expect(listCalls.length).toBeGreaterThan(0);
    expect(listCalls.every((path) => path.includes('status=ACTIVE'))).toBe(true);
  });

  async function openDetail() {
    renderPage();
    const grid = await screen.findByRole('grid', { name: '가입고현황 목록' });
    await waitFor(() => expect(within(grid).getAllByText('정상').length).toBeGreaterThan(0));
    fireEvent.click(within(grid).getAllByRole('button', { name: 'MP-20261116-0001 상세 보기' })[0]);
    expect(await screen.findByText('가입고번호: MP-20261116-0001')).toBeInTheDocument();
  }

  it('lists rows and offers edit for active arrivals', async () => {
    await openDetail();
    expect(screen.getByLabelText('가입고 요약')).toHaveTextContent('16,500');
    fireEvent.click(screen.getByRole('button', { name: '가입고 더보기' }));
    expect(screen.getByRole('menuitem', { name: '자세히보기' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '수정' })).toBeInTheDocument();
  });

  it('does not offer edit for canceled arrivals and opens a read-only view', async () => {
    current = arrivalItem('N');
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '가입고 더보기' }));
    expect(screen.queryByRole('menuitem', { name: '수정' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: '자세히보기' }));
    const dialog = await screen.findByRole('dialog', { name: '가입고 상세보기' });
    await waitFor(() => expect(within(dialog).getByLabelText('가입고번호')).toHaveValue('MP-20261116-0001'));
    expect(within(dialog).getByText('취소된 가입고입니다. 조회만 할 수 있습니다.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '선택 행 빼기' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '발주 불러오기' })).not.toBeInTheDocument();
  });

  it('removes a row in the edit dialog and saves the remaining rows with their ids', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '가입고 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '가입고 수정' });
    const grid = await within(dialog).findByRole('grid', { name: '가입고 상세 목록' });
    await within(grid).findByText('품목 21');
    expect(within(dialog).getByLabelText('가입고번호')).toHaveValue('MP-20261116-0001');
    expect(within(dialog).queryByRole('button', { name: '발주 불러오기' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '저장' })).toBeDisabled();

    fireEvent.click(within(grid).getByLabelText('arrival-22 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 행 빼기' }));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '저장' })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
    const [path, payload] = apiPutMock.mock.calls[0] as [string, { details: { materialArrivalDetailId: number }[] }];
    expect(path).toBe('/api/v1/materials/material-arrivals/800');
    expect(payload.details.map((line) => line.materialArrivalDetailId)).toEqual([21]);
    expect(payload).toMatchObject({ supplierId: 4, taxType: 'TAXABLE', vatIncludedAt: 'N' });
    expect(await within(dialog).findByText(/가입고를 수정했습니다/)).toBeInTheDocument();
  });

  it('locks the rows that already have a receipt and points to the receipt number', async () => {
    current = {
      ...arrivalItem('Y'),
      details: [{ ...detail(21), receiptId: 900, receiptNo: 'MI-20261117-0001' }, detail(22)],
    };
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '가입고 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '가입고 수정' });
    expect(await within(dialog).findByText(/입고가 등록된 품목이 있습니다\(입고 MI-20261117-0001\)/)).toBeInTheDocument();
    // 가입고 전체 취소와 헤더(가입고일·부가세) 수정은 막힌다.
    expect(await within(dialog).findByRole('button', { name: '가입고 취소' })).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: /^가입고일/ })).toBeDisabled();
    // 입고가 생긴 행은 뺄 수 없다.
    await within(dialog).findByRole('grid', { name: '가입고 상세 목록' });
    fireEvent.click(await screen.findByLabelText('arrival-21 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 행 빼기' }));
    expect(await within(dialog).findByText(/입고가 등록된 품목 1건은 가입고에서 뺄 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByLabelText('arrival-21 행 선택')).toBeInTheDocument();
  });

  it('clears the previous error when the user edits a value again in the edit dialog', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '가입고 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '가입고 수정' });
    const grid = await within(dialog).findByRole('grid', { name: '가입고 상세 목록' });
    await within(grid).findByText('품목 21');
    const remark = within(dialog).getByRole('textbox', { name: /^비고/ });
    fireEvent.change(remark, { target: { value: '첫 수정' } });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '저장' })).toBeEnabled());
    apiPutMock.mockRejectedValueOnce(new Error('저장 실패: 서버 오류'));
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    expect(await within(dialog).findByText('저장 실패: 서버 오류')).toBeInTheDocument();
    fireEvent.change(remark, { target: { value: '다시 입력' } });
    await waitFor(() => expect(within(dialog).queryByText('저장 실패: 서버 오류')).not.toBeInTheDocument());
  });

  it('shows the receipt number of each row in the detail panel', async () => {
    current = {
      ...arrivalItem('Y'),
      details: [{ ...detail(21), receiptId: 900, receiptNo: 'MI-20261117-0001' }, detail(22)],
    };
    await openDetail();
    expect(within(screen.getByRole('table', { name: '가입고 품목 목록' })).getByText('MI-20261117-0001')).toBeInTheDocument();
  });

  it('opens the arrival detail directly when arriving with an arrivalId from the receipt status link', async () => {
    renderPage('/?arrivalId=800');
    expect(await screen.findByText('가입고번호: MP-20261116-0001')).toBeInTheDocument();
  });

  it('locks the rows that already have an inspection and points to the inspection number', async () => {
    current = {
      ...arrivalItem('Y'),
      details: [{ ...detail(21), inspectionId: 950, inspectionNo: 'QI-20261117-0001' }, detail(22)],
    };
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '가입고 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '가입고 수정' });
    expect(await within(dialog).findByText(/수입검사가 등록된 품목이 있습니다\(수입검사 QI-20261117-0001\)/)).toBeInTheDocument();
    expect(within(dialog).getByText(/가입고 취소는 수입검사에서 처리해 주세요/)).toBeInTheDocument();
    expect(await within(dialog).findByRole('button', { name: '가입고 취소' })).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: /^가입고일/ })).toBeDisabled();
    await within(dialog).findByRole('grid', { name: '가입고 상세 목록' });
    fireEvent.click(await screen.findByLabelText('arrival-21 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 행 빼기' }));
    expect(await within(dialog).findByText(/수입검사가 등록된 품목 1건은 가입고에서 뺄 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByLabelText('arrival-21 행 선택')).toBeInTheDocument();
  });

  it('links the inspection number of a row in the detail panel to the inspection status screen', async () => {
    current = {
      ...arrivalItem('Y'),
      details: [{ ...detail(21), inspectionId: 950, inspectionNo: 'QI-20261117-0001' }, detail(22)],
    };
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: 'QI-20261117-0001 수입검사 보기' }));
    expect(await screen.findByTestId('inspection-status-location')).toHaveTextContent(
      '/quality/inspect/inspect-status?inspectionId=950',
    );
  });

  it('cancels the whole arrival after confirmation', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '가입고 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '가입고 수정' });
    await within(dialog).findByRole('grid', { name: '가입고 상세 목록' });
    fireEvent.click(await within(dialog).findByRole('button', { name: '가입고 취소' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '확인' });
    expect(within(confirmDialog).getByText(/발주 잔량이 되살아나/)).toBeInTheDocument();
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '확인' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith('/api/v1/materials/material-arrivals/800/cancel', {}));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '가입고 수정' })).not.toBeInTheDocument());
  });
});

function InspectionStatusLocation() {
  const location = useLocation();
  return <div data-testid="inspection-status-location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(initialEntry = '/') {
  const router = createMemoryRouter(
    [{
      path: '/',
      element: (
        <MaterialArrivalStatusPage
          selectedModule={{
            id: 'materials',
            name: '구매자재',
            icon: null,
            tree: [{
              id: 'receipt',
              name: '입고관리',
              children: [{
                id: 'arrival-create',
                name: '가입고등록',
                pageKey: 'arrival-create',
                permissions: { read: true, update: true },
              }],
            }],
            menus: [],
          }}
          currentMenuName="가입고현황"
          breadcrumbItems={['구매자재', '입고관리', '가입고현황']}
          content={{ title: '가입고현황', description: '', cards: [], items: [] }}
          selectedMenuPermissions={{ read: true, excel: true }}
        />
      ),
    }, { path: '/quality/inspect/inspect-status', element: <InspectionStatusLocation /> }],
    { initialEntries: [initialEntry] },
  );
  return render(<RouterProvider router={router} />);
}

function row(detailId: number): MaterialArrivalStatusRow {
  return {
    materialArrivalId: 800,
    materialArrivalDetailId: detailId,
    arrivalNo: 'MP-20261116-0001',
    arrivalDt: '2026-11-16',
    supplierName: '테스트 구매처',
    receiverName: '홍길동',
    status: 'ACTIVE',
    taxType: 'TAXABLE',
    taxTypeName: '과세',
    vatIncludedAt: 'N',
    headerSupplyAmt: 15000,
    headerVatAmt: 1500,
    headerTotalAmt: 16500,
    headerRemark: null,
    lineNo: detailId === 21 ? 1 : 2,
    orderNo: 'PO-20261113-0001',
    materialCode: `M-${detailId}`,
    materialName: `품목 ${detailId}`,
    materialSpec: null,
    unit: 'KG',
    orderQty: 10,
    arrivalQty: 5,
    unitPrice: 1000,
    supplyAmt: 5000,
    vatAmt: 500,
    totalAmt: 5500,
    warehouseName: '자재창고',
    manufactureDt: null,
    expireDt: null,
    lotNo: null,
    inspectAt: 'N',
    remark: null,
  };
}

function detail(detailId: number): MaterialArrivalDetailItem {
  return {
    materialArrivalDetailId: detailId,
    lineNo: detailId === 21 ? 1 : 2,
    purchaseOrderDetailId: detailId === 21 ? 51 : 52,
    orderNo: 'PO-20261113-0001',
    materialId: detailId + 100,
    materialCode: `M-${detailId}`,
    materialName: `품목 ${detailId}`,
    materialSpec: null,
    unit: 'KG',
    orderQty: 10,
    // 서버 값: 이 행을 제외한 다른 유효 가입고 수량을 뺀 발주 잔량
    remainQty: 8,
    orderUnitPrice: 1000,
    orderWarehouseId: 1,
    arrivalQty: 5,
    unitPrice: 1000,
    supplyAmt: 5000,
    vatAmt: 500,
    totalAmt: 5500,
    warehouseId: 1,
    warehouseName: '자재창고',
    manufactureDt: null,
    expireDt: null,
    lotNo: null,
    inspectAt: 'N',
    remark: null,
  };
}

function arrivalItem(useAt: 'Y' | 'N'): MaterialArrivalItem {
  return {
    materialArrivalId: 800,
    arrivalNo: 'MP-20261116-0001',
    arrivalDt: '2026-11-16',
    supplierId: 4,
    supplierCode: 'S4',
    supplierName: '테스트 구매처',
    receiverName: '홍길동',
    currencyCode: 'KRW',
    taxType: 'TAXABLE',
    vatIncludedAt: 'N',
    supplyAmt: 15000,
    vatAmt: 1500,
    totalAmt: 16500,
    remark: null,
    useAt,
    details: [detail(21), detail(22)],
  };
}
