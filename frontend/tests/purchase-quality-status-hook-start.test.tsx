import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  usePurchaseArrivalStatusDetail,
  usePurchaseArrivalStatusList,
} from '../src/pages/materials/arrival/status/hooks/usePurchaseArrivalStatus';
import {
  usePurchaseOrderStatusDetail,
  usePurchaseOrderStatusList,
} from '../src/pages/materials/order/status/hooks/usePurchaseOrderStatus';
import {
  useQualityInspectionStatusDetail,
  useQualityInspectionStatusList,
} from '../src/pages/quality/inspect/status/hooks/useQualityInspectionStatus';

const mocks = vi.hoisted(() => ({
  searchArrival: vi.fn(),
  searchOrder: vi.fn(),
  searchInspection: vi.fn(),
  getArrival: vi.fn(),
  getOrder: vi.fn(),
  getInspection: vi.fn(),
}));

vi.mock('../src/pages/materials/arrival/status/services/purchaseArrivalStatus.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  searchPurchaseArrivalStatus: mocks.searchArrival,
}));
vi.mock('../src/pages/materials/order/status/services/purchaseOrderStatus.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  searchPurchaseOrderStatus: mocks.searchOrder,
}));
vi.mock('../src/pages/quality/inspect/status/services/qualityInspectionStatus.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  searchQualityInspectionStatus: mocks.searchInspection,
}));
vi.mock('../src/pages/materials/arrival/create/services/purchaseArrival.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPurchaseArrival: mocks.getArrival,
}));
vi.mock('../src/pages/materials/order/create/services/purchaseOrder.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPurchaseOrder: mocks.getOrder,
}));
vi.mock('../src/pages/quality/inspect/create/services/qualityInspection.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getQualityInspection: mocks.getInspection,
}));

const never = () => new Promise<never>(() => undefined);

const cases = [
  { name: '가입고현황', list: usePurchaseArrivalStatusList, detail: usePurchaseArrivalStatusDetail, search: mocks.searchArrival, get: mocks.getArrival, idKey: 'purchaseArrivalId' },
  { name: '발주현황', list: usePurchaseOrderStatusList, detail: usePurchaseOrderStatusDetail, search: mocks.searchOrder, get: mocks.getOrder, idKey: 'purchaseOrderId' },
  { name: '수입검사현황', list: useQualityInspectionStatusList, detail: useQualityInspectionStatusDetail, search: mocks.searchInspection, get: mocks.getInspection, idKey: 'qualityInspectionId' },
] as const;

describe.each(cases)('$name 요청 시작 상태', ({ list, detail, search, get, idKey }) => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('목록: filters가 null이면 요청하지 않고, 필터가 생긴 첫 commit부터 로딩이며 quiet 재조회는 로딩·목록을 유지한다', async () => {
    search.mockResolvedValueOnce([{ id: 1 }]).mockImplementation(() => never());
    const filters = { keyword: '' } as never;
    const { result, rerender } = renderHook(({ f }) => list(f), { initialProps: { f: null as never } });
    expect(search).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);

    rerender({ f: filters });
    expect(result.current.loading).toBe(true);
    expect(result.current.hasLoaded).toBe(false);
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(result.current.rows).toHaveLength(1);

    act(() => result.current.refreshQuietly());
    expect(result.current.loading).toBe(false);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('목록: 필터가 바뀌면 이전 응답을 무시하고 일반 로딩을 시작한다', async () => {
    let resolveFirst: (rows: unknown[]) => void = () => undefined;
    search.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce([{ id: 2 }]);
    const { result, rerender } = renderHook(({ f }) => list(f), { initialProps: { f: { keyword: 'a' } as never } });
    expect(result.current.loading).toBe(true);
    rerender({ f: { keyword: 'b' } as never });
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await act(async () => resolveFirst([{ id: 1 }]));
    expect(result.current.rows).toEqual([{ id: 2 }]);
  });

  it('상세: ID를 고른 첫 commit부터 로딩이고, 같은 ID 재선택은 요청하지 않으며, 닫으면 비운다', async () => {
    get.mockResolvedValue({ [idKey]: 7 });
    const { result } = renderHook(() => detail());
    expect(result.current.loading).toBe(false);
    act(() => result.current.openDetail(7));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.item).not.toBeNull());
    expect(result.current.loading).toBe(false);
    act(() => result.current.openDetail(7));
    expect(get).toHaveBeenCalledTimes(1);

    act(() => result.current.refreshDetail());
    expect(result.current.loading).toBe(true);
    expect(result.current.item).not.toBeNull();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(get).toHaveBeenCalledTimes(2);

    act(() => result.current.closeDetail());
    expect(result.current.item).toBeNull();
    expect(result.current.selectedId).toBeNull();
  });

  it('상세: 오류는 항목을 비우고 오류를 보이며, 다시 열면 오류가 지워진다', async () => {
    get.mockRejectedValueOnce(new Error('불러오기 실패')).mockImplementation(() => never());
    const { result } = renderHook(() => detail());
    act(() => result.current.openDetail(9));
    await waitFor(() => expect(result.current.error).toBe('불러오기 실패'));
    expect(result.current.item).toBeNull();
    act(() => result.current.refreshDetail());
    expect(result.current.error).toBe('');
    expect(result.current.loading).toBe(true);
  });
});
