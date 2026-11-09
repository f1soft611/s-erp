import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchCompanyInfo,
  updateCompanyInfo,
} from '../src/pages/co/master/company/services/companyInfo.service';
import type { CompanyInfo } from '../src/pages/co/master/company/types/companyInfo.types';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

const company: CompanyInfo = {
  companyName: 'Example Co.',
  businessNo: '123-45-67890',
  businessType: '제조업',
  businessCategory: '전자부품',
  presidentName: '홍길동',
  postCode: '01234',
  address: '서울시 중구 세종대로 1',
  telephoneNo: '02-1234-5678',
  facsimileNo: '02-1234-5679',
  stampImage: '',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('company info service', () => {
  it('loads the complete company information from the authenticated company endpoint', async () => {
    apiMocks.apiGet.mockResolvedValue({ item: company });

    await expect(fetchCompanyInfo()).resolves.toEqual(company);
    expect(apiMocks.apiGet).toHaveBeenCalledExactlyOnceWith(
      '/api/v1/co/master/company',
    );
  });

  it('saves the complete company information with PUT and rejects malformed responses', async () => {
    apiMocks.apiPut.mockResolvedValueOnce({ item: company });
    await expect(updateCompanyInfo(company)).resolves.toEqual(company);
    expect(apiMocks.apiPut).toHaveBeenCalledExactlyOnceWith(
      '/api/v1/co/master/company',
      company,
    );

    apiMocks.apiPut.mockResolvedValueOnce({});
    await expect(updateCompanyInfo(company)).rejects.toThrow(
      '회사정보 저장 응답을 확인할 수 없습니다.',
    );
  });
});
