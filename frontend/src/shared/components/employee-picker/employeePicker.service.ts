import { apiGet } from '../../services/apiClient';
import type { EmployeePickerFilters, EmployeePickerRow } from './employeePicker.types';

function text(value: unknown): string {
  return value == null ? '' : String(value);
}

export function normalizePickerEmployee(source: Record<string, unknown>): EmployeePickerRow {
  const userId = Number(source.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error('사원 ID 응답을 확인할 수 없습니다.');
  }
  const departmentId = source.departmentId == null ? null : Number(source.departmentId);
  return {
    userId,
    employeeNo: text(source.employeeNo),
    userNm: text(source.userNm),
    departmentId: departmentId != null && Number.isSafeInteger(departmentId) ? departmentId : null,
    departmentNm: text(source.departmentNm),
    positionCode: text(source.positionCode),
    positionNm: text(source.positionNm),
    photoImage: text(source.photoImage),
  };
}

/**
 * 사원 선택 도움창용 사원을 조회한다(`GET /api/v1/hr/employee-picker`).
 * 퇴직자는 제외하고 휴직자는 포함하며, 관리자가 아니어도 호출할 수 있다.
 * departmentId가 있으면 그 부서에 직접 소속된 사원만, 없으면 회사 전체다.
 */
export async function fetchPickerEmployees(
  filters: EmployeePickerFilters,
  signal?: AbortSignal,
): Promise<EmployeePickerRow[]> {
  const query = new URLSearchParams();
  if (filters.departmentId != null) query.set('departmentId', String(filters.departmentId));
  if (filters.keyword.trim()) query.set('keyword', filters.keyword.trim());
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const result = await apiGet<{ resultList?: unknown }>(`/api/v1/hr/employee-picker${suffix}`, signal);
  if (!Array.isArray(result.resultList)) {
    throw new Error('사원 목록 응답을 확인할 수 없습니다.');
  }
  return result.resultList.map((row: Record<string, unknown>) => normalizePickerEmployee(row));
}
