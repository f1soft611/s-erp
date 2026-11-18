import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../src/shared/services/apiClient';
import type {
  MaterialReceiptDetailItem,
  MaterialReceiptItem,
} from '../src/pages/materials/receipt/create/types/materialReceipt.types';
import { MaterialReceiptStatusPage } from '../src/pages/materials/receipt/status/MaterialReceiptStatusPage';
import {
  MATERIAL_RECEIPT_STATUS_OPTIONS,
  searchMaterialReceiptStatus,
  toMaterialReceiptStatusFilters,
} from '../src/pages/materials/receipt/status/services/materialReceiptStatus.service';
import type { MaterialReceiptStatusRow } from '../src/pages/materials/receipt/status/types/materialReceiptStatus.types';

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
    values: { receiptDt: { from: '2026-11-01', to: '2026-11-30' } },
    loading: false,
    error: null,
    retry: vi.fn(),
    initialLoad: { loading: false, error: null, hasLoaded: true },
  }),
}));

const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);
const apiPutMock = vi.mocked(apiPut);

describe('material receipt status service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers normal (default), canceled and all as the status choices', () => {
    expect(MATERIAL_RECEIPT_STATUS_OPTIONS).toEqual([
      { value: 'ACTIVE', label: '정상' },
      { value: 'CANCELED', label: '취소' },
      { value: 'ALL', label: '전체' },
    ]);
  });

  it('maps search values to API filters and keeps the normal status when none is chosen', async () => {
    expect(toMaterialReceiptStatusFilters(' MI ', {
      receiptDt: { from: '2026-11-01', to: '2026-11-30' },
      receiptNo: 'MI-2026',
      supplierName: '테스트',
      status: 'ALL',
      materialCode: 'M-1',
      orderNo: 'PO-1',
      arrivalNo: 'MP-1',
    })).toEqual({
      keyword: 'MI', receiptNo: 'MI-2026', receiptDtFrom: '2026-11-01', receiptDtTo: '2026-11-30',
      supplierKeyword: '테스트', status: 'ALL', materialKeyword: 'M-1', orderNo: 'PO-1', arrivalNo: 'MP-1',
    });
    expect(toMaterialReceiptStatusFilters('', { receiptDt: { from: '2026-11-01', to: '2026-11-30' } }).status)
      .toBe('ACTIVE');
    apiGetMock.mockResolvedValue({ resultList: [] });
    await searchMaterialReceiptStatus({ keyword: 'MI', status: 'CANCELED' });
    expect(apiGetMock).toHaveBeenLastCalledWith('/api/v1/materials/material-receipt-status?keyword=MI&status=CANCELED');
  });
});

