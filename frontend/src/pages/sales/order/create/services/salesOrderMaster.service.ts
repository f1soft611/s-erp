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

export const searchOrderCustomers: MasterPickerSearch = async (keyword) => {
  const customers = await fetchCustomers({ keyword, useAt: 'Y' });
  return customers.map((customer) =>
    createMasterOption(
      customer.customerId,
      customer.customerCode,
      customer.customerName,
      '거래처',
    ),
  );
};

export const searchOrderMaterials: MasterPickerSearch = async (keyword) => {
  const materials = await fetchMaterials({ keyword });
  return materials.map((material) =>
    createMasterOption(
      material.materialId,
      material.materialCode,
      material.materialName,
      '품목',
    ),
  );
};
