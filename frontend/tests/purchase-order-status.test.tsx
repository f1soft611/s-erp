import { useLayoutEffect } from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../src/shared/services/apiClient';
import {
  buildReceiptClosePayload,
  cancelPurchaseOrder,
  detailToRow,
  getPurchaseOrder,
  updatePurchaseOrder,
} from '../src/pages/materials/order/create/services/purchaseOrder.service';
import {
  PURCHASE_ORDER_STATUS_OPTIONS,
  searchPurchaseOrderStatus,
  toPurchaseOrderStatusFilters,
} from '../src/pages/materials/order/status/services/purchaseOrderStatus.service';
import { PurchaseOrderStatusPage } from '../src/pages/materials/order/status/PurchaseOrderStatusPage';
import { createPurchaseOrderStatusColumns } from '../src/pages/materials/order/status/data/purchaseOrderStatusColumns';
import { createPurchaseOrderColumns } from '../src/pages/materials/order/create/data/purchaseOrderColumns';
import { toPageSearchFields } from '../src/shared/components/page-search/searchFields';
import type {
  PurchaseOrderDetailItem,
  PurchaseOrderItem,
} from '../src/pages/materials/order/create/types/purchaseOrder.types';
import type { PurchaseOrderStatusFilters, PurchaseOrderStatusRow } from '../src/pages/materials/order/status/types/purchaseOrderStatus.types';
import {
  usePurchaseOrderStatusDetail,
  usePurchaseOrderStatusList,
  usePurchaseOrderStatusSearch,
} from '../src/pages/materials/order/status/hooks/usePurchaseOrderStatus';

const orderDefaultsControl = vi.hoisted(() => ({
  values: { orderDt: { from: '2026-11-01', to: '2026-11-30' } } as
    { orderDt: { from: string; to: string } } | null,
}));

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
    values: orderDefaultsControl.values,
    loading: false,
    error: null,
    retry: vi.fn(),
    initialLoad: { loading: false, error: null, hasLoaded: true },
  }),
}));

const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);
const apiPutMock = vi.mocked(apiPut);

