import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../src/shared/services/apiClient';
import {
  buildConfirmPayload,
  buildOrderClosePayload,
  cancelPurchaseConfirm,
  createPurchaseConfirm,
  currencyMixMessage,
  distinctCurrencies,
  fetchDefaultUnitPrice,
  fetchRequestDetails,
  getPurchaseConfirm,
  savePurchaseConfirmOrderClose,
  searchConfirmCandidates,
  searchPurchaseConfirms,
  toConfirmRows,
  validateConfirmInput,
} from '../src/pages/materials/request/confirm/services/purchaseRequestConfirm.service';
import { calculateAmount } from '../src/pages/materials/request/confirm/data/purchaseRequestConfirmColumns';
import { PurchaseRequestConfirmPage } from '../src/pages/materials/request/confirm/PurchaseRequestConfirmPage';
import type {
  PurchaseConfirmItem,
  PurchaseRequestConfirmDetail,
} from '../src/pages/materials/request/confirm/types/purchaseRequestConfirm.types';
import { getSystemDate } from '../src/shared/services/systemDateService';

// 작성 기준일은 서버 날짜(GET /api/v1/common/system-date)로 채운다. 기본은 2026-11-17이고 테스트가 값을 바꾼다.
vi.mock('../src/shared/services/systemDateService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/shared/services/systemDateService')>()),
  getSystemDate: vi.fn(async () => '2026-11-17'),
}));

vi.mock('../src/shared/services/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/shared/services/apiClient')>();
  return { ...actual, apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn() };
});

vi.mock('../src/pages/co/master/warehouse/services/warehouseManagement.service', () => ({
  fetchWarehouses: vi.fn(async () => [{ warehouseId: 1, warehouseName: '자재창고' }]),
}));

vi.mock('../src/pages/co/master/common-code/services/commonCodeManagement.service', () => ({
  fetchCommonCodeGroups: vi.fn(async () => [{ id: 7, groupCode: 'PURCHASE_ORDER_TYPE' }]),
  fetchCommonCodeItems: vi.fn(async () => [
    { itemCode: 'RAW_MATERIAL', itemNm: '원자재', useAt: 'Y', sortOrder: 20 },
  ]),
}));

const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);
const apiPutMock = vi.mocked(apiPut);

function detail(requestId: number, detailId: number, confirmed: boolean, currency = 'KRW'): PurchaseRequestConfirmDetail {
  return {
    purchaseRequestId: requestId,
    requestNo: `MR-20261112-000${requestId}`,
    requestDt: '2026-11-12',
    requesterName: '관리자',
    requestDeptName: null,
    purchaseRequestDetailId: detailId,
    lineNo: 1,
    materialId: 12,
    materialCode: `0000${detailId}`,
    materialName: '원재료 품목',
    materialSpec: null,
    unit: 'KG',
    requestQty: 20,
    requestDeliveryDt: '2026-11-19',
    useType: 'PRODUCTION',
    useTypeName: '생산',
    requestRemark: null,
    confirmQty: confirmed ? 20 : null,
    confirmDeliveryDt: confirmed ? '2026-11-19' : null,
    warehouseId: confirmed ? 1 : null,
    warehouseName: confirmed ? '자재창고' : null,
    orderType: confirmed ? 'RAW_MATERIAL' : null,
    orderTypeName: confirmed ? '원자재' : null,
    supplierId: confirmed ? 4 : null,
    supplierCode: confirmed ? '213231' : null,
    supplierName: confirmed ? '테스트' : null,
    unitPrice: confirmed ? 1200 : null,
    currencyCode: confirmed ? currency : null,
    amount: confirmed ? 24000 : 0,
    confirmRemark: null,
    orderCloseAt: confirmed ? 'N' : null,
  };
}

function confirmItem(useAt: 'Y' | 'N'): PurchaseConfirmItem {
  return {
    purchaseConfirmId: 9,
    confirmNo: 'MC-20261112-0001',
    confirmDt: '2026-11-12',
    confirmerName: '관리자',
    currencyCode: 'KRW',
    totalAmt: useAt === 'Y' ? 48000 : 48000,
    remark: null,
    useAt,
    updatedByName: null,
    updatedAt: null,
    details: useAt === 'Y' ? [detail(5, 51, true), detail(6, 61, true)] : [],
  };
}

