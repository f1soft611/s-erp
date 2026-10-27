import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaterialManagementPage } from '../src/pages/co/master/materials/MaterialManagementPage';
import { CustomerManagementPage } from '../src/pages/co/master/customers/CustomerManagementPage';
import { createMaterialColumns } from '../src/pages/co/master/materials/components/MaterialGrid';
import { createCustomerColumns } from '../src/pages/co/master/customers/components/CustomerGrid';
import { normalizeMaterialRow, toMaterialPayload } from '../src/pages/co/master/materials/services/materialManagement.service';
import { normalizeCustomerRow } from '../src/pages/co/master/customers/services/customerManagement.service';
import { emptyMaterialPayload } from '../src/pages/co/master/materials/types/materialManagement.types';
import { NotificationProvider } from '../src/shared/context/NotificationContext';

const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);
const root = { id: 1, name: 'Root', level: 1, parentId: null, sortSeq: 0, useAt: 'Y' };
const child = { ...root, id: 2, name: 'Child', level: 2, parentId: 1 };
const otherRoot = { ...root, id: 6, name: 'Other root' };
const material = { ...emptyMaterialPayload(), materialId: 12, materialCode: '000012',
  materialName: 'Sample material', materialTypeCode: 'RAW' };
const customer = { customerId: 14, customerCode: '000014', customerName: 'Sample customer',
  businessNo: '1234567890', useAt: 'Y' };
