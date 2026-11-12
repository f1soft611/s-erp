import type { ProcessRow } from '../types/processManagement.types';

export function createProcessRow(group: boolean): ProcessRow {
  return {
    id: `${group ? 'g' : 'p'}:new-${crypto.randomUUID()}`, parentId: null, code: '', name: '',
    description: '', image: '', inactive: false, productionOutsource: false, purchaseOutsource: false,
    inspection: false, packing: false, stockManagement: false, previousStockOut: false,
    finalProcess: false, plannedEquipment: false, actualEquipmentRequired: false,
  };
}
