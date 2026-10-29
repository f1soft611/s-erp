import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import { createItemPartnerPriceColumns, createItemPartnerPriceRow } from '../src/pages/co/master/item-partner-prices/components/itemPartnerPriceGridModel';

const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  api.apiGet.mockResolvedValue({ resultList: [] });
});

describe('item partner price page', () => {
  it('builds a row form with required trade, master, price and date fields', () => {
    const row = createItemPartnerPriceRow();
    const columns = createItemPartnerPriceColumns(true);
    expect(row.priceId).toMatch(/^new-price-/);
    for (const field of ['tradeType', 'materialId', 'customerId', 'unitPrice', 'startDt']) {
      expect(columns.find((column) => column.field === field)).toMatchObject({
        required: true,
        form: expect.objectContaining({ group: expect.any(String) }),
      });
    }
    expect(columns.find((column) => column.field === 'materialId')?.type).toBe('code');
    expect(columns.find((column) => column.field === 'customerId')?.type).toBe('code');
  });

  it('routes the co master menu to the price page and exposes Excel actions for admins', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{ id: 'co', name: '기준정보', icon: null, tree: [], menus: [] }}
            currentMenuName="품목·거래처별 단가관리"
            currentPageKey="item-partner-prices"
            breadcrumbItems={['기준정보', '품목·거래처별 단가관리']}
            content={{ title: '단가관리', description: '단가', cards: [], items: [] }}
            selectedMenuPermissions={{ read: true, create: true, update: true, delete: false, excel: true }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith('/api/v1/co/master/item-partner-prices'));
    expect(await screen.findByRole('button', { name: '엑셀 양식 다운로드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '엑셀 업로드' })).toBeInTheDocument();
  });
});
