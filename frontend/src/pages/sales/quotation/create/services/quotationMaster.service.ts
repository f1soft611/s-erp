import { fetchCustomers } from '../../../../co/master/customers/services/customerManagement.service';
import { fetchMaterials } from '../../../../co/master/materials/services/materialManagement.service';
import type {
  MasterPickerOption,
  MasterPickerSearch,
} from '../../../../../shared/components/master-picker/masterPicker.types';

export const searchQuotationCustomers: MasterPickerSearch = async (keyword) => {
  const customers = await fetchCustomers({ keyword, useAt: 'Y' });
  return customers.map((customer) => {
    const details = [
      customer.businessNo ? { label: '사업자번호', value: customer.businessNo } : null,
      customer.presidentName ? { label: '대표자명', value: customer.presidentName } : null,
    ].filter((detail): detail is { label: string; value: string } => detail !== null);
    return createMasterOption(
      customer.customerId,
      customer.customerCode,
      customer.customerName,
      '거래처',
      details,
    );
  });
};

export const searchQuotationMaterials: MasterPickerSearch = async (keyword) => {
  const materials = await fetchMaterials({ keyword });
  return materials.map((material) => {
    const details = [
      material.materialSpec ? { label: '품목규격', value: material.materialSpec } : null,
      material.unit ? { label: '단위', value: material.unit } : null,
    ].filter((detail): detail is { label: string; value: string } => detail !== null);
    return createMasterOption(
      material.materialId,
      material.materialCode,
      material.materialName,
      '품목',
      details,
    );
  });
};

function createMasterOption(
  idValue: unknown,
  codeValue: unknown,
  nameValue: unknown,
  masterName: string,
  details: { label: string; value: string }[],
): MasterPickerOption {
  const id = Number(idValue);
  if (
    !Number.isSafeInteger(id) || id < 1
    || typeof codeValue !== 'string' || typeof nameValue !== 'string'
  ) {
    throw new Error(`${masterName} 마스터 응답을 확인할 수 없습니다.`);
  }
  return { id, code: codeValue, name: nameValue, details };
}
