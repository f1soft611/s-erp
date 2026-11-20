import {
  Alert, Box, Button, Checkbox, FormControlLabel, InputAdornment, MenuItem, TextField, Typography,
} from '@mui/material';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CommonDialog } from '../../../../shared/components/CommonDialog';
import { FormDateField } from '../../../../shared/components/FormDateField';
import { DepartmentPickerDialog } from '../../../../shared/components/department-picker';
import { loadPostcodeScript, openPostcodeSearch } from '../../../../shared/services/postcode';
import { buildEmployeePayload, MIN_PASSWORD_LENGTH } from '../data/employeeForm';
import type {
  EmployeeCodeOption,
  EmployeeCodeOptions,
  EmployeeFormValues,
  EmployeePayload,
} from '../types/employee.types';
import { EmployeePhotoField } from './EmployeePhotoField';

const GRID = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
  gap: 2,
  alignItems: 'start',
  // 테마의 TextField 기본 여백(normal)이 날짜 입력(여백 없음)과 달라 칸 높이가 어긋나므로 팝업에서는 모두 없앤다.
  '& .MuiTextField-root': { margin: 0 },
} as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section" aria-label={title} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
      <Box sx={GRID}>{children}</Box>
    </Box>
  );
}

type Props = {
  initial: EmployeeFormValues;
  codeOptions: EmployeeCodeOptions;
  /** 권한이 없으면 조회만 가능하다(입력이 잠기고 저장 버튼이 없다). */
  canSave: boolean;
  saving: boolean;
  onSubmit: (payload: EmployeePayload) => Promise<unknown>;
  onCheckEmployeeNo: (employeeNo: string, userId: number | null) => Promise<boolean>;
  onCheckLoginCode: (loginCode: string) => Promise<boolean>;
  onClose: () => void;
};

