import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
import type { PurchaseRequestStatusRow } from '../src/pages/materials/request/status/types/purchaseRequestStatus.types';

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
    values: { requestDt: { from: '2026-11-01', to: '2026-11-30' } },
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
    window.sessionStorage.clear();
    apiGetMock.mockResolvedValue({ resultList: [row()], resultCnt: 1 });
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
