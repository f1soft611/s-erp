import { useLayoutEffect } from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/shared/services/apiClient';
import { QuotationStatusPage } from '../src/pages/sales/quotation/status/QuotationStatusPage';
import { useQuotationStatusDetail } from '../src/pages/sales/quotation/status/hooks/useQuotationStatusDetail';
import { useQuotationStatusList } from '../src/pages/sales/quotation/status/hooks/useQuotationStatusList';
import type { QuotationStatusFilters, QuotationStatusRow } from '../src/pages/sales/quotation/status/types/quotationStatus.types';
import type { QuotationItem } from '../src/pages/sales/quotation/create/types/quotation.types';
import type { ModuleItem } from '../src/pages/dashboard/types/dashboard';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

const apiGetMock = vi.mocked(apiGet);
const statusRow: QuotationStatusRow = {
  quotationId: 21,
  quotationDetailId: 31,
  quotationNo: 'QT-20261116-0001',
  quotationDt: '2026-11-16',
  submitDt: '2026-11-17',
  customerId: 10,
  customerCode: 'C-10',
  customerName: '고객 10',
  customerReference: '담당자',
  incoterms: 'FOB',
  paymentTerm: '월말',
  validTerm: '30일',
  currencyCode: 'KRW',
  remark: '확인',
  supplyAmt: 10,
  vatAmt: 1,
  totalAmt: 11,
  createdBy: 'writer',
  lineNo: 1,
  materialId: null,
  materialCode: 'CUSTOM',
  materialName: '직접 입력 품목',
  materialSpec: '규격',
  unit: 'EA',
  quotationQty: 2,
  unitPrice: 5,
  lineAmt: 10,
  detailRemark: null,
};
const quotation: QuotationItem = {
  quotationId: 21,
  quotationNo: statusRow.quotationNo,
  quotationDt: statusRow.quotationDt,
  submitDt: statusRow.submitDt,
  customerId: 10,
  customerCode: 'C-10',
  customerName: '고객 10',
  customerReference: '담당자',
  incoterms: 'FOB',
  paymentTerm: '월말',
  validTerm: '30일',
  currencyCode: 'KRW',
  remark: '확인',
  supplyAmt: 10,
  vatAmt: 1,
  totalAmt: 11,
  createdBy: 'writer',
  createdByName: '홍길동',
  createdAt: '2026-11-16 10:00',
  writer: false,
  details: [{
    quotationDetailId: 31,
    lineNo: 1,
    materialId: null,
    materialCode: 'CUSTOM',
    materialName: '직접 입력 품목',
    materialSpec: '규격',
    unit: 'EA',
    quotationQty: 2,
    unitPrice: 5,
    lineAmt: 10,
    remark: null,
  }],
};
const moduleItem: ModuleItem = {
  id: 'sales',
  name: '영업관리',
  icon: null,
  tree: [
    { id: 'create', name: '견적서작성', pageKey: 'quotation-create', path: '/sales/quotation-create',
      permissions: { read: true, create: true, update: true, delete: true, excel: false } },
  ],
  menus: [],
};

