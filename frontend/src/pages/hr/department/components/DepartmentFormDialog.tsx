import { Alert, Autocomplete, Box, Button, TextField } from '@mui/material';
import { useMemo, useState, type FormEvent } from 'react';
import { CommonDialog } from '../../../../shared/components/CommonDialog';
import { buildDepartmentPath, COMPANY_ROW_ID, listParentCandidates } from '../data/departmentTree';
import type {
  DepartmentManagerOption,
  DepartmentPayload,
  DepartmentRow,
} from '../types/department.types';

export type DepartmentFormInitial = {
  /** 편집할 부서 ID. 없으면 등록이다. */
  departmentId: number | null;
  parentDepartmentId: number | null;
  departmentNm: string;
  managerUserId: number | null;
  /** 현재 부서장 이름(소속 사원 목록에 없을 때 선택지에 남기려고 쓴다) */
  managerUserNm: string;
  /** 부서장 선택지: 이 부서의 소속 사원만. 신규 부서는 비어 있다. */
  managerOptions: DepartmentManagerOption[];
  departmentDc: string;
  sortOrder: number;
};

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

function managerLabel(option: DepartmentManagerOption): string {
  return option.levelNm ? `${option.userNm} ${option.levelNm}` : option.userNm;
}

type Props = {
  initial: DepartmentFormInitial;
  /** 상위 부서 선택지 맨 위에 "회사명(최상위)"로 보여 줄 회사명 */
  companyName: string;
  rows: DepartmentRow[];
  saving: boolean;
  onSubmit: (payload: DepartmentPayload) => Promise<unknown>;
  onClose: () => void;
};

/** 부서 등록·편집 팝업. 열 때마다 새로 마운트되므로 입력값은 initial에서 시작한다. */
export function DepartmentFormDialog({ initial, companyName, rows, saving, onSubmit, onClose }: Props) {
  const isEdit = initial.departmentId !== null;
  const parentCandidates = useMemo(
    () => listParentCandidates(rows, initial.departmentId),
    [rows, initial.departmentId],
  );
  // 상위 부서가 사용안함이어서 후보에 없더라도 현재 값은 목록에 남겨, 이름만 고칠 때 상위 부서가 지워지지 않게 한다.
  const parentOptions = useMemo(() => {
    const { parentDepartmentId } = initial;
    const company = { departmentId: COMPANY_ROW_ID, label: `${companyName || '회사'}(최상위)` };
    if (parentDepartmentId === null
      || parentCandidates.some((candidate) => candidate.departmentId === parentDepartmentId)) {
      return [company, ...parentCandidates];
    }
    return [company, ...parentCandidates, {
      departmentId: parentDepartmentId,
      label: buildDepartmentPath(rows, parentDepartmentId) || String(parentDepartmentId),
    }];
  }, [parentCandidates, initial, rows, companyName]);
  const [parentId, setParentId] = useState<number | null>(initial.parentDepartmentId);
  const [name, setName] = useState(initial.departmentNm);
  const [managerUserId, setManagerUserId] = useState<number | null>(initial.managerUserId);
  const [description, setDescription] = useState(initial.departmentDc);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [error, setError] = useState('');

  // 상위 부서가 없으면(null) 회사 바로 아래(최상위)다.
  const selectedParent = parentOptions.find(
    (candidate) => candidate.departmentId === (parentId === null ? COMPANY_ROW_ID : parentId),
  ) ?? parentOptions[0];
  // 부서장이 다른 부서로 옮겨 가 목록에 없더라도 현재 값은 남겨, 이름만 고칠 때 부서장이 지워지지 않게 한다.
  const managerOptions = useMemo(() => {
    const { managerUserId: currentId, managerUserNm, managerOptions: members } = initial;
    if (currentId === null || members.some((member) => member.userId === currentId)) return members;
    return [...members, { userId: currentId, userNm: `${managerUserNm || currentId} (소속 아님)`, levelNm: '' }];
  }, [initial]);
  const selectedManager = managerOptions.find((option) => option.userId === managerUserId) ?? null;

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('부서명을 입력해 주세요.');
      return;
    }
    if (trimmedName.length > NAME_MAX_LENGTH) {
      setError(`부서명은 ${NAME_MAX_LENGTH}자 이하로 입력해 주세요.`);
      return;
    }
    if (description.length > DESCRIPTION_MAX_LENGTH) {
      setError(`설명은 ${DESCRIPTION_MAX_LENGTH}자 이하로 입력해 주세요.`);
      return;
    }
    const order = Number(sortOrder);
    if (!Number.isInteger(order)) {
      setError('정렬순서는 정수로 입력해 주세요.');
      return;
    }
    setError('');
    try {
      await onSubmit({
        parentDepartmentId: parentId,
        departmentNm: trimmedName,
        managerUserId,
        departmentDc: description.trim(),
        sortOrder: order,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : '부서를 저장하지 못했습니다.');
    }
  };

  return (
    <CommonDialog
      open
      onClose={saving ? () => undefined : onClose}
      title={isEdit ? '부서 편집' : '부서 등록'}
      size="sm"
      fullScreenOnMobile
      actions={(
        <>
          <Button onClick={onClose} disabled={saving}>취소</Button>
          <Button variant="contained" onClick={() => { void submit(); }} disabled={saving}>저장</Button>
        </>
      )}
    >
      <Box component="form" onSubmit={(event) => { void submit(event); }} noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
        {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
        <Autocomplete
          size="small"
          options={parentOptions}
          value={selectedParent}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, value) => option.departmentId === value.departmentId}
          disableClearable
          onChange={(_event, option) => setParentId(option.departmentId === COMPANY_ROW_ID ? null : option.departmentId)}
          noOptionsText="선택할 부서가 없습니다."
          renderInput={(params) => <TextField {...params} label="상위 부서" />}
        />
        <TextField
          size="small"
          required
          autoFocus
          label="부서명"
          value={name}
          onChange={(event) => setName(event.target.value)}
          slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }}
        />
        <Autocomplete
          size="small"
          options={managerOptions}
          value={selectedManager}
          getOptionLabel={managerLabel}
          isOptionEqualToValue={(option, value) => option.userId === value.userId}
          onChange={(_event, option) => setManagerUserId(option ? option.userId : null)}
          disabled={!isEdit}
          noOptionsText="이 부서에 소속 사원이 없습니다."
          renderInput={(params) => (
            <TextField
              {...params}
              label="부서장"
              helperText={isEdit
                ? '이 부서의 소속 사원 중에서 지정합니다.'
                : '등록 후 소속 사원을 배정한 뒤 편집에서 지정할 수 있습니다.'}
            />
          )}
        />
        <TextField
          size="small"
          label="정렬순서"
          type="number"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
        />
        <TextField
          size="small"
          label="설명"
          multiline
          minRows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          slotProps={{ htmlInput: { maxLength: DESCRIPTION_MAX_LENGTH } }}
        />
      </Box>
    </CommonDialog>
  );
}
