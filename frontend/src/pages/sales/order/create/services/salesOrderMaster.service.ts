import { fetchCustomers } from '../../../../co/master/customers/services/customerManagement.service';
import { fetchMaterials } from '../../../../co/master/materials/services/materialManagement.service';
import type {
  MasterPickerOption,
  MasterPickerSearch,
} from '../../../../../shared/components/master-picker/masterPicker.types';

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
