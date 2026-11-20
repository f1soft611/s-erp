import type { F1GridColumn } from '../../../../shared/components/f1-grid';
import type { EmployeeCodeOptions, EmploymentStatus, EmployeeRow } from '../types/employee.types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPLOYEE_NO = /^[A-Za-z0-9]{1,20}$/;
const LOGIN_CODE = /^[A-Za-z0-9._-]{4,30}$/;
export const MIN_PASSWORD_LENGTH = 8;
export const NEW_EMPLOYEE_PREFIX = 'new-employee-';

/** 아직 저장하지 않은 새 행인지(임시 ID). 사번은 새 행에서만 입력할 수 있다. */
export function isNewEmployeeRow(row: Pick<EmployeeRow, 'userId'>): boolean {
  return String(row.userId).startsWith(NEW_EMPLOYEE_PREFIX);
}

/** 이 저장에서 로그인 계정을 새로 발급하는 행인지(실사용자이고 아직 계정이 없음). */
export function isIssuingAccount(row: Pick<EmployeeRow, 'realUserAt' | 'loginId'>): boolean {
  return row.realUserAt === 'Y' && row.loginId == null;
}

function isForeigner(row: Pick<EmployeeRow, 'nativeTypeCode'>): boolean {
  return row.nativeTypeCode === 'FOREIGN';
}

export function describeEmploymentStatus(status: EmploymentStatus): string {
  if (status === 'RETIRED') return '퇴직';
  if (status === 'LEAVE') return '휴직';
  return '재직';
}

export function createEmployeeRow(): EmployeeRow {
  return {
    userId: `${NEW_EMPLOYEE_PREFIX}${Date.now()}-${Math.random().toString(16).slice(2)}`,
    employeeNo: '', userNm: '', englishNm: '', departmentId: null, departmentNm: '',
    positionCode: '', positionNm: '', levelId: '', levelNm: '', genderCode: '', genderNm: '',
    employmentTypeCode: '', employmentTypeNm: '', nativeTypeCode: '', nativeTypeNm: '',
    nationalityCode: '', nationalityNm: '', birthCalendarCode: '', birthDt: '', joinDt: '',
    retireDt: '', suspendDt: '', backDt: '', workEndDt: '', admissionDt: '', stayFromDt: '',
    stayToDt: '', contractFromDt: '', contractToDt: '', mobileNo: '', homePhoneNo: '',
    emailAddr: '', postalCode: '', address: '', addressDetail: '', realUserAt: 'N', loginId: null,
    loginCode: '', loginUseAt: '', initialPassword: '', photoImage: '', employmentStatus: 'ACTIVE',
    departmentManagerYn: 'N',
  };
}

export type EmployeeColumnHandlers = {
  /** 부서 선택 버튼(표 셀·행 폼)을 누르면 호출된다. 페이지가 부서 선택 도움창을 열고 결과를 applyPatch로 적용한다. */
  onOpenDepartmentPicker?: (row: EmployeeRow, applyPatch: (patch: Partial<EmployeeRow>) => void) => void;
  /** 우편번호·주소 선택 버튼을 누르면 호출된다. 페이지가 주소 검색 창을 열고 결과를 applyPatch로 적용한다. */
  onOpenPostcodePicker?: (row: EmployeeRow, applyPatch: (patch: Partial<EmployeeRow>) => void) => void;
};

const BASIC = '기본 정보';
const PERSONAL = '개인·연락 정보';
const NATIVE = '내/외국인';
const FOREIGN = '외국인 정보';
const SYSTEM = '시스템 사용';

/**
 * 사원 그리드 컬럼 정의. 같은 정의로 표 셀과 공통 행 폼(섹션 카드·필수값 빨간 테두리)을 만든다.
 * 컬럼은 행 폼 섹션 순서(기본 → 개인·연락 → 내/외국인 → 외국인 → 시스템 사용)로 선언한다.
 * 목록에서 숨긴 컬럼은 행 폼에서만 보인다(`hidden: true` + `form.hidden: false`).
 */