describe('purchase order status service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps search values to API filters and calls the status endpoint', async () => {
    const filters = toPurchaseOrderStatusFilters(' PO ', {
      orderDt: { from: '2026-11-01', to: '2026-11-30' },
      orderNo: 'PO-2026',
      supplierName: '테스트',
      status: 'CANCELED',
      sourceType: 'DIRECT',
      materialCode: 'M-1',
      deliveryDt: { from: '2026-11-10', to: '2026-11-20' },
    });
    expect(filters).toEqual({
      keyword: 'PO', orderNo: 'PO-2026', orderDtFrom: '2026-11-01', orderDtTo: '2026-11-30',
      supplierKeyword: '테스트', status: 'CANCELED', sourceType: 'DIRECT', materialKeyword: 'M-1',
      deliveryDtFrom: '2026-11-10', deliveryDtTo: '2026-11-20',
    });
    apiGetMock.mockResolvedValue({ resultList: [] });
    await searchPurchaseOrderStatus({ keyword: 'PO', status: 'ACTIVE' });
    expect(apiGetMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-order-status?keyword=PO&status=ACTIVE');
  });

  it('offers normal (default), canceled and all as the status choices and keeps normal when none is chosen', () => {
    expect(PURCHASE_ORDER_STATUS_OPTIONS).toEqual([
      { value: 'ACTIVE', label: '정상' },
      { value: 'CANCELED', label: '취소' },
      { value: 'ALL', label: '전체' },
    ]);
    expect(toPurchaseOrderStatusFilters('', { orderDt: { from: '2026-11-01', to: '2026-11-30' } }).status)
      .toBe('ACTIVE');
    expect(toPurchaseOrderStatusFilters('', { status: 'ALL' }).status).toBe('ALL');
  });

  it('passes the receipt close condition (미마감/마감) and leaves it out when empty', () => {
    expect(toPurchaseOrderStatusFilters('', { receiptCloseType: 'OPEN' }).receiptCloseType).toBe('OPEN');
    expect(toPurchaseOrderStatusFilters('', { receiptCloseType: 'CLOSED' }).receiptCloseType).toBe('CLOSED');
    expect(toPurchaseOrderStatusFilters('', { receiptCloseType: '' })).not.toHaveProperty('receiptCloseType');
    expect(toPurchaseOrderStatusFilters('', {})).not.toHaveProperty('receiptCloseType');
  });

  it('shows arrived and remaining quantity after the order quantity and offers a receipt close search', () => {
    const columns = createPurchaseOrderStatusColumns();
    const visible = columns.filter((column) => !column.hidden).map((column) => column.headerName);
    const qtyAt = visible.indexOf('발주수량');
    expect(visible.slice(qtyAt, qtyAt + 3)).toEqual(['발주수량', '가입고수량', '입고잔량']);
    expect(visible).toContain('입고대기마감');
    const search = toPageSearchFields(columns).find((field) => field.field === 'receiptCloseType');
    expect(search).toMatchObject({ label: '입고대기마감', searchSpan: 1, group: '선택' });
    expect(search?.options).toEqual([
      { value: 'OPEN', label: '미마감' },
      { value: 'CLOSED', label: '마감' },
    ]);
  });

  it('calls get, update and cancel endpoints', async () => {
    apiGetMock.mockResolvedValue({ item: orderItem('Y') });
    await getPurchaseOrder(700);
    expect(apiGetMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-orders/700');
    apiPutMock.mockResolvedValue({ item: orderItem('Y') });
    const payload = { sourceType: 'CONFIRM' } as never;
    await updatePurchaseOrder(700, payload);
    expect(apiPutMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-orders/700', payload);
    apiPostMock.mockResolvedValue({ item: orderItem('N') });
    await cancelPurchaseOrder(700);
    expect(apiPostMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-orders/700/cancel', {});
    apiPostMock.mockResolvedValue({ item: null });
    await expect(cancelPurchaseOrder(700)).rejects.toThrow('발주 취소 응답에 발주 정보가 없습니다.');
  });

  it('sends only rows whose receipt-close value changed', () => {
    const baseline = [detailToRow(detail(11, 'a'), 4), detailToRow(detail(12, 'b'), 4)];
    const rows = [{ ...baseline[0], receiptClosed: true }, baseline[1]];
    expect(buildReceiptClosePayload(rows, baseline)).toEqual({
      details: [{ purchaseOrderDetailId: 11, receiptCloseAt: 'Y' }],
    });
    expect(buildReceiptClosePayload(baseline, baseline)).toEqual({ details: [] });
    expect(buildReceiptClosePayload([{ ...baseline[0], receiptClosed: false }], baseline).details).toEqual([]);
  });

  it('carries the arrived quantity of a saved detail into the grid row (0 when there is none)', () => {
    expect(detailToRow({ ...detail(11, 'a'), arrivedQty: 4 }, 4).arrivedQty).toBe(4);
    expect(detailToRow(detail(12, 'b'), 4).arrivedQty).toBe(0);
  });

  it('keeps rows that have an arrival read-only for quantity, price, delivery, warehouse, inspect and tax amount', () => {
    const columns = createPurchaseOrderColumns({
      editable: true, showReceiptClose: true, taxType: 'TAXABLE', vatIncluded: false, supplierId: 4, warehouseOptions: [],
    });
    const arrived = detailToRow({ ...detail(11, 'a'), arrivedQty: 4 }, 4);
    const free = detailToRow(detail(12, 'b'), 4);
    for (const field of ['orderQty', 'unitPrice', 'deliveryDt', 'warehouseId', 'inspectAt', 'vatAmt']) {
      const column = columns.find((item) => item.field === field);
      const editable = column?.editable;
      expect(typeof editable, field).toBe('function');
      expect((editable as (row: typeof arrived) => boolean)(arrived), `${field} arrived`).toBe(false);
      expect((editable as (row: typeof arrived) => boolean)(free), `${field} free`).toBe(true);
    }
    // 비고는 가입고가 있어도 고칠 수 있다
    expect(columns.find((item) => item.field === 'remark')?.editable).toBe(true);
  });

  it('turns a saved detail into a grid row with the confirm comparison', () => {
    const same = detailToRow(detail(11, 'same'), 4);
    expect(same).toMatchObject({ purchaseOrderDetailId: 11, orderQty: 10, warehouseId: '1', diffNote: '' });
    const changed = detailToRow({ ...detail(11, 'changed'), unitPrice: 900 }, 4);
    expect(changed.diffNote).toBe('확정과 다름: 단가');
  });
});

describe('purchase order status start commits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    orderDefaultsControl.values = { orderDt: { from: '2026-11-01', to: '2026-11-30' } };
  });

  it.each([false, true])('publishes order search defaults in the first eligible commit with passive storage and restored edits (initially ready: %s)', (initiallyReady) => {
    const key = 's-erp:page:materials-purchase-order-status';
    const loadedDefaults = { orderDt: { from: '2026-11-01', to: '2026-11-30' } };
    const defaults = { ...loadedDefaults, status: 'ACTIVE' };
    orderDefaultsControl.values = initiallyReady ? loadedDefaults : null;
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const commits: Array<{ initialized: boolean; keyword: string; values: Record<string, unknown>; applied: Record<string, unknown>; filters: PurchaseOrderStatusFilters | null; writes: number }> = [];
    try {
      const { result, rerender, unmount } = renderHook(() => {
        const search = usePurchaseOrderStatusSearch();
        useLayoutEffect(() => {
          commits.push({
            initialized: search.defaultsInitialized, keyword: search.keyword, values: search.detailValues,
            applied: search.appliedDetailValues, filters: search.appliedFilters,
            writes: writes.mock.calls.filter(([storedKey]) => storedKey === key).length,
          });
        });
        return search;
      });
      if (!initiallyReady) {
        expect(result.current.defaultsInitialized).toBe(false);
        expect(window.sessionStorage.getItem(key)).toBeNull();
        act(() => result.current.setKeyword('Owned pending'));
        commits.length = 0;
        orderDefaultsControl.values = loadedDefaults;
        rerender();
      }
      expect(commits[0]).toMatchObject({
        initialized: true, keyword: '', values: defaults, applied: defaults,
        filters: { orderDtFrom: '2026-11-01', orderDtTo: '2026-11-30', status: 'ACTIVE' }, writes: 0,
      });
      expect(JSON.parse(window.sessionStorage.getItem(key)!)).toEqual({ version: 2, value: { keyword: '', detailValues: defaults } });
      const initialSnapshot = window.sessionStorage.getItem(key);
      act(() => {
        result.current.setKeyword('Owned applied');
        result.current.setDetailValues({ ...defaults, supplierName: 'Owned team', status: 'ALL' });
      });
      expect(result.current.appliedFilters?.keyword).toBeUndefined();
      expect(window.sessionStorage.getItem(key)).toBe(initialSnapshot);
      act(() => result.current.applySearch());
      expect(result.current.appliedFilters).toMatchObject({ keyword: 'Owned applied', supplierKeyword: 'Owned team', status: 'ALL' });
      const appliedSnapshot = window.sessionStorage.getItem(key);
      const latestDefaults = { orderDt: { from: '2026-12-01', to: '2026-12-31' } };
      orderDefaultsControl.values = latestDefaults;
      rerender();
      expect(window.sessionStorage.getItem(key)).toBe(appliedSnapshot);
      unmount();
      const reopened = renderHook(() => usePurchaseOrderStatusSearch());
      expect(reopened.result.current.keyword).toBe('Owned applied');
      expect(reopened.result.current.appliedFilters).toMatchObject({ orderDtFrom: '2026-11-01', status: 'ALL' });
      act(() => reopened.result.current.resetSearch());
      expect(reopened.result.current.keyword).toBe('');
      expect(reopened.result.current.detailValues).toEqual({ ...latestDefaults, status: 'ACTIVE' });
      expect(apiGetMock).not.toHaveBeenCalled();
    } finally {
      writes.mockRestore();
    }
  });

  it.each([false, true])('publishes order list-start commits without changing quiet reloads, paused versions or cancellation (initially ready: %s)', async (initiallyReady) => {
    const requests: Array<{ resolve: (value: { resultList: PurchaseOrderStatusRow[] }) => void; reject: (error: Error) => void }> = [];
    apiGetMock.mockImplementation(() => new Promise<{ resultList: PurchaseOrderStatusRow[] }>((resolve, reject) => {
      requests.push({ resolve, reject });
    }));
    const filters: PurchaseOrderStatusFilters = { orderDtFrom: '2026-11-01', orderDtTo: '2026-11-30', status: 'ACTIVE' };
    const initialProps: { filters: PurchaseOrderStatusFilters | null } = { filters: initiallyReady ? filters : null };
    const commits: Array<{ loading: boolean; hasLoaded: boolean; error: string; initialLoading: boolean }> = [];
    const { result, rerender } = renderHook(({ filters: current }) => {
      const list = usePurchaseOrderStatusList(current);
      useLayoutEffect(() => {
        commits.push({ loading: list.loading, hasLoaded: list.hasLoaded, error: list.error, initialLoading: list.initialLoad.loading });
      });
      return list;
    }, { initialProps });
    if (!initiallyReady) {
      expect(requests).toHaveLength(0);
      commits.length = 0;
      rerender({ filters });
    }
    const normalStart = { loading: true, hasLoaded: false, error: '', initialLoading: true };
    const quietStart = { ...normalStart, loading: false };
    expect(commits[0]).toEqual(normalStart);
    await act(async () => requests[0].reject(new Error('Owned order list failure')));
    expect(result.current.error).toBe('Owned order list failure');
    commits.length = 0;
    act(() => result.current.retry());
    expect(commits[0]).toEqual(normalStart);
    const currentRows = [row(11)];
    await act(async () => requests[1].resolve({ resultList: currentRows }));
    commits.length = 0;
    act(() => result.current.refreshQuietly());
    expect(commits[0]).toEqual(quietStart);
    expect(result.current.rows).toEqual(currentRows);
    await act(async () => requests[2].resolve({ resultList: currentRows }));
    commits.length = 0;
    rerender({ filters: { ...filters, keyword: 'Owned changed' } });
    expect(commits[0]).toEqual(normalStart);
    rerender({ filters: { ...filters, keyword: 'Owned latest' } });
    await act(async () => requests[3].resolve({ resultList: [] }));
    expect(result.current.rows).toEqual(currentRows);
    expect(result.current.loading).toBe(true);
    await act(async () => requests[4].resolve({ resultList: currentRows }));
    rerender({ filters: null });
    act(() => result.current.refreshQuietly());
    expect(requests).toHaveLength(5);
    expect(result.current.loading).toBe(false);
    commits.length = 0;
    rerender({ filters });
    expect(commits[0]).toEqual(quietStart);
    await act(async () => requests[5].resolve({ resultList: currentRows }));
    rerender({ filters });
    expect(requests).toHaveLength(6);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasLoaded).toBe(true);
  });

  it('publishes order detail-start commits without changing same-ID, editor or stale-response behavior', async () => {
    const requests: Array<{ resolve: (value: PurchaseOrderItem) => void; reject: (error: Error) => void }> = [];
    apiGetMock.mockImplementation(() => new Promise<{ item: PurchaseOrderItem }>((resolve, reject) => {
      requests.push({ resolve: (value) => resolve({ item: value }), reject });
    }));
    const commits: Array<{ id: number | null; loading: boolean; error: string }> = [];
    const { result } = renderHook(() => {
      const detail = usePurchaseOrderStatusDetail();
      useLayoutEffect(() => {
        commits.push({ id: detail.selectedId, loading: detail.loading, error: detail.error });
      });
      return detail;
    });
    act(() => result.current.openDetail(700));
    expect(commits.find(({ id }) => id === 700)).toEqual({ id: 700, loading: true, error: '' });
    await act(async () => requests[0].reject(new Error('Owned order detail failure')));
    expect(result.current.error).toBe('Owned order detail failure');
    commits.length = 0;
    act(() => result.current.refreshDetail());
    expect(commits[0]).toEqual({ id: 700, loading: true, error: '' });
    await act(async () => requests[1].resolve(orderItem('Y')));
    act(() => result.current.openDetail(700));
    expect(requests).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.item?.purchaseOrderId).toBe(700);
    for (const mode of ['view', 'edit', 'close'] as const) {
      act(() => result.current.openEditor(mode));
      expect(result.current.editorMode).toBe(mode);
      act(() => result.current.closeEditor());
      expect(result.current.editorMode).toBeNull();
    }
    commits.length = 0;
    act(() => result.current.refreshDetail());
    expect(commits[0]).toEqual({ id: 700, loading: true, error: '' });
    expect(result.current.item?.purchaseOrderId).toBe(700);
    await act(async () => requests[2].resolve(orderItem('Y')));
    act(() => result.current.openDetail(701));
    act(() => result.current.closeDetail());
    commits.length = 0;
    act(() => result.current.openDetail(700));
    expect(commits[0]).toEqual({ id: 700, loading: true, error: '' });
    await act(async () => requests[3].resolve({ ...orderItem('Y'), purchaseOrderId: 701 }));
    expect(result.current.item).toBeNull();
    expect(result.current.loading).toBe(true);
    await act(async () => requests[4].resolve(orderItem('Y')));
    act(() => result.current.openEditor('close'));
    act(() => result.current.closeDetail());
    expect(result.current.editorMode).toBeNull();
    act(() => result.current.refreshDetail());
    expect(requests).toHaveLength(5);
    expect(result.current.selectedId).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(apiPutMock).not.toHaveBeenCalled();
  });
});