describe('MaterialReceiptStatusPage', () => {
  let current: MaterialReceiptItem;

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    current = receiptItem('Y');
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/materials/material-receipt-status')) return { resultList: [row(71), row(72)] };
      if (path === '/api/v1/materials/material-receipts/900') return { item: current };
      return { resultList: [] };
    });
    apiPutMock.mockResolvedValue({ item: receiptItem('Y') });
    apiPostMock.mockResolvedValue({ item: receiptItem('N') });
  });

  async function openDetail() {
    renderPage();
    const grid = await screen.findByRole('grid', { name: '입고현황 목록' });
    await waitFor(() => expect(within(grid).getAllByText('정상').length).toBeGreaterThan(0));
    fireEvent.click(within(grid).getAllByRole('button', { name: 'MI-20261117-0001 상세 보기' })[0]);
    expect(await screen.findByText('입고번호: MI-20261117-0001')).toBeInTheDocument();
  }

  it('lists only the normal receipts by default', async () => {
    renderPage();
    await screen.findByRole('grid', { name: '입고현황 목록' });
    await waitFor(() => expect(apiGetMock).toHaveBeenCalled());
    const listCalls = apiGetMock.mock.calls
      .map(([path]) => path as string)
      .filter((path) => path.startsWith('/api/v1/materials/material-receipt-status'));
    expect(listCalls.length).toBeGreaterThan(0);
    expect(listCalls.every((path) => path.includes('status=ACTIVE'))).toBe(true);
  });

  it('highlights the applied keyword in the receipt number and supplier columns only after the search runs', async () => {
    renderPage();
    const grid = await screen.findByRole('grid', { name: '입고현황 목록' });
    await waitFor(() => expect(within(grid).getAllByText('정상').length).toBeGreaterThan(0));
    expect(grid.querySelector('[data-f1-grid-highlight="true"]')).toBeNull();

    // 입력만 하고 조회하지 않으면 강조하지 않는다.
    fireEvent.change(screen.getByRole('textbox', { name: '입고현황 빠른 검색' }), { target: { value: '0001' } });
    expect(screen.getByRole('grid', { name: '입고현황 목록' }).querySelector('[data-f1-grid-highlight="true"]')).toBeNull();

    fireEvent.keyDown(screen.getByRole('textbox', { name: '입고현황 빠른 검색' }), { key: 'Enter' });
    await waitFor(() => {
      const highlights = Array.from(
        screen.getByRole('grid', { name: '입고현황 목록' }).querySelectorAll('[data-f1-grid-highlight="true"]'),
      );
      expect(highlights.length).toBeGreaterThan(0);
      highlights.forEach((node) => expect(node.textContent).toBe('0001'));
    });
    // 입고번호 링크는 강조되어도 접근성 이름과 동작이 그대로다. 통합검색 대상이 아닌 가입고번호는 강조하지 않는다.
    const link = screen.getAllByRole('button', { name: 'MI-20261117-0001 상세 보기' })[0];
    expect(link.querySelector('[data-f1-grid-highlight="true"]')).toHaveTextContent('0001');
    const arrivalCells = screen.getAllByText(/MP-20261117-/);
    arrivalCells.forEach((cell) => expect(cell.querySelector('[data-f1-grid-highlight="true"]')).toBeNull());

    // 검색어를 비우고 조회하면 강조가 사라진다.
    fireEvent.change(screen.getByRole('textbox', { name: '입고현황 빠른 검색' }), { target: { value: '' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: '입고현황 빠른 검색' }), { key: 'Enter' });
    await waitFor(() => expect(
      screen.getByRole('grid', { name: '입고현황 목록' }).querySelector('[data-f1-grid-highlight="true"]'),
    ).toBeNull());
  });

  it('opens the detail from the receipt number and offers edit for active receipts', async () => {
    await openDetail();
    expect(screen.getByLabelText('입고 요약')).toHaveTextContent('11,000');
    fireEvent.click(screen.getByRole('button', { name: '입고 더보기' }));
    expect(screen.getByRole('menuitem', { name: '자세히보기' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '수정' })).toBeInTheDocument();
  });

  it('does not offer edit while the receipt has a row closed for purchase closing', async () => {
    current = receiptItem('Y', [detail(71), detail(72, { closingMonth: '202611' })]);
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '입고 더보기' }));
    expect(screen.getByRole('menuitem', { name: '자세히보기' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '수정' })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.getByText(/매입마감된 입고입니다\(마감 1건, 마감월 2026-11\)/)).toBeInTheDocument();
    expect(screen.getByText('매입마감')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: '입고 품목 목록' })).getAllByText('2026-11')).toHaveLength(1);
  });

  it('shows the closing month column in the list', async () => {
    renderPage();
    const grid = await screen.findByRole('grid', { name: '입고현황 목록' });
    await waitFor(() => expect(within(grid).getAllByText('2026-11').length).toBeGreaterThan(0));
    expect(within(grid).getByText('마감월')).toBeInTheDocument();
  });

  it('does not offer edit for canceled receipts and opens a read-only view', async () => {
    current = receiptItem('N');
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '입고 더보기' }));
    expect(screen.queryByRole('menuitem', { name: '수정' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: '자세히보기' }));
    const dialog = await screen.findByRole('dialog', { name: '입고 상세보기' });
    await waitFor(() => expect(within(dialog).getByLabelText('입고번호')).toHaveValue('MI-20261117-0001'));
    expect(within(dialog).getByText('취소된 입고입니다. 조회만 할 수 있습니다.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '선택 행 빼기' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '입고 취소' })).not.toBeInTheDocument();
  });

  it('clears the previous error when the user edits a value again in the edit dialog', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '입고 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '입고 수정' });
    await waitFor(() => expect(within(dialog).getByLabelText('입고번호')).toHaveValue('MI-20261117-0001'));
    await within(dialog).findByRole('grid', { name: '입고 상세 목록' });
    const remark = within(dialog).getByRole('textbox', { name: /^비고/ });
    fireEvent.change(remark, { target: { value: '첫 수정' } });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '저장' })).toBeEnabled());
    apiPutMock.mockRejectedValueOnce(new Error('저장 실패: 서버 오류'));
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    expect(await within(dialog).findByText('저장 실패: 서버 오류')).toBeInTheDocument();
    fireEvent.change(remark, { target: { value: '다시 입력' } });
    await waitFor(() => expect(within(dialog).queryByText('저장 실패: 서버 오류')).not.toBeInTheDocument());
  });

  it('cancels the whole receipt after a confirmation that explains the arrival is canceled too', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '입고 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '입고 수정' });
    await waitFor(() => expect(within(dialog).getByLabelText('입고번호')).toHaveValue('MI-20261117-0001'));
    fireEvent.click(await within(dialog).findByRole('button', { name: '입고 취소' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '확인' });
    expect(within(confirmDialog).getByText(/무검사 품목은 가입고와 함께 취소됩니다/)).toBeInTheDocument();
    expect(within(confirmDialog).getByText(/가입고등록에서 새로 등록해야 합니다/)).toBeInTheDocument();
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '확인' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith('/api/v1/materials/material-receipts/900/cancel', {}));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '입고 수정' })).not.toBeInTheDocument());
  });

  it('does not mention the arrival when no row is linked to a no-inspection arrival row', async () => {
    current = receiptItem('Y', [detail(71, { inspectAt: 'Y' }), detail(72, { inspectAt: 'Y' })]);
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '입고 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '입고 수정' });
    await waitFor(() => expect(within(dialog).getByLabelText('입고번호')).toHaveValue('MI-20261117-0001'));
    fireEvent.click(await within(dialog).findByRole('button', { name: '입고 취소' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '확인' });
    expect(within(confirmDialog).queryByText(/가입고와 함께 취소됩니다/)).not.toBeInTheDocument();
  });

  it('moves to the arrival status screen with the arrival id from the arrival number link', async () => {
    renderPage();
    const grid = await screen.findByRole('grid', { name: '입고현황 목록' });
    await waitFor(() => expect(within(grid).getAllByText('정상').length).toBeGreaterThan(0));
    fireEvent.click(within(grid).getAllByRole('button', { name: 'MP-20261117-0001 가입고 보기' })[0]);
    expect(await screen.findByTestId('arrival-status-location')).toHaveTextContent(
      '/materials/arrival/arrival-status?arrivalId=800',
    );
  });
});

