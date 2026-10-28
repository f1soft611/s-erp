import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPut } from '../src/shared/services/apiClient';
import { SalesOrderStatusPage } from '../src/pages/sales/order/status/SalesOrderStatusPage';
import { createSalesOrderStatusColumns } from '../src/pages/sales/order/status/data/salesOrderStatusColumns';
import type { SalesOrderStatusRow } from '../src/pages/sales/order/status/types/salesOrderStatus.types';
import type { SalesOrderItem } from '../src/pages/sales/order/create/types/salesOrder.types';
import type { MenuPermission, ModuleItem } from '../src/pages/dashboard/types/dashboard';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

const apiGetMock = vi.mocked(apiGet);
const apiPutMock = vi.mocked(apiPut);
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

function createOrderItem(overrides: Partial<SalesOrderItem> = {}): SalesOrderItem {
  return {
    salesOrderId: 300,
    orderNo: 'SO-20261027-0001',
    orderDt: '2026-10-27',
    customerId: 10,
    customerCode: 'C-10',
    customerName: '거래처 10',
    quotNo: 'Q-1',
    deliveryDt: '2026-11-01',
    deliveryPlace: '본사 창고',
    deliveryMethod: '택배',
    status: '수주등록',
    totalAmt: 220,
    remark: '긴급',
    createdBy: 'user01',
    createdByName: '홍길동',
    createdByProfileImage: 'data:image/png;base64,cHJvZmlsZQ==',
    createdAt: '2026-10-27 13:38',
    writer: false,
    details: [
      {
        salesOrderDetailId: 450,
        lineNo: 1,
        materialId: 20,
        materialCode: 'M-20',
        materialName: '품목 20',
        orderQty: 2,
        unitPrice: 100,
        supplyAmt: 200,
        vatAmt: 20,
        totalAmt: 220,
        deliveryDt: '2026-11-01',
        shippedQty: 0,
        lineStatus: '대기',
      },
    ],
    ...overrides,
  };
}

let orderItem: SalesOrderItem = createOrderItem();

const salesModule: ModuleItem = {
  id: 'sales',
  name: '영업관리',
  icon: null,
  tree: [
    {
      id: 'order',
      name: '수주관리',
      children: [
        {
          id: 'create',
          name: '수주등록',
          pageKey: 'create',
          path: '/sales/order/create',
          permissions: { read: true, create: true, update: true, delete: true },
        },
        {
          id: 'status',
          name: '수주현황',
          pageKey: 'status',
          path: '/sales/order/status',
          permissions: { read: true, create: false, update: false, delete: false, excel: true },
        },
      ],
    },
  ],
  menus: [],
};

function renderStatusPage(
  permissions: MenuPermission = { read: true, create: false, update: false, delete: false, excel: true },
) {
  return render(
    <SalesOrderStatusPage
      selectedModule={salesModule}
      currentMenuName="수주현황"
      breadcrumbItems={['영업관리', '수주관리', '수주현황']}
      content={{ title: '수주현황', description: '수주 현황을 조회합니다.', cards: [], items: [] }}
      selectedMenuPermissions={permissions}
    />,
  );
}

async function openOrderDetailPanel() {
  fireEvent.click(
    await screen.findByRole('button', { name: 'SO-20261027-0001 상세 보기' }),
  );
  return screen.findByRole('region', { name: '수주 상세' });
}

