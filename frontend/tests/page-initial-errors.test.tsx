import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { WarehouseManagementPage } from '../src/pages/settings/system/warehouses/WarehouseManagementPage';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import { ApiNetworkError } from '../src/shared/services/apiErrors';

const api = vi.hoisted(() => ({
  apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn(),
}));
vi.mock('../src/shared/services/apiClient', () => api);

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  api.apiGet.mockRejectedValue(new ApiNetworkError());
});

describe('data-backed page initial failures', () => {
  it.each([
    ['settings', 'modules'],
    ['settings', 'roles'],
    ['settings', 'menus'],
    ['co', 'common-code'],
    ['co', 'customers'],
    ['co', 'materials'],
    ['co', 'form'],
    ['sales', 'status'],
    ['groupware', 'notice'],
    ['groupware', 'archive'],
    ['groupware', 'documents'],
    ['groupware', 'write'],
  ])('replaces the full %s/%s body, not the header, on a connection failure', async (id, currentPageKey) => {
    render(
      <NotificationProvider>
        <DashboardContent
          selectedModule={{ id, name: 'Synthetic ERP', icon: null, menus: [], tree: [] }}
          currentPageKey={currentPageKey} currentMenuName="Synthetic page"
          breadcrumbItems={['Synthetic ERP', 'Synthetic page']}
          content={{ title: 'Synthetic page', description: 'Header stays visible', cards: [], items: [] }}
          selectedMenuPermissions={{ read: true, create: true, update: true, delete: true }}
          isTenantAdmin
        />
      </NotificationProvider>,
    );
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('네트워크 상태를 확인');
    expect(screen.getByText('Header stays visible')).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notice-feed-skeleton')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /다시 불러오기/ })).toBeEnabled());
  });

  it('uses the same initial failure state in the warehouse page', async () => {
    render(<WarehouseManagementPage
      selectedModule={{ id: 'settings', name: 'Synthetic ERP', icon: null, menus: [], tree: [] }}
      currentMenuName="창고관리"
      content={{ title: '창고관리', description: '', cards: [], items: [] }}
    />);
    expect(await screen.findByRole('button', { name: '창고 목록 다시 불러오기' })).toBeEnabled();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });
});