describe('quotation status page', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    apiGetMock.mockReset();
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/api/v1/common/system-date') return Promise.resolve({ today: '2026-11-16' });
      if (path === '/api/v1/sales/quotations/21') return Promise.resolve({ item: quotation });
      return Promise.resolve({ resultList: [statusRow], resultCnt: 1 });
    });
  });

  it('publishes quotation request-start state in the first commit without changing cancellation or same-ID behavior', async () => {
    const requests: Array<{
      resolve: (value: { item: QuotationItem }) => void;
      reject: (error: Error) => void;
    }> = [];
    apiGetMock.mockImplementation(() => new Promise<{ item: QuotationItem }>((resolve, reject) => {
      requests.push({ resolve, reject });
    }));
    const commits: Array<{ id: number | null; loading: boolean; error: string }> = [];
    const { result } = renderHook(() => {
      const detail = useQuotationStatusDetail();
      useLayoutEffect(() => {
        commits.push({ id: detail.selectedQuotationId, loading: detail.loading, error: detail.error });
      });
      return detail;
    });

    act(() => result.current.openDetail(21));
    expect(commits.find(({ id }) => id === 21)).toEqual({ id: 21, loading: true, error: '' });
    await act(async () => requests[0].reject(new Error('Owned quotation detail failure')));
    expect(result.current.error).toBe('Owned quotation detail failure');
    commits.length = 0;
    act(() => result.current.refreshDetail());
    expect(commits[0]).toEqual({ id: 21, loading: true, error: '' });
    await act(async () => requests[1].resolve({ item: quotation }));
    expect(result.current.quotation?.quotationId).toBe(21);
    expect(result.current.loading).toBe(false);

    act(() => result.current.openDetail(21));
    expect(requests).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.quotation?.quotationId).toBe(21);
    commits.length = 0;
    act(() => result.current.refreshDetail());
    expect(commits[0]).toEqual({ id: 21, loading: true, error: '' });
    expect(result.current.quotation?.quotationId).toBe(21);
    await act(async () => requests[2].resolve({ item: quotation }));
    act(() => result.current.openDetail(22));
    act(() => result.current.closeDetail());
    commits.length = 0;
    act(() => result.current.openDetail(21));
    expect(commits[0]).toEqual({ id: 21, loading: true, error: '' });
    expect(requests).toHaveLength(5);
    await act(async () => requests[3].resolve({ item: { ...quotation, quotationId: 22 } }));
    expect(result.current.selectedQuotationId).toBe(21);
    expect(result.current.quotation).toBeNull();
    expect(result.current.loading).toBe(true);
    await act(async () => requests[4].resolve({ item: quotation }));
    expect(result.current.quotation?.quotationId).toBe(21);
    expect(result.current.loading).toBe(false);
    act(() => result.current.closeDetail());
    act(() => result.current.refreshDetail());
    expect(requests).toHaveLength(5);
    expect(result.current.selectedQuotationId).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it.each([false, true])('publishes quotation list-start commits while preserving quiet reloads and paused request versions (initially ready: %s)', async (initiallyReady) => {
    const requests: Array<{
      resolve: (value: { resultList: QuotationStatusRow[] }) => void;
      reject: (error: Error) => void;
    }> = [];
    apiGetMock.mockImplementation(() => new Promise<{ resultList: QuotationStatusRow[] }>((resolve, reject) => {
      requests.push({ resolve, reject });
    }));
    const filters: QuotationStatusFilters = { quotationDtFrom: '2026-11-01', quotationDtTo: '2026-11-30' };
    const initialProps: { filters: QuotationStatusFilters | null } = { filters: initiallyReady ? filters : null };
    const commits: Array<{ loading: boolean; hasLoaded: boolean; error: string; initialLoading: boolean }> = [];
    const { result, rerender } = renderHook(({ filters: current }) => {
      const list = useQuotationStatusList(current);
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
    await act(async () => requests[0].reject(new Error('Owned quotation list failure')));
    expect(result.current.error).toBe('Owned quotation list failure');
    commits.length = 0;
    act(() => result.current.retry());
    expect(commits[0]).toEqual(normalStart);
    await act(async () => requests[1].resolve({ resultList: [statusRow] }));
    expect(result.current.hasLoaded).toBe(true);

    commits.length = 0;
    act(() => result.current.refreshQuietly());
    expect(commits[0]).toEqual(quietStart);
    expect(result.current.rows).toEqual([statusRow]);
    await act(async () => requests[2].resolve({ resultList: [statusRow] }));
    commits.length = 0;
    rerender({ filters: { ...filters, keyword: 'Owned changed' } });
    expect(commits[0]).toEqual(normalStart);
    rerender({ filters: { ...filters, keyword: 'Owned latest' } });
    expect(requests).toHaveLength(5);
    await act(async () => requests[3].resolve({ resultList: [{ ...statusRow, quotationId: 22 }] }));
    expect(result.current.rows).toEqual([statusRow]);
    expect(result.current.loading).toBe(true);
    await act(async () => requests[4].resolve({ resultList: [statusRow] }));
    expect(result.current.loading).toBe(false);
    expect(result.current.hasLoaded).toBe(true);

    rerender({ filters: null });
    act(() => result.current.refreshQuietly());
    expect(requests).toHaveLength(5);
    expect(result.current.loading).toBe(false);
    commits.length = 0;
    rerender({ filters });
    expect(commits[0]).toEqual(quietStart);
    expect(result.current.rows).toEqual([statusRow]);
    await act(async () => requests[5].resolve({ resultList: [statusRow] }));
    rerender({ filters });
    expect(requests).toHaveLength(6);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasLoaded).toBe(true);
  });

  it('requires a date range, lists detail-based results, and opens quotation detail', async () => {
    const router = createMemoryRouter([{
      path: '/',
      element: (
        <QuotationStatusPage
          selectedModule={moduleItem}
          currentMenuName="견적현황"
          breadcrumbItems={['영업관리', '견적관리', '견적현황']}
          content={{ title: '견적현황', description: '견적을 조회합니다.', cards: [], items: [] }}
          selectedMenuPermissions={{ read: true, create: false, update: false, delete: false, excel: true }}
        />
      ),
    }]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('button', { name: 'QT-20261116-0001 상세 보기' }, {
      timeout: 5000,
    })).toBeInTheDocument();
    const statusRequest = apiGetMock.mock.calls
      .map(([path]) => String(path))
      .find((path) => path.startsWith('/api/v1/sales/quotation-status'));
    expect(statusRequest).toContain('quotationDtFrom=2026-10-16');
    expect(statusRequest).toContain('quotationDtTo=2026-11-16');
    fireEvent.click(screen.getByRole('button', { name: 'QT-20261116-0001 상세 보기' }));

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith('/api/v1/sales/quotations/21'));
    expect(await screen.findByText('견적 조건')).toBeInTheDocument();
    expect(screen.getAllByText('직접 입력 품목').length).toBeGreaterThan(0);
    expect(screen.getByText('FOB')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '견적 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '자세히보기' }));
    const date = await screen.findByRole('textbox', { name: '견적작성일' });
    await waitFor(() => expect(date.closest('.MuiInputBase-root')).toHaveClass('Mui-disabled'));
    expect(screen.getByRole('textbox', { name: '견적제출일' }).closest('.MuiInputBase-root'))
      .toHaveClass('Mui-disabled');
    expect(screen.getByRole('button', { name: '견적작성일 달력 열기' })).toBeDisabled();
  }, 15000);

  it('submits the integrated keyword with required dates and restores it from the session', async () => {
    const element = <QuotationStatusPage selectedModule={moduleItem} currentMenuName="견적현황"
      breadcrumbItems={[]} content={{ title: '견적현황', description: '', cards: [], items: [] }}
      selectedMenuPermissions={{ read: true }} />;
    const mounted = render(<RouterProvider router={createMemoryRouter([{ path: '/', element }])} />);
    const input = await screen.findByRole('textbox', { name: '견적현황 빠른 검색' });
    await waitFor(() => expect(input).toBeEnabled());
    await screen.findByRole('button', { name: 'QT-20261116-0001 상세 보기' }, {
      timeout: 5000,
    });
    const before = apiGetMock.mock.calls.length;
    fireEvent.change(input, { target: { value: ' 볼트 ' } });
    expect(apiGetMock.mock.calls.length).toBe(before);
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(apiGetMock.mock.calls.some(([path]) =>
      String(path).includes('keyword=%EB%B3%BC%ED%8A%B8'))).toBe(true));
    mounted.unmount();
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element }])} />);
    expect(await screen.findByRole('textbox', { name: '견적현황 빠른 검색' })).toHaveValue(' 볼트 ');
    fireEvent.click(screen.getByRole('button', { name: '견적현황 검색어 초기화' }));
    expect(screen.getByRole('textbox', { name: '견적현황 빠른 검색' })).toHaveValue('');
  }, 15000);
});
