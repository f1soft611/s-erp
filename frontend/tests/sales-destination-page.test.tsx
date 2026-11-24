import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { SalesDestinationPage } from '../src/pages/sales/master/destination/SalesDestinationPage';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
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

it('outlines both customer and destination panels like the sales forms', async () => {
  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '납품처 관리']}
    selectedMenuPermissions={{ read: true }}
  />);
  await screen.findByRole('grid', { name: '거래처 목록' });
  for (const name of ['거래처 목록', '납품처 목록']) {
    expect(screen.getByRole('grid', { name }).closest('.MuiCard-root')).toHaveClass('MuiPaper-outlined');
  }
});

it('aligns each panel title and grid with a 16px inner gutter', async () => {
  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '납품처 관리']}
    selectedMenuPermissions={{ read: true }}
  />);
  await screen.findByRole('grid', { name: '거래처 목록' });
  for (const [gridName, title] of [['거래처 목록', '거래처 관리'], ['납품처 목록', '납품처 관리']]) {
    const content = screen.getByRole('grid', { name: gridName }).closest('.MuiCardContent-root')!;
    const style = getComputedStyle(content);
    expect([style.paddingLeft, style.paddingRight, style.paddingBottom]).toEqual(['16px', '16px', '16px']);
    const heading = within(content as HTMLElement).getByText(title).parentElement!;
    expect([parseFloat(getComputedStyle(heading).paddingLeft), parseFloat(getComputedStyle(heading).paddingRight)]).toEqual([0, 0]);
  }
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
  await waitFor(() => expect(screen.getByRole('button', { name: '삭제' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: '삭제' }));
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

it('shows the empty destination grid before a customer is selected', async () => {
  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }}
  />);

  expect(await screen.findByRole('grid', { name: '납품처 목록' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '납품처 추가' })).toBeDisabled();
});

it('does not mark an unchanged empty nullable destination field dirty', async () => {
  vi.mocked(fetchSalesDestinations).mockResolvedValue([{
    salesDestinationId: 90, customerId: 10, destinationCode: 'D90', destinationName: '기존 납품처',
    businessNo: null, address: null, contactName: null, mobileNo: null, telephoneNo: null,
    facsimileNo: null, remark: null,
  }]);
  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }}
  />);
  fireEvent.click(await screen.findByRole('gridcell', { name: 'C10' }));

  const destinationCell = await screen.findByRole('gridcell', { name: '기존 납품처' });
  const destinationRow = destinationCell.closest('[role="row"]');
  const businessNoCell = destinationRow?.querySelectorAll<HTMLElement>('[role="gridcell"]')[3];
  if (!businessNoCell) throw new Error('사업자번호 셀을 찾을 수 없습니다.');
  fireEvent.doubleClick(businessNoCell);
  fireEvent.keyDown(within(businessNoCell).getByRole('textbox'), { key: 'Enter' });

  expect(businessNoCell).toHaveAttribute('data-dirty-cell', 'false');
  expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
});

it('formats and validates optional destination numbers in the row form', async () => {
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
  const businessNo = within(dialog).getByLabelText('사업자번호');
  const mobileNo = within(dialog).getByLabelText('이동전화번호');
  const telephoneNo = within(dialog).getByLabelText('전화번호');
  const facsimileNo = within(dialog).getByLabelText('팩스번호');
  fireEvent.change(businessNo, { target: { value: '123456789' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
  expect(screen.getByRole('dialog', { name: '납품처 등록' })).toBeInTheDocument();
  expect(businessNo).toHaveAttribute('aria-invalid', 'true');
  fireEvent.change(businessNo, { target: { value: '1234567890' } });
  fireEvent.change(mobileNo, { target: { value: '010123' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
  expect(mobileNo).toHaveAttribute('aria-invalid', 'true');
  fireEvent.change(mobileNo, { target: { value: '01012345678' } });
  fireEvent.change(telephoneNo, { target: { value: '0212345678' } });
  fireEvent.change(facsimileNo, { target: { value: '0311234567' } });
  expect(businessNo).toHaveValue('123-45-67890');
  expect(mobileNo).toHaveValue('010-1234-5678');
  expect(telephoneNo).toHaveValue('02-1234-5678');
  expect(facsimileNo).toHaveValue('031-123-4567');
  fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByRole('gridcell', { name: '123-45-67890' })).toBeInTheDocument();
});

it('formats an existing destination telephone number during cell editing', async () => {
  vi.mocked(fetchSalesDestinations).mockResolvedValue([{
    salesDestinationId: 90, customerId: 10, destinationCode: 'D90', destinationName: '기존 납품처',
    businessNo: null, address: null, contactName: null, mobileNo: null, telephoneNo: '0212345678',
    facsimileNo: null, remark: null,
  }]);
  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }}
  />);
  fireEvent.click(await screen.findByRole('gridcell', { name: 'C10' }));
  fireEvent.doubleClick(await screen.findByRole('gridcell', { name: '0212345678' }));
  const editor = screen.getByDisplayValue('0212345678');
  fireEvent.change(editor, { target: { value: '0311234567' } });
  expect(screen.getByDisplayValue('031-123-4567')).toBeInTheDocument();
  fireEvent.keyDown(screen.getByDisplayValue('031-123-4567'), { key: 'Enter' });
  expect(screen.getByRole('gridcell', { name: '031-123-4567' })).toBeInTheDocument();
});

it('keeps edited destination values visible while the quiet save refresh is pending', async () => {
  const initialDestination = {
    salesDestinationId: 90, customerId: 10, destinationCode: 'D90', destinationName: '기존 납품처',
    businessNo: null, address: null, contactName: null, mobileNo: null, telephoneNo: null,
    facsimileNo: null, remark: null,
  };
  let releaseDestinationRefresh: () => void = () => undefined;
  const destinationRefresh = new Promise<void>((resolve) => { releaseDestinationRefresh = resolve; });
  vi.mocked(fetchSalesDestinations)
    .mockResolvedValueOnce([initialDestination])
    .mockImplementationOnce(async () => {
      await destinationRefresh;
      return [{ ...initialDestination, destinationName: '수정 납품처' }];
    });
  vi.mocked(saveDestinationBatch).mockResolvedValue(undefined);

  render(<NotificationProvider><SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }}
  /></NotificationProvider>);
  fireEvent.click(await screen.findByRole('gridcell', { name: 'C10' }));
  const destinationCell = await screen.findByRole('gridcell', { name: '기존 납품처' });
  fireEvent.doubleClick(destinationCell);
  fireEvent.change(screen.getByDisplayValue('기존 납품처'), { target: { value: '수정 납품처' } });
  fireEvent.keyDown(screen.getByDisplayValue('수정 납품처'), { key: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));

  await waitFor(() => expect(fetchSalesDestinations).toHaveBeenCalledTimes(2));
  expect(await screen.findByRole('alert')).toHaveTextContent('납품처 정보를 저장했습니다.');
  expect(screen.getByRole('gridcell', { name: '수정 납품처' })).toBeVisible();
  expect(screen.queryByRole('gridcell', { name: '기존 납품처' })).not.toBeInTheDocument();

  releaseDestinationRefresh();
  expect(await screen.findByRole('gridcell', { name: '수정 납품처' })).toBeVisible();
});

