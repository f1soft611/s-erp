import type { ProcessRow } from '../types/processManagement.types';

const emptyRow = (id: string, parentId: string | null): ProcessRow => ({
  id, parentId, code: '', processId: null, name: '', description: '', image: '', inactive: false,
  productionOutsource: false, purchaseOutsource: false, inspection: false, packing: false,
  stockManagement: false, previousStockOut: false, finalProcess: false, plannedEquipment: false,
  actualEquipmentRequired: false,
});

/** 새 작업장 행. */
export function createWorkplaceRow(): ProcessRow {
  return emptyRow(`g:new-${crypto.randomUUID()}`, null);
}

/** 공정 마스터 신규 행(공정 설정 모달). */
export function createMasterRow(): ProcessRow {
  return emptyRow(`p:new-${crypto.randomUUID()}`, null);
}

/** 선택한 공정 마스터를 작업장에 연결하는 행. 표시 내용은 마스터에서 복사한다. */
export function createLinkRow(groupId: string, master: ProcessRow): ProcessRow {
  return {
    ...master, id: `m:new-${crypto.randomUUID()}`, parentId: groupId,
    processId: master.processId, code: String(master.processId ?? ''),
  };
}
