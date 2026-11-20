import EditOutlined from '@mui/icons-material/EditOutlined';
import { Avatar, Button, IconButton } from '@mui/material';
import { useMemo } from 'react';
import { F1Grid, F1GridHighlightText, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { describeEmploymentStatus } from '../data/employeeForm';
import type { EmployeeRow } from '../types/employee.types';

const RETIRED_STYLE = { opacity: 0.5 } as const;

function createColumns(onOpen: (row: EmployeeRow) => void): F1GridColumn<EmployeeRow>[] {
  const retiredStyle: F1GridColumn<EmployeeRow>['getCellStyle'] = ({ row }) =>
    (row.employmentStatus === 'RETIRED' ? RETIRED_STYLE : undefined);
  const text = (
    field: keyof EmployeeRow, headerName: string, width: number, extra: Partial<F1GridColumn<EmployeeRow>> = {},
  ): F1GridColumn<EmployeeRow> => ({
    field, headerName, width, editable: false, getCellStyle: retiredStyle, search: { hidden: true }, ...extra,
  });
  return [
    { field: 'userId', headerName: 'No', type: 'rownumber', width: 48, align: 'center', search: { hidden: true } },
    {
      field: 'photoImage', headerName: '사진', width: 64, align: 'center', editable: false,
      getCellStyle: retiredStyle, search: { hidden: true },
      renderCell: ({ row }) => (
        <Avatar src={row.photoImage || undefined} alt="" sx={{ width: 36, height: 36, fontSize: 14 }}>
          {row.userNm.slice(0, 1)}
        </Avatar>
      ),
    },
    text('employeeNo', '사번', 90, { align: 'center', highlightSearch: true }),
    text('userNm', '이름', 170, {
      highlightSearch: true,
      renderCell: ({ row, highlightKeyword }) => (
        <Button
          size="small"
          variant="text"
          onClick={() => onOpen(row)}
          sx={{ minWidth: 0, p: 0, fontWeight: 700, justifyContent: 'flex-start' }}
        >
          <F1GridHighlightText text={row.userNm} keyword={highlightKeyword} />
        </Button>
      ),
    }),
    text('englishNm', '영문이름', 120, { highlightSearch: true }),
    text('departmentNm', '부서', 120, { highlightSearch: true }),
    text('positionNm', '직위', 80, { align: 'center', highlightSearch: true }),
    text('levelNm', '직급', 80, { align: 'center' }),
    text('genderNm', '성별', 60, { align: 'center' }),
    text('joinDt', '입사일', 100, { align: 'center' }),
    text('retireDt', '퇴사일', 100, { align: 'center' }),
    text('employmentStatus', '재직상태', 80, {
      align: 'center', getValue: (row) => describeEmploymentStatus(row.employmentStatus),
    }),
    text('employmentTypeNm', '근무형태', 80, { align: 'center' }),
    text('mobileNo', '핸드폰', 120, { align: 'center', highlightSearch: true }),
    text('homePhoneNo', '자택전화', 120, { align: 'center', highlightSearch: true }),
    text('emailAddr', '이메일', 200, { highlightSearch: true }),
    text('postalCode', '우편번호', 80, { align: 'center' }),
    text('address', '주소', 320, {
      highlightSearch: true,
      getValue: (row) => [row.address, row.addressDetail].filter(Boolean).join(' '),
    }),
    text('realUserAt', '실사용자', 80, { align: 'center', getValue: (row) => (row.realUserAt === 'Y' ? '예' : '아니오') }),
    text('loginCode', '로그인 아이디', 130, { highlightSearch: true }),
    // 품목관리 등 다른 목록과 같은 맨 오른쪽 "상세"(연필) 열. 누르면 등록·수정 팝업이 열린다.
    {
      field: 'loginUseAt', headerName: '상세', width: 64, align: 'center', pinned: 'right', editable: false,
      search: { hidden: true },
      renderCell: ({ row }) => (
        <IconButton size="small" aria-label={`${row.userNm} 사원 정보 열기`} onClick={() => onOpen(row)}>
          <EditOutlined fontSize="small" />
        </IconButton>
      ),
    },
  ];
}

type Props = {
  rows: EmployeeRow[];
  loading: boolean;
  highlightKeyword?: string;
  canExportExcel: boolean;
  onOpen: (row: EmployeeRow) => void;
};

/** 사원 목록(읽기 전용). 이름(파란 링크) 또는 맨 오른쪽 "상세"(연필)를 누르면 등록·수정 팝업이 열린다. 퇴직 행은 흐리게 보인다. */
export function EmployeeGrid({ rows, loading, highlightKeyword, canExportExcel, onOpen }: Props) {
  const columns = useMemo(() => createColumns(onOpen), [onOpen]);
  return (
    <F1Grid
      ariaLabel="사원 목록"
      storageKey="hr-employee-list-v1"
      rows={rows}
      columns={columns}
      rowKey="userId"
      height="100%"
      rowHeight={48}
      showCheckbox={false}
      selectionMode="row"
      multiSelect={false}
      highlightKeyword={highlightKeyword}
      loading={loading}
      canExportExcel={canExportExcel}
      excelFileName="사원목록"
      rowFormPlugin={{ enabled: false }}
      allowAddRowInContextMenu={false}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
    />
  );
}
