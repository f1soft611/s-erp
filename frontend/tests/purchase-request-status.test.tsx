import { useLayoutEffect } from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/shared/services/apiClient';
import {
  searchPurchaseRequestStatus,
  toPurchaseRequestStatusFilters,
} from '../src/pages/materials/request/status/services/purchaseRequestStatus.service';
import { getPurchaseRequest } from '../src/pages/materials/request/create/services/purchaseRequest.service';
import { PurchaseRequestStatusPage } from '../src/pages/materials/request/status/PurchaseRequestStatusPage';
import type { PurchaseRequestItem } from '../src/pages/materials/request/create/types/purchaseRequest.types';
import type { PurchaseRequestStatusFilters, PurchaseRequestStatusRow } from '../src/pages/materials/request/status/types/purchaseRequestStatus.types';
import {
  usePurchaseRequestStatusDetail,
  usePurchaseRequestStatusList,
  usePurchaseRequestStatusSearch,
} from '../src/pages/materials/request/status/hooks/usePurchaseRequestStatus';

const requestDefaultsControl = vi.hoisted(() => ({
  values: { requestDt: { from: '2026-11-01', to: '2026-11-30' } } as
    { requestDt: { from: string; to: string } } | null,
}));

vi.mock('../src/shared/services/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/shared/services/apiClient')>();
  return { ...actual, apiGet: vi.fn() };
});

vi.mock('../src/pages/materials/request/create/services/purchaseRequest.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/pages/materials/request/create/services/purchaseRequest.service')>();
  return {
    ...actual,
    getPurchaseRequest: vi.fn(),
    fetchPurchaseUseTypeOptions: vi.fn(async () => [{ value: 'PRODUCTION', label: '생산' }]),
  };
});

vi.mock('../src/shared/hooks/usePageSearchDefaults', () => ({
  usePageSearchDefaults: () => ({
    values: requestDefaultsControl.values,
    loading: false,
    error: null,
    retry: vi.fn(),
    initialLoad: { loading: false, error: null, hasLoaded: true },
  }),
}));

const apiGetMock = vi.mocked(apiGet);
const getRequestMock = vi.mocked(getPurchaseRequest);

