import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeeManagePage } from '../src/pages/hr/employee/EmployeeManagePage';
import { createEmployeeRow } from '../src/pages/hr/employee/data/employeeGridData';
import type { EmployeeCodeOptions, EmployeeRow } from '../src/pages/hr/employee/types/employee.types';

const mocks = vi.hoisted(() => ({
  fetchEmployees: vi.fn(),
  saveEmployeeRows: vi.fn(),
  fetchEmployeeCodeOptions: vi.fn(),
  fetchPickerDepartments: vi.fn(),
  openPostcodeSearch: vi.fn(),
}));

vi.mock('../src/pages/hr/employee/services/employee.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/pages/hr/employee/services/employee.service')>()),
  fetchEmployees: mocks.fetchEmployees,
  saveEmployeeRows: mocks.saveEmployeeRows,
  fetchEmployeeCodeOptions: mocks.fetchEmployeeCodeOptions,
}));
vi.mock('../src/shared/services/postcode', () => ({
  loadPostcodeScript: () => Promise.resolve(),
  openPostcodeSearch: (...args: unknown[]) => mocks.openPostcodeSearch(...args),
}));
vi.mock('../src/shared/components/department-picker/departmentPicker.service', () => ({
  fetchPickerDepartments: mocks.fetchPickerDepartments,
}));

const CODES: EmployeeCodeOptions = {
  position: [{ value: 'MANAGER', label: '과장' }, { value: 'STAFF', label: '사원' }],
  gender: [{ value: 'MALE', label: '남' }, { value: 'FEMALE', label: '여' }],
  employmentType: [{ value: 'REGULAR', label: '정규' }, { value: 'OUTSOURCED', label: '외주' }],
  nativeType: [{ value: 'DOMESTIC', label: '내국인' }, { value: 'FOREIGN', label: '외국인' }],
  birthCalendar: [{ value: 'SOLAR', label: '양력' }, { value: 'LUNAR', label: '음력' }],
  country: [{ value: 'USA', label: '미국' }],
  level: [{ value: '7', label: '대리' }],
};

function row(overrides: Partial<EmployeeRow> = {}): EmployeeRow {
  return {
    ...createEmployeeRow(), userId: '5', employeeNo: '261101', userNm: '홍길동', englishNm: 'Gildong', departmentId: 5,
    departmentNm: '생산1팀', positionCode: 'MANAGER', positionNm: '과장', levelId: '7', levelNm: '대리', genderCode: 'MALE',
    genderNm: '남', employmentTypeCode: 'REGULAR', employmentTypeNm: '정규', joinDt: '2026-11-05', mobileNo: '010-1111-2222',
    emailAddr: 'hong@example.com', realUserAt: 'Y', loginId: 55, loginCode: 'hong.gd', loginUseAt: 'Y', ...overrides,
  };
}

const PAGE_PROPS = {
  selectedModule: { id: 'hr', name: '인사관리', icon: null, tree: [], menus: [] },
  currentMenuName: '사원관리',
  content: { title: '사원관리', description: '사원을 등록·수정합니다.', cards: [], items: [] },
  selectedMenuPermissions: { read: true, create: true, update: true, delete: false, excel: true },
  isTenantAdmin: true,
};

