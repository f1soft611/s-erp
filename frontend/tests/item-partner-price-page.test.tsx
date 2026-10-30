import { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import { createItemPartnerPriceColumns, createItemPartnerPriceRow } from '../src/pages/co/master/item-partner-prices/components/itemPartnerPriceGridModel';
import { ItemPartnerPriceGrid } from '../src/pages/co/master/item-partner-prices/components/ItemPartnerPriceGrid';
import type { ItemPartnerPriceRow } from '../src/pages/co/master/item-partner-prices/types/itemPartnerPrice.types';
import type { F1GridRef } from '../src/shared/components/f1-grid';
import type { MasterPickerOption } from '../src/shared/components/master-picker/masterPicker.types';

const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);
const masters = vi.hoisted(() => ({
  searchOrderMaterials: vi.fn(),
  searchOrderCustomers: vi.fn(),
}));
vi.mock('../src/pages/sales/order/create/services/salesOrderMaster.service', () => masters);

const material = { id: 101, code: 'M-TEST', name: '검증 품목' };
const customer = { id: 202, code: 'C-TEST', name: '검증 거래처' };

async function openPriceForm() {
  const gridRef = createRef<F1GridRef<ItemPartnerPriceRow>>();
  render(
    <ThemeProvider theme={createTheme()}>
      <NotificationProvider>
        <ItemPartnerPriceGrid
          rows={[]}
          canCreate
          canUpdate
          canExportExcel={false}
          loading={false}
          gridKey={0}
          gridRef={gridRef}
          onChangesChange={() => undefined}
        />
      </NotificationProvider>
    </ThemeProvider>,
  );
  act(() => gridRef.current?.addRow());
  return screen.findByRole('dialog', { name: '단가 등록' });
}

async function openPicker(form: HTMLElement, label: string) {
  fireEvent.click(await within(form).findByRole('button', { name: `${label} 선택 선택` }));
  return screen.findByRole('dialog', { name: `${label} 선택` });
}

function searchPicker(dialog: HTMLElement, label: string, keyword: string) {
  fireEvent.change(within(dialog).getByRole('textbox', { name: `${label} 검색` }), {
    target: { value: keyword },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: '검색' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  api.apiGet.mockResolvedValue({ resultList: [] });
  masters.searchOrderMaterials.mockReset().mockResolvedValue([material]);
  masters.searchOrderCustomers.mockReset().mockResolvedValue([customer]);
});

describe('item partner price page', () => {
  it('starts each master picker fresh while preserving selected form values', async () => {
    const form = await openPriceForm();
    const materialDialog = await openPicker(form, '품목');
    searchPicker(materialDialog, '품목', '품목 검색어');
    fireEvent.click(await within(materialDialog).findByRole('button', {
      name: `${material.code} ${material.name} 선택`,
    }));

    expect(await within(form).findByDisplayValue('M-TEST · 검증 품목')).toBeInTheDocument();
    const customerDialog = await openPicker(form, '거래처');
    expect(within(customerDialog).getByRole('textbox', { name: '거래처 검색' })).toHaveValue('');
    expect(within(customerDialog).queryByText(material.name)).not.toBeInTheDocument();
    expect(within(customerDialog).getByText('검색어를 입력한 뒤 검색해 주세요.')).toBeVisible();
    searchPicker(customerDialog, '거래처', '거래처 검색어');
    fireEvent.click(await within(customerDialog).findByRole('button', {
      name: `${customer.code} ${customer.name} 선택`,
    }));

    expect(await within(form).findByDisplayValue('C-TEST · 검증 거래처')).toBeInTheDocument();
    expect(within(form).getByDisplayValue('M-TEST · 검증 품목')).toBeInTheDocument();
    const reopenedMaterial = await openPicker(form, '품목');
    expect(within(reopenedMaterial).getByRole('textbox', { name: '품목 검색' })).toHaveValue('');
    expect(within(reopenedMaterial).queryByText(customer.name)).not.toBeInTheDocument();
    searchPicker(reopenedMaterial, '품목', '다시 검색');
    await within(reopenedMaterial).findByText(material.name);
    fireEvent.click(within(reopenedMaterial).getByRole('button', { name: '닫기' }));
    const freshMaterial = await openPicker(form, '품목');
    expect(within(freshMaterial).getByRole('textbox', { name: '품목 검색' })).toHaveValue('');
    expect(within(freshMaterial).queryByText(material.name)).not.toBeInTheDocument();
  });

  it('does not expose a closed material search response in the customer picker', async () => {
    let resolveMaterial!: (rows: MasterPickerOption[]) => void;
    masters.searchOrderMaterials.mockImplementationOnce(() => new Promise<MasterPickerOption[]>((resolve) => {
      resolveMaterial = resolve;
    }));
    const form = await openPriceForm();
    const materialDialog = await openPicker(form, '품목');
    searchPicker(materialDialog, '품목', '늦은 품목');
    fireEvent.click(within(materialDialog).getByRole('button', { name: '닫기' }));

    const customerDialog = await openPicker(form, '거래처');
    expect(within(customerDialog).getByRole('textbox', { name: '거래처 검색' })).toHaveValue('');
    searchPicker(customerDialog, '거래처', '거래처');
    await within(customerDialog).findByText(customer.name);
    await act(async () => resolveMaterial([material]));
    expect(within(customerDialog).queryByText(material.name)).not.toBeInTheDocument();
    fireEvent.click(within(customerDialog).getByRole('button', {
      name: `${customer.code} ${customer.name} 선택`,
    }));
    expect(await within(form).findByDisplayValue('C-TEST · 검증 거래처')).toBeInTheDocument();
  });

  it('does not carry a material search error into the customer picker', async () => {
    masters.searchOrderMaterials.mockRejectedValueOnce(new Error('품목 검색 실패'));
    const form = await openPriceForm();
    const materialDialog = await openPicker(form, '품목');
    searchPicker(materialDialog, '품목', '오류');
    await within(materialDialog).findByText('품목 검색 실패');
    fireEvent.click(within(materialDialog).getByRole('button', { name: '닫기' }));

    const customerDialog = await openPicker(form, '거래처');
    expect(within(customerDialog).queryByText('품목 검색 실패')).not.toBeInTheDocument();
    expect(within(customerDialog).getByText('검색어를 입력한 뒤 검색해 주세요.')).toBeVisible();
  });

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