describe('PurchaseOrderStatusPage', () => {
  let current: PurchaseOrderItem;
  const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');

  // jsdom은 너비가 0이라 가로 가상화가 뒤쪽 컬럼(입고대기마감)을 그리지 않는다. 넓은 화면처럼 보이게 한다.
  function simulateWideViewport() {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 3000 });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 3000 });
  }

  afterEach(() => {
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
    if (originalOffsetWidth) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    orderDefaultsControl.values = { orderDt: { from: '2026-11-01', to: '2026-11-30' } };
    window.sessionStorage.clear();
    current = orderItem('Y');
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/materials/purchase-order-status')) return { resultList: [row(11), row(12)] };
      if (path === '/api/v1/materials/purchase-orders/700') return { item: current };
      if (path === '/api/v1/materials/purchase-orders/700/print') {
        if (current.useAt === 'N') throw new Error('취소된 발주는 출력할 수 없습니다.');
        return { item: printData() };
      }
      return { resultList: [] };
    });
    apiPutMock.mockResolvedValue({ item: { ...orderItem('Y'), overOrderedLineNos: [] } });
    apiPostMock.mockResolvedValue({ item: orderItem('N') });
  });

  it('lists only the normal orders by default', async () => {
    renderPage();
    await screen.findByRole('grid', { name: '발주현황 목록' });
    await waitFor(() => expect(apiGetMock).toHaveBeenCalled());
    const listCalls = apiGetMock.mock.calls
      .map(([path]) => path as string)
      .filter((path) => path.startsWith('/api/v1/materials/purchase-order-status'));
    expect(listCalls.length).toBeGreaterThan(0);
    expect(listCalls.every((path) => path.includes('status=ACTIVE'))).toBe(true);
  });

  async function openDetail() {
    renderPage();
    const grid = await screen.findByRole('grid', { name: '발주현황 목록' });
    await waitFor(() => expect(within(grid).getAllByText('정상').length).toBeGreaterThan(0));
    fireEvent.click(within(grid).getAllByRole('button', { name: 'PO-20261113-0001 상세 보기' })[0]);
    expect(await screen.findByText('발주번호: PO-20261113-0001')).toBeInTheDocument();
  }

  it('lists rows with Korean status labels and offers edit for active orders', async () => {
    await openDetail();
    expect(screen.getByLabelText('발주 요약')).toHaveTextContent('15,402');
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    expect(screen.getByRole('menuitem', { name: '자세히보기' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '수정' })).toBeInTheDocument();
  });

  it('does not offer edit for canceled orders and opens a read-only view', async () => {
    current = orderItem('N');
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    expect(screen.queryByRole('menuitem', { name: '수정' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: '자세히보기' }));
    const dialog = await screen.findByRole('dialog', { name: '발주 상세보기' });
    await waitFor(() => expect(within(dialog).getByLabelText('발주번호')).toHaveValue('PO-20261113-0001'));
    expect(within(dialog).getByText('취소된 발주입니다. 조회만 할 수 있습니다.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '선택 행 빼기' })).not.toBeInTheDocument();
  });

  it('removes a row in the edit dialog and saves the remaining rows with their ids', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '발주 수정' });
    const grid = await within(dialog).findByRole('grid', { name: '발주 상세 목록' });
    await within(grid).findByText('품목 11');
    expect(within(dialog).getByLabelText('발주번호')).toHaveValue('PO-20261113-0001');
    expect(within(dialog).queryByRole('button', { name: '확정 불러오기' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '저장' })).toBeDisabled();

    fireEvent.click(within(grid).getByLabelText('order-12 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 행 빼기' }));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '저장' })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
    const [path, payload] = apiPutMock.mock.calls[0] as [string, { details: { purchaseOrderDetailId: number }[] }];
    expect(path).toBe('/api/v1/materials/purchase-orders/700');
    expect(payload.details.map((line) => line.purchaseOrderDetailId)).toEqual([11]);
    expect(payload).toMatchObject({ sourceType: 'CONFIRM', supplierId: 4, taxType: 'TAXABLE', vatIncludedAt: 'N' });
    expect(await within(dialog).findByText(/발주를 수정했습니다/)).toBeInTheDocument();
  });

  it('locks the header and the rows that have an arrival in the edit dialog and explains why', async () => {
    current = { ...orderItem('Y'), details: [{ ...detail(11, 'a'), arrivedQty: 4 }, detail(12, 'b')] };
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '발주 수정' });
    const grid = await within(dialog).findByRole('grid', { name: '발주 상세 목록' });
    await within(grid).findByText('품목 11');
    expect(within(dialog).getByText(/가입고가 있는 행 1건은 수량·단가·납기·창고·검사대상을 바꿀 수 없습니다/)).toBeInTheDocument();
    // 발주일·부가세 설정은 잠기고 비고는 고칠 수 있다
    expect(within(dialog).getByRole('textbox', { name: /^발주일/ })).toBeDisabled();
    expect(within(dialog).getByRole('combobox', { name: /부가세구분/ })).toHaveAttribute('aria-disabled', 'true');
    expect(within(dialog).getByRole('textbox', { name: /^비고/ })).toBeEnabled();
    // 가입고가 있는 행은 뺄 수 없다
    fireEvent.click(within(grid).getByLabelText('order-11 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 행 빼기' }));
    expect(await within(dialog).findByText(/가입고가 있는 행은 뺄 수 없습니다/)).toBeInTheDocument();
    expect(within(grid).getByText('품목 11')).toBeInTheDocument();
  });

  it('does not lock anything when no row has an arrival', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '발주 수정' });
    await within(dialog).findByRole('grid', { name: '발주 상세 목록' });
    expect(within(dialog).queryByText(/가입고가 있는 행/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /^발주일/ })).toBeEnabled();
    expect(within(dialog).getByRole('combobox', { name: /부가세구분/ })).not.toHaveAttribute('aria-disabled', 'true');
  });

  async function openEditDialog() {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '발주 수정' });
    const grid = await within(dialog).findByRole('grid', { name: '발주 상세 목록' });
    await within(grid).findByText('품목 11');
    return { dialog, grid };
  }

  it('warns about an already printed order in the edit dialog and asks before saving without blocking', async () => {
    current = { ...orderItem('Y'), printAt: 'Y' };
    const { dialog, grid } = await openEditDialog();
    expect(within(dialog).getByText(/이미 출력된 발주서입니다\. 내용을 바꾸면 출력본과 달라집니다/)).toBeInTheDocument();

    fireEvent.click(within(grid).getByLabelText('order-12 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 행 빼기' }));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '저장' })).toBeEnabled());

    // 취소하면 저장하지 않는다
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '확인' });
    expect(within(confirmDialog).getByText(/저장하면 출력본과 내용이 달라집니다/)).toBeInTheDocument();
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '확인' })).not.toBeInTheDocument());
    expect(apiPutMock).not.toHaveBeenCalled();

    // 확인하면 저장한다(막지 않는다)
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    const again = await screen.findByRole('dialog', { name: '확인' });
    fireEvent.click(within(again).getByRole('button', { name: '확인' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
  });

  it('does not warn or ask when the order has not been printed', async () => {
    const { dialog, grid } = await openEditDialog();
    expect(within(dialog).queryByText(/이미 출력된 발주서입니다/)).not.toBeInTheDocument();
    fireEvent.click(within(grid).getByLabelText('order-12 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 행 빼기' }));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '저장' })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog', { name: '확인' })).not.toBeInTheDocument();
  });

  it('does not ask about the printout when only the receipt-close value is saved', async () => {
    simulateWideViewport();
    current = { ...orderItem('Y'), printAt: 'Y' };
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '입고대기마감' }));
    const dialog = await screen.findByRole('dialog', { name: '입고대기마감' });
    const grid = await within(dialog).findByRole('grid', { name: '발주 상세 목록' });
    await within(grid).findByText('품목 11');
    expect(within(dialog).queryByText(/이미 출력된 발주서입니다/)).not.toBeInTheDocument();
    fireEvent.click(within(grid).getByLabelText('입고대기마감 order-12'));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '저장' })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog', { name: '확인' })).not.toBeInTheDocument();
  });

  it('clears the previous error as soon as the user edits a value again', async () => {
    const { dialog } = await openEditDialog();
    const remark = within(dialog).getByRole('textbox', { name: /^비고/ });
    fireEvent.change(remark, { target: { value: '첫 수정' } });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '저장' })).toBeEnabled());
    apiPutMock.mockRejectedValueOnce(new Error('저장 실패: 서버 오류'));
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    expect(await within(dialog).findByText('저장 실패: 서버 오류')).toBeInTheDocument();

    fireEvent.change(remark, { target: { value: '다시 입력' } });
    await waitFor(() => expect(within(dialog).queryByText('저장 실패: 서버 오류')).not.toBeInTheDocument());
  });

  it('shows only the latest result: the success notice and the over-order warning go away on the next edit', async () => {
    const { dialog } = await openEditDialog();
    const remark = within(dialog).getByRole('textbox', { name: /^비고/ });
    fireEvent.change(remark, { target: { value: '수정' } });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '저장' })).toBeEnabled());
    apiPutMock.mockResolvedValueOnce({ item: { ...orderItem('Y'), overOrderedLineNos: [1] } });
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    expect(await within(dialog).findByText(/발주를 수정했습니다/)).toBeInTheDocument();
    expect(within(dialog).getByText(/확정수량을 넘겨 발주한 행이 있습니다/)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole('textbox', { name: /^비고/ }), { target: { value: '또 수정' } });
    await waitFor(() => expect(within(dialog).queryByText(/발주를 수정했습니다/)).not.toBeInTheDocument());
    expect(within(dialog).queryByText(/확정수량을 넘겨 발주한 행이 있습니다/)).not.toBeInTheDocument();
  });

  it('keeps state-based notices (printed order, locked rows) while clearing the transient messages', async () => {
    current = { ...orderItem('Y'), printAt: 'Y', details: [{ ...detail(11, 'a'), arrivedQty: 4 }, detail(12, 'b')] };
    const { dialog } = await openEditDialog();
    const remark = within(dialog).getByRole('textbox', { name: /^비고/ });
    fireEvent.change(remark, { target: { value: '수정' } });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '저장' })).toBeEnabled());
    apiPutMock.mockRejectedValueOnce(new Error('저장 실패: 서버 오류'));
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '확인' });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '확인' }));
    expect(await within(dialog).findByText('저장 실패: 서버 오류')).toBeInTheDocument();

    fireEvent.change(remark, { target: { value: '수정 다시' } });
    await waitFor(() => expect(within(dialog).queryByText('저장 실패: 서버 오류')).not.toBeInTheDocument());
    expect(within(dialog).getByText(/이미 출력된 발주서입니다\. 내용을 바꾸면/)).toBeInTheDocument();
    expect(within(dialog).getByText(/가입고가 있는 행 1건은/)).toBeInTheDocument();
  });

  it('offers the receipt-close menu only for active orders', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    expect(screen.getByRole('menuitem', { name: '입고대기마감' })).toBeInTheDocument();
  });

  it('hides the receipt-close menu for canceled orders', async () => {
    current = orderItem('N');
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    expect(screen.queryByRole('menuitem', { name: '입고대기마감' })).not.toBeInTheDocument();
  });

  it('closes receipt waiting for a row without touching any other value', async () => {
    simulateWideViewport();
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '입고대기마감' }));
    const dialog = await screen.findByRole('dialog', { name: '입고대기마감' });
    const grid = await within(dialog).findByRole('grid', { name: '발주 상세 목록' });
    await within(grid).findByText('품목 11');
    // 마감 외에는 전부 읽기 전용: 헤더 입력, 행 빼기, 발주 취소가 없다
    expect(within(dialog).getByRole('textbox', { name: /^발주일/ })).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: /^비고/ })).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: '선택 행 빼기' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '발주 취소' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '저장' })).toBeDisabled();

    fireEvent.click(within(grid).getByLabelText('입고대기마감 order-12'));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '저장' })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
    expect(apiPutMock).toHaveBeenCalledWith(
      '/api/v1/materials/purchase-orders/700/receipt-close',
      { details: [{ purchaseOrderDetailId: 12, receiptCloseAt: 'Y' }] },
    );
    expect(await within(dialog).findByText(/입고대기마감을 저장했습니다/)).toBeInTheDocument();
  });

  it('keeps the receipt-close column read-only in the edit dialog', async () => {
    simulateWideViewport();
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '발주 수정' });
    const grid = await within(dialog).findByRole('grid', { name: '발주 상세 목록' });
    await within(grid).findByText('품목 11');
    expect(within(grid).getByLabelText('입고대기마감 order-11')).toBeDisabled();
  });

  it('offers print for active orders and opens the preview with the stored snapshot', async () => {
    window.print = vi.fn();
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '출력' }));
    const preview = await screen.findByRole('dialog', { name: '발주서 미리보기' });
    expect(within(preview).getByRole('heading', { name: '발 주 서' })).toBeInTheDocument();
    expect(within(preview).getByText('스냅샷 구매처')).toBeInTheDocument();
    expect(apiGetMock).toHaveBeenCalledWith('/api/v1/materials/purchase-orders/700/print');
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('hides print for canceled orders', async () => {
    current = orderItem('N');
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    expect(screen.queryByRole('menuitem', { name: '출력' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: '자세히보기' }));
    const dialog = await screen.findByRole('dialog', { name: '발주 상세보기' });
    await within(dialog).findByText('취소된 발주입니다. 조회만 할 수 있습니다.');
    expect(within(dialog).queryByRole('button', { name: '출력' })).not.toBeInTheDocument();
  });

  it('records the print when 인쇄 is pressed and refreshes the list', async () => {
    window.print = vi.fn();
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '출력' }));
    const preview = await screen.findByRole('dialog', { name: '발주서 미리보기' });
    const listCallsBefore = apiGetMock.mock.calls.filter(([path]) => String(path).startsWith('/api/v1/materials/purchase-order-status')).length;
    fireEvent.click(within(preview).getByRole('button', { name: '인쇄' }));
    expect(window.print).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith('/api/v1/materials/purchase-orders/700/print-mark', {}));
    await waitFor(() => expect(apiGetMock.mock.calls.filter(([path]) =>
      String(path).startsWith('/api/v1/materials/purchase-order-status')).length).toBeGreaterThan(listCallsBefore));
  });

  it('still prints and only warns when recording the print fails', async () => {
    window.print = vi.fn();
    apiPostMock.mockRejectedValue(new Error('기록 실패'));
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '출력' }));
    const preview = await screen.findByRole('dialog', { name: '발주서 미리보기' });
    fireEvent.click(within(preview).getByRole('button', { name: '인쇄' }));
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('기록 실패')).toBeInTheDocument();
  });

  it('offers print in the view dialog', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '자세히보기' }));
    const viewDialog = await screen.findByRole('dialog', { name: '발주 상세보기' });
    await within(viewDialog).findByRole('grid', { name: '발주 상세 목록' });
    expect(within(viewDialog).getByRole('button', { name: '출력' })).toBeEnabled();
  });

  it('disables print in the edit dialog while there are unsaved changes and hides it in the close dialog', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '발주 수정' });
    const grid = await within(dialog).findByRole('grid', { name: '발주 상세 목록' });
    await within(grid).findByText('품목 11');
    expect(within(dialog).getByRole('button', { name: '출력' })).toBeEnabled();
    fireEvent.click(within(grid).getByLabelText('order-12 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 행 빼기' }));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '출력' })).toBeDisabled());
  });

  it('does not offer print in the receipt-close dialog', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '입고대기마감' }));
    const dialog = await screen.findByRole('dialog', { name: '입고대기마감' });
    await within(dialog).findByRole('grid', { name: '발주 상세 목록' });
    expect(within(dialog).queryByRole('button', { name: '출력' })).not.toBeInTheDocument();
  });

  it('cancels the whole order after confirmation', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '발주 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '발주 수정' });
    await within(dialog).findByRole('grid', { name: '발주 상세 목록' });
    fireEvent.click(await within(dialog).findByRole('button', { name: '발주 취소' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '확인' });
    expect(within(confirmDialog).getByText(/잔량이 되살아나/)).toBeInTheDocument();
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '확인' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith('/api/v1/materials/purchase-orders/700/cancel', {}));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '발주 수정' })).not.toBeInTheDocument());
  });
});