describe('purchase request confirm service (batch)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the batch confirm endpoints', async () => {
    apiGetMock.mockResolvedValue({ resultList: [] });
    await searchConfirmCandidates(' MR ');
    expect(apiGetMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-request-confirms/candidates?keyword=MR');
    await fetchRequestDetails([51, 61]);
    expect(apiGetMock).toHaveBeenLastCalledWith(
      '/api/v1/materials/purchase-request-confirms/request-details?purchaseRequestDetailIds=51%2C61');
    await searchPurchaseConfirms('', 'CANCELED');
    expect(apiGetMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-request-confirms?status=CANCELED');

    apiGetMock.mockResolvedValue({ item: confirmItem('Y') });
    await getPurchaseConfirm(9);
    expect(apiGetMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-request-confirms/9');

    apiPostMock.mockResolvedValue({ item: confirmItem('Y') });
    const payload = { confirmDt: '2026-11-12', remark: null, details: [] };
    await createPurchaseConfirm(payload);
    expect(apiPostMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-request-confirms', payload);
    await cancelPurchaseConfirm(9);
    expect(apiPostMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-request-confirms/9/cancel', {});

    apiPutMock.mockResolvedValue({ item: confirmItem('Y') });
    await savePurchaseConfirmOrderClose(9, { details: [{ purchaseRequestDetailId: 51, orderCloseAt: 'Y' }] });
    expect(apiPutMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-request-confirms/9/order-close',
      { details: [{ purchaseRequestDetailId: 51, orderCloseAt: 'Y' }] });

    apiGetMock.mockResolvedValue({ item: null });
    expect(await fetchDefaultUnitPrice(12, 4, '2026-11-12')).toBeNull();
  });

  it('builds draft rows with defaults, validates and builds a multi-request payload', () => {
    const rows = toConfirmRows([detail(5, 51, false), detail(6, 61, false)], true);
    expect(rows[0]).toMatchObject({ requestNo: 'MR-20261112-0005', confirmQty: 20, confirmDeliveryDt: '2026-11-19',
      currencyCode: 'KRW' });
    expect(validateConfirmInput('2026-11-12', rows)).toEqual([
      '입고창고를 선택해 주세요.', '발주구분을 선택해 주세요.', '구매처를 선택해 주세요.',
    ]);
    expect(validateConfirmInput('2026-11-12', [])).toContain('확정할 구매요청 품목을 불러와 주세요.');
    const filled = rows.map((row) => ({ ...row, warehouseId: '1', orderType: 'RAW_MATERIAL', supplierId: 4 }));
    const payload = buildConfirmPayload('2026-11-12', ' 긴급 ', filled);
    expect(payload).not.toHaveProperty('purchaseRequestIds');
    expect(payload.remark).toBe('긴급');
    expect(payload.details.map((line) => line.purchaseRequestDetailId)).toEqual([51, 61]);
  });

  it('detects mixed currencies and changed order-close rows', () => {
    const rows = toConfirmRows([detail(5, 51, true, 'KRW'), detail(6, 61, true, 'USD')], false);
    expect(distinctCurrencies(rows)).toEqual(['KRW', 'USD']);
    expect(distinctCurrencies([{ ...rows[0], currencyCode: '' }, rows[0]])).toEqual(['KRW']);
    expect(currencyMixMessage(['KRW', 'USD'])).toContain('(KRW, USD)');
    expect(buildOrderClosePayload([{ ...rows[1], orderClosed: true }, rows[0]], rows).details)
      .toEqual([{ purchaseRequestDetailId: 61, orderCloseAt: 'Y' }]);
    expect(calculateAmount(2.5, 1200.13)).toBe(3000.33);
  });
});

describe('purchase request confirm page (batch)', () => {
  let currentConfirm: PurchaseConfirmItem = confirmItem('Y');
  let requestDetails: PurchaseRequestConfirmDetail[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    requestDetails = [detail(5, 51, false), detail(6, 61, false)];
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.includes('/candidates')) {
        return { resultList: [[5, 51, 1], [5, 52, 2], [6, 61, 1]].map(([requestId, detailId, lineNo]) => ({
          purchaseRequestId: requestId, purchaseRequestDetailId: detailId, requestNo: `MR-20261112-000${requestId}`,
          requestDt: '2026-11-12', requesterName: '관리자', requestStatus: 'REQUESTED', lineNo,
          materialCode: `0000${detailId}`, materialName: `품목 ${detailId}`, materialSpec: '규격', unit: 'KG',
          requestQty: 1, requestDeliveryDt: '2026-11-19', useTypeName: '생산', requestRemark: null })) };
      }
      if (path.includes('/request-details')) return { resultList: requestDetails };
      if (path.startsWith('/api/v1/materials/purchase-request-confirms?')) {
        return { resultList: [{ purchaseConfirmId: 9, confirmNo: 'MC-20261112-0001', confirmDt: '2026-11-12',
          confirmerName: '관리자', currencyCode: 'KRW', totalAmt: 48000, requestCount: 2, remark: null, useAt: 'Y' }] };
      }
      return { item: currentConfirm };
    });
  });

  async function loadTwoRequests() {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '요청 불러오기' }));
    const dialog = await screen.findByRole('dialog', { name: '구매요청 선택' });
    const grid = within(dialog).getByRole('grid', { name: '확정 대상 구매요청 품목 목록' });
    await within(grid).findByText('품목 51');
    expect(within(grid).getByText('품목 52')).toBeInTheDocument();
    fireEvent.click(within(grid).getByLabelText('51 행 선택'));
    fireEvent.click(within(grid).getByLabelText('61 행 선택'));
    expect(within(dialog).getByRole('button', { name: '선택 불러오기 (2)' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /선택 불러오기/ }));
    await waitFor(() => expect(screen.getByLabelText('요청 건수 / 품목 수')).toHaveValue('2 / 2'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '구매요청 선택' })).not.toBeInTheDocument());
  }

  it('loads selected item rows into one draft and blocks confirm until required values are entered', async () => {
    await loadTwoRequests();
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v1/materials/purchase-request-confirms/request-details?purchaseRequestDetailIds=51%2C61');
    expect(screen.getByLabelText('확정번호')).toHaveValue('확정 시 자동 채번');
    expect(screen.getByLabelText('상태')).toHaveValue('신규 작성');
    fireEvent.click(await screen.findByRole('button', { name: '확정' }));
    expect(await screen.findByText('입고창고를 선택해 주세요.')).toBeInTheDocument();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('opens an existing confirm and cancels the whole confirm number', async () => {
    currentConfirm = confirmItem('Y');
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '확정 불러오기' }));
    const dialog = await screen.findByRole('dialog', { name: '구매요청확정 선택' });
    fireEvent.click(await within(dialog).findByRole('button', { name: 'MC-20261112-0001 선택' }));
    await waitFor(() => expect(screen.getByLabelText('확정번호')).toHaveValue('MC-20261112-0001'));
    expect(screen.getByLabelText('상태')).toHaveValue('확정');
    expect(screen.getByLabelText('요청 건수 / 품목 수')).toHaveValue('2 / 2');
    expect(screen.queryByRole('button', { name: '확정' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();

    apiPostMock.mockResolvedValue({ item: confirmItem('N') });
    fireEvent.click(screen.getByRole('button', { name: '확정 취소' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '확인' });
    expect(within(confirmDialog).getByText(/품목 2행이 미확정으로/)).toBeInTheDocument();
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '확인' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v1/materials/purchase-request-confirms/9/cancel', {}));
    await waitFor(() => expect(screen.getByLabelText('상태')).toHaveValue('확정 취소'));
    expect(screen.queryByRole('button', { name: '확정 취소' })).not.toBeInTheDocument();
  });

  it('replaces the grid on every request load instead of accumulating rows', async () => {
    currentConfirm = confirmItem('Y');
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '확정 불러오기' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '구매요청확정 선택' });
    fireEvent.click(await within(confirmDialog).findByRole('button', { name: 'MC-20261112-0001 선택' }));
    await waitFor(() => expect(screen.getByLabelText('확정번호')).toHaveValue('MC-20261112-0001'));

    const pick = async (requestId: number) => {
      requestDetails = [detail(requestId, requestId * 10 + 1, false)];
      fireEvent.click(await screen.findByRole('button', { name: '요청 불러오기' }));
      const dialog = await screen.findByRole('dialog', { name: '구매요청 선택' });
      const grid = within(dialog).getByRole('grid', { name: '확정 대상 구매요청 품목 목록' });
      await within(grid).findByText(`품목 ${requestId * 10 + 1}`);
      fireEvent.click(within(grid).getByLabelText(`${requestId * 10 + 1} 행 선택`));
      fireEvent.click(within(dialog).getByRole('button', { name: /선택 불러오기/ }));
      await waitFor(() => expect(screen.getByLabelText('상태')).toHaveValue('신규 작성'));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: '구매요청 선택' })).not.toBeInTheDocument());
    };

    await pick(5);
    const detailGrid = await screen.findByRole('grid', { name: '구매요청 확정 상세 목록' });
    await waitFor(() => expect(within(detailGrid).getAllByText(/^MR-20261112-000/)).toHaveLength(1));
    expect(within(detailGrid).getByText('MR-20261112-0005')).toBeInTheDocument();
    expect(screen.getByLabelText('확정번호')).toHaveValue('확정 시 자동 채번');

    // 작성 중 내용이 있으므로 버리기 확인 후 다시 불러온다.
    requestDetails = [detail(6, 61, false)];
    fireEvent.click(screen.getByRole('button', { name: '요청 불러오기' }));
    const discard = await screen.findByRole('dialog', { name: '확인' });
    fireEvent.click(within(discard).getByRole('button', { name: '확인' }));
    const dialog = await screen.findByRole('dialog', { name: '구매요청 선택' });
    const grid = within(dialog).getByRole('grid', { name: '확정 대상 구매요청 품목 목록' });
    await within(grid).findByText('품목 61');
    fireEvent.click(within(grid).getByLabelText('61 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: /선택 불러오기/ }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '구매요청 선택' })).not.toBeInTheDocument());
    const replaced = await screen.findByRole('grid', { name: '구매요청 확정 상세 목록' });
    await waitFor(() => expect(within(replaced).queryByText('MR-20261112-0005')).not.toBeInTheDocument());
    expect(within(replaced).getByText('MR-20261112-0006')).toBeInTheDocument();
    expect(screen.getByLabelText('요청 건수 / 품목 수')).toHaveValue('1 / 1');
  });

  it('hides write actions without update permission', async () => {
    renderPage({ read: true });
    expect(await screen.findByRole('button', { name: '확정 불러오기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '요청 불러오기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '확정' })).not.toBeInTheDocument();
  });
});

