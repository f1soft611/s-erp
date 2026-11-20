import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type MutableRefObject } from 'react';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Avatar, Box, Button, Checkbox, CircularProgress, InputAdornment, TextField, Typography } from '@mui/material';
import { CommonDialog } from '../CommonDialog';
import { F1Grid, F1Tree, type F1GridColumn } from '../f1-grid';
import { fetchPickerDepartments } from '../department-picker/departmentPicker.service';
import type { DepartmentPickerData, DepartmentPickerRow } from '../department-picker/departmentPicker.types';
import { buildPickerRows, PICKER_COMPANY_ROW_ID } from '../department-picker/departmentPicker.utils';
import { fetchPickerEmployees } from './employeePicker.service';
import type { EmployeePickerDialogProps, EmployeePickerOption, EmployeePickerRow } from './employeePicker.types';

const TREE_COLUMNS: F1GridColumn<DepartmentPickerRow>[] = [
  {
    field: 'departmentNm',
    headerName: '부서명',
    flex: 1,
    width: 220,
    editable: false,
    getCellStyle: ({ row }) => (row.isCompany ? { fontWeight: 700 } : undefined),
    search: { hidden: true },
  },
];

const GRID_COLUMNS: F1GridColumn<EmployeePickerRow>[] = [
  {
    field: 'photoImage', headerName: '사진', width: 64, align: 'center', editable: false, search: { hidden: true },
    renderCell: ({ row }) => (
      <Avatar src={row.photoImage || undefined} alt="" sx={{ width: 36, height: 36, fontSize: 14 }}>
        {row.userNm.slice(0, 1)}
      </Avatar>
    ),
  },
  { field: 'departmentNm', headerName: '부서명', width: 130, editable: false, search: { hidden: true } },
  { field: 'positionNm', headerName: '직위', width: 80, align: 'center', editable: false, search: { hidden: true } },
  { field: 'employeeNo', headerName: '사번', width: 90, align: 'center', editable: false, search: { hidden: true } },
  { field: 'userNm', headerName: '사원명', flex: 1, width: 120, editable: false, search: { hidden: true } },
];

function toOption(row: EmployeePickerRow): EmployeePickerOption {
  return {
    departmentId: row.departmentId,
    departmentNm: row.departmentNm,
    userId: row.userId,
    positionCode: row.positionCode,
    positionNm: row.positionNm,
    employeeNo: row.employeeNo,
    userNm: row.userNm,
  };
}

type BodyProps = {
  onChange: (value: EmployeePickerOption) => void;
  onPicked: () => void;
  /** 선택(또는 선택 해제)이 한 번 끝났는지. 도움창을 열 때마다 초기화된다. */
  doneRef: MutableRefObject<boolean>;
  /** 다중 선택이면 사원 표에 체크 열과 선택 도구가 생기고 더블클릭으로는 적용하지 않는다. */
  multiple: boolean;
  selected: EmployeePickerOption[];
  onToggle: (option: EmployeePickerOption, checked: boolean) => void;
  onSelectMany: (options: EmployeePickerOption[]) => void;
  onClearSelection: () => void;
  limitMessage: string;
};

