import { apiGet } from '../../services/apiClient';
import type { DepartmentPickerData } from './departmentPicker.types';

/**
 * 사용 중인 부서 전체와 회사명을 조회한다(`GET /api/v1/hr/departments`, 사용안함 부서 제외).
 * 읽기 전용이라 로그인한 사용자라면 누구나 호출할 수 있다.
 */
export async function fetchPickerDepartments(): Promise<DepartmentPickerData> {
  const result = await apiGet<{ resultList?: unknown; companyName?: unknown }>(
    '/api/v1/hr/departments?includeInactive=false',
  );
  if (!Array.isArray(result.resultList)) {
    throw new Error('부서 목록 응답을 확인할 수 없습니다.');
  }
  return {
    companyName: result.companyName == null ? '' : String(result.companyName),
    departments: result.resultList.map((row: Record<string, unknown>) => {
      const departmentId = Number(row.departmentId);
      if (!Number.isSafeInteger(departmentId) || departmentId <= 0) {
        throw new Error('부서 ID 응답을 확인할 수 없습니다.');
      }
      return {
        departmentId,
        parentDepartmentId: row.parentDepartmentId == null ? null : Number(row.parentDepartmentId),
        departmentNm: String(row.departmentNm ?? ''),
      };
    }),
  };
}