function renderPage(permissions: { read: boolean; update?: boolean } = { read: true, update: true }) {
  const router = createMemoryRouter([{
    path: '/',
    element: (
      <PurchaseRequestConfirmPage
        selectedModule={{ id: 'materials', name: '구매자재', icon: null, tree: [], menus: [] }}
        currentMenuName="구매요청확정"
        breadcrumbItems={['구매자재', '구매관리', '구매요청확정']}
        content={{ title: '구매요청확정', description: '', cards: [], items: [] }}
        selectedMenuPermissions={permissions}
      />
    ),
  }], { initialEntries: ['/'] });
  return render(<RouterProvider router={router} />);
}

describe('구매요청확정 server date default', () => {
  it('fills the 확정일 from the server date, not the browser clock', async () => {
    vi.mocked(getSystemDate).mockResolvedValueOnce('2031-05-06');
    renderPage();
    await waitFor(() => expect(screen.getByRole('textbox', { name: /^확정일/ })).toHaveValue('2031-05-06'));
  });

  it('leaves the 확정일 empty and shows the error when the server date cannot be loaded', async () => {
    vi.mocked(getSystemDate).mockRejectedValueOnce(new Error('연결 실패'));
    renderPage();
    expect(await screen.findByText(/서버 기준일을 불러오지 못했습니다\. 연결 실패/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^확정일/ })).toHaveValue('');
  });
});