function EmployeePickerBody({ onChange, onPicked, doneRef, multiple, selected, onToggle, onSelectMany, onClearSelection, limitMessage }: BodyProps) {
  const [departments, setDepartments] = useState<DepartmentPickerData | null>(null);
  const [departmentError, setDepartmentError] = useState('');
  /** null이면 회사(전체). */
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [rows, setRows] = useState<EmployeePickerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPickerDepartments()
      .then((loaded) => {
        if (!cancelled) setDepartments(loaded);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setDepartmentError(cause instanceof Error && cause.message ? cause.message : '부서 목록을 조회하지 못했습니다.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 트리·검색어가 바뀌면 렌더 중에 로딩 상태로 되돌린다(효과 안에서 동기적으로 상태를 바꾸지 않기 위한 패턴).
  const [requested, setRequested] = useState<{ departmentId: number | null; keyword: string } | null>(null);
  if (requested === null || requested.departmentId !== departmentId || requested.keyword !== keyword) {
    setRequested({ departmentId, keyword });
    setLoading(true);
    setError('');
    setSelectedUserId(null);
  }

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void fetchPickerEmployees({ departmentId, keyword }, controller.signal)
      .then((loaded) => {
        if (cancelled) return;
        setRows(loaded);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setRows([]);
        setError(cause instanceof Error && cause.message ? cause.message : '사원 목록을 조회하지 못했습니다.');
        setLoading(false);
      });
    return () => {
      // 트리를 바꾸거나 검색어를 바꾸면 이전 요청의 결과는 버린다.
      cancelled = true;
      controller.abort();
    };
  }, [departmentId, keyword]);

  const treeRows = useMemo(
    () => (departments ? buildPickerRows(departments.companyName, departments.departments) : []),
    [departments],
  );

  const selectedIds = useMemo(() => new Set(selected.map((option) => option.userId)), [selected]);
  const columns = useMemo<F1GridColumn<EmployeePickerRow>[]>(() => {
    if (!multiple) return GRID_COLUMNS;
    return [
      {
        field: 'userId', headerName: '선택', width: 56, align: 'center', editable: false, search: { hidden: true },
        renderCell: ({ row }) => (
          <Checkbox
            size="small"
            checked={selectedIds.has(row.userId)}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onToggle(toOption(row), event.target.checked)}
            slotProps={{ input: { 'aria-label': `${row.userNm} 선택` } }}
          />
        ),
      },
      ...GRID_COLUMNS,
    ];
  }, [multiple, selectedIds, onToggle]);

  const pick = (row: EmployeePickerRow | undefined) => {
    // 선택은 한 번만 처리한다(부모가 선택에 반응해 다시 그려져도 같은 이벤트가 반복 호출되지 않게 한다).
    if (!row || doneRef.current) return;
    doneRef.current = true;
    onChange(toOption(row));
    onPicked();
  };

  const rowOfEvent = (event: MouseEvent<HTMLElement>): EmployeePickerRow | undefined => {
    const target = event.target as HTMLElement;
    const id = target.closest('[data-f1-grid-row-id]')?.getAttribute('data-f1-grid-row-id');
    return id == null ? undefined : rows.find((row) => String(row.userId) === id);
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (multiple || event.key !== 'Enter' || selectedUserId == null) return;
    event.preventDefault();
    pick(rows.find((row) => row.userId === selectedUserId));
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setKeyword(keywordInput.trim());
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' },
        gap: 2,
        minWidth: 0,
      }}
    >
      <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {departmentError ? <Alert severity="error">{departmentError}</Alert> : null}
        {!departments && !departmentError ? (
          <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
            <CircularProgress size={18} /> <span>부서를 불러오는 중...</span>
          </Box>
        ) : null}
        {departments ? (
          <Box sx={{ height: { xs: 220, md: 420 }, minWidth: 0 }}>
            <F1Tree
              ariaLabel="사원 선택 부서 트리"
              storageKey="employee-picker-tree-v1"
              rows={treeRows}
              columns={TREE_COLUMNS}
              rowKey="departmentId"
              parentKey="parentDepartmentId"
              treeColumn="departmentNm"
              defaultExpanded="all"
              height="100%"
              showCheckbox={false}
              selectionMode="row"
              multiSelect={false}
              initialSelectedRowIds={[PICKER_COMPANY_ROW_ID]}
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
                if (id === undefined) return;
                const next = Number(id);
                setDepartmentId(next === PICKER_COMPANY_ROW_ID ? null : next);
              }}
            />
          </Box>
        ) : null}
      </Box>

      {/* 오른쪽 영역은 높이를 고정한다. 오류 문구가 생겨도 도움창 크기는 그대로이고 목록 영역만 줄어든다. */}
      <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, height: { xs: 'auto', md: 420 } }}>
        <Box component="form" onSubmit={submitSearch} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            margin="none"
            fullWidth
            label="통합검색"
            placeholder="사원명·사번·직위·부서명"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            slotProps={{
              htmlInput: { maxLength: 100 },
              input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
            }}
          />
          <Button type="submit" variant="outlined" sx={{ flexShrink: 0 }}>검색</Button>
        </Box>
        {/* 안내 줄. 한도 초과 같은 알림도 이 줄 안에서만 바뀌어 도움창 크기가 변하지 않는다. */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 28, flexWrap: 'wrap' }}>
          <Typography variant="caption" color={limitMessage ? 'error' : 'text.secondary'} role={limitMessage ? 'alert' : undefined} sx={{ flex: 1, minWidth: 0 }}>
            {limitMessage
              || (multiple
                ? '체크박스로 사원을 고른 뒤 적용하세요. 부서·검색을 바꿔도 선택은 유지됩니다.'
                : '사원 행을 더블클릭하거나 선택한 뒤 Enter를 누르면 적용됩니다.')}
          </Typography>
          {multiple ? (
            <>
              <Button size="small" disabled={rows.length === 0} onClick={() => onSelectMany(rows.map(toOption))}>현재 목록 전체 선택</Button>
              <Button size="small" color="inherit" disabled={selected.length === 0} onClick={onClearSelection}>선택 해제</Button>
            </>
          ) : null}
        </Box>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Box
          sx={{ height: { xs: 320, md: 'auto' }, flex: { md: 1 }, minHeight: { md: 0 }, minWidth: 0 }}
          onDoubleClick={multiple ? undefined : (event) => pick(rowOfEvent(event))}
          onKeyDown={onGridKeyDown}
        >
          <F1Grid
            ariaLabel="사원 목록"
            storageKey="employee-picker-grid-v1"
            rows={rows}
            columns={columns}
            rowKey="userId"
            height="100%"
            rowHeight={48}
            loading={loading}
            showCheckbox={false}
            selectionMode="row"
            multiSelect={false}
            rowFormPlugin={{ enabled: false }}
            allowAddRowInContextMenu={false}
            allowDuplicateRowInContextMenu={false}
            allowDeleteRowInContextMenu={false}
            onSelectionChange={(ids) => setSelectedUserId(ids[0] === undefined ? null : Number(ids[0]))}
          />
        </Box>
      </Box>
    </Box>
  );
}

