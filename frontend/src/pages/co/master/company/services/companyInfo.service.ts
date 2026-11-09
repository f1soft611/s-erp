import { apiGet, apiPut } from '../../../../../shared/services/apiClient';
import type { CompanyInfo } from '../types/companyInfo.types';

type ApiRow = Record<string, unknown>;

function isApiRow(value: unknown): value is ApiRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string {
  return value == null ? '' : String(value);
}

function normalizeCompanyInfo(source: ApiRow): CompanyInfo {
  return {
    companyName: toText(source.companyName),
    businessNo: toText(source.businessNo),
    businessType: toText(source.businessType),
    businessCategory: toText(source.businessCategory),
    presidentName: toText(source.presidentName),
    postCode: toText(source.postCode),
    address: toText(source.address),
    telephoneNo: toText(source.telephoneNo),
    facsimileNo: toText(source.facsimileNo),
    stampImage: toText(source.stampImage),
  };
}

export async function fetchCompanyInfo(): Promise<CompanyInfo> {
  const result = await apiGet<{ item?: unknown }>('/api/v1/co/master/company');
  if (!isApiRow(result.item)) {
    throw new Error('회사정보 조회 응답을 확인할 수 없습니다.');
  }
  return normalizeCompanyInfo(result.item);
}

export async function updateCompanyInfo(payload: Omit<CompanyInfo, 'stampImage'> & { stampImage?: string }): Promise<CompanyInfo> {
  const result = await apiPut<{ item?: unknown }>(
    '/api/v1/co/master/company',
    payload,
  );
  if (!isApiRow(result.item)) {
    throw new Error('회사정보 저장 응답을 확인할 수 없습니다.');
  }
  return normalizeCompanyInfo(result.item);
}
