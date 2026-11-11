import { fetchMaterials } from '../../../master/materials/services/materialManagement.service';
import type {
  MasterPickerOption,
  MasterPickerSearch,
} from '../../../../../shared/components/master-picker/masterPicker.types';
import { SAMPLE_WORK_STANDARDS } from '../data/workStandard.data';
import type {
  WorkStandardItem,
  WorkStandardListRow,
  WorkStandardListSegment,
  WorkStandardSearchFilters,
} from '../types/workStandard.types';

function cloneItem(item: WorkStandardItem): WorkStandardItem {
  return { ...item, formula: item.formula.map((row) => ({ ...row })) };
}

export function filterWorkStandards(
  items: WorkStandardItem[],
  filters: WorkStandardSearchFilters,
): WorkStandardItem[] {
  const keyword = filters.keyword.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.itemAccount && item.itemAccount !== filters.itemAccount) return false;
    if (filters.productCategory && item.productCategory !== filters.productCategory) return false;
    if (filters.versionStatus && item.versionStatus !== filters.versionStatus) return false;
    if (
      filters.processName &&
      !item.formula.some((row) => row.processName === filters.processName)
    ) {
      return false;
    }
    if (!keyword) return true;
    return [item.materialCode, item.materialName, ...item.formula.map((row) => row.materialName)]
      .some((value) => value.toLowerCase().includes(keyword));
  });
}

export function filterBySegment<T extends Pick<WorkStandardListRow, 'itemAccount' | 'versionStatus'>>(
  rows: T[],
  segment: WorkStandardListSegment,
): T[] {
  if (segment === '전체') return rows;
  if (segment === '샘플') return rows.filter((row) => row.versionStatus === '샘플');
  return rows.filter((row) => row.itemAccount === segment);
}

export function toWorkStandardListRow(item: WorkStandardItem): WorkStandardListRow {
  return {
    workStandardId: item.workStandardId,
    itemAccount: item.itemAccount || '제품',
    materialCode: item.materialCode,
    materialName: item.materialName,
    version: item.version,
    versionStatus: item.versionStatus || '샘플',
  };
}

/** 백엔드 API 연결 전까지 예시 데이터를 조회 결과로 반환한다. */
export async function searchWorkStandards(
  filters: WorkStandardSearchFilters,
): Promise<WorkStandardItem[]> {
  return filterWorkStandards(SAMPLE_WORK_STANDARDS, filters).map(cloneItem);
}

export async function getWorkStandard(workStandardId: number): Promise<WorkStandardItem> {
  const item = SAMPLE_WORK_STANDARDS.find((candidate) => candidate.workStandardId === workStandardId);
  if (!item) throw new Error('작업표준서를 찾을 수 없습니다.');
  return cloneItem(item);
}

export const searchWorkStandardMaterials: MasterPickerSearch = async (keyword) => {
  const materials = await fetchMaterials({ keyword });
  return materials.map((material): MasterPickerOption => {
    const details = (
      [
        ['품목규격', material.materialSpec],
        ['단위', material.unit],
        ['품목계정', material.materialTypeCode],
      ] as [string, string | null | undefined][]
    )
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .map(([label, value]) => ({ label, value: String(value).trim() }));
    return {
      id: Number(material.materialId),
      code: String(material.materialCode ?? ''),
      name: String(material.materialName ?? ''),
      ...(details.length ? { details } : {}),
    };
  });
};
