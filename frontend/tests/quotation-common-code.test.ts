import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/shared/services/apiClient';
import { fetchQuotationCommonCodes } from '../src/pages/sales/quotation/create/services/quotationCommonCode.service';

vi.mock('../src/shared/services/apiClient', () => ({ apiGet: vi.fn() }));
const get = vi.mocked(apiGet);

describe('quotation common codes', () => {
  beforeEach(() => { get.mockReset(); });

  it('loads only active groups and sorts active items using their code as the value', async () => {
    get.mockImplementation(async (path: string) => ({
      resultList: path.endsWith('/groups') ? [
        { commonCodeGroupId: 1, groupCode: 'INCOTERMS', useAt: 'Y' },
        { commonCodeGroupId: 2, groupCode: 'PAYMENT_TERM', useAt: 'N' },
        { commonCodeGroupId: 3, groupCode: 'CURRENCY', useAt: 'Y' },
        { commonCodeGroupId: 4, groupCode: 'ITEM_UNIT', useAt: 'Y' },
      ] : [
        { itemCode: 'B', itemNm: '표시 B', sortOrder: 20, useAt: 'Y' },
        { itemCode: 'N', itemNm: '미사용', sortOrder: 0, useAt: 'N' },
        { itemCode: 'A', itemNm: '표시 A', sortOrder: 10, useAt: 'Y' },
      ],
    }));
    const result = await fetchQuotationCommonCodes();
    expect(result.INCOTERMS).toEqual([
      { value: 'A', label: '표시 A' }, { value: 'B', label: '표시 B' },
    ]);
    expect(result.PAYMENT_TERM).toEqual([]);
    expect(result.CURRENCY).toEqual(result.INCOTERMS);
    expect(result.ITEM_UNIT).toEqual(result.INCOTERMS);
    expect(get).not.toHaveBeenCalledWith('/api/v1/co/master/common-code/groups/2/items');
  });

  it('does not replace missing groups with hardcoded options and propagates lookup errors', async () => {
    get.mockResolvedValue({ resultList: [] });
    await expect(fetchQuotationCommonCodes()).resolves.toEqual({
      INCOTERMS: [], PAYMENT_TERM: [], CURRENCY: [], ITEM_UNIT: [],
    });
    get.mockRejectedValue(new Error('lookup failed'));
    await expect(fetchQuotationCommonCodes()).rejects.toThrow('lookup failed');
  });
});