export function createEmployeeColumns(
  canEdit: boolean,
  options: EmployeeCodeOptions,
  handlers: EmployeeColumnHandlers = {},
): F1GridColumn<EmployeeRow>[] {
  const dimRetired: F1GridColumn<EmployeeRow>['getCellStyle'] = ({ row }) =>
    (row.employmentStatus === 'RETIRED' ? { opacity: 0.5 } : undefined);
  const base = (
    field: keyof EmployeeRow, headerName: string, width: number, extra: Partial<F1GridColumn<EmployeeRow>> = {},
  ): F1GridColumn<EmployeeRow> => ({
    field, headerName, width, editable: canEdit, getCellStyle: dimRetired, search: { hidden: true }, ...extra,
  });
  const select = (
    field: keyof EmployeeRow, headerName: string, width: number, items: EmployeeCodeOptions['position'],
    form: NonNullable<F1GridColumn<EmployeeRow>['form']>, extra: Partial<F1GridColumn<EmployeeRow>> = {},
  ) => base(field, headerName, width, {
    type: 'select', options: items.map((item) => ({ value: item.value, label: item.label })), align: 'center', form, ...extra,
  });
  const date = (
    field: keyof EmployeeRow, headerName: string, group: string, order: number, extra: Partial<F1GridColumn<EmployeeRow>> = {},
  ) => base(field, headerName, 100, { type: 'date', align: 'center', form: { group, order }, ...extra });
  const foreignDate = (field: keyof EmployeeRow, headerName: string, order: number) => date(field, headerName, FOREIGN, order, {
    hidden: true, editable: (row) => canEdit && isForeigner(row), form: { hidden: false, group: FOREIGN, order },
  });
  const yn = (
    field: keyof EmployeeRow, headerName: string, formLabel: string, order: number,
    formExtra: NonNullable<F1GridColumn<EmployeeRow>['form']> = {},
  ): F1GridColumn<EmployeeRow> => base(
    field, headerName, 90, {
      type: 'checkbox', align: 'center',
      editable: (row) => canEdit && row.loginId == null,
      onValueChange: (_row, checked) => ({ [field]: checked ? 'Y' : 'N' }) as Partial<EmployeeRow>,
      form: { group: SYSTEM, order, label: formLabel, ...formExtra },
    });

  return [
    // ---- 기본 정보
    {
      field: 'photoImage', headerName: '사진', type: 'image', width: 84, align: 'center', editable: canEdit,
      // 목록은 작은 원형, 행 폼은 "시스템 사용" 맨 아래에 큰 원형 미리보기로 둔다(입력 칸이 아니라 첨부 성격).
      // 선택한 사진은 긴 변 320px JPEG로 줄여 저장한다(서버 한도 700KB).
      imageOptions: {
        shape: 'circle', fallbackText: (row) => (row.userNm ?? '').trim().charAt(0),
        formSize: 120, compress: { maxSide: 320, maxLength: 700 * 1024 },
      },
      search: { hidden: true },
      form: {
        group: SYSTEM, order: 4, groupOrder: 99, span: 3,
        helperText: 'PNG·JPEG·WEBP, 선택하면 자동으로 줄여서 저장합니다. 계정이 있으면 내 정보 관리의 프로필 이미지도 같이 바뀝니다.',
      },
    },
    base('employeeNo', '사번', 90, {
      align: 'center', highlightSearch: true,
      // 사번은 한 번 부여하면 바꿀 수 없으므로 새 행에서만 입력할 수 있다.
      editable: (row) => canEdit && isNewEmployeeRow(row),
      validate: (value) => {
        const text = String(value ?? '').trim();
        return !text || EMPLOYEE_NO.test(text) || '사번은 영문·숫자 1~20자로 입력해 주세요.';
      },
      form: {
        group: BASIC, order: 1, visible: true,
        helperText: (row) => (isNewEmployeeRow(row)
          ? '직접 입력하거나 비우면 자동 부여합니다. 부여한 사번은 변경할 수 없습니다.'
          : '사번은 한 번 부여하면 변경할 수 없습니다.'),
      },
    }),
    base('userNm', '이름', 120, {
      required: true, highlightSearch: true,
      form: { group: BASIC, order: 2, targetField: 'userNm', targetLabel: '사원' },
    }),
    base('englishNm', '영문이름', 120, { highlightSearch: true, form: { group: BASIC, order: 3 } }),
    base('departmentId', '부서', 130, {
      type: 'code', required: true, highlightSearch: true,
      getValue: (row) => row.departmentNm,
      onOpenCodePicker: (row, applyPatch) => {
        handlers.onOpenDepartmentPicker?.(row, applyPatch);
        return undefined;
      },
      onValueChange: () => {
        throw new Error('부서 선택 버튼으로 부서를 선택해 주세요.');
      },
      form: { group: BASIC, order: 4 },
    }),
    select('positionCode', '직위', 80, options.position, { group: BASIC, order: 5 }, { required: true, highlightSearch: true }),
    select('levelId', '직급', 80, options.level, { group: BASIC, order: 6 }),
    select('genderCode', '성별', 70, options.gender, { group: BASIC, order: 7 }),
    // 근무형태는 필수가 아니다.
    select('employmentTypeCode', '근무형태', 90, options.employmentType, { group: BASIC, order: 8 }),
    date('joinDt', '입사일', BASIC, 9, { required: true }),
    date('retireDt', '퇴사일', BASIC, 10, {
      validate: (value, row) => !value || !row.joinDt || String(value) >= row.joinDt || '퇴사일은 입사일보다 빠를 수 없습니다.',
    }),
    date('suspendDt', '휴직일', BASIC, 11, { hidden: true, form: { hidden: false, group: BASIC, order: 11 } }),
    date('backDt', '복직일', BASIC, 12, {
      hidden: true,
      validate: (value, row) => !value || !row.suspendDt || String(value) >= row.suspendDt || '복직일은 휴직일보다 빠를 수 없습니다.',
      form: { hidden: false, group: BASIC, order: 12 },
    }),
    // 재직상태는 퇴사일·휴직일·복직일로 계산한 값이라 목록에서만 보여 준다(행 폼에는 나오지 않는다).
    base('employmentStatus', '재직상태', 80, {
      editable: false, align: 'center', getValue: (row) => describeEmploymentStatus(row.employmentStatus), form: { hidden: true },
    }),

    // ---- 개인·연락 정보
    date('birthDt', '생년월일', PERSONAL, 1, { hidden: true, form: { hidden: false, group: PERSONAL, order: 1 } }),
    select('birthCalendarCode', '생년월일 구분', 100, options.birthCalendar, { hidden: false, group: PERSONAL, order: 2 }, { hidden: true }),
    base('mobileNo', '핸드폰', 120, {
      align: 'center', highlightSearch: true, inputFormat: { type: 'korean-phone', maxDigits: 11 },
      form: { group: PERSONAL, order: 3 },
    }),
    base('homePhoneNo', '자택전화', 120, {
      align: 'center', highlightSearch: true, inputFormat: { type: 'korean-phone', maxDigits: 11 },
      form: { group: PERSONAL, order: 4 },
    }),
    base('emailAddr', '개인이메일', 200, {
      highlightSearch: true,
      validate: (value) => !String(value ?? '').trim() || EMAIL.test(String(value).trim()) || '이메일 형식이 올바르지 않습니다.',
      form: { group: PERSONAL, order: 5 },
    }),
    base('postalCode', '우편번호', 90, {
      type: 'code', align: 'center',
      onOpenCodePicker: (row, applyPatch) => {
        handlers.onOpenPostcodePicker?.(row, applyPatch);
        return undefined;
      },
      onValueChange: () => {
        throw new Error('주소 검색으로 우편번호와 주소를 입력해 주세요.');
      },
      form: { group: PERSONAL, order: 6 },
    }),
    base('address', '주소', 280, {
      type: 'code', highlightSearch: true,
      onOpenCodePicker: (row, applyPatch) => {
        handlers.onOpenPostcodePicker?.(row, applyPatch);
        return undefined;
      },
      onValueChange: () => {
        throw new Error('주소 검색으로 우편번호와 주소를 입력해 주세요.');
      },
      form: { group: PERSONAL, order: 7, span: 2 },
    }),
    base('addressDetail', '상세주소', 160, { hidden: true, form: { hidden: false, group: PERSONAL, order: 8 } }),

    // ---- 내/외국인 (외국인이면 외국인 정보 섹션이 나타난다)
    select('nativeTypeCode', '내/외국인', 90, options.nativeType, { hidden: false, group: NATIVE, order: 1 }, { hidden: true }),

    // ---- 외국인 정보
    base('nationalityCode', '국적', 120, {
      type: 'autocomplete', hidden: true, options: options.country.map((item) => ({ value: item.value, label: item.label })),
      editable: (row) => canEdit && isForeigner(row), form: { hidden: false, group: FOREIGN, order: 1 },
    }),
    foreignDate('workEndDt', '취업기간 만료일', 2),
    foreignDate('admissionDt', '입국일', 3),
    foreignDate('stayFromDt', '체류기간 시작', 4),
    foreignDate('stayToDt', '체류기간 종료', 5),
    foreignDate('contractFromDt', '근로계약 시작', 6),
    foreignDate('contractToDt', '근로계약 종료', 7),

    // ---- 시스템 사용 (사진은 이 섹션 맨 아래, 위 사진 컬럼의 form 설정)
    yn('realUserAt', '실사용자', '실사용자(시스템 사용)', 1, {
      visible: true, span: 2,
      helperText: (row) => (row.loginId != null
        ? '로그인 계정이 연결된 사원은 실사용자를 해제할 수 없습니다. 계정 관리에서 로그인을 미허용 처리해 주세요.'
        : '체크하면 로그인 아이디와 초기 비밀번호를 입력해 계정을 함께 발급합니다. 현장직처럼 시스템을 쓰지 않으면 체크하지 않습니다.'),
    }),
    base('loginCode', '로그인 아이디', 130, {
      highlightSearch: true,
      // 계정이 이미 있으면 읽기 전용(목록에서만 보임). 새로 발급할 때만 입력받고, 비우면 사번이 아이디가 된다.
      editable: (row) => canEdit && isIssuingAccount(row),
      validate: (value, row) => {
        const text = String(value ?? '').trim();
        if (!isIssuingAccount(row) || !text) return true;
        return LOGIN_CODE.test(text) || '로그인 아이디는 영문·숫자·`.`·`_`·`-` 4~30자로 입력해 주세요.';
      },
      form: {
        group: SYSTEM, order: 2,
        // 계정이 이미 있으면 읽기 전용으로 보여 주고, 새로 발급할 때(실사용자 체크)만 입력받는다.
        visible: (row) => row.loginId != null || row.realUserAt === 'Y',
        helperText: (row) => (row.loginId != null
          ? ''
          : '비워 두면 사번을 로그인 아이디로 씁니다. 직접 입력하면 영문·숫자·`.`·`_`·`-` 4~30자, 발급 후에는 수정할 수 없습니다.'),
      },
    }),
    base('initialPassword', '초기 비밀번호', 140, {
      hidden: true, editable: (row) => canEdit && isIssuingAccount(row),
      validate: (value, row) => !isIssuingAccount(row) || String(value ?? '').length >= MIN_PASSWORD_LENGTH
        || `초기 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
      form: { hidden: false, group: SYSTEM, order: 3, inputType: 'password', helperText: `${MIN_PASSWORD_LENGTH}자 이상, 최초 로그인 시 변경합니다.` },
    }),
  ];
}
