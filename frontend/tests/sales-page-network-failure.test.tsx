import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GridDecimalModuleProvider } from '../src/shared/components/f1-grid/core/GridDecimalPolicy';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { preloadDashboardPages } from '../src/pages/dashboard/components/dashboardPages';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import { ApiNetworkError, ApiResponseError } from '../src/shared/services/apiErrors';
import { resetGridDecimalPolicyCache } from '../src/shared/services/gridDecimalPolicy.service';

// 대시보드 업무 화면은 지연 로딩된다. 동기 렌더링 단언을 위해 화면 모듈을 미리 불러온다.
beforeAll(() => preloadDashboardPages(), 60_000);

const api = vi.hoisted(() => ({
  apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn(),
}));
vi.mock('../src/shared/services/apiClient', () => ({
  ...api,
  apiGetWithExactDecimals: (path: string) => api.apiGet(path),
  apiPostWithExactDecimals: (path: string, data: unknown) => api.apiPost(path, data),
  apiPutWithExactDecimals: (path: string, data: unknown) => api.apiPut(path, data),
}));

const requestCount = () => api.apiGet.mock.calls.length + api.apiPost.mock.calls.length;

// 실제 앱(DashboardPage)과 같이 모듈 소수점 정책 Provider와 데이터 라우터(useBlocker) 안에서 렌더링한다.
function renderSalesPage(currentPageKey: string) {
  const page = (
    <NotificationProvider>
      <GridDecimalModuleProvider moduleCode="sales">
      <DashboardContent
        selectedModule={{ id: 'sales', name: 'Synthetic ERP', icon: null, menus: [], tree: [] }}
        currentPageKey={currentPageKey} currentMenuName="Synthetic page"
        breadcrumbItems={['Synthetic ERP', 'Synthetic page']}
        content={{ title: 'Synthetic page', description: 'Header stays visible', cards: [], items: [] }}
        selectedMenuPermissions={{ read: true, create: true, update: true, delete: true }}
        isTenantAdmin
      />
      </GridDecimalModuleProvider>
    </NotificationProvider>
  );
  return render(<RouterProvider router={createMemoryRouter([{ path: '/', element: page }])} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  resetGridDecimalPolicyCache();
  api.apiGet.mockRejectedValue(new ApiNetworkError());
  api.apiPost.mockRejectedValue(new ApiNetworkError());
});

describe('sales pages on a server connection failure', () => {
  it.each([
    ['quotation-create', '견적등록'],
    ['create', '수주등록'],
    ['delivery-plan-create', '출하계획등록'],
    ['delivery-plan-status', '출하계획현황'],
    ['delivery-create', '출하등록'],
    ['delivery-status', '출하현황'],
    ['statement-create', '거래명세서등록'],
    ['statement-status', '거래명세서현황'],
    ['revenue-closing', '매출마감'],
    ['destinations', '납품처관리'],
  ])('%s shows only the page connection failure and retries the lookup', async (pageKey, label) => {
    renderSalesPage(pageKey);

    const retry = await screen.findByRole('button', { name: new RegExp(`^${label}.* 다시 불러오기$`) });
    await waitFor(() => expect(retry).toBeEnabled());
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('서버에 연결하지 못했습니다');
    expect(screen.getByText('Header stays visible')).toBeInTheDocument();
    expect(screen.queryByText(/불러오지 못했습니다/)).not.toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();

    const before = requestCount();
    fireEvent.click(retry);
    await waitFor(() => expect(requestCount()).toBeGreaterThan(before));
  });

  it('keeps the in-page message for a server error on a networkOnly page', async () => {
    api.apiGet.mockRejectedValue(new ApiResponseError('거래처 서버 오류', 500));
    api.apiPost.mockRejectedValue(new ApiResponseError('거래처 서버 오류', 500));
    renderSalesPage('destinations');

    expect(await screen.findByText('거래처 서버 오류')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /다시 불러오기/ })).not.toBeInTheDocument();
    expect(screen.queryByText('서버에 연결하지 못했습니다', { exact: false })).not.toBeInTheDocument();
  });
});
