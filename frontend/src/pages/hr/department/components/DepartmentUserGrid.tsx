import { useMemo } from 'react';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import type { DepartmentUserRow } from '../types/department.types';

function createColumns(): F1GridColumn<DepartmentUserRow>[] {
  return [
    { field: 'userId', headerName: 'No', type: 'rownumber', width: 48, align: 'center', search: { hidden: true } },
    {
      field: 'managerYn',
      headerName: '부서장',
      width: 72,
      align: 'center',
      editable: false,
      getValue: (row) => (row.managerYn === 'Y' ? '부서장' : ''),
      search: { hidden: true },
    },
    { field: 'employeeNo', headerName: '사번', width: 90, align: 'center', editable: false, search: { hidden: true } },
    { field: 'userNm', headerName: '성명', width: 110, editable: false, search: { hidden: true } },
    { field: 'positionNm', headerName: '직위', width: 80, align: 'center', editable: false, search: { hidden: true } },
    { field: 'levelNm', headerName: '직급', width: 90, editable: false, search: { hidden: true } },
    {
      field: 'employmentStatus',
      headerName: '재직상태',
      width: 80,
      align: 'center',
      editable: false,
      getValue: (row) => (row.employmentStatus === 'RETIRED' ? '퇴직' : row.employmentStatus === 'LEAVE' ? '휴직' : '재직'),
      search: { hidden: true },
    },
    { field: 'loginCode', headerName: '아이디', width: 120, editable: false, search: { hidden: true } },
    { field: 'mobileNo', headerName: '휴대전화', width: 120, editable: false, search: { hidden: true } },
    { field: 'emailAddr', headerName: '이메일', flex: 1, width: 180, editable: false, search: { hidden: true } },
  ];
}

type Props = {
  rows: DepartmentUserRow[];
  loading: boolean;
};

/** 선택한 부서의 소속 사원(조회 전용). 재직/퇴직/전체는 상위 화면의 재직 구분으로 조회한다. */
export function DepartmentUserGrid({ rows, loading }: Props) {
  const columns = useMemo(() => createColumns(), []);
  return (
    <F1Grid
      ariaLabel="소속 사원 목록"
      storageKey="hr-department-users-v2"
      rows={rows}
      columns={columns}
      rowKey="userId"
      height="100%"
      showCheckbox={false}
      selectionMode="row"
      multiSelect={false}
      loading={loading}
      rowFormPlugin={{ enabled: false }}
      allowAddRowInContextMenu={false}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
    />
  );
}