function renderPage() {
  const router = createMemoryRouter(
    [{
      path: '/',
      element: (
        <PurchaseOrderStatusPage
          selectedModule={{
            id: 'materials',
            name: '구매자재',
            icon: null,
            tree: [{
              id: 'order',
              name: '구매관리',
              children: [{
                id: 'order-create',
                name: '발주등록',
                pageKey: 'order-create',
                permissions: { read: true, update: true },
              }],
            }],
            menus: [],
          }}
          currentMenuName="발주현황"
          breadcrumbItems={['구매자재', '구매관리', '발주현황']}
          content={{ title: '발주현황', description: '', cards: [], items: [] }}
          selectedMenuPermissions={{ read: true, excel: true }}
        />
      ),
    }],
    { initialEntries: ['/'] },
  );
  return render(<RouterProvider router={router} />);
}

function row(detailId: number): PurchaseOrderStatusRow {
  return {
    purchaseOrderId: 700,
    purchaseOrderDetailId: detailId,
    orderNo: 'PO-20261113-0001',
    orderDt: '2026-11-13',
    supplierName: '테스트 구매처',
    ordererName: '홍길동',
    status: 'ACTIVE',
    sourceType: 'CONFIRM',
    taxType: 'TAXABLE',
    taxTypeName: '과세',
    vatIncludedAt: 'N',
    headerSupplyAmt: 15402,
    headerVatAmt: 1540.2,
    headerTotalAmt: 16942.2,
    headerRemark: null,
    lineNo: detailId === 11 ? 1 : 2,
    confirmNo: 'MC-20261112-0001',
    requestNo: 'MR-20261112-0001',
    materialCode: `M-${detailId}`,
    materialName: `품목 ${detailId}`,
    materialSpec: null,
    unit: 'KG',
    orderQty: 10,
    unitPrice: 1200,
    deliveryDt: '2026-11-24',
    warehouseName: '자재창고',
    inspectAt: 'N',
    receiptCloseAt: 'N',
    supplyAmt: 12000,
    vatAmt: 1200,
    totalAmt: 13200,
    orderTypeName: '원자재',
    useTypeName: '생산',
    remark: null,
  };
}

