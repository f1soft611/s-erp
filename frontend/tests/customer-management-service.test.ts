import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCustomer,
  fetchCustomers,
  normalizeCustomerRow,
  saveCustomerBatch,
  updateCustomer,
} from '../src/pages/co/master/customers/services/customerManagement.service';
import type {
  CustomerFilters,
  CustomerPayload,
} from '../src/pages/co/master/customers/types/customerManagement.types';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

const customer = {
  customerId: 12,
  tenantId: 9,
  customerCode: '000012',
  customerName: 'Acme',
  custNameAbbr: 'AC',
  presidentName: 'Lee',
  businessNo: '123-45-67890',
  juridNo: '110111-1234567',
  businessStatus1: '도소매',
  businessItem1: '식품',
  postCode: '01234',
  address: '서울',
  telephoneNo: '02-1234-5678',
  facsimileNo: '02-1234-5679',
  custMemo: '메모',
  useAt: 'N',
};

const payload: CustomerPayload = {
  customerCode: '',
  customerName: 'Acme',
  custNameAbbr: 'AC',
  presidentName: 'Lee',
  businessNo: '123-45-67890',
  juridNo: '110111-1234567',
  businessStatus1: '도소매',
  businessItem1: '식품',
  postCode: '01234',
  address: '서울',
  telephoneNo: '02-1234-5678',
  facsimileNo: '02-1234-5679',
  custMemo: '메모',
  useAt: 'Y',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('customer management service', () => {
  it('sends one common-code-style change set to save-batch', async () => {
    const changes = {
      customers: {
        insertedRows: [{ ...payload, customerId: 'new-customer' }],
        updatedRows: [{ ...payload, customerCode: '000012', customerId: '12' }],
        deletedRows: [],
      },
    };
    apiMocks.apiPost.mockResolvedValue({ item: { customers: [customer] } });

    await expect(saveCustomerBatch(changes)).resolves.toEqual([
      expect.objectContaining({ customerId: 12 }),
    ]);
    expect(apiMocks.apiPost).toHaveBeenCalledExactlyOnceWith(
      '/api/v1/co/master/customers/save-batch',
      changes,
    );
  });

  it('normalizes customer API fields into a stable grid row', () => {
    expect(
      normalizeCustomerRow({
        customerId: '12',
        customerName: 'Acme',
        useAt: 'Y',
      }),
    ).toEqual(
      expect.objectContaining({
        customerId: 12,
        customerCode: '',
        customerName: 'Acme',
        useAt: 'Y',
      }),
    );
  });

  it('rejects customer rows with invalid identifiers or use status', () => {
    expect(() =>
      normalizeCustomerRow({ customerId: 'not-a-number', useAt: 'Y' }),
    ).toThrow('거래처 ID 응답을 확인할 수 없습니다.');
    expect(() =>
      normalizeCustomerRow({ customerId: '12', useAt: 'X' }),
    ).toThrow('거래처 사용 여부 응답을 확인할 수 없습니다.');
  });

  it('sends all supplied filters and normalizes the returned customer list', async () => {
    const filters: CustomerFilters = {
      keyword: ' Acme ',
      presidentName: 'Lee',
      businessNo: '123',
      juridNo: '456',
      businessStatus1: '도소매',
      businessItem1: '식품',
      useAt: 'N',
    };
    apiMocks.apiGet.mockResolvedValue({ resultList: [customer] });

    await expect(fetchCustomers(filters)).resolves.toEqual([
      expect.objectContaining({ customerId: 12, customerCode: '000012' }),
    ]);

    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/customers?keyword=Acme&presidentName=Lee&businessNo=123&juridNo=456&businessStatus1=%EB%8F%84%EC%86%8C%EB%A7%A4&businessItem1=%EC%8B%9D%ED%92%88&useAt=N',
    );
  });

  it('creates and updates customers through the customer API', async () => {
    apiMocks.apiPost.mockResolvedValue({ item: customer });
    apiMocks.apiPut.mockResolvedValue({ item: customer });

    await expect(createCustomer(payload)).resolves.toEqual(
      expect.objectContaining({ customerId: 12 }),
    );
    await expect(updateCustomer(12, payload)).resolves.toEqual(
      expect.objectContaining({ customerId: 12 }),
    );

    expect(apiMocks.apiPost).toHaveBeenCalledWith(
      '/api/v1/co/master/customers',
      payload,
    );
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/co/master/customers/12',
      payload,
    );
  });

  it('rejects successful API envelopes that omit required customer data', async () => {
    apiMocks.apiGet.mockResolvedValue({});
    apiMocks.apiPost.mockResolvedValue({});

    await expect(fetchCustomers()).rejects.toThrow(
      '거래처 목록 응답을 확인할 수 없습니다.',
    );
    await expect(createCustomer(payload)).rejects.toThrow(
      '거래처 저장 응답을 확인할 수 없습니다.',
    );
    await expect(saveCustomerBatch({
      customers: { insertedRows: [], updatedRows: [], deletedRows: [] },
    })).rejects.toThrow('거래처 일괄 저장 응답을 확인할 수 없습니다.');
  });

  it('preserves batch API errors and rejects invalid saved rows', async () => {
    const batch = {
      customers: { insertedRows: [], updatedRows: [], deletedRows: [] },
    };
    apiMocks.apiPost.mockRejectedValueOnce(new Error('duplicate code'));
    await expect(saveCustomerBatch(batch)).rejects.toThrow('duplicate code');
    apiMocks.apiPost.mockResolvedValueOnce({
      item: { customers: [{ ...customer, customerId: -1 }] },
    });
    await expect(saveCustomerBatch(batch)).rejects.toThrow(
      '거래처 ID 응답을 확인할 수 없습니다.',
    );
  });
});
