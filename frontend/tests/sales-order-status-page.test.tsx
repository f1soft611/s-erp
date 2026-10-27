import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/shared/services/apiClient';
import { SalesOrderStatusPage } from '../src/pages/sales/order/status/SalesOrderStatusPage';
import { createSalesOrderStatusColumns } from '../src/pages/sales/order/status/data/salesOrderStatusColumns';
import type { SalesOrderStatusRow } from '../src/pages/sales/order/status/types/salesOrderStatus.types';
import type { MenuPermission } from '../src/pages/dashboard/types/dashboard';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(),
}));

const apiGetMock = vi.mocked(apiGet);
const SYSTEM_TODAY = '2026-10-27';

const statusRow: SalesOrderStatusRow = {
  salesOrderId: 300,
  salesOrderDetailId: 450,
  orderNo: 'SO-20261027-0001',
  orderDt: '2026-10-27',
  customerCode: 'C-10',
  customerName: '거래처 10',
  quotNo: 'Q-1',
  status: '수주등록',
  headerDeliveryDt: '2026-11-01',
  deliveryPlace: '본사 창고',
  deliveryMethod: '택배',
  remark: '긴급',
  lineNo: 1,
  materialCode: 'M-20',
  materialName: '품목 20',
  unit: 'EA',
  orderQty: 2,
  unitPrice: 100,
  supplyAmt: 200,
  vatAmt: 20,
  totalAmt: 220,
  deliveryDt: '2026-11-01',
  shippedQty: 0,
  lineStatus: '대기',
};

function listRequests(): URLSearchParams[] {
  return apiGetMock.mock.calls
    .map(([path]) => String(path))
    .filter((path) => path.startsWith('/api/v1/sales/order-status'))
    .map((path) => new URLSearchParams(path.split('?')[1] ?? ''));
}

function renderStatusPage(
  permissions: MenuPermission = { read: true, create: false, update: false, delete: false, excel: true },
) {
  return render(
    <SalesOrderStatusPage
      selectedModule={{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }}
      currentMenuName="수주현황"
      breadcrumbItems={['영업관리', '수주관리', '수주현황']}
      content={{ title: '수주현황', description: '수주 현황을 조회합니다.', cards: [], items: [] }}
      selectedMenuPermissions={permissions}
    />,
  );
}

describe('sales order status page', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    apiGetMock.mockReset();
    apiGetMock.mockImplementation((path: string) => {
      if (path.includes('/common/system-date')) {
        return Promise.resolve({ today: SYSTEM_TODAY });
      }
      return Promise.resolve({ resultList: [statusRow], resultCnt: 1 });
    });
  });

  it('loads the last month of orders and shows header and detail columns in one grid', async () => {
    renderStatusPage();

    const grid = await screen.findByRole('grid', { name: '수주현황 목록' });
    expect(await within(grid).findByText('SO-20261027-0001')).toBeInTheDocument();
    expect(within(grid).getByText('수주번호')).toBeInTheDocument();
    expect(within(grid).getByText('거래처 10')).toBeInTheDocument();
    expect(createSalesOrderStatusColumns().map((column) => column.headerName)).toEqual([
      '수주번호', '수주일자', '거래처코드', '거래처명', '견적번호', '수주상태', '납품장소', '배송방법',
      '행', '품목코드', '품목명', '단위', '주문수량', '단가', '공급가', '부가세', '합계',
      '납기일자', '출하수량', '행상태', '비고',
    ]);

    const request = listRequests().at(-1)!;
    expect(request.get('orderDtFrom')).toBe('2026-09-27');
    expect(request.get('orderDtTo')).toBe(SYSTEM_TODAY);
  });

  it('searches with the quick keyword through the 조회 action', async () => {
    renderStatusPage();
    await screen.findByText('SO-20261027-0001');

    fireEvent.change(screen.getByRole('textbox', { name: '수주현황 빠른 검색' }), {
      target: { value: '볼트' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() => {
      expect(listRequests().at(-1)?.get('keyword')).toBe('볼트');
    });
  });

  it('sends detail search conditions generated from grid columns', async () => {
    renderStatusPage();
    await screen.findByText('SO-20261027-0001');

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const detail = screen.getByRole('dialog', { name: '상세 검색' });
    fireEvent.change(within(detail).getByRole('textbox', { name: '거래처' }), {
      target: { value: '거래처 10' },
    });
    fireEvent.change(within(detail).getByRole('textbox', { name: '품목' }), {
      target: { value: 'M-20' },
    });
    fireEvent.click(within(detail).getByRole('button', { name: '조회' }));

    await waitFor(() => {
      const request = listRequests().at(-1)!;
      expect(request.get('customerKeyword')).toBe('거래처 10');
      expect(request.get('materialKeyword')).toBe('M-20');
      expect(request.get('orderDtFrom')).toBe('2026-09-27');
    });
  });

  it('hides the 조회 action without read permission', async () => {
    renderStatusPage({ read: false, create: false, update: false, delete: false, excel: false });

    await screen.findByRole('grid', { name: '수주현황 목록' });
    expect(screen.queryByRole('button', { name: '조회' })).not.toBeInTheDocument();
  });
});
