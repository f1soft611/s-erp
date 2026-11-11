import type { F1GridOption } from '../../../../../shared/components/f1-grid';
import type { PageSearchField } from '../../../../../shared/components/page-search/searchFields';
import type {
  WorkStandardFormulaRow,
  WorkStandardHeader,
  WorkStandardItem,
} from '../types/workStandard.types';

const toOptions = (values: string[]): F1GridOption[] =>
  values.map((value) => ({ value, label: value }));

export const ITEM_ACCOUNT_OPTIONS = toOptions(['제품', '반제품', '원료']);
export const PRODUCT_CATEGORY_OPTIONS = toOptions(['생초콜릿', '초콜릿', '쿠키']);
export const VERSION_STATUS_OPTIONS = toOptions(['양산', '샘플', '폐기']);
export const PROCESS_OPTIONS = toOptions(['용해', '혼합가열', '혼합믹서', '성형']);
export const PRODUCTION_UNIT_OPTIONS = toOptions(['판', '개', 'kg']);
export const SHELF_LIFE_BASE_OPTIONS = toOptions(['반제품 생산완료일', '제품 생산완료일']);

export const WORK_STANDARD_SEARCH_FIELDS: PageSearchField[] = [
  { field: 'itemAccount', label: '품목계정', type: 'select', searchSpan: 1, options: ITEM_ACCOUNT_OPTIONS },
  { field: 'productCategory', label: '제품분류', type: 'select', searchSpan: 1, options: PRODUCT_CATEGORY_OPTIONS },
  { field: 'versionStatus', label: '버전 상태', type: 'select', searchSpan: 1, options: VERSION_STATUS_OPTIONS },
  { field: 'processName', label: '공정', type: 'select', searchSpan: 1, options: PROCESS_OPTIONS },
];

export function createEmptyWorkStandardHeader(): WorkStandardHeader {
  return {
    materialId: null,
    materialCode: '',
    materialName: '',
    itemAccount: '',
    productCategory: '',
    version: 1,
    revisionCount: 0,
    versionStatus: '샘플',
    versionStatusSince: '',
    applyStartDt: '',
    applyEndDt: '9999-12-31',
    productionUnit: '판',
    baseQty: 0,
    piecesPerPlate: 0,
    shelfLifeBase: '',
    shelfLifeDays: 0,
    establishedDt: '',
    revisedDt: '',
    productionManager: '',
    researcher: '',
  };
}

type FormulaSeed = [
  processName: string,
  materialCode: string,
  materialName: string,
  spec: string,
  inputQty: number,
  lotInput: boolean,
  substitute?: string,
  remark?: string,
];

const DARK_FORMULA: FormulaSeed[] = [
  ['용해', '000112', '다크 커버처 초콜릿 70%', '5kg', 18, true, '000113 다크 커버처 72%'],
  ['혼합가열', '000131', '생크림', '1L', 12, true],
  ['혼합가열', '000135', '물엿', '25kg', 2.4, true],
  ['혼합가열', '000140', '무염버터', '450g', 1.8, true, '000141 가염버터'],
  ['혼합믹서', '000152', '바닐라 엑스트랙', '500ml', 0.06, false],
  ['성형', '000118', '코코아파우더 (코팅용)', '1kg', 1.2, true, '', '컷팅 후 코팅'],
];

const MILK_FORMULA: FormulaSeed[] = [
  ['용해', '000114', '밀크 커버처 초콜릿 38%', '5kg', 16, true],
  ['혼합가열', '000131', '생크림', '1L', 13, true],
  ['혼합가열', '000135', '물엿', '25kg', 2, true],
  ['성형', '000118', '코코아파우더 (코팅용)', '1kg', 1, true],
];

function toFormulaRows(workStandardId: number, seeds: FormulaSeed[]): WorkStandardFormulaRow[] {
  return seeds.map(
    ([processName, materialCode, materialName, spec, inputQty, lotInput, substitute = '', remark = ''], index) => ({
      rowId: `formula-${workStandardId}-${index + 1}`,
      processName,
      materialId: null,
      materialCode,
      materialName,
      spec,
      unit: 'kg',
      inputQty,
      ratio: 0,
      perPlateG: 0,
      lotInput,
      substitute,
      remark,
    }),
  );
}

type ItemSeed = [
  id: number,
  code: string,
  name: string,
  version: number,
  status: '양산' | '샘플',
  formula: FormulaSeed[],
];

const ITEM_SEEDS: ItemSeed[] = [
  [1, '100245', '(반)카카올라 다크 생초콜릿 [판]', 3, '양산', DARK_FORMULA],
  [2, '100246', '(반)카카올라 밀크 생초콜릿 [판]', 2, '양산', MILK_FORMULA],
  [3, '100247', '(반)카카올라 녹차 생초콜릿 [판]', 2, '양산', MILK_FORMULA],
  [4, '100251', '(반)카멜 화이트 생초콜릿 [판]', 1, '양산', MILK_FORMULA],
  [5, '100252', '(반/아)오멜티 제주바다 생초콜릿 [판]', 1, '양산', MILK_FORMULA],
  [6, '100253', '(반/아)오멜티 제주땅콩 생초콜릿 [판]', 1, '양산', MILK_FORMULA],
  [7, '100254', '(반/오)노바텍 코코릿 생초콜릿 [판]', 2, '샘플', DARK_FORMULA],
  [8, '100261', '(반)카카올라 제로슈가 다크 생초콜릿 [판]', 1, '샘플', DARK_FORMULA],
  [9, '100262', '(반)카카올라 인절미 생초콜릿 [판]', 1, '샘플', MILK_FORMULA],
];

/** 백엔드 미구현 기간 동안 화면 레이아웃 확인에 사용하는 예시 데이터 */
export const SAMPLE_WORK_STANDARDS: WorkStandardItem[] = ITEM_SEEDS.map(
  ([workStandardId, materialCode, materialName, version, versionStatus, formula]) => ({
    ...createEmptyWorkStandardHeader(),
    workStandardId,
    materialCode,
    materialName,
    itemAccount: '반제품',
    productCategory: '생초콜릿',
    version,
    revisionCount: version - 1,
    versionStatus,
    versionStatusSince: '2026-10-28',
    applyStartDt: '2026-11-01',
    applyEndDt: '9999-12-31',
    productionUnit: '판',
    baseQty: 40,
    piecesPerPlate: 11.25,
    shelfLifeBase: '반제품 생산완료일',
    shelfLifeDays: 30,
    establishedDt: '2025-03-10',
    revisedDt: '2026-10-28',
    productionManager: '생산관리팀',
    researcher: '개발팀',
    formula: toFormulaRows(workStandardId, formula),
    createdBy: '개발팀',
    createdAt: '2025-03-10 10:12',
    updatedBy: '생산관리팀',
    updatedAt: '2026-10-28 16:40',
  }),
);
