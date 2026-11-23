import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { SalesDestinationPage } from '../src/pages/sales/master/destination/SalesDestinationPage';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { deleteSalesDestination, fetchDestinationCustomers, fetchSalesDestinations, saveDestinationBatch } from '../src/pages/sales/master/destination/services/salesDestination.service';

vi.mock('../src/pages/sales/master/destination/services/salesDestination.service', () => ({
  fetchDestinationCustomers: vi.fn(),
  fetchSalesDestinations: vi.fn(),
  saveSalesDestination: vi.fn(),
  saveDestinationBatch: vi.fn(),
  deleteSalesDestination: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchDestinationCustomers).mockResolvedValue([
    { customerId: 10, customerCode: 'C10', customerName: '거래처', hasDestination: true },
  ]);
  vi.mocked(fetchSalesDestinations).mockResolvedValue([]);
});

it('saves staged rows for the selected customer and reloads registration status', async () => {
  vi.mocked(saveDestinationBatch).mockResolvedValue(undefined);
  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }}
  />);
  fireEvent.click(await screen.findByRole('gridcell', { name: 'C10' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '납품처 추가' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: '납품처 추가' }));
  const dialog = screen.getByRole('dialog', { name: '납품처 등록' });
  fireEvent.change(within(dialog).getByLabelText(/납품처명/), { target: { value: '납품처' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(saveDestinationBatch).toHaveBeenCalledWith(
    10, [expect.objectContaining({ customerId: 10, destinationName: '납품처' })], [],
  ));
  await waitFor(() => expect(fetchDestinationCustomers).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(fetchSalesDestinations).toHaveBeenCalledTimes(2));
});

it('allows a create-only user to correct a newly staged row before saving', async () => {
  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: true, create: true, update: false, delete: false, excel: false }}
  />);
  fireEvent.click(await screen.findByRole('gridcell', { name: 'C10' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '납품처 추가' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: '납품처 추가' }));
  let dialog = screen.getByRole('dialog', { name: '납품처 등록' });
  fireEvent.change(within(dialog).getByLabelText(/납품처명/), { target: { value: '납품처' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /new-.* 행 정보 수정/ }));
  dialog = screen.getByRole('dialog', { name: '납품처 수정' });
  fireEvent.change(within(dialog).getByLabelText(/납품처명/), { target: { value: '변경 납품처' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByRole('gridcell', { name: '변경 납품처' })).toBeInTheDocument();
});

it('deletes the selected persisted destination only after confirmation', async () => {
  vi.mocked(fetchSalesDestinations).mockResolvedValue([{
    salesDestinationId: 90, customerId: 10, destinationCode: 'D90', destinationName: '납품처',
    businessNo: null, address: null, contactName: null, mobileNo: null, telephoneNo: null,
    facsimileNo: null, remark: null,
  }]);
  vi.mocked(deleteSalesDestination).mockResolvedValue(undefined);
  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }}
  />);
  fireEvent.click(await screen.findByRole('gridcell', { name: 'C10' }));
  fireEvent.click(await screen.findByRole('gridcell', { name: 'D90' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '납품처 삭제' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: '납품처 삭제' }));
  expect(deleteSalesDestination).not.toHaveBeenCalled();
  const dialog = await screen.findByRole('dialog', { name: '납품처 삭제' });
  fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));
  await waitFor(() => expect(deleteSalesDestination).toHaveBeenCalledWith(90));
});

it('keeps unsaved changes when switching customers is cancelled', async () => {
  vi.mocked(fetchDestinationCustomers).mockResolvedValue([
    { customerId: 10, customerCode: 'C10', customerName: '거래처', hasDestination: true },
    { customerId: 20, customerCode: 'C20', customerName: '다른 거래처', hasDestination: false },
  ]);
  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }}
  />);
  fireEvent.click(await screen.findByRole('gridcell', { name: 'C10' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '납품처 추가' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: '납품처 추가' }));
  const form = screen.getByRole('dialog', { name: '납품처 등록' });
  fireEvent.change(within(form).getByLabelText(/납품처명/), { target: { value: '납품처' } });
  fireEvent.click(within(form).getByRole('button', { name: '적용' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('gridcell', { name: 'C20' }));
  const confirm = await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' });
  fireEvent.click(within(confirm).getByRole('button', { name: '취소' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('선택 거래처: 거래처')).toBeInTheDocument();
  expect(screen.getByRole('gridcell', { name: '납품처' })).toBeInTheDocument();
  expect(fetchSalesDestinations).not.toHaveBeenCalledWith(20);
});

it('stages new rows before saving and shows save errors', async () => {
  vi.mocked(saveDestinationBatch).mockRejectedValue(new Error('저장 실패'));
  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }}
  />);
  fireEvent.click(await screen.findByRole('gridcell', { name: 'C10' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '납품처 추가' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: '납품처 추가' }));
  const dialog = screen.getByRole('dialog', { name: '납품처 등록' });
  fireEvent.change(within(dialog).getByLabelText(/납품처명/), { target: { value: '납품처' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(saveDestinationBatch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('저장 실패');
});

it('shows registration status and loads destinations for the selected customer', async () => {
  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }}
  />);
  expect(await screen.findByText('등록')).toBeInTheDocument();
  expect(screen.getByText('거래처 관리')).toBeInTheDocument();
  expect(screen.getByText('납품처 관리', { selector: 'h6' })).toBeInTheDocument();
  expect(screen.getByText('선택 거래처가 없습니다')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('gridcell', { name: 'C10' }));
  await waitFor(() => expect(fetchSalesDestinations).toHaveBeenCalledWith(10));
  expect(screen.getByText('선택 거래처: 거래처')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
});

it('does not expose the 조회 action without read permission', async () => {
  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: false, create: false, update: false, delete: false, excel: false }}
  />);
  expect(await screen.findByText('등록')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '조회' })).not.toBeInTheDocument();
});

it('centers registration status badges for both registered and unregistered customers', async () => {
  vi.mocked(fetchDestinationCustomers).mockResolvedValue([
    { customerId: 10, customerCode: 'C10', customerName: '거래처', hasDestination: true },
    { customerId: 20, customerCode: 'C20', customerName: '다른 거래처', hasDestination: false },
  ]);
  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }}
  />);
  for (const label of ['등록', '미등록']) {
    const cell = await screen.findByRole('gridcell', { name: label });
    expect(cell).toHaveStyle({ justifyContent: 'center' });
    expect(within(cell).getByText(label).closest('.MuiChip-root')).not.toBeNull();
  }
});

it('routes the seeded destination menu to its management page', async () => {
  render(<DashboardContent
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentPageKey="destinations"
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true }}
  />);
  expect(await screen.findByText('등록')).toBeInTheDocument();
});