function detail(detailId: number, _label: string): PurchaseOrderDetailItem {
  return {
    purchaseOrderDetailId: detailId,
    lineNo: detailId === 11 ? 1 : 2,
    purchaseRequestDetailId: detailId + 4,
    requestNo: 'MR-20261112-0001',
    confirmNo: 'MC-20261112-0001',
    materialId: detailId + 100,
    materialCode: `M-${detailId}`,
    materialName: `품목 ${detailId}`,
    materialSpec: null,
    unit: 'KG',
    orderQty: 10,
    unitPrice: 1200,
    deliveryDt: '2026-11-24',
    warehouseId: 1,
    warehouseName: '자재창고',
    orderType: 'RAW_MATERIAL',
    orderTypeName: '원자재',
    useType: 'PRODUCTION',
    useTypeName: '생산',
    inspectAt: 'N',
    supplyAmt: 12000,
    vatAmt: 1200,
    totalAmt: 13200,
    receiptCloseAt: 'N',
    remark: null,
    confirmQty: 10,
    // 서버 값: 이 행을 뺀 다른 유효 발주 수량을 제외한 확정 잔량
    remainQty: 10,
    confirmSupplierId: 4,
    confirmUnitPrice: 1200,
    confirmDeliveryDt: '2026-11-24',
    confirmWarehouseId: 1,
  };
}

