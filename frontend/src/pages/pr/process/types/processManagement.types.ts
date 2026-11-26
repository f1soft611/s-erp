/**
 * 공정관리 행.
 * - `g:<id>` 작업장(최상위)
 * - `m:<id>` 작업장에 연결된 공정(`processId`가 공정 마스터)
 * - `p:<id>` 공정 마스터(공정 설정 모달)
 */
export type ProcessRow = {
  id: string;
  parentId: string | null;
  code: string;
  processId: number | null;
  name: string;
  description: string;
  image: string;
  inactive: boolean;
  productionOutsource: boolean;
  purchaseOutsource: boolean;
  inspection: boolean;
  packing: boolean;
  stockManagement: boolean;
  previousStockOut: boolean;
  finalProcess: boolean;
  plannedEquipment: boolean;
  actualEquipmentRequired: boolean;
};

/** 공정 마스터 속성 체크박스 컬럼(필드명, 헤더). */
export const PROCESS_FLAG_COLUMNS = [
  ['productionOutsource', '생산외주'], ['purchaseOutsource', '구매외주'], ['inspection', '공정검사'],
  ['packing', '포장공정'], ['stockManagement', '공정재고'], ['previousStockOut', '이전공정 재고출고'],
  ['finalProcess', '최종공정'], ['plannedEquipment', '계획설비'], ['actualEquipmentRequired', '실적설비 필수'],
] as const;
