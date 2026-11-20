import type { EmployeePickerOption } from '../../../../../shared/components/employee-picker';
import type { WarehouseRow } from '../types/warehouseManagement.types';

/**
 * 사원 선택 도움창의 결과를 창고 행의 담당자·담당부서 값으로 바꾼다.
 * 담당자를 고르면 담당부서도 같이 설정하고(부서가 없는 사원이면 비운다), null(선택 해제)이면 둘 다 비운다.
 */
export function toManagerPatch(option: EmployeePickerOption | null): Partial<WarehouseRow> {
  if (!option) {
    return { managerUserId: null, managerUserName: '', departmentId: null, departmentName: '' };
  }
  return {
    managerUserId: option.userId,
    managerUserName: option.userNm,
    departmentId: option.departmentId,
    departmentName: option.departmentNm,
  };
}
