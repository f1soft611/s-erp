const materialTextFieldDefinitions = [
  {
    field: 'materialCode',
    label: '품목코드',
    max: 20,
    group: '기본정보',
    visible: true,
  },
  {
    field: 'materialName',
    label: '품목명',
    max: 200,
    group: '기본정보',
    visible: true,
  },
  {
    field: 'materialEngName',
    label: '품목영문명',
    max: 200,
    group: '기본정보',
  },
  {
    field: 'materialModelName',
    label: '품목모델명',
    max: 200,
    group: '기본정보',
    visible: true,
  },
  {
    field: 'materialSpec',
    label: '품목규격',
    max: 100,
    group: '규격·분류',
    visible: true,
    search: true,
  },
  { field: 'materialSpec2', label: '품목규격2', max: 100, group: '규격·분류' },
  { field: 'unit', label: '단위', max: 6, group: '규격·분류', visible: true },
  {
    field: 'materialTypeCode',
    label: '품목계정코드',
    max: 14,
    group: '규격·분류',
    visible: true,
    search: true,
  },
  {
    field: 'matCataType',
    label: '품목분류',
    max: 10,
    group: '규격·분류',
    visible: true,
    search: true,
  },
  { field: 'itemType', label: '품목계정', max: 10, group: '규격·분류' },
  { field: 'materialQuality', label: '품목재질', max: 6, group: '규격·분류' },
  {
    field: 'materialKind',
    label: '품목유형',
    max: 50,
    group: '규격·분류',
    visible: true,
    search: true,
    codeGroup: 'MATERIAL_TYPE',
  },
  {
    field: 'customerCode',
    label: '제조사 코드',
    max: 10,
    group: '재고·위치',
    search: true,
  },
  {
    field: 'warehouseCode',
    label: '창고코드',
    max: 10,
    group: '재고·위치',
    search: true,
  },
  { field: 'location', label: '위치정보', max: 1000, group: '재고·위치' },
  {
    field: 'storeMethod',
    label: '보관방법',
    max: 50,
    group: '재고·위치',
    visible: true,
    search: true,
    codeGroup: 'STORE_METHOD',
  },
  {
    field: 'accountingCode',
    label: '회계코드',
    max: 7,
    group: '기타·소비기한',
  },
  { field: 'drawing', label: '도면번호', max: 10, group: '기타·소비기한' },
  { field: 'etc', label: '비고', max: 100, group: '기타·소비기한' },
  { field: 'partNo', label: 'Part No', max: 30, group: '기타·소비기한' },
  { field: 'manufactory', label: '제조', max: 100, group: '기타·소비기한' },
  {
    field: 'searchItemName',
    label: '통합검색명칭',
    max: 200,
    group: '기본정보',
  },
  {
    field: 'itemBarcode',
    label: '품목바코드',
    max: 20,
    group: '기타·소비기한',
    search: true,
  },
  { field: 'materialNo', label: '품목번호', max: 20, group: '기타·소비기한' },
  {
    field: 'kfdaReportNo',
    label: '품목보고번호',
    max: 20,
    group: '기타·소비기한',
  },
] as const;

type MaterialTextFieldAlignment = 'left' | 'center' | 'right';
export const materialTextFields: readonly (
  (typeof materialTextFieldDefinitions)[number] & {
    align?: MaterialTextFieldAlignment;
  }
)[] = materialTextFieldDefinitions;

export const expiryStatuses = ['NONE', 'DAY', 'MONTH', 'YEAR'] as const;
export type ExpiryStatus = (typeof expiryStatuses)[number];
export type MaterialTextField = (typeof materialTextFields)[number]['field'];
export type MaterialPayload = Record<MaterialTextField, string> & {
  materialWeight: number | null;
  safeInvoice: number | null;
  expiryedStatus: ExpiryStatus;
  expiryedCount: number | null;
};
export type MaterialRow = MaterialPayload & {
  materialId: string | number;
  tenantId?: number;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
};
export const materialSearchFields = [
  'materialSpec',
  'materialTypeCode',
  'matCataType',
  'customerCode',
  'warehouseCode',
  'itemBarcode',
  'materialKind',
  'storeMethod',
  'expiryedStatus',
] as const;
export type MaterialFilters = Partial<
  Record<(typeof materialSearchFields)[number] | 'keyword', string>
>;
export type MaterialOption = {
  groupCode: string;
  itemCode: string;
  itemName: string;
};
export type MaterialBatchPayload = {
  materials: {
    insertedRows: (MaterialPayload & { materialId: string })[];
    updatedRows: (MaterialPayload & { materialId: string })[];
    deletedRows: (MaterialPayload & { materialId: string })[];
  };
};

export function emptyMaterialPayload(): MaterialPayload {
  return {
    materialCode: '',
    materialName: '',
    materialEngName: '',
    materialModelName: '',
    materialSpec: '',
    materialSpec2: '',
    unit: '',
    materialTypeCode: '',
    customerCode: '',
    accountingCode: '',
    warehouseCode: '',
    drawing: '',
    etc: '',
    partNo: '',
    manufactory: '',
    matCataType: '',
    location: '',
    itemType: '',
    searchItemName: '',
    materialQuality: '',
    itemBarcode: '',
    materialNo: '',
    materialKind: '',
    storeMethod: '',
    kfdaReportNo: '',
    materialWeight: null,
    safeInvoice: null,
    expiryedStatus: 'NONE',
    expiryedCount: null,
  };
}
