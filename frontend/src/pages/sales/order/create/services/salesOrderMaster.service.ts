import { apiGet } from '../../../../../shared/services/apiClient';
import { fetchCustomers } from '../../../../co/master/customers/services/customerManagement.service';
import { fetchMaterials } from '../../../../co/master/materials/services/materialManagement.service';
import type {
  MasterPickerOption,
  MasterPickerSearch,
} from '../../../../../shared/components/master-picker/masterPicker.types';

type SalesQuotationOptionResponse = {
  quotationId: unknown;
  quotationNo: unknown;
  quotationDt: unknown;
  customerId: unknown;
  customerCode: unknown;
  customerName: unknown;
};

type SalesQuotationOptionsResponse = {
  resultList?: unknown;
};

export type SalesOrderQuotationOption = MasterPickerOption & {
  customerId: number;
};

function createMasterOption(
  idValue: unknown,
  codeValue: unknown,
  nameValue: unknown,
  masterName: string,
): MasterPickerOption {
  const id = Number(idValue);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`${masterName} ID 응답을 확인할 수 없습니다.`);
  }
  if (typeof codeValue !== 'string' || typeof nameValue !== 'string') {
    throw new Error(`${masterName} 코드/명 응답을 확인할 수 없습니다.`);
  }
  return { id, code: codeValue, name: nameValue };
}

function addDetails(option: MasterPickerOption, values: [string, string | null | undefined][]): MasterPickerOption {
  const details = values.filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([label, value]) => ({ label, value: value!.trim() }));
  return details.length ? { ...option, details } : option;
}

export const searchOrderCustomers: MasterPickerSearch = async (keyword) => {
  const customers = await fetchCustomers({ keyword, useAt: 'Y' });
  return customers.map((customer) =>
    addDetails(createMasterOption(
      customer.customerId,
      customer.customerCode,
      customer.customerName,
      '거래처',
    ), [['사업자번호', customer.businessNo], ['대표자명', customer.presidentName]]),
  );
};

export const searchOrderMaterials: MasterPickerSearch = async (keyword) => {
  const materials = await fetchMaterials({ keyword });
  return materials.map((material) =>
    addDetails(createMasterOption(
      material.materialId,
      material.materialCode,
      material.materialName,
      '품목',
    ), [['품목규격', material.materialSpec], ['품목규격2', material.materialSpec2],
      ['단위', material.unit], ['품목모델명', material.materialModelName]]),
  );
};

export async function searchOrderQuotations(
  customerId: number | null,
  keyword: string,
): Promise<SalesOrderQuotationOption[]> {
  const params = new URLSearchParams();
  if (customerId != null) params.set('customerId', String(customerId));
  if (keyword.trim()) params.set('keyword', keyword.trim());
  const query = params.toString();
  const response = await apiGet<SalesQuotationOptionsResponse>(
    `/api/v1/sales/quotations/options${query ? `?${query}` : ''}`,
  );
  if (!Array.isArray(response.resultList)) {
    throw new Error('견적 검색 응답을 확인할 수 없습니다.');
  }

  return response.resultList.map((item) => {
    if (!isSalesQuotationOptionResponse(item)) {
      throw new Error('견적 선택 항목 응답을 확인할 수 없습니다.');
    }
    const option = createMasterOption(
      item.quotationId,
      item.quotationNo,
      item.customerName,
      '견적',
    );
    const parsedCustomerId = Number(item.customerId);
    if (!Number.isSafeInteger(parsedCustomerId) || parsedCustomerId < 1) {
      throw new Error('견적 거래처 응답을 확인할 수 없습니다.');
    }
    const details = [
      typeof item.quotationDt === 'string' && item.quotationDt.trim()
        ? { label: '견적작성일', value: item.quotationDt.trim() }
        : null,
      typeof item.customerCode === 'string' && item.customerCode.trim()
        ? { label: '거래처코드', value: item.customerCode.trim() }
        : null,
    ].filter((detail): detail is { label: string; value: string } => detail !== null);
    return { ...option, customerId: parsedCustomerId, details };
  });
}

function isSalesQuotationOptionResponse(
  value: unknown,
): value is SalesQuotationOptionResponse {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    item.quotationId != null &&
    typeof item.quotationNo === 'string' &&
    typeof item.customerName === 'string'
  );
}
