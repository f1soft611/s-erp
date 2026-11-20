import { useEffect, useMemo, useRef, useState } from 'react';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, CircularProgress, InputAdornment, TextField, Typography } from '@mui/material';
import { CommonDialog } from '../CommonDialog';
import { F1Tree, type F1GridColumn } from '../f1-grid';
import { fetchPickerDepartments } from './departmentPicker.service';
import type {
  DepartmentPickerData,
  DepartmentPickerDialogProps,
  DepartmentPickerOption,
  DepartmentPickerRow,
} from './departmentPicker.types';
import { buildDepartmentPath, buildPickerRows, PICKER_COMPANY_ROW_ID } from './departmentPicker.utils';

const COLUMNS: F1GridColumn<DepartmentPickerRow>[] = [
  {
    field: 'departmentNm',
    headerName: '부서명',
    flex: 1,
    width: 240,
    editable: false,
    getCellStyle: ({ row }) => (row.isCompany ? { fontWeight: 700 } : undefined),
    search: { hidden: true },
  },
];

type BodyProps = Pick<DepartmentPickerDialogProps, 'selectedId' | 'onChange'> & { onPicked: () => void };

function DepartmentPickerBody({ selectedId, onChange, onPicked }: BodyProps) {
  const [data, setData] = useState<DepartmentPickerData | null>(null);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [companyClicked, setCompanyClicked] = useState(false);
  const pickedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void fetchPickerDepartments()
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error && cause.message ? cause.message : '부서 목록을 조회하지 못했습니다.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () => (data ? buildPickerRows(data.companyName, data.departments, keyword) : []),
    [data, keyword],
  );
  const hasMatch = rows.length > 1;
  const currentPath = data && selectedId != null ? buildDepartmentPath(data.departments, selectedId) : '';

  const pick = (rowId: number) => {
    // 선택은 한 번만 처리한다. 부모가 선택에 반응해 다시 그려져도 같은 이벤트가 반복 호출되지 않게 한다.
    if (!data || pickedRef.current) return;
    if (rowId === PICKER_COMPANY_ROW_ID) {
      setCompanyClicked(true);
      return;
    }
    const department = data.departments.find((row) => row.departmentId === rowId);
    if (!department) return;
    const option: DepartmentPickerOption = {
      departmentId: department.departmentId,
      departmentNm: department.departmentNm,
      departmentPath: buildDepartmentPath(data.departments, department.departmentId),
    };
    pickedRef.current = true;
    onChange(option);
    onPicked();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <TextField
        size="small"
        margin="none"
        fullWidth
        label="부서 검색"
        placeholder="부서명으로 검색"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        slotProps={{
          input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
        }}
      />
      {currentPath ? (
        <Typography variant="caption" color="text.secondary">현재 선택: {currentPath}</Typography>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!data && !error ? (
        <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
          <CircularProgress size={18} /> <span>부서를 불러오는 중...</span>
        </Box>
      ) : null}
      {data ? (
        <>
          {companyClicked ? <Alert severity="info">회사는 선택할 수 없습니다. 부서를 선택해 주세요.</Alert> : null}
          {!hasMatch ? (
            <Alert severity="info">{keyword.trim() ? '검색 결과가 없습니다.' : '등록된 부서가 없습니다.'}</Alert>
          ) : null}
          <Box sx={{ height: 340, minWidth: 0 }}>
            <F1Tree
              key={keyword.trim()}
              ariaLabel="부서 선택 트리"
              storageKey="department-picker-tree-v1"
              rows={rows}
              columns={COLUMNS}
              rowKey="departmentId"
              parentKey="parentDepartmentId"
              treeColumn="departmentNm"
              defaultExpanded="all"
              height="100%"
              showCheckbox={false}
              selectionMode="row"
              multiSelect={false}
              disableContextMenu
              rowFormPlugin={{ enabled: false }}
              treeNodeIcon={({ row, expanded, hasChildren }) => {
                if (row.isCompany) {
                  return <BusinessOutlined fontSize="small" aria-hidden="true" sx={{ mr: 0.75, color: 'primary.main' }} />;
                }
                const Icon = !hasChildren ? DescriptionOutlined : expanded ? FolderOpenOutlined : FolderOutlined;
                return (
                  <Icon
                    fontSize="small"
                    aria-hidden="true"
                    sx={{ mr: 0.75, color: hasChildren ? 'warning.main' : 'text.secondary' }}
                  />
                );
              }}
              onSelectionChange={(ids) => {
                // 트리가 다시 그려질 때 오는 빈 선택은 무시한다.
                const id = ids[0];
                if (id !== undefined) pick(Number(id));
              }}
            />
          </Box>
        </>
      ) : null}
    </Box>
  );
}

/**
 * 부서 선택 도움창. 폴더형 부서 트리에서 부서를 클릭하면 `{ departmentId, departmentNm, departmentPath }`를 돌려주고 닫힌다.
 * 회사(최상단)는 선택할 수 없고 사용안함 부서는 보이지 않는다. 여는 즉시 `GET /api/v1/hr/departments`를 호출한다.
 */
export function DepartmentPickerDialog({ open, onClose, onChange, selectedId, title = '부서 선택' }: DepartmentPickerDialogProps) {
  return (
    <CommonDialog
      open={open}
      onClose={onClose}
      title={title}
      description="부서를 클릭해 선택하세요. 회사는 선택할 수 없습니다."
      size="xs"
      fullScreenOnMobile
    >
      <DepartmentPickerBody selectedId={selectedId} onChange={onChange} onPicked={onClose} />
    </CommonDialog>
  );
}
