import { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import { createItemPartnerPriceColumns, createItemPartnerPriceRow } from '../src/pages/co/master/item-partner-prices/components/itemPartnerPriceGridModel';
import { createItemPriceOverviewColumns } from '../src/pages/co/master/item-partner-prices/components/itemPriceOverviewGridModel';
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
    for (const field of ['tradeType', 'materialId', 'startDt']) {
      expect(columns.find((column) => column.field === field)).toMatchObject({
        required: true,
        form: expect.objectContaining({ group: expect.any(String) }),
      });
    }
    // 원화단가·외화단가는 둘 중 하나만 있으면 되므로 표시 전용 필수 표시만 쓴다.
    for (const field of ['unitPrice', 'foreignUnitPrice']) {
      expect(columns.find((column) => column.field === field)).toMatchObject({ requiredMark: true });
      expect(columns.find((column) => column.field === field)?.required).toBeFalsy();
    }
    expect(columns.find((column) => column.field === 'materialId')?.type).toBe('code');
    expect(columns.find((column) => column.field === 'customerId')?.type).toBe('code');
    // 거래처를 비우면 품목 기본단가이므로 필수가 아니다.
    expect(columns.find((column) => column.field === 'customerId')?.required).toBeFalsy();
  });

  it('adds VAT, foreign price and currency columns', () => {
    const columns = createItemPartnerPriceColumns(true, undefined, {
      taxTypes: [{ value: 'TAXABLE', label: '과세' }],
      currencies: [{ value: 'USD', label: '미국 달러' }],
    });
    const fields = columns.map((column) => String(column.field));
    for (const field of ['taxType', 'vatIncludedAt', 'foreignUnitPrice', 'currency', 'materialUnit', 'priceStatus']) {
      expect(fields).toContain(field);
    }
    expect(columns.find((column) => column.field === 'taxType')?.options)
      .toEqual([{ value: 'TAXABLE', label: '과세' }]);
    expect(columns.find((column) => column.field === 'currency')?.options)
      .toEqual([{ value: 'USD', label: '미국 달러' }]);
    const currency = columns.find((column) => column.field === 'currency');
    const validate = currency?.validate as (value: unknown, row: ItemPartnerPriceRow) => unknown;
    expect(validate('', { ...createItemPartnerPriceRow(), foreignUnitPrice: 3 })).toContain('통화');
    expect(validate('', createItemPartnerPriceRow())).toBe(true);
  });

  it('locks past rows and the key fields of current rows', () => {
    const columns = createItemPartnerPriceColumns(true);
    const editable = (field: string, row: ItemPartnerPriceRow) => {
      const column = columns.find((candidate) => String(candidate.field) === field);
      const value = column?.editable;
      return typeof value === 'function' ? value(row) : Boolean(value);
    };
    const base = { ...createItemPartnerPriceRow(), priceId: 7 };
    const past = { ...base, priceStatus: 'past' as const };
    const current = { ...base, priceStatus: 'current' as const };
    const future = { ...base, priceStatus: 'future' as const };
    expect(editable('unitPrice', past)).toBe(false);
    expect(editable('unitPrice', current)).toBe(true);
    expect(editable('startDt', current)).toBe(false);
    expect(editable('customerId', current)).toBe(false);
    expect(editable('startDt', future)).toBe(true);
    expect(editable('startDt', createItemPartnerPriceRow())).toBe(true);
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
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/item-partner-prices/overview',
    ));
    expect(await screen.findByRole('tab', { name: '품목 기준', selected: true })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '특별단가 추가' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '엑셀 양식 다운로드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '엑셀 업로드' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '단가 이력 조회' }));
    // 이력 조회 탭은 조회 전용이라 종료된 단가까지 보이도록 includeHistory로 조회하고, 입력·저장·엑셀 업로드 버튼이 없다.
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/item-partner-prices?includeHistory=true',
    ));
    expect(await screen.findByRole('button', { name: '조회' })).toBeInTheDocument();
    for (const name of ['단가 추가', '저장', '엑셀 업로드', '엑셀 양식 다운로드', '특별단가 추가']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('loads the customer list on the customer tab and fetches that customer prices on selection', async () => {
    api.apiGet.mockImplementation(async (url: string) => {
      if (url.includes('/customer-overview')) {
        return { resultList: [{
          customerId: 301, customerCode: 'C301', customerName: '기준 거래처', businessNo: '123-45-67890', priceCount: 2,
        }] };
      }
      return { resultList: [] };
    });
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
    fireEvent.click(await screen.findByRole('tab', { name: '거래처 기준' }));
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/item-partner-prices/customer-overview',
    ));
    expect(await screen.findByText('왼쪽에서 거래처를 선택해 주세요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '엑셀 양식 다운로드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '엑셀 업로드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '단가 추가' })).toBeDisabled();
    fireEvent.click(await screen.findByText('기준 거래처'));
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/item-partner-prices?useAt=Y&customerId=301',
    ));
    expect(await screen.findByText('C301 · 기준 거래처 단가')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '단가 추가' })).toBeEnabled());
  });

  it('marks required inputs on the editable overview grid only, not on the read-only history grid', () => {
    const overview = createItemPriceOverviewColumns({ canEdit: true, today: '2026-11-18' });
    const header = (field: string) => overview.find((column) => String(column.field) === field);
    expect(overview[0]).toMatchObject({ field: 'rowId', type: 'rownumber', headerName: 'No' });
    expect(header('displayName')?.headerName).toBe('품목');
    for (const field of ['purchaseUnitPrice', 'purchaseStartDt', 'salesUnitPrice', 'salesStartDt', 'customerId']) {
      expect(header(field)?.requiredMark).toBe(true);
      // 빈 행을 모두 검증 오류로 만들지 않도록 required(검증)는 쓰지 않는다.
      expect(header(field)?.required).toBeFalsy();
    }
    expect(header('purchaseForeignUnitPrice')?.form).toMatchObject({ group: '매입 단가' });

    const readOnlyHistory = createItemPartnerPriceColumns(false, undefined, undefined, false);
    expect(readOnlyHistory.some((column) => column.required)).toBe(false);
    const editable = createItemPartnerPriceColumns(true);
    expect(editable.some((column) => column.required)).toBe(true);
  });
});