it('keeps both grids visible during the quiet refresh after saving', async () => {
  const initialCustomers = [
    { customerId: 10, customerCode: 'C10', customerName: '거래처', hasDestination: false },
  ];
  const initialDestinations = [{
    salesDestinationId: 90, customerId: 10, destinationCode: 'D90', destinationName: '기존 납품처',
    businessNo: null, address: null, contactName: null, mobileNo: null, telephoneNo: null,
    facsimileNo: null, remark: null,
  }];
  let releaseCustomerRefresh: () => void = () => undefined;
  let releaseDestinationRefresh: () => void = () => undefined;
  let releaseSave: () => void = () => undefined;
  const customerRefresh = new Promise<void>((resolve) => { releaseCustomerRefresh = resolve; });
  const destinationRefresh = new Promise<void>((resolve) => { releaseDestinationRefresh = resolve; });
  const saveRequest = new Promise<void>((resolve) => { releaseSave = resolve; });
  vi.mocked(fetchDestinationCustomers)
    .mockResolvedValueOnce(initialCustomers)
    .mockImplementationOnce(async () => {
      await customerRefresh;
      return [{ ...initialCustomers[0], hasDestination: true }];
    });
  vi.mocked(fetchSalesDestinations)
    .mockResolvedValueOnce(initialDestinations)
    .mockImplementationOnce(async () => {
      await destinationRefresh;
      return [
        ...initialDestinations,
        {
          salesDestinationId: 91, customerId: 10, destinationCode: 'D91', destinationName: '새 납품처',
          businessNo: null, address: null, contactName: null, mobileNo: null, telephoneNo: null,
          facsimileNo: null, remark: null,
        },
      ];
    });
  vi.mocked(saveDestinationBatch).mockImplementationOnce(async () => { await saveRequest; });

  render(<SalesDestinationPage
    selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
    currentMenuName="납품처 관리"
    content={{ title: '납품처 관리', description: '', cards: [], items: [] }}
    breadcrumbItems={['영업관리', '기준정보', '납품처 관리']}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }}
  />);
  fireEvent.click(await screen.findByRole('gridcell', { name: 'C10' }));
  expect(await screen.findByRole('gridcell', { name: '기존 납품처' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '납품처 추가' }));
  const dialog = screen.getByRole('dialog', { name: '납품처 등록' });
  fireEvent.change(within(dialog).getByLabelText(/납품처명/), { target: { value: '새 납품처' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: '저장' }));

  await waitFor(() => expect(saveDestinationBatch).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('button', { name: '저장' })).toHaveAttribute('aria-busy', 'true');
  expect(screen.getByRole('grid', { name: '거래처 목록' })).not.toHaveAttribute('aria-busy', 'true');
  expect(screen.getByRole('grid', { name: '납품처 목록' })).not.toHaveAttribute('aria-busy', 'true');

  releaseSave();
  await waitFor(() => {
    expect(fetchDestinationCustomers).toHaveBeenCalledTimes(2);
    expect(fetchSalesDestinations).toHaveBeenCalledTimes(2);
  });
  expect(screen.getByRole('grid', { name: '거래처 목록' })).not.toHaveAttribute('aria-busy', 'true');
  expect(screen.getByRole('grid', { name: '납품처 목록' })).not.toHaveAttribute('aria-busy', 'true');
  expect(screen.getByRole('gridcell', { name: 'C10' })).toBeInTheDocument();
  expect(screen.getByRole('gridcell', { name: '기존 납품처' })).toBeInTheDocument();
  expect(screen.getByRole('gridcell', { name: '새 납품처' })).toBeInTheDocument();

  releaseCustomerRefresh();
  releaseDestinationRefresh();
  await waitFor(() => expect(
    screen.getAllByRole('gridcell').some((cell) => cell.textContent === '새 납품처'),
  ).toBe(true), { timeout: 3000 });
});
