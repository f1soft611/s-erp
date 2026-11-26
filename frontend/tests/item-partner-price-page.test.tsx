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
import { preloadDashboardPages } from '../src/pages/dashboard/components/dashboardPages';

// 대시보드 업무 화면은 지연 로딩된다. 기존 동기 렌더링 단언을 유지하도록 화면 모듈을 미리 불러온다.
beforeAll(() => preloadDashboardPages(), 60_000);

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

const TRADE = encodeURIComponent('매입');
const PURCHASE_TYPES = encodeURIComponent('RAW,SUB,SUPPLY');
const SALES_TYPES = encodeURIComponent('PRODUCT,SEMI,GOODS');

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
    // 공통단가가 폐지되어 단가는 항상 거래처에 붙으므로 거래처도 필수다.
    expect(columns.find((column) => column.field === 'customerId')?.required).toBe(true);
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

  it('routes the 매출단가등록 page key to the sales screen without purchase-only columns', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{ id: 'co', name: '기준정보', icon: null, tree: [], menus: [] }}
            currentMenuName="매출단가등록"
            currentPageKey="item-sales-prices"
            breadcrumbItems={['기준정보', '매출단가등록']}
            content={{ title: '매출단가등록', description: '단가', cards: [], items: [] }}
            selectedMenuPermissions={{ read: true, create: true, update: true, delete: false, excel: true }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );
    // 매출 화면은 제품·반제품·상품이 계정분류 기본 조건이다.
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(
      `/api/v1/co/master/item-partner-prices/overview?tradeType=${encodeURIComponent('매출')}&itemTypes=${SALES_TYPES}`,
    ));
    expect(await screen.findByRole('tab', { name: '품목 기준', selected: true })).toBeInTheDocument();
  });

  it('builds only the selected trade type columns and keeps the item columns side by side', () => {
    const hidden = (tradeType: '매입' | '매출') => createItemPartnerPriceColumns(true, undefined, {}, true, false, tradeType)
      .filter((column) => column.hidden).map((column) => String(column.field));
    expect(hidden('매입')).toContain('tradeType');
    expect(hidden('매입')).not.toContain('orderType');
    expect(hidden('매출')).toEqual(expect.arrayContaining(['tradeType', 'orderType', 'defaultSupplier']));
    expect(createItemPartnerPriceRow('매출').tradeType).toBe('매출');

    // 품목코드·품목명·규격·단위는 나란히 있다(단위가 뒤쪽에 따로 떨어져 있지 않다).
    const order = createItemPartnerPriceColumns(false, undefined, undefined, false).map((column) => String(column.field));
    const code = order.indexOf('materialCode');
    expect(order.slice(code, code + 4)).toEqual(['materialCode', 'materialName', 'materialSpec', 'materialUnit']);
  });

  it('puts the default supplier column first as "기본", hides it on sales, and has no minimum order quantity', () => {
    const purchase = createItemPartnerPriceColumns(true, undefined, {}, true, false, '매입');
    const fields = purchase.map((column) => String(column.field));
    expect(fields.slice(0, 2)).toEqual(['priceId', 'defaultSupplier']);
    expect(purchase[1]).toMatchObject({ headerName: '기본', type: 'checkbox' });
    expect(purchase[1].hidden).toBeFalsy();
    expect(purchase[1].form).toMatchObject({ label: '기본 거래처' });
    expect(fields).not.toContain('moq');
    const sales = createItemPartnerPriceColumns(true, undefined, {}, true, false, '매출');
    expect(sales.find((column) => column.field === 'defaultSupplier')?.hidden).toBe(true);
  });

  it('hides the item columns and shows the fixed item read-only in the form on the item screen', () => {
    const columns = createItemPartnerPriceColumns(true, undefined, {}, true, false, '매입', true);
    const hidden = columns.filter((column) => column.hidden).map((column) => String(column.field));
    expect(hidden).toEqual(expect.arrayContaining(['materialId', 'materialCode', 'materialName', 'materialSpec', 'materialUnit']));
    expect(hidden).not.toContain('customerId');
    const materialField = columns.find((column) => column.field === 'materialId');
    const form = materialField?.form as { visible: (row: ItemPartnerPriceRow) => boolean; readOnly: (row: ItemPartnerPriceRow) => boolean };
    expect(form.visible(createItemPartnerPriceRow('매입'))).toBe(true);
    expect(form.readOnly(createItemPartnerPriceRow('매입'))).toBe(true);
    // 종료일은 새 적용일 등록 때 서버가 자동으로 닫으므로 키가 고정된 화면에서는 직접 고치지 않는다.
    const endDt = columns.find((column) => column.field === 'endDt')?.editable;
    expect(typeof endDt === 'function' ? endDt(createItemPartnerPriceRow('매입')) : endDt).toBe(false);
  });

  it('routes the co master menu to the price page and exposes Excel actions for admins', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{ id: 'co', name: '기준정보', icon: null, tree: [], menus: [] }}
            currentMenuName="품목·거래처별 단가관리"
            currentPageKey="item-purchase-prices"
            breadcrumbItems={['기준정보', '매입단가등록']}
            content={{ title: '단가관리', description: '단가', cards: [], items: [] }}
            selectedMenuPermissions={{ read: true, create: true, update: true, delete: false, excel: true }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(
      `/api/v1/co/master/item-partner-prices/overview?tradeType=${TRADE}&itemTypes=${PURCHASE_TYPES}`,
    ));
    expect(await screen.findByRole('tab', { name: '품목 기준', selected: true })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '단가 추가' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '엑셀 양식 다운로드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '엑셀 업로드' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '단가 이력 조회' }));
    // 이력 조회 탭은 조회 전용이라 종료된 단가까지 보이도록 includeHistory로 조회하고, 입력·저장·엑셀 업로드 버튼이 없다.
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(
      `/api/v1/co/master/item-partner-prices?tradeType=${TRADE}&itemTypes=${PURCHASE_TYPES}&includeHistory=true`,
    ));
    expect(await screen.findByRole('button', { name: '조회' })).toBeInTheDocument();
    for (const name of ['단가 추가', '저장', '엑셀 업로드', '엑셀 양식 다운로드']) {
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
            currentPageKey="item-purchase-prices"
            breadcrumbItems={['기준정보', '매입단가등록']}
            content={{ title: '단가관리', description: '단가', cards: [], items: [] }}
            selectedMenuPermissions={{ read: true, create: true, update: true, delete: false, excel: true }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );
    fireEvent.click(await screen.findByRole('tab', { name: '거래처 기준' }));
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(
      `/api/v1/co/master/item-partner-prices/customer-overview?tradeType=${TRADE}&itemTypes=${PURCHASE_TYPES}`,
    ));
    expect(await screen.findByText('왼쪽에서 거래처를 선택해 주세요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '엑셀 양식 다운로드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '엑셀 업로드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '단가 추가' })).toBeDisabled();
    fireEvent.click(await screen.findByText('기준 거래처'));
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(
      `/api/v1/co/master/item-partner-prices?useAt=Y&tradeType=${TRADE}&itemTypes=${PURCHASE_TYPES}&customerId=301`,
    ));
    expect(await screen.findByText('C301 · 기준 거래처 단가')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '단가 추가' })).toBeEnabled());
  });

  it('loads the item list on the item tab and fetches that item prices on selection', async () => {
    api.apiGet.mockImplementation(async (url: string) => {
      if (url.includes('/overview')) {
        return { resultList: [{
          materialId: 101, materialCode: 'M101', materialName: '기준 품목', materialSpec: '10x20', materialUnit: 'EA',
          materialTypeCode: 'RAW', customerCount: 2, defaultSupplierId: 301, defaultSupplierName: '기본 거래처',
        }] };
      }
      return { resultList: [] };
    });
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{ id: 'co', name: '기준정보', icon: null, tree: [], menus: [] }}
            currentMenuName="매입단가등록"
            currentPageKey="item-purchase-prices"
            breadcrumbItems={['기준정보', '매입단가등록']}
            content={{ title: '단가관리', description: '단가', cards: [], items: [] }}
            selectedMenuPermissions={{ read: true, create: true, update: true, delete: false, excel: true }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );
    expect(await screen.findByText('왼쪽에서 품목을 선택해 주세요.')).toBeInTheDocument();
    // 품목코드·품목·규격·단위가 나란히 있는 왼쪽 목록
    expect(await screen.findByText('기준 품목')).toBeInTheDocument();
    expect(screen.getByText('10x20')).toBeInTheDocument();
    expect(screen.getByText('원재료')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '단가 추가' })).toBeDisabled();
    fireEvent.click(screen.getByText('기준 품목'));
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(
      `/api/v1/co/master/item-partner-prices?useAt=Y&tradeType=${TRADE}&materialId=101`,
    ));
    expect(await screen.findByText(/M101 · 기준 품목 단가/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '단가 추가' })).toBeEnabled());
  });

  it('marks required inputs on the editable grid only, not on the read-only history grid', () => {
    const readOnlyHistory = createItemPartnerPriceColumns(false, undefined, undefined, false);
    expect(readOnlyHistory.some((column) => column.required)).toBe(false);
    const editable = createItemPartnerPriceColumns(true);
    expect(editable.some((column) => column.required)).toBe(true);
  });
});