function orderItem(useAt: 'Y' | 'N'): PurchaseOrderItem {
  return {
    purchaseOrderId: 700,
    orderNo: 'PO-20261113-0001',
    orderDt: '2026-11-13',
    supplierId: 4,
    supplierCode: 'S4',
    supplierName: '테스트 구매처',
    ordererName: '홍길동',
    currencyCode: 'KRW',
    sourceType: 'CONFIRM',
    taxType: 'TAXABLE',
    vatIncludedAt: 'N',
    supplyAmt: 15402,
    vatAmt: 1540.2,
    totalAmt: 16942.2,
    printAt: 'N',
    remark: null,
    useAt,
    details: [detail(11, 'a'), detail(12, 'b')],
  };
}

function printData() {
  return {
    purchaseOrderId: 700,
    orderNo: 'PO-20261113-0001',
    orderDt: '2026-11-13',
    currencyCode: 'KRW',
    taxType: 'TAXABLE',
    vatIncludedAt: 'N',
    supplyAmt: 15402,
    vatAmt: 1540.2,
    totalAmt: 16942.2,
    remark: null,
    printAt: 'N',
    companyName: '스냅샷 회사',
    companyBusinessNo: '123-45-67890',
    companyPresidentName: '대표',
    companyPostCode: null,
    companyAddress: '주소',
    companyTelephoneNo: null,
    companyFacsimileNo: null,
    companyStampImage: null,
    companyLogoImage: null,
    vendorName: '스냅샷 구매처',
    vendorBusinessNo: null,
    vendorPresidentName: null,
    vendorPostCode: null,
    vendorAddress: null,
    vendorTelephoneNo: null,
    vendorFacsimileNo: null,
    vendorCharge: null,
    ordererName: '홍길동',
    ordererMobileNo: null,
    details: [{
      lineNo: 1, materialCode: 'M-11', materialName: '품목 11', materialSpec: null, unit: 'KG', orderQty: 10,
      unitPrice: 1200, deliveryDt: '2026-11-24', supplyAmt: 12000, vatAmt: 1200, totalAmt: 13200, remark: null,
    }],
  };
}