/** 사원 등록·수정 팝업. 열 때마다 새로 마운트되므로 입력값은 initial에서 시작한다. */
export function EmployeeFormDialog({ initial, codeOptions, canSave, saving, onSubmit, onCheckEmployeeNo, onCheckLoginCode, onClose }: Props) {
  const isEdit = initial.userId !== null;
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const addressDetailRef = useRef<HTMLInputElement>(null);
  const [employeeNoMessage, setEmployeeNoMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loginCodeMessage, setLoginCodeMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const employeeNoLocked = isEdit && initial.employeeNo !== '';
  const set = (patch: Partial<EmployeeFormValues>) => setValues((current) => ({ ...current, ...patch }));

  const textField = (label: string, field: keyof EmployeeFormValues, extra: { required?: boolean; type?: string; maxLength?: number; helperText?: string; placeholder?: string } = {}) => (
    <TextField
      size="small"
      label={label}
      required={extra.required}
      type={extra.type}
      placeholder={extra.placeholder}
      helperText={extra.helperText}
      value={String(values[field] ?? '')}
      onChange={(event) => set({ [field]: event.target.value } as Partial<EmployeeFormValues>)}
      slotProps={{ htmlInput: { maxLength: extra.maxLength } }}
    />
  );

  const selectField = (label: string, field: keyof EmployeeFormValues, options: EmployeeCodeOption[], required = false) => (
    <TextField
      select
      size="small"
      label={label}
      required={required}
      value={String(values[field] ?? '')}
      onChange={(event) => set({ [field]: event.target.value } as Partial<EmployeeFormValues>)}
      slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
    >
      <MenuItem value=""><em>{required ? '선택' : '선택 안 함'}</em></MenuItem>
      {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
    </TextField>
  );

  const dateField = (label: string, field: keyof EmployeeFormValues, required = false) => (
    <FormDateField label={label} required={required} value={String(values[field] ?? '')}
      onChange={(next) => set({ [field]: next } as Partial<EmployeeFormValues>)} />
  );

  // 팝업 열기는 클릭 직후여야 차단되지 않으므로 스크립트를 미리 불러 둔다(실패해도 클릭 때 다시 시도한다).
  useEffect(() => {
    if (canSave) loadPostcodeScript().catch(() => undefined);
  }, [canSave]);

  const searchAddress = async () => {
    try {
      await openPostcodeSearch(({ postalCode, address }) => {
        set({ postalCode, address });
        setError('');
        window.setTimeout(() => addressDetailRef.current?.focus(), 0);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '우편번호 검색을 열지 못했습니다.');
    }
  };

  const checkEmployeeNo = async () => {
    const employeeNo = values.employeeNo.trim();
    if (!employeeNo || employeeNoLocked) {
      setEmployeeNoMessage(null);
      return;
    }
    try {
      const available = await onCheckEmployeeNo(employeeNo, values.userId);
      setEmployeeNoMessage(available
        ? { ok: true, text: '사용할 수 있는 사번입니다.' }
        : { ok: false, text: '이미 사용 중인 사번입니다.' });
    } catch (cause) {
      setEmployeeNoMessage({ ok: false, text: cause instanceof Error ? cause.message : '사번을 확인하지 못했습니다.' });
    }
  };

  const checkLoginCode = async () => {
    const loginCode = values.loginCode.trim();
    if (!loginCode) {
      setLoginCodeMessage(null);
      return;
    }
    try {
      const available = await onCheckLoginCode(loginCode);
      setLoginCodeMessage(available
        ? { ok: true, text: '사용할 수 있는 아이디입니다.' }
        : { ok: false, text: '이미 사용 중인 로그인 아이디입니다.' });
    } catch (cause) {
      setLoginCodeMessage({ ok: false, text: cause instanceof Error ? cause.message : '로그인 아이디를 확인하지 못했습니다.' });
    }
  };

  const submit = async () => {
    const result = buildEmployeePayload(values);
    if (result.error !== undefined) {
      setError(result.error);
      return;
    }
    setError('');
    try {
      await onSubmit(result.payload);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : '사원 정보를 저장하지 못했습니다.');
    }
  };

  const photo = values.photoImage !== undefined ? values.photoImage : values.currentPhoto;
  const foreign = values.nativeTypeCode === 'FOREIGN';

  return (
    <CommonDialog
      open
      onClose={saving ? () => undefined : onClose}
      title={isEdit ? '사원 정보 수정' : '사원 등록'}
      size="lg"
      fullScreenOnMobile
      actions={(
        <>
          <Button onClick={onClose} disabled={saving}>{canSave ? '취소' : '닫기'}</Button>
          {canSave ? (
            <Button variant="contained" onClick={() => { void submit(); }} disabled={saving}>저장</Button>
          ) : null}
        </>
      )}
    >
      <Box component="fieldset" disabled={!canSave} sx={{ border: 0, p: 0, m: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {error ? <Alert severity="error" role="alert">{error}</Alert> : null}

        <Section title="기본 정보">
          <TextField
            size="small"
            label="사번"
            value={values.employeeNo}
            disabled={employeeNoLocked}
            placeholder={isEdit ? undefined : '비우면 입사년월+순번 자동'}
            error={employeeNoMessage?.ok === false}
            color={employeeNoMessage?.ok ? 'success' : undefined}
            helperText={employeeNoMessage?.text
              ?? (employeeNoLocked
                ? '사번은 한 번 부여하면 변경할 수 없습니다.'
                : '직접 입력하거나 비우면 자동 부여합니다. 부여한 사번은 변경할 수 없습니다.')}
            onChange={(event) => { set({ employeeNo: event.target.value }); setEmployeeNoMessage(null); }}
            onBlur={() => { void checkEmployeeNo(); }}
            slotProps={{ htmlInput: { maxLength: 20 } }}
          />
          {textField('이름', 'userNm', { required: true, maxLength: 100 })}
          {textField('영문이름', 'englishNm', { maxLength: 60 })}
          <TextField
            size="small"
            required
            label="부서"
            value={values.departmentLabel}
            placeholder="부서 선택"
            onClick={() => { if (canSave) setPickerOpen(true); }}
            slotProps={{
              input: {
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Button size="small" onClick={() => setPickerOpen(true)} disabled={!canSave}>선택</Button>
                  </InputAdornment>
                ),
              },
            }}
          />
          {selectField('직위', 'positionCode', codeOptions.position, true)}
          {selectField('직급', 'levelId', codeOptions.level)}
          {selectField('성별', 'genderCode', codeOptions.gender)}
          {selectField('근무형태', 'employmentTypeCode', codeOptions.employmentType, true)}
          {dateField('입사일', 'joinDt', true)}
          {dateField('퇴사일', 'retireDt')}
          {dateField('휴직일', 'suspendDt')}
          {dateField('복직일', 'backDt')}
        </Section>

        <Section title="개인·연락 정보">
          <TextField
            size="small"
            label="주민등록번호"
            value={values.residentNo}
            placeholder={isEdit && values.residentNoMasked ? `현재 ${values.residentNoMasked}` : '숫자 13자리'}
            helperText={isEdit && values.residentNoMasked
              ? '변경하려면 새 번호를 입력하세요. 비워 두면 기존 값이 유지됩니다.'
              : '암호화해서 저장하며 화면에는 마스킹해서 보여 줍니다.'}
            onChange={(event) => set({ residentNo: event.target.value.replace(/[^0-9-]/g, '') })}
            slotProps={{ htmlInput: { maxLength: 14, inputMode: 'numeric', autoComplete: 'off' } }}
          />
          {dateField('생일', 'birthDt')}
          {selectField('생일 구분', 'birthCalendarCode', codeOptions.birthCalendar)}
          {textField('핸드폰', 'mobileNo', { maxLength: 20 })}
          {textField('자택전화', 'homePhoneNo', { maxLength: 30 })}
          {textField('개인이메일', 'emailAddr', { maxLength: 100 })}
          <TextField
            size="small"
            label="우편번호"
            value={values.postalCode}
            placeholder="주소 검색"
            slotProps={{
              inputLabel: { shrink: true },
              // 칸 전체(root)가 아니라 입력창에만 건다. root에 걸면 안쪽 "주소 검색" 버튼 클릭이 전달되어 검색 창이 두 번 열린다.
              htmlInput: { onClick: () => { if (canSave) void searchAddress(); } },
              input: {
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Button size="small" onClick={() => { void searchAddress(); }} disabled={!canSave}>주소 검색</Button>
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            size="small"
            label="주소"
            value={values.address}
            placeholder="주소 검색으로 입력"
            slotProps={{ inputLabel: { shrink: true }, input: { readOnly: true } }}
          />
          <TextField
            size="small"
            label="상세주소"
            value={values.addressDetail}
            inputRef={addressDetailRef}
            onChange={(event) => set({ addressDetail: event.target.value })}
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />

        </Section>

        <Section title="내/외국인">
          {selectField('내/외국인', 'nativeTypeCode', codeOptions.nativeType)}
          {foreign ? selectField('국적', 'nationalityCode', codeOptions.country) : null}
          {foreign ? dateField('취업기간만료일', 'workEndDt') : null}
          {foreign ? dateField('입국일', 'admissionDt') : null}
          {foreign ? dateField('체류기간 시작일', 'stayFromDt') : null}
          {foreign ? dateField('체류기간 종료일', 'stayToDt') : null}
          {foreign ? dateField('근로계약 시작일', 'contractFromDt') : null}
          {foreign ? dateField('근로계약 종료일', 'contractToDt') : null}
        </Section>

        <Section title="시스템 사용">
          <Box sx={{ gridColumn: '1 / -1' }}>
            <FormControlLabel
              label="실사용자(시스템 사용)"
              control={(
                <Checkbox
                  checked={values.realUser}
                  disabled={values.loginId != null}
                  onChange={(event) => set({ realUser: event.target.checked })}
                />
              )}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {values.loginId != null
                ? '로그인 계정이 연결된 사원은 실사용자를 해제할 수 없습니다. 계정 관리에서 로그인을 미허용 처리해 주세요.'
                : '체크하면 로그인 아이디와 초기 비밀번호를 입력해 계정을 함께 발급합니다. 현장직처럼 시스템을 쓰지 않으면 체크하지 않습니다.'}
            </Typography>
          </Box>
          {values.loginId != null ? (
            <TextField size="small" label="로그인 아이디" value={values.loginCode} disabled />
          ) : null}
          {values.realUser && values.loginId == null ? (
            <>
              <TextField
                size="small"
                label="로그인 아이디"
                value={values.loginCode}
                placeholder="비우면 사번 사용"
                error={loginCodeMessage?.ok === false}
                color={loginCodeMessage?.ok ? 'success' : undefined}
                helperText={loginCodeMessage?.text
                  ?? '비워 두면 사번을 로그인 아이디로 씁니다. 직접 입력하면 영문·숫자·`.`·`_`·`-` 4~30자, 발급 후에는 수정할 수 없습니다.'}
                onChange={(event) => { set({ loginCode: event.target.value }); setLoginCodeMessage(null); }}
                onBlur={() => { void checkLoginCode(); }}
                slotProps={{ htmlInput: { maxLength: 30, autoComplete: 'off' } }}
              />
              {textField('초기 비밀번호', 'initialPassword', {
                required: true, type: 'password', maxLength: 100,
                helperText: `${MIN_PASSWORD_LENGTH}자 이상, 최초 로그인 시 변경합니다.`,
              })}
            </>
          ) : null}
          <Box sx={{ gridColumn: '1 / -1' }}>
            <EmployeePhotoField name={values.userNm} value={photo} disabled={!canSave} onChange={(next) => set({ photoImage: next })} />
          </Box>
        </Section>
      </Box>
      <DepartmentPickerDialog
        open={pickerOpen}
        selectedId={values.departmentId}
        onClose={() => setPickerOpen(false)}
        onChange={(department) => set({ departmentId: department.departmentId, departmentLabel: department.departmentPath })}
      />
    </CommonDialog>
  );
}