describe('purchase request status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestDefaultsControl.values = { requestDt: { from: '2026-11-01', to: '2026-11-30' } };
    window.sessionStorage.clear();
    apiGetMock.mockResolvedValue({ resultList: [row()], resultCnt: 1 });
  });

  it.each([false, true])('publishes request search defaults in the first eligible commit with passive storage and restored edits (initially ready: %s)', (initiallyReady) => {
    const key = 's-erp:page:materials-purchase-request-status';
    const defaults = { requestDt: { from: '2026-11-01', to: '2026-11-30' } };
    requestDefaultsControl.values = initiallyReady ? defaults : null;
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const commits: Array<{ initialized: boolean; keyword: string; values: Record<string, unknown>; applied: Record<string, unknown>; filters: PurchaseRequestStatusFilters | null; writes: number }> = [];
    try {
      const { result, rerender, unmount } = renderHook(() => {
        const search = usePurchaseRequestStatusSearch();
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
        requestDefaultsControl.values = defaults;
        rerender();
      }
      expect(commits[0]).toMatchObject({
        initialized: true, keyword: '', values: defaults, applied: defaults,
        filters: { requestDtFrom: '2026-11-01', requestDtTo: '2026-11-30' }, writes: 0,
      });
      expect(JSON.parse(window.sessionStorage.getItem(key)!)).toEqual({ version: 1, value: { keyword: '', detailValues: defaults } });
      const initialSnapshot = window.sessionStorage.getItem(key);
      act(() => {
        result.current.setKeyword('Owned applied');
        result.current.setDetailValues({ ...defaults, requesterName: 'Owned team', status: 'REQUESTED' });
      });
      expect(result.current.appliedFilters?.keyword).toBeUndefined();
      expect(window.sessionStorage.getItem(key)).toBe(initialSnapshot);
      act(() => result.current.applySearch());
      expect(result.current.appliedFilters).toMatchObject({ keyword: 'Owned applied', requesterKeyword: 'Owned team', status: 'REQUESTED' });
      const appliedSnapshot = window.sessionStorage.getItem(key);
      const latestDefaults = { requestDt: { from: '2026-12-01', to: '2026-12-31' } };
      requestDefaultsControl.values = latestDefaults;
      rerender();
      expect(window.sessionStorage.getItem(key)).toBe(appliedSnapshot);
      unmount();
      const reopened = renderHook(() => usePurchaseRequestStatusSearch());
      expect(reopened.result.current.keyword).toBe('Owned applied');
      expect(reopened.result.current.appliedFilters).toMatchObject({ requestDtFrom: '2026-11-01', status: 'REQUESTED' });
      act(() => reopened.result.current.resetSearch());
      expect(reopened.result.current.keyword).toBe('');
      expect(reopened.result.current.detailValues).toEqual(latestDefaults);
      expect(apiGetMock).not.toHaveBeenCalled();
      expect(getRequestMock).not.toHaveBeenCalled();
    } finally {
      writes.mockRestore();
    }
  });

  it.each([false, true])('publishes request list-start commits without changing quiet reloads, paused versions or cancellation (initially ready: %s)', async (initiallyReady) => {
    const requests: Array<{ resolve: (value: { resultList: PurchaseRequestStatusRow[] }) => void; reject: (error: Error) => void }> = [];
    apiGetMock.mockImplementation(() => new Promise<{ resultList: PurchaseRequestStatusRow[] }>((resolve, reject) => {
      requests.push({ resolve, reject });
    }));
    const filters: PurchaseRequestStatusFilters = { requestDtFrom: '2026-11-01', requestDtTo: '2026-11-30' };
    const initialProps: { filters: PurchaseRequestStatusFilters | null } = { filters: initiallyReady ? filters : null };
    const commits: Array<{ loading: boolean; hasLoaded: boolean; error: string; initialLoading: boolean }> = [];
    const { result, rerender } = renderHook(({ filters: current }) => {
      const list = usePurchaseRequestStatusList(current);
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
    await act(async () => requests[0].reject(new Error('Owned request list failure')));
    expect(result.current.error).toBe('Owned request list failure');
    commits.length = 0;
    act(() => result.current.retry());
    expect(commits[0]).toEqual(normalStart);
    const currentRows = [row()];
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

  it('publishes request detail-start commits without changing same-ID, editor or stale-response behavior', async () => {
    const requests: Array<{ resolve: (value: PurchaseRequestItem) => void; reject: (error: Error) => void }> = [];
    getRequestMock.mockImplementation(() => new Promise<PurchaseRequestItem>((resolve, reject) => requests.push({ resolve, reject })));
    const commits: Array<{ id: number | null; loading: boolean; error: string }> = [];
    const { result } = renderHook(() => {
      const detail = usePurchaseRequestStatusDetail();
      useLayoutEffect(() => {
        commits.push({ id: detail.selectedId, loading: detail.loading, error: detail.error });
      });
      return detail;
    });
    act(() => result.current.openDetail(300));
    expect(commits.find(({ id }) => id === 300)).toEqual({ id: 300, loading: true, error: '' });
    await act(async () => requests[0].reject(new Error('Owned request detail failure')));
    expect(result.current.error).toBe('Owned request detail failure');
    commits.length = 0;
    act(() => result.current.refreshDetail());
    expect(commits[0]).toEqual({ id: 300, loading: true, error: '' });
    await act(async () => requests[1].resolve(item('REQUESTED')));
    act(() => result.current.openDetail(300));
    expect(requests).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.item?.purchaseRequestId).toBe(300);
    act(() => result.current.openEditor('view'));
    expect(result.current.editorMode).toBe('view');
    act(() => result.current.closeEditor());
    expect(result.current.editorMode).toBeNull();
    commits.length = 0;
    act(() => result.current.refreshDetail());
    expect(commits[0]).toEqual({ id: 300, loading: true, error: '' });
    expect(result.current.item?.purchaseRequestId).toBe(300);
    await act(async () => requests[2].resolve(item('REQUESTED')));
    act(() => result.current.openDetail(301));
    act(() => result.current.closeDetail());
    commits.length = 0;
    act(() => result.current.openDetail(300));
    expect(commits[0]).toEqual({ id: 300, loading: true, error: '' });
    await act(async () => requests[3].resolve({ ...item('REQUESTED'), purchaseRequestId: 301 }));
    expect(result.current.item).toBeNull();
    expect(result.current.loading).toBe(true);
    await act(async () => requests[4].resolve(item('REQUESTED')));
    act(() => result.current.openEditor('edit'));
    act(() => result.current.closeDetail());
    expect(result.current.editorMode).toBeNull();
    act(() => result.current.refreshDetail());
    expect(requests).toHaveLength(5);
    expect(result.current.selectedId).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('maps search values to API filters and calls the status endpoint', async () => {
    const filters = toPurchaseRequestStatusFilters(' MR ', {
      requestDt: { from: '2026-11-01', to: '2026-11-30' },
      requesterName: '홍',
      status: 'REQUESTED',
      materialCode: 'M-1',
      useTypeName: 'PRODUCTION',
    });
    expect(filters).toEqual({
      keyword: 'MR',
      requestDtFrom: '2026-11-01',
      requestDtTo: '2026-11-30',
      requesterKeyword: '홍',
      status: 'REQUESTED',
      materialKeyword: 'M-1',
      useType: 'PRODUCTION',
    });
    await searchPurchaseRequestStatus(filters);
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v1/materials/purchase-request-status?keyword=MR&requestDtFrom=2026-11-01&requestDtTo=2026-11-30'
        + '&requesterKeyword=%ED%99%8D&status=REQUESTED&materialKeyword=M-1&useType=PRODUCTION',
    );
  });

  it('lists rows with Korean status labels and opens the detail panel with edit for requested items', async () => {
    getRequestMock.mockResolvedValue(item('REQUESTED'));
    renderPage();
    const grid = await screen.findByRole('grid', { name: '구매요청현황 목록' });
    await waitFor(() => expect(within(grid).getByText('요청')).toBeInTheDocument());
    fireEvent.click(within(grid).getByRole('button', { name: 'MR-20261112-0001 상세 보기' }));
    expect(await screen.findByText('구매요청번호: MR-20261112-0001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '구매요청 더보기' }));
    expect(screen.getByRole('menuitem', { name: '수정' })).toBeInTheDocument();
  });

  it('does not offer edit for confirmed requests', async () => {
    getRequestMock.mockResolvedValue(item('CONFIRMED'));
    renderPage();
    const grid = await screen.findByRole('grid', { name: '구매요청현황 목록' });
    fireEvent.click(await within(grid).findByRole('button', { name: 'MR-20261112-0001 상세 보기' }));
    await screen.findByText('구매요청번호: MR-20261112-0001');
    fireEvent.click(screen.getByRole('button', { name: '구매요청 더보기' }));
    expect(screen.getByRole('menuitem', { name: '자세히보기' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '수정' })).not.toBeInTheDocument();
  });
});

function renderPage() {
  const router = createMemoryRouter(
    [{
      path: '/',
      element: (
        <PurchaseRequestStatusPage
          selectedModule={{
            id: 'materials',
            name: '구매자재',
            icon: null,
            tree: [{
              id: 'request',
              name: '구매관리',
              children: [{
                id: 'request-create',
                name: '구매요청등록',
                pageKey: 'request-create',
                permissions: { read: true, create: true, update: true, delete: true },
              }],
            }],
            menus: [],
          }}
          currentMenuName="구매요청현황"
          breadcrumbItems={['구매자재', '구매관리', '구매요청현황']}
          content={{ title: '구매요청현황', description: '', cards: [], items: [] }}
          selectedMenuPermissions={{ read: true, excel: true }}
        />
      ),
    }],
    { initialEntries: ['/'] },
  );
  return render(<RouterProvider router={router} />);
}

function row(): PurchaseRequestStatusRow {
  return {
    purchaseRequestId: 300,
    purchaseRequestDetailId: 400,
    requestNo: 'MR-20261112-0001',
    requestDt: '2026-11-12',
    requesterName: '홍길동',
    requestDeptName: '생산지원팀',
    status: 'REQUESTED',
    remark: null,
    lineNo: 1,
    materialCode: 'M-101',
    materialName: '품목 101',
    materialSpec: null,
    unit: 'EA',
    requestQty: 10,
    requestDeliveryDt: '2026-11-20',
    useType: 'PRODUCTION',
    useTypeName: '생산',
    requestRemark: null,
    confirmQty: null,
  };
}

function item(status: string): PurchaseRequestItem {
  return {
    purchaseRequestId: 300,
    requestNo: 'MR-20261112-0001',
    requestDt: '2026-11-12',
    requesterName: '홍길동',
    requestDeptName: '생산지원팀',
    status,
    remark: null,
    createdByName: '홍길동',
    createdAt: '2026-11-12 08:38',
    updatedByName: null,
    updatedAt: null,
    details: [{
      purchaseRequestDetailId: 400,
      lineNo: 1,
      materialId: 101,
      materialCode: 'M-101',
      materialName: '품목 101',
      materialSpec: null,
      unit: 'EA',
      requestQty: 10,
      requestDeliveryDt: '2026-11-20',
      useType: 'PRODUCTION',
      useTypeName: '생산',
      requestRemark: null,
      confirmQty: null,
    }],
  };
}
