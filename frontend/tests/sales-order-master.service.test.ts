import { beforeEach, describe, expect, it, vi } from 'vitest';

const customerService = vi.hoisted(() => ({
  fetchCustomers: vi.fn(),
}));
const materialService = vi.hoisted(() => ({
  fetchMaterials: vi.fn(),
}));

vi.mock('../src/pages/co/master/customers/services/customerManagement.service', () => customerService);
vi.mock('../src/pages/co/master/materials/services/materialManagement.service', () => materialService);

import { searchOrderCustomers, searchOrderMaterials } from '../src/pages/sales/order/create/services/salesOrderMaster.service';

describe('sales order master search adapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps existing customer results into typed picker options', async () => {
    customerService.fetchCustomers.mockResolvedValue([
      {
        customerId: 12,
        customerCode: 'C-012',
        customerName: '고객사',
      },
    ]);

    await expect(searchOrderCustomers('고객')).resolves.toEqual([
      { id: 12, code: 'C-012', name: '고객사' },
    ]);
    expect(customerService.fetchCustomers).toHaveBeenCalledWith({
      keyword: '고객',
      useAt: 'Y',
    });
  });

  it('keeps material search errors explicit', async () => {
    const error = new Error('품목 API 오류');
    materialService.fetchMaterials.mockRejectedValue(error);

    await expect(searchOrderMaterials('품목')).rejects.toBe(error);
  });

  it('preserves useful item and customer information for picker results', async () => {
    materialService.fetchMaterials.mockResolvedValue([{
      materialId: 7, materialCode: 'M7', materialName: '품목',
      materialSpec: '규격 A', materialSpec2: '규격 B', unit: 'EA', materialModelName: '모델 X',
    }]);
    customerService.fetchCustomers.mockResolvedValue([{
      customerId: 8, customerCode: 'C8', customerName: '거래처',
      businessNo: '123-45-67890', presidentName: '대표',
    }]);
    expect(await searchOrderMaterials('')).toEqual([expect.objectContaining({
      details: expect.arrayContaining([
        { label: '품목규격', value: '규격 A' }, { label: '품목규격2', value: '규격 B' },
        { label: '단위', value: 'EA' }, { label: '품목모델명', value: '모델 X' },
      ]),
    })]);
    expect(await searchOrderCustomers('')).toEqual([expect.objectContaining({
      details: expect.arrayContaining([
        { label: '사업자번호', value: '123-45-67890' }, { label: '대표자명', value: '대표' },
      ]),
    })]);
  });

  it('rejects malformed master IDs rather than returning picker options', async () => {
    customerService.fetchCustomers.mockResolvedValue([
      { customerId: 0, customerCode: 'C-000', customerName: '잘못된 거래처' },
    ]);

    await expect(searchOrderCustomers('잘못된')).rejects.toThrow(
      '거래처 ID 응답을 확인할 수 없습니다.',
    );
  });
});