function ArrivalStatusLocation() {
  const location = useLocation();
  return <div data-testid="arrival-status-location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <MaterialReceiptStatusPage
            selectedModule={{
              id: 'materials',
              name: '구매자재',
              icon: null,
              tree: [{
                id: 'receipt',
                name: '입고관리',
                children: [{
                  id: 'receipt-create',
                  name: '입고등록',
                  pageKey: 'receipt-create',
                  permissions: { read: true, update: true },
                }],
              }],
              menus: [],
            }}
            currentMenuName="입고현황"
            breadcrumbItems={['구매자재', '입고관리', '입고현황']}
            content={{ title: '입고현황', description: '', cards: [], items: [] }}
            selectedMenuPermissions={{ read: true, excel: true }}
          />
        ),
      },
      { path: '/materials/arrival/arrival-status', element: <ArrivalStatusLocation /> },
    ],
    { initialEntries: ['/'] },
  );
  return render(<RouterProvider router={router} />);
}

function row(detailId: number): MaterialReceiptStatusRow {
  return {
    materialReceiptId: 900,
    materialReceiptDetailId: detailId,
    receiptNo: 'MI-20261117-0001',
    receiptDt: '2026-11-17',
    supplierName: '테스트 구매처',
    receiverName: '홍길동',
    status: 'ACTIVE',
    taxType: 'TAXABLE',
    taxTypeName: '과세',
    vatIncludedAt: 'N',
    headerSupplyAmt: 10000,
    headerVatAmt: 1000,
    headerTotalAmt: 11000,
    headerRemark: null,
    lineNo: detailId === 71 ? 1 : 2,
    arrivalNo: 'MP-20261117-0001',
    materialArrivalId: 800,
    arrivalLinked: true,
    inspectionNo: detailId === 71 ? null : 'QI-20261117-0001',
    closingMonth: detailId === 71 ? null : '202611',
    orderNo: 'PO-20261113-0001',
    materialCode: `M-${detailId}`,
    materialName: `품목 ${detailId}`,
    materialSpec: null,
    unit: 'KG',
    receiptQty: 5,
    unitPrice: 1000,
    supplyAmt: 5000,
    vatAmt: 500,
    totalAmt: 5500,
    warehouseName: '자재창고',
    manufactureDt: null,
    expireDt: null,
    lotNo: null,
    remark: null,
    createdByName: '관리자',
  };
}

function detail(id: number, overrides: Partial<MaterialReceiptDetailItem> = {}): MaterialReceiptDetailItem {
  return {
    materialReceiptDetailId: id,
    lineNo: id === 71 ? 1 : 2,
    materialArrivalDetailId: id - 50,
    materialArrivalId: 800,
    arrivalActive: 'Y',
    inspectAt: 'N',
    arrivalNo: 'MP-20261117-0001',
    purchaseOrderDetailId: id - 20,
    orderNo: 'PO-20261113-0001',
    materialId: id + 100,
    materialCode: `M-${id}`,
    materialName: `품목 ${id}`,
    materialSpec: null,
    unit: 'KG',
    orderQty: 10,
    remainQty: 8,
    arrivalQty: 5,
    receiptQty: 5,
    unitPrice: 1000,
    supplyAmt: 5000,
    vatAmt: 500,
    totalAmt: 5500,
    warehouseId: 1,
    warehouseName: '자재창고',
    manufactureDt: null,
    expireDt: null,
    lotNo: null,
    remark: null,
    ...overrides,
  };
}

function receiptItem(useAt: 'Y' | 'N', details = [detail(71), detail(72)]): MaterialReceiptItem {
  return {
    materialReceiptId: 900,
    receiptNo: 'MI-20261117-0001',
    receiptDt: '2026-11-17',
    supplierId: 4,
    supplierCode: 'S4',
    supplierName: '테스트 구매처',
    receiverName: '홍길동',
    currencyCode: 'KRW',
    taxType: 'TAXABLE',
    vatIncludedAt: 'N',
    supplyAmt: 10000,
    vatAmt: 1000,
    totalAmt: 11000,
    remark: null,
    useAt,
    details,
  };
}
