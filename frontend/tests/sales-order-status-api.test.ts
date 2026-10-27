import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/shared/services/apiClient';
import {
  searchSalesOrderStatus,
  toSalesOrderStatusFilters,
} from '../src/pages/sales/order/status/services/salesOrderStatus.service';
import type { SalesOrderStatusRow } from '../src/pages/sales/order/status/types/salesOrderStatus.types';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(),
}));

const apiGetMock = vi.mocked(apiGet);

describe('sales order status service', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it('maps quick and detail search values to API filters and drops blanks', () => {
    expect(
      toSalesOrderStatusFilters(' SO-2026 ', {
        orderNo: ' SO-1 ',
        orderDt: { from: '2026-09-27', to: '2026-10-27' },
        customerName: '거래처',
        quotNo: '',
        status: '수주등록',
        materialName: '볼트',
        deliveryDt: { from: '', to: '2026-11-30' },
        lineStatus: null,
      }),
    ).toEqual({
      keyword: 'SO-2026',
      orderNo: 'SO-1',
      orderDtFrom: '2026-09-27',
      orderDtTo: '2026-10-27',
      customerKeyword: '거래처',
      status: '수주등록',
      materialKeyword: '볼트',
      deliveryDtTo: '2026-11-30',
    });
  });

  it('requests the order status list with query parameters and returns rows', async () => {
    const row = { salesOrderDetailId: 450, orderNo: 'SO-1' } as SalesOrderStatusRow;
    apiGetMock.mockResolvedValue({ resultList: [row], resultCnt: 1 });

    const rows = await searchSalesOrderStatus({
      keyword: 'SO 1',
      orderDtFrom: '2026-10-01',
    });

    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v1/sales/order-status?keyword=SO+1&orderDtFrom=2026-10-01',
    );
    expect(rows).toEqual([row]);
  });

  it('returns an empty list when the response has no result list', async () => {
    apiGetMock.mockResolvedValue({});

    await expect(searchSalesOrderStatus({})).resolves.toEqual([]);
    expect(apiGetMock).toHaveBeenCalledWith('/api/v1/sales/order-status');
  });
});