function normalizeMaxSelect(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value >= 1 ? Math.floor(value) : undefined;
}

/**
 * 사원 선택 도움창. 왼쪽 회사·부서 트리에서 부서를 고르면 그 부서 소속 사원만, 회사를 고르면 전체 재직 인원이 오른쪽에 나온다.
 * 기본(단일)은 사원 행을 더블클릭하면 `{ departmentId, departmentNm, userId, positionCode, positionNm, employeeNo, userNm }`을 돌려주고 닫힌다.
 * `selectionMode="multiple"`이면 체크박스로 여러 명을 고르고 "적용(N명)"을 누를 때 같은 형태의 배열을 돌려준다(부서·검색을 바꿔도 선택 유지).
 * 퇴직자는 보이지 않고 연락처 등 개인정보는 내려오지 않는다. 열면 즉시 `GET /api/v1/hr/employee-picker`를 호출한다.
 */
export function EmployeePickerDialog(props: EmployeePickerDialogProps) {
  const { open, onClose, title = '사원 선택' } = props;
  const multiple = props.selectionMode === 'multiple';
  const maxSelect = props.selectionMode === 'multiple' ? normalizeMaxSelect(props.maxSelect) : undefined;
  const doneRef = useRef(false);
  const [selected, setSelected] = useState<EmployeePickerOption[]>([]);
  const [limitMessage, setLimitMessage] = useState('');
  const [wasOpen, setWasOpen] = useState(false);

  // 열 때마다 새로 선택할 수 있도록 되돌린다(렌더 중 상태 정리 패턴).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const initial = props.selectionMode === 'multiple' ? props.selected ?? [] : [];
      setSelected(maxSelect === undefined ? initial : initial.slice(0, maxSelect));
      setLimitMessage('');
    }
  }
  useEffect(() => {
    doneRef.current = false;
  }, [open]);

  const limitText = maxSelect === undefined ? '' : `최대 ${maxSelect}명까지 선택할 수 있습니다.`;
  const toggle = (option: EmployeePickerOption, checked: boolean) => {
    if (!checked) {
      setSelected((current) => current.filter((item) => item.userId !== option.userId));
      setLimitMessage('');
      return;
    }
    if (selected.some((item) => item.userId === option.userId)) return;
    if (maxSelect !== undefined && selected.length >= maxSelect) {
      setLimitMessage(limitText);
      return;
    }
    setSelected([...selected, option]);
    setLimitMessage('');
  };
  const selectMany = (options: EmployeePickerOption[]) => {
    const next = [...selected];
    let exceeded = false;
    options.forEach((option) => {
      if (next.some((item) => item.userId === option.userId)) return;
      if (maxSelect !== undefined && next.length >= maxSelect) {
        exceeded = true;
        return;
      }
      next.push(option);
    });
    setSelected(next);
    setLimitMessage(exceeded ? limitText : '');
  };

  const clear = () => {
    if (doneRef.current || props.selectionMode === 'multiple') return;
    doneRef.current = true;
    props.onClear?.();
    onClose();
  };
  const apply = () => {
    if (doneRef.current || props.selectionMode !== 'multiple') return;
    doneRef.current = true;
    props.onApply(selected);
    onClose();
  };
  const onChange = props.selectionMode === 'multiple' ? () => undefined : props.onChange;
  const onClear = props.selectionMode === 'multiple' ? undefined : props.onClear;

  return (
    <CommonDialog
      open={open}
      onClose={onClose}
      title={title}
      description={multiple
        ? '부서를 고른 뒤 사원을 체크하세요. 부서를 바꿔도 선택은 유지되고, 회사를 고르면 전체 인원이 나옵니다.'
        : '부서를 고른 뒤 사원을 더블클릭해 선택하세요. 회사를 고르면 전체 인원이 나옵니다.'}
      size="lg"
      fullScreenOnMobile
      footerStart={multiple
        ? <Typography variant="body2" sx={{ fontWeight: 600 }}>선택 {selected.length}명</Typography>
        : onClear ? <Button color="inherit" onClick={clear}>선택 해제</Button> : undefined}
      actions={multiple
        ? (
          <>
            <Button onClick={onClose}>취소</Button>
            <Button variant="contained" onClick={apply}>적용({selected.length}명)</Button>
          </>
        )
        : onClear ? <Button onClick={onClose}>취소</Button> : undefined}
    >
      <EmployeePickerBody
        onChange={onChange}
        onPicked={onClose}
        doneRef={doneRef}
        multiple={multiple}
        selected={selected}
        onToggle={toggle}
        onSelectMany={selectMany}
        onClearSelection={() => { setSelected([]); setLimitMessage(''); }}
        limitMessage={limitMessage}
      />
    </CommonDialog>
  );
}