const props = {
  selectedModule: { id: 'co', name: '기준정보', icon: null, tree: [], menus: [] },
  currentMenuName: '마스터', content: { title: '마스터', description: '', cards: [], items: [] },
  selectedMenuPermissions: { read: true, create: true, update: true, delete: false, excel: false },
  isTenantAdmin: true,
};
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  api.apiGet.mockImplementation(async (url: string) => ({
    resultList: url.includes('/classifications/') ? [root, child, otherRoot]
      : url.endsWith('/options') ? [] : url.includes('/materials') ? [material] : [customer],
  }));
  api.apiPost.mockImplementation(async (url: string, payload) => {
    const key = url.includes('/materials') ? 'materials' : 'customers';
    const rows = [...payload[key].insertedRows, ...payload[key].updatedRows].map((row) => ({
      ...row, ...(key === 'materials' ? { itemClsPath: row.itemClsId ? 'Root > Child' : '' }
        : { businessKind1Name: row.businessKind1 ? 'Root' : '',
          businessKind2Name: row.businessKind2 ? 'Child' : '' }),
    }));
    const idField = key === 'materials' ? 'materialId' : 'customerId';
    return { item: { [key]: rows, rowIdMappings: Object.fromEntries(rows.map((row) => [
      String(row[idField]), Number(row[idField]),
    ])) } };
  });
});
const show = (kind: 'item' | 'partner') => render(
  <ThemeProvider theme={createTheme()}><NotificationProvider>
    {kind === 'item' ? <MaterialManagementPage {...props} /> : <CustomerManagementPage {...props} />}
  </NotificationProvider></ThemeProvider>,
);
async function openPicker(kind: 'item' | 'partner', field: string) {
  const columns = kind === 'item' ? createMaterialColumns(true) : createCustomerColumns(true);
  const index = columns.findIndex((column) => column.field === field);
  expect(index).toBeGreaterThan(-1);
  const row = document.querySelector(`[data-f1-grid-row-id="${kind === 'item' ? 12 : 14}"]`) as HTMLElement;
  fireEvent.doubleClick(within(row).getAllByRole('gridcell')[index]);
  fireEvent.click(screen.getByRole('button', { name: '코드 선택' }));
  return screen.findByRole('dialog', { name: kind === 'item' ? '품목분류 선택'
    : field === 'businessKind1' ? '거래처 대분류 선택' : '거래처 소분류 선택' });
}
async function choose(id: number) {
  const tree = await screen.findByRole('grid', { name: '분류 선택 트리' });
  await within(tree).findByText('Child', { exact: true });
  fireEvent.click(within(tree.querySelector(`[data-f1-grid-row-id="${id}"]`) as HTMLElement)
    .getAllByRole('gridcell')[0]);
  fireEvent.click(screen.getByRole('button', { name: '선택', exact: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('master classification persistence', () => {
  it('normalizes IDs and display values while saving only the material classification ID', () => {
    const row = normalizeMaterialRow({ ...material, itemClsId: 2, itemClsPath: 'Root > Child' });
    expect(row).toMatchObject({ itemClsId: 2, itemClsPath: 'Root > Child' });
    expect(toMaterialPayload(row, false)).toMatchObject({ itemClsId: 2, matCataType: '' });
    expect(toMaterialPayload(row, false)).not.toHaveProperty('itemClsPath');
    expect(normalizeCustomerRow({ ...customer, businessKind1: 1, businessKind2: 2,
      businessKind1Name: 'Root', businessKind2Name: 'Child' })).toMatchObject({
      businessKind1: 1, businessKind2: 2, businessKind1Name: 'Root', businessKind2Name: 'Child',
    });
  });

  it('selects and saves an item classification and preserves it when the picker is cancelled', async () => {
    show('item');
    await screen.findByText('Sample material');
    expect(api.apiGet).not.toHaveBeenCalledWith('/api/v1/co/master/classifications/items');
    await openPicker('item', 'itemClsId');
    await choose(2);
    expect(screen.getByText('Root > Child')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
    await waitFor(() => expect(api.apiPost).toHaveBeenCalledOnce());
    expect(api.apiPost.mock.calls[0][1].materials.updatedRows[0]).toMatchObject({ itemClsId: 2 });
    expect(api.apiPost.mock.calls[0][1].materials.updatedRows[0]).not.toHaveProperty('itemClsPath');
    await waitFor(() => expect(screen.getByRole('button', { name: '저장', exact: true })).toBeDisabled());
    await openPicker('item', 'itemClsId');
    fireEvent.click(screen.getByRole('button', { name: '취소', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Root > Child')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
    expect(api.apiPost).toHaveBeenCalledOnce();
  });

  it('auto-selects the partner parent and clears its child when the parent changes', async () => {
    show('partner');
    await screen.findByText('Sample customer');
    await openPicker('partner', 'businessKind2');
    await choose(2);
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
    await waitFor(() => expect(api.apiPost).toHaveBeenCalledOnce());
    expect(api.apiPost.mock.calls[0][1].customers.updatedRows[0]).toMatchObject({ businessKind1: 1, businessKind2: 2 });
    expect(api.apiPost.mock.calls[0][1].customers.updatedRows[0]).not.toHaveProperty('businessKind1Name');
    await waitFor(() => expect(screen.getByRole('button', { name: '저장', exact: true })).toBeDisabled());
    await openPicker('partner', 'businessKind1');
    await choose(6);
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
    await waitFor(() => expect(api.apiPost).toHaveBeenCalledTimes(2));
    expect(api.apiPost.mock.calls[1][1].customers.updatedRows[0]).toMatchObject({ businessKind1: 6, businessKind2: null });
  });

  it('applies a delayed classification selection to the row form draft before saving', async () => {
    show('item');
    await screen.findByText('Sample material');
    fireEvent.click(screen.getByRole('button', { name: '12 행 정보 수정' }));
    fireEvent.click(screen.getByRole('button', { name: '품목분류 선택' }));
    await screen.findByText('Child', { exact: true });
    fireEvent.click(within(document.querySelector('[data-f1-grid-row-id="2"]') as HTMLElement)
      .getAllByRole('gridcell')[0]);
    fireEvent.click(screen.getByRole('button', { name: '선택', exact: true }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: '품목분류' })).toHaveValue('Root > Child'));
    fireEvent.click(screen.getByRole('button', { name: '적용', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
    await waitFor(() => expect(api.apiPost).toHaveBeenCalledOnce());
    expect(api.apiPost.mock.calls[0][1].materials.updatedRows[0]).toMatchObject({ itemClsId: 2 });
  });
});
