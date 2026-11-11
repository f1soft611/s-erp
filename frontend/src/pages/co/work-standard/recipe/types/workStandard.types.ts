import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';

export type WorkStandardItemAccount = '제품' | '반제품' | '원료';
export type WorkStandardVersionStatus = '양산' | '샘플' | '폐기';
export type WorkStandardListSegment = '전체' | '제품' | '반제품' | '샘플';
export type FormulaQuantityBasis = 'batch' | 'plate';

export type WorkStandardFormulaRow = {
  rowId: string;
  processName: string;
  materialId: number | null;
  materialCode: string;
  materialName: string;
  spec: string;
  unit: string;
  inputQty: number;
  ratio: number;
  perPlateG: number;
  lotInput: boolean;
  substitute: string;
  remark: string;
};

export type WorkStandardHeader = {
  materialId: number | null;
  materialCode: string;
  materialName: string;
  itemAccount: WorkStandardItemAccount | '';
  productCategory: string;
  version: number;
  revisionCount: number;
  versionStatus: WorkStandardVersionStatus | '';
  versionStatusSince: string;
  applyStartDt: string;
  applyEndDt: string;
  productionUnit: string;
  baseQty: number;
  piecesPerPlate: number;
  shelfLifeBase: string;
  shelfLifeDays: number;
  establishedDt: string;
  revisedDt: string;
  productionManager: string;
  researcher: string;
};

export type WorkStandardItem = WorkStandardHeader & {
  workStandardId: number;
  formula: WorkStandardFormulaRow[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

export type WorkStandardListRow = {
  workStandardId: number;
  itemAccount: WorkStandardItemAccount;
  materialCode: string;
  materialName: string;
  version: number;
  versionStatus: WorkStandardVersionStatus;
};

export type WorkStandardSearchValues = Record<string, PageSearchFieldValue>;

export type WorkStandardSearchFilters = {
  keyword: string;
  itemAccount?: string;
  productCategory?: string;
  versionStatus?: string;
  processName?: string;
};