describe('사원관리 페이지(공통 행 폼)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchEmployees.mockResolvedValue([
      row(),
      row({ userId: '6', employeeNo: '261102', userNm: '김휴직', employmentStatus: 'LEAVE', realUserAt: 'N', loginId: null, loginCode: '' }),
    ]);
    mocks.fetchEmployeeCodeOptions.mockResolvedValue(CODES);
    mocks.fetchPickerDepartments.mockResolvedValue({
      companyName: '에프원소프트',
      departments: [
        { departmentId: 4, parentDepartmentId: null, departmentNm: '생산팀' },
        { departmentId: 5, parentDepartmentId: 4, departmentNm: '생산1팀' },
      ],
    });
    // 저장 응답: 요청 행을 그대로(새 행은 서버가 정한 ID로) 돌려준다.
    mocks.saveEmployeeRows.mockImplementation(async (_payload: unknown, requested: EmployeeRow[]) => requested.map((item) => ({
      previousRowId: item.userId,
      row: { ...item, userId: item.userId.startsWith('new-employee-') ? '99' : item.userId, initialPassword: '' },
    })));
  });

  async function renderPage(overrides: Partial<typeof PAGE_PROPS> = {}) {
    render(<EmployeeManagePage {...PAGE_PROPS} {...overrides} />);
    await screen.findByRole('gridcell', { name: '261101' });
  }

  const form = (name: string) => screen.findByRole('dialog', { name });
  const input = (dialog: HTMLElement, label: RegExp | string) => within(dialog).getByLabelText(label);
  const fieldInput = (dialog: HTMLElement, field: string) => dialog.querySelector<HTMLInputElement>(`[data-field="${field}"] input`)!;

  async function chooseOption(dialog: HTMLElement, field: RegExp, option: string) {
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: field }));
    fireEvent.click(await screen.findByRole('option', { name: option }));
  }

  it('재직 구분 기본값으로 조회하고 공통 연필(정보 수정) 열과 목록 열을 보여 준다', async () => {
    await renderPage();
    expect(mocks.fetchEmployees).toHaveBeenCalledWith({ keyword: '', status: 'ACTIVE' });
    expect(screen.getByRole('button', { name: '6 행 정보 수정' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '261102' })).toBeInTheDocument();
    for (const header of ['사진', '사번', '이름', '영문이름', '부서', '직위']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
    expect(screen.queryByRole('columnheader', { name: '초기 비밀번호' })).toBeNull();
  });

  it('입력한 검색어를 조회 버튼으로 적용한다', async () => {
    await renderPage();
    fireEvent.change(screen.getByRole('textbox', { name: '사원 검색' }), { target: { value: '홍' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(mocks.fetchEmployees).toHaveBeenLastCalledWith({ keyword: '홍', status: 'ACTIVE' }));
  });

  it('연필을 누르면 공통 행 폼이 열리고 대상 사원명을 보여 주며 사번·계정은 읽기 전용 칸과 안내로 보인다', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '5 행 정보 수정' }));

    const dialog = await form('사원 정보 수정');
    expect(within(dialog).getByText('사원: 홍길동')).toBeInTheDocument();
    expect(input(dialog, /^사번/)).toHaveValue('261101');
    expect(input(dialog, /^사번/)).toHaveAttribute('readonly');
    expect(within(dialog).getByText('사번은 한 번 부여하면 변경할 수 없습니다.')).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: /실사용자/ })).toBeChecked();
    expect(within(dialog).getByText(/로그인 계정이 연결된 사원은 실사용자를 해제할 수 없습니다/)).toBeInTheDocument();
    expect(input(dialog, /^로그인 아이디/)).toHaveValue('hong.gd');
    expect(input(dialog, /^로그인 아이디/)).toHaveAttribute('readonly');
    expect(input(dialog, /^이름/)).toHaveValue('홍길동');
    expect(within(dialog).getByRole('button', { name: '적용' })).toBeInTheDocument();
    expect(within(dialog).getByText('적용 후 화면의 저장 버튼으로 최종 저장됩니다.')).toBeInTheDocument();
  });

  it('근무형태에는 필수 표시가 없고 직위에는 있다', async () => {
    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '사원 추가' }));
    const dialog = await form('사원 등록');
    const labelOf = (field: string) => dialog.querySelector(`[data-field="${field}"]`)?.textContent ?? '';
    expect(labelOf('employmentTypeCode')).toContain('근무형태');
    expect(labelOf('employmentTypeCode')).not.toContain('*');
    for (const field of ['userNm', 'departmentId', 'positionCode', 'joinDt']) {
      expect(labelOf(field), field).toContain('*');
    }
  });

  it('필수값을 비우고 적용하면 해당 칸이 오류(빨간 테두리)로 표시되고 근무형태는 오류가 아니다', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '사원 추가' }));
    const dialog = await form('사원 등록');

    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));

    await waitFor(() => expect(input(dialog, /^이름/)).toHaveAttribute('aria-invalid', 'true'));
    expect(input(dialog, '입사일')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByRole('combobox', { name: /직위/ })).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByRole('combobox', { name: /근무형태/ })).not.toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByText('이름은(는) 필수입니다.')).toBeInTheDocument();
    expect(mocks.saveEmployeeRows).not.toHaveBeenCalled();
  });

  it('새 사원을 입력해 적용한 뒤 저장 버튼으로 일괄 저장한다(부서는 도움창으로 선택)', async () => {
    await renderPage();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '사원 추가' }));
    const dialog = await form('사원 등록');

    fireEvent.change(input(dialog, /^이름/), { target: { value: '박신입' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '부서 선택' }));
    const picker = await screen.findByRole('dialog', { name: '부서 선택' });
    fireEvent.click(await within(picker).findByRole('gridcell', { name: '생산1팀' }));
    await waitFor(() => expect(fieldInput(dialog, 'departmentId')).toHaveValue('생산1팀'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '부서 선택' })).toBeNull());
    await chooseOption(dialog, /직위/, '사원');
    fireEvent.change(input(dialog, '입사일'), { target: { value: '2026-11-20' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '사원 등록' })).toBeNull());

    expect(mocks.saveEmployeeRows).not.toHaveBeenCalled();
    const save = screen.getByRole('button', { name: '저장' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() => expect(mocks.saveEmployeeRows).toHaveBeenCalledTimes(1));
    const [payload] = mocks.saveEmployeeRows.mock.calls[0];
    expect(payload.employees.updatedRows).toEqual([]);
    expect(payload.employees.deletedRows).toEqual([]);
    expect(payload.employees.insertedRows).toHaveLength(1);
    expect(payload.employees.insertedRows[0]).toMatchObject({
      userNm: '박신입', departmentId: 5, positionCode: 'STAFF', joinDt: '2026-11-20', realUserAt: 'N', loginCode: '', initialPassword: '',
    });
    expect(payload.employees.insertedRows[0]).not.toHaveProperty('photoImage');
    expect(payload.employees.insertedRows[0]).not.toHaveProperty('residentNo');
    expect(await screen.findByRole('gridcell', { name: '박신입' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeDisabled());
  });

  it('기존 사원을 수정하면 수정 행만 보내고 바뀌지 않은 사진은 보내지 않는다', async () => {
    mocks.fetchEmployees.mockResolvedValue([row({ photoImage: 'data:image/png;base64,AAAA' })]);
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '5 행 정보 수정' }));
    const dialog = await form('사원 정보 수정');

    fireEvent.change(input(dialog, '영문이름'), { target: { value: 'Gil Dong' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '사원 정보 수정' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(mocks.saveEmployeeRows).toHaveBeenCalledTimes(1));
    const [payload] = mocks.saveEmployeeRows.mock.calls[0];
    expect(payload.employees.insertedRows).toEqual([]);
    expect(payload.employees.updatedRows).toHaveLength(1);
    expect(payload.employees.updatedRows[0]).toMatchObject({ userId: '5', englishNm: 'Gil Dong', userNm: '홍길동', loginCode: '' });
    expect(payload.employees.updatedRows[0]).not.toHaveProperty('photoImage');
  });

  it('실사용자를 체크하면 로그인 아이디와 가려진 초기 비밀번호 칸이 나타나고 8자 미만이면 오류를 보여 준다', async () => {
    mocks.fetchEmployees.mockResolvedValue([row({ userId: '6', realUserAt: 'N', loginId: null, loginCode: '' })]);
    render(<EmployeeManagePage {...PAGE_PROPS} />);
    fireEvent.click(await screen.findByRole('button', { name: '6 행 정보 수정' }));
    const dialog = await form('사원 정보 수정');
    expect(within(dialog).queryByLabelText(/로그인 아이디/)).toBeNull();
    expect(within(dialog).getByText(/체크하면 로그인 아이디와 초기 비밀번호를 입력해 계정을 함께 발급합니다/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('checkbox', { name: /실사용자/ }));

    expect(await within(dialog).findByLabelText(/로그인 아이디/)).toBeInTheDocument();
    expect(within(dialog).getByText('비워 두면 사번을 로그인 아이디로 씁니다.', { exact: false })).toBeInTheDocument();
    expect(within(dialog).getByText('8자 이상, 최초 로그인 시 변경합니다.')).toBeInTheDocument();
    const password = input(dialog, '초기 비밀번호');
    expect(password).toHaveAttribute('type', 'password');
    fireEvent.change(password, { target: { value: 'short' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
    expect(await within(dialog).findByText('초기 비밀번호는 8자 이상이어야 합니다.')).toBeInTheDocument();
    expect(password).toHaveAttribute('aria-invalid', 'true');
  });

  it('내/외국인이 외국인이면 외국인 정보 섹션이 나타난다', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '5 행 정보 수정' }));
    const dialog = await form('사원 정보 수정');
    expect(within(dialog).queryByText('외국인 정보')).toBeNull();

    await chooseOption(dialog, /내\/외국인/, '외국인');

    expect(await within(dialog).findByText('외국인 정보')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('입국일')).toBeInTheDocument();
  });

  it('주소 검색 버튼으로 우편번호와 주소를 채운다', async () => {
    mocks.openPostcodeSearch.mockImplementation((onSelect: (selection: { postalCode: string; address: string }) => void) => {
      onSelect({ postalCode: '06236', address: '서울 강남구 테헤란로 1' });
      return Promise.resolve();
    });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '5 행 정보 수정' }));
    const dialog = await form('사원 정보 수정');

    fireEvent.click(within(dialog).getByRole('button', { name: '우편번호 선택' }));

    expect(mocks.openPostcodeSearch).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(input(dialog, '우편번호')).toHaveValue('06236'));
    expect(input(dialog, '주소')).toHaveValue('서울 강남구 테헤란로 1');
  });

  it('우편번호 서비스를 불러오지 못하면 상단에 오류를 보여 준다', async () => {
    mocks.openPostcodeSearch.mockRejectedValue(new Error('우편번호 검색 서비스를 불러오지 못했습니다.'));
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '5 행 정보 수정' }));
    const dialog = await form('사원 정보 수정');

    fireEvent.click(within(dialog).getByRole('button', { name: '우편번호 선택' }));

    expect(await screen.findAllByText('우편번호 검색 서비스를 불러오지 못했습니다.')).not.toHaveLength(0);
  });

  it('서버 오류는 상단 메시지로 보여 주고 변경 내용은 그대로 둔다(저장 버튼이 계속 활성)', async () => {
    mocks.saveEmployeeRows.mockRejectedValue(new Error('박신입: 이미 사용 중인 사번입니다.'));
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '5 행 정보 수정' }));
    const dialog = await form('사원 정보 수정');
    fireEvent.change(input(dialog, '영문이름'), { target: { value: 'Changed' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '사원 정보 수정' })).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('박신입: 이미 사용 중인 사번입니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
  });

  it('저장하지 않은 변경이 있으면 조회할 때 확인창을 띄우고 취소하면 그대로 둔다', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '5 행 정보 수정' }));
    const dialog = await form('사원 정보 수정');
    fireEvent.change(input(dialog, '영문이름'), { target: { value: 'Changed' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '사원 정보 수정' })).toBeNull());
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    mocks.fetchEmployees.mockClear();

    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(await screen.findByText('변경사항을 버리고 사원 목록을 다시 불러오시겠습니까?')).toBeInTheDocument();
    expect(mocks.fetchEmployees).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(mocks.fetchEmployees).not.toHaveBeenCalled();
  });

  it('테넌트 관리자가 아니면 사원 추가와 저장을 보여 주지 않는다', async () => {
    await renderPage({ isTenantAdmin: false });
    expect(screen.queryByRole('button', { name: '사원 추가' })).toBeNull();
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
  });
});
