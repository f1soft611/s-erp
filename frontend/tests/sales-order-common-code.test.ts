import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../src/pages/co/master/common-code/services/commonCodeManagement.service';
import {
  fetchSalesOrderCommonCodes,
  getSalesOrderCodeLabel,
} from '../src/pages/sales/order/services/salesOrderCommonCode.service';

vi.mock('../src/pages/co/master/common-code/services/commonCodeManagement.service', () => ({
  fetchCommonCodeGroups: vi.fn(),
  fetchCommonCodeItems: vi.fn(),
}));

const fetchGroupsMock = vi.mocked(fetchCommonCodeGroups);
const fetchItemsMock = vi.mocked(fetchCommonCodeItems);

describe('sales order common codes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses active sorted item names for order and progress states and delivery methods', async () => {
    fetchGroupsMock.mockResolvedValue([
      { id: '10', groupCode: 'SALES_ORDER_STATUS', groupNm: '상태', moduleCd: null, parentGroupId: null, groupDc: '', sortOrder: 1, useAt: 'Y' },
      { id: '20', groupCode: 'SALES_DELIVERY_METHOD', groupNm: '배송방법', moduleCd: null, parentGroupId: null, groupDc: '', sortOrder: 2, useAt: 'Y' },
      { id: '30', groupCode: 'SALES_ORDER_STATUS', groupNm: '사용 안 함', moduleCd: null, parentGroupId: null, groupDc: '', sortOrder: 3, useAt: 'N' },
    ]);
    fetchItemsMock.mockImplementation(async (groupId) => {
      if (groupId === '10') {
        return [
          { id: '1', groupId, itemCode: '생산중', itemNm: '생산 진행', parentItemId: null, parentItemNm: '', sortOrder: 20, useAt: 'Y', itemDc: '' },
          { id: '2', groupId, itemCode: '대기', itemNm: '대기 중', parentItemId: null, parentItemNm: '', sortOrder: 10, useAt: 'Y', itemDc: '' },
          { id: '3', groupId, itemCode: '취소', itemNm: '취소됨', parentItemId: null, parentItemNm: '', sortOrder: 30, useAt: 'N', itemDc: '' },
        ];
      }
      if (groupId === '20') {
        return [
          { id: '4', groupId, itemCode: '택배', itemNm: '택배 배송', parentItemId: null, parentItemNm: '', sortOrder: 10, useAt: 'Y', itemDc: '' },
        ];
      }
      return [];
    });

    const codes = await fetchSalesOrderCommonCodes();

    expect(fetchItemsMock).toHaveBeenCalledTimes(2);
    expect(codes.orderStatusOptions).toEqual([
      { value: '생산중', label: '생산 진행' },
    ]);
    expect(codes.progressStatusOptions).toEqual([
      { value: '대기', label: '대기 중' },
      { value: '생산중', label: '생산 진행' },
    ]);
    expect(codes.deliveryMethodOptions).toEqual([
      { value: '택배', label: '택배 배송' },
    ]);
    expect(getSalesOrderCodeLabel(codes.progressStatusOptions, '대기')).toBe('대기 중');
    expect(getSalesOrderCodeLabel(codes.progressStatusOptions, '이전상태')).toBe('이전상태');
  });

  it('propagates common-code service errors instead of returning empty fallback options', async () => {
    fetchGroupsMock.mockRejectedValue(new Error('offline'));

    await expect(fetchSalesOrderCommonCodes()).rejects.toThrow('offline');
    expect(fetchItemsMock).not.toHaveBeenCalled();
  });

  it('returns empty options when code groups have not been seeded', async () => {
    fetchGroupsMock.mockResolvedValue([]);

    await expect(fetchSalesOrderCommonCodes()).resolves.toEqual({
      orderStatusOptions: [],
      progressStatusOptions: [],
      deliveryMethodOptions: [],
    });
    expect(fetchItemsMock).not.toHaveBeenCalled();
  });
});