describe('sales order status page', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    orderItem = createOrderItem();
    apiGetMock.mockReset();
    apiPutMock.mockReset();
    apiGetMock.mockImplementation((path: string) => {
      if (path.includes('/common/system-date')) {
        return Promise.resolve({ today: SYSTEM_TODAY });
      }
      if (path === '/api/v1/sales/orders/300') {
        return Promise.resolve({ item: orderItem });
      }
      return Promise.resolve({ resultList: [statusRow], resultCnt: 1 });
    });
    apiPutMock.mockImplementation(() => Promise.resolve({ item: orderItem }));
  });

  it('uses the dashboard month instead of an unrelated saved search', async () => {
      window.sessionStorage.setItem('s-erp:page:sales-order-status', JSON.stringify({
        version: 1, value: { keyword: '이전 검색', detailValues: { status: '완료' } },
      }));
      window.history.replaceState(null, '', '/sales/order/status?dashboardMonth=2026-02');
      renderStatusPage();
      await waitFor(() => {
        const request = listRequests().at(-1)!;
        expect(request?.get('orderDtFrom')).toBe('2026-02-01');
        expect(request?.get('orderDtTo')).toBe('2026-02-28');
        expect(request?.get('keyword')).toBeNull();
        expect(request?.get('status')).toBeNull();
      });
    });

    it('drills down to due dates without accidentally restricting order dates', async () => {
      window.history.replaceState(null, '', '/sales/order/status?dashboardDueFrom=2026-10-28&dashboardDueTo=2026-11-03&dashboardOrderNo=SO-FIXTURE');
      renderStatusPage();
      await waitFor(() => {
        const request = listRequests().at(-1)!;
        expect(request?.get('deliveryDtFrom')).toBe('2026-10-28');
        expect(request?.get('deliveryDtTo')).toBe('2026-11-03');
        expect(request?.get('orderNo')).toBe('SO-FIXTURE');
        expect(request?.get('orderDtFrom')).toBeNull();
      });
    });
  it('restores the last search conditions after returning to the page', async () => {
    const first = renderStatusPage();
    await screen.findByText('SO-20261027-0001');
    fireEvent.change(screen.getByRole('textbox', { name: '수주현황 빠른 검색' }), {
      target: { value: '볼트' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => {
      expect(listRequests().at(-1)?.get('keyword')).toBe('볼트');
    });
    first.unmount();
    apiGetMock.mockClear();

    renderStatusPage();

    expect(screen.getByRole('textbox', { name: '수주현황 빠른 검색' })).toHaveValue('볼트');
    await waitFor(() => {
      const request = listRequests().at(-1)!;
      expect(request.get('keyword')).toBe('볼트');
      expect(request.get('orderDtFrom')).toBe('2026-09-27');
    });
  });

  it('opens a detail panel with header and detail lines when 수주번호 is clicked', async () => {
    renderStatusPage();

    const panel = await openOrderDetailPanel();

    expect(await within(panel).findByText('홍길동')).toBeInTheDocument();
    expect(within(panel).getByRole('img', { name: '홍길동' })).toHaveAttribute(
      'src',
      'data:image/png;base64,cHJvZmlsZQ==',
    );
    expect(within(panel).getByText('작성자 · 등록 2026-10-27 13:38')).toBeInTheDocument();
    expect(within(panel).getByText('SO-20261027-0001')).toBeInTheDocument();
    expect(within(panel).getByText('거래처 10')).toBeInTheDocument();
    expect(within(panel).getByText('본사 창고')).toBeInTheDocument();
    expect(within(panel).getByText('품목 20')).toBeInTheDocument();
    expect(within(panel).getByText('수주등록')).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole('button', { name: '상세 닫기' }));
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: '수주 상세' })).not.toBeInTheDocument();
    });
  });

  it('groups the order information and makes the order summary and item table easier to scan', async () => {
    renderStatusPage();
    const panel = await openOrderDetailPanel();

    expect(within(panel).getByText('거래처 10')).toBeInTheDocument();
    expect(within(panel).getByText('총 합계')).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { name: '수주 정보' })).toBeInTheDocument();
    expect(within(panel).getByText('Q-1')).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { name: '납품 정보' })).toBeInTheDocument();
    expect(within(panel).getByText('본사 창고')).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { name: '수주 품목' })).toBeInTheDocument();
    expect(within(panel).getByRole('table', { name: '수주 품목 목록' })).toBeInTheDocument();
    expect(within(panel).getByText('품목 20')).toBeInTheDocument();
    expect(within(panel).getByText('M-20')).toBeInTheDocument();
  });

  it('shows an explicit empty state when an order has no detail lines', async () => {
    orderItem = createOrderItem({ details: [], deliveryPlace: '', remark: '' });
    renderStatusPage();
    const panel = await openOrderDetailPanel();

    expect(within(panel).getByText('0건')).toBeInTheDocument();
    expect(within(panel).getByText('등록된 수주 품목이 없습니다.')).toBeInTheDocument();
  });

  it('offers only 자세히보기 for orders written by someone else', async () => {
    renderStatusPage();
    const panel = await openOrderDetailPanel();
    await within(panel).findByText('홍길동');

    fireEvent.click(within(panel).getByRole('button', { name: '수주 더보기' }));

    expect(await screen.findByRole('menuitem', { name: '자세히보기' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '수정' })).not.toBeInTheDocument();
  });

  it('opens the 수주등록 screen read-only from 자세히보기', async () => {
    renderStatusPage();
    const panel = await openOrderDetailPanel();
    await within(panel).findByText('홍길동');
    fireEvent.click(within(panel).getByRole('button', { name: '수주 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '자세히보기' }));

    const dialog = await screen.findByRole('dialog', { name: '수주 상세보기' });
    await waitFor(() => {
      expect(within(dialog).getByLabelText('납품장소')).toHaveValue('본사 창고');
    });
    expect(within(dialog).getByLabelText('납품장소')).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '신규' })).not.toBeInTheDocument();
    expect(
      within(within(dialog).getByTestId('common-dialog-actions'))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['닫기']);
  });

  it('lets the writer edit through the reused 수주등록 screen and refreshes the list', async () => {
    orderItem = createOrderItem({ writer: true });
    renderStatusPage();
    const panel = await openOrderDetailPanel();
    await within(panel).findByText('홍길동');
    fireEvent.click(within(panel).getByRole('button', { name: '수주 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '수정' }));

    const dialog = await screen.findByRole('dialog', { name: '수주 수정' });
    const place = within(dialog).getByLabelText('납품장소');
    await waitFor(() => {
      expect(place).toHaveValue('본사 창고');
    });
    expect(within(dialog).queryByRole('button', { name: '신규' })).not.toBeInTheDocument();
    const region = within(dialog).getByRole('region', { name: '수주 입력 내용' });
    expect(within(region).queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    const footerActions = within(dialog).getByTestId('common-dialog-actions');
    expect(
      within(footerActions).getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['저장', '취소']);
    expect(
      within(within(dialog).getByTestId('common-dialog-footer-start')).getByRole('button', {
        name: '삭제',
      }),
    ).toBeInTheDocument();
    expect(within(footerActions).getByRole('button', { name: '저장' })).toBeDisabled();
    const listCallsBeforeSave = listRequests().length;
    let resolveRefetch: (value: unknown) => void = () => {};
    const defaultGet = apiGetMock.getMockImplementation()!;
    apiGetMock.mockImplementation((path: string) =>
      path.startsWith('/api/v1/sales/order-status')
        ? new Promise((resolve) => {
            resolveRefetch = resolve;
          })
        : defaultGet(path),
    );

    fireEvent.change(place, { target: { value: '제2 창고' } });
    fireEvent.click(within(footerActions).getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        '/api/v1/sales/orders/300',
        expect.objectContaining({ deliveryPlace: '제2 창고' }),
      );
    });
    await waitFor(() => {
      expect(listRequests().length).toBeGreaterThan(listCallsBeforeSave);
    });
    // 수정 저장 후 목록 재조회는 조용한 로딩: 조회 버튼/그리드가 로딩 상태로 바뀌지 않는다.
    expect(screen.getByRole('button', { name: '조회', hidden: true })).toBeEnabled();
    resolveRefetch({ resultList: [statusRow], resultCnt: 1 });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '수주 수정' })).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('region', { name: '수주 상세' })).toBeInTheDocument();
  }, 15000);

  it('closes the edit dialog with the footer 취소 button without saving', async () => {
    orderItem = createOrderItem({ writer: true });
    renderStatusPage();
    const panel = await openOrderDetailPanel();
    await within(panel).findByText('홍길동');
    fireEvent.click(within(panel).getByRole('button', { name: '수주 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '수정' }));

    const dialog = await screen.findByRole('dialog', { name: '수주 수정' });
    await waitFor(() => {
      expect(within(dialog).getByLabelText('납품장소')).toHaveValue('본사 창고');
    });
    fireEvent.click(
      within(within(dialog).getByTestId('common-dialog-actions')).getByRole('button', {
        name: '취소',
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '수주 수정' })).not.toBeInTheDocument();
    });
    expect(apiPutMock).not.toHaveBeenCalled();
  });

  it('loads the last month of orders and shows header and detail columns in one grid', async () => {
    renderStatusPage();

    const grid = await screen.findByRole('grid', { name: '수주현황 목록' });
    expect(await within(grid).findByText('SO-20261027-0001')).toBeInTheDocument();
    expect(within(grid).getByText('수주번호')).toBeInTheDocument();
    expect(within(grid).getByText('거래처 10')).toBeInTheDocument();
    expect(createSalesOrderStatusColumns().map((column) => column.headerName)).toEqual([
      'No', '수주번호', '수주일자', '거래처코드', '거래처명', '견적번호', '수주상태', '납품장소', '배송방법',
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

  it('highlights the whole selected status row instead of an individual cell', async () => {
    renderStatusPage();
    const cell = await screen.findByRole('gridcell', { name: 'SO-20261027-0001' });
    fireEvent.click(cell);
    expect(cell.closest('[role="row"]')).toHaveAttribute('aria-selected', 'true');
    expect(cell.closest('[role="row"]')?.querySelector('[data-row-selection-overlay]')).not.toBeNull();
    expect(getComputedStyle(cell).outline).toBe('none');
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

  it('keeps applied detail filters when a keyword search follows unsubmitted edits', async () => {
    renderStatusPage();
    await screen.findByText('SO-20261027-0001');

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const detail = screen.getByRole('dialog', { name: '상세 검색' });
    expect(screen.getByLabelText('수주일자 시작일')).toBeRequired();
    expect(screen.getByLabelText('수주일자 종료일')).toBeRequired();
    fireEvent.mouseDown(within(detail).getByRole('combobox', { name: '수주상태' }));
    fireEvent.click(await screen.findByRole('option', { name: '수주등록' }));
    fireEvent.click(within(detail).getByRole('button', { name: '조회' }));

    await waitFor(() => {
      expect(listRequests().at(-1)?.get('status')).toBe('수주등록');
    });

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const reopenedDetail = screen.getByRole('dialog', { name: '상세 검색' });
    fireEvent.mouseDown(
      within(reopenedDetail).getByRole('combobox', { name: '수주상태' }),
    );
    fireEvent.click(await screen.findByRole('option', { name: '취소' }));
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 닫기' }));

    fireEvent.change(screen.getByRole('textbox', { name: '수주현황 빠른 검색' }), {
      target: { value: '볼트' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() => {
      const request = listRequests().at(-1)!;
      expect(request.get('keyword')).toBe('볼트');
      expect(request.get('status')).toBe('수주등록');
    });

    fireEvent.change(screen.getByRole('textbox', { name: '수주현황 빠른 검색' }), {
      target: { value: '너트' },
    });
    fireEvent.keyDown(
      screen.getByRole('textbox', { name: '수주현황 빠른 검색' }),
      { key: 'Enter', code: 'Enter' },
    );

    await waitFor(() => {
      const request = listRequests().at(-1)!;
      expect(request.get('keyword')).toBe('너트');
      expect(request.get('status')).toBe('수주등록');
    });
  }, 15000);

  it('hides the 조회 action without read permission', async () => {
    renderStatusPage({ read: false, create: false, update: false, delete: false, excel: false });

    await screen.findByRole('grid', { name: '수주현황 목록' });
    expect(screen.queryByRole('button', { name: '조회' })).not.toBeInTheDocument();
  });
});
