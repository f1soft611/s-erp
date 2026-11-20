import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeeManagePage } from '../src/pages/hr/employee/EmployeeManagePage';
import type { EmployeeCodeOptions, EmployeeRow } from '../src/pages/hr/employee/types/employee.types';

const mocks = vi.hoisted(() => ({
  fetchEmployees: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  checkEmployeeNoAvailable: vi.fn(),
  checkLoginCodeAvailable: vi.fn(),
  openPostcodeSearch: vi.fn(),
  fetchEmployeeCodeOptions: vi.fn(),
  fetchPickerDepartments: vi.fn(),
}));

vi.mock('../src/pages/hr/employee/services/employee.service', () => ({
  fetchEmployees: mocks.fetchEmployees,
  createEmployee: mocks.createEmployee,
  updateEmployee: mocks.updateEmployee,
  checkEmployeeNoAvailable: mocks.checkEmployeeNoAvailable,
  checkLoginCodeAvailable: mocks.checkLoginCodeAvailable,
  fetchEmployeeCodeOptions: mocks.fetchEmployeeCodeOptions,
}));
vi.mock('../src/shared/services/postcode', () => ({ loadPostcodeScript: () => Promise.resolve(), openPostcodeSearch: (...args: unknown[]) => mocks.openPostcodeSearch(...args) }));

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
    userId: 5, employeeNo: '261101', userNm: '홍길동', englishNm: 'Gildong', departmentId: 5, departmentNm: '생산1팀',
    positionCode: 'MANAGER', positionNm: '과장', levelId: 7, levelNm: '대리', genderCode: 'MALE', genderNm: '남',
    employmentTypeCode: 'REGULAR', employmentTypeNm: '정규', nativeTypeCode: 'DOMESTIC', nativeTypeNm: '내국인',
    nationalityCode: '', nationalityNm: '', birthCalendarCode: 'SOLAR', birthDt: '1990-01-01', joinDt: '2026-11-05',
    retireDt: '', suspendDt: '', backDt: '', workEndDt: '', admissionDt: '', stayFromDt: '', stayToDt: '',
    contractFromDt: '', contractToDt: '', residentNoMasked: '900101-1******', mobileNo: '010-1111-2222',
    homePhoneNo: '', emailAddr: 'hong@example.com', postalCode: '', address: '', addressDetail: '', realUserAt: 'Y',
    loginId: 55, loginCode: 'hong.gd', loginUseAt: 'Y', photoImage: '', employmentStatus: 'ACTIVE', departmentManagerYn: 'N',
    ...overrides,
  };
}

const PAGE_PROPS = {
  selectedModule: { id: 'hr', name: '인사관리', icon: null, tree: [], menus: [] },
  currentMenuName: '사원등록',
  content: { title: '사원등록', description: '사원을 등록합니다.', cards: [], items: [] },
  selectedMenuPermissions: { read: true, create: true, update: true, delete: false, excel: true },
  isTenantAdmin: true,
};

describe('사원등록 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchEmployees.mockResolvedValue([
      row(),
      row({ userId: 6, employeeNo: '261102', userNm: '김휴직', employmentStatus: 'LEAVE', realUserAt: 'N', loginId: null, loginCode: '' }),
    ]);
    mocks.fetchEmployeeCodeOptions.mockResolvedValue(CODES);
    mocks.checkEmployeeNoAvailable.mockResolvedValue(true);
    mocks.fetchPickerDepartments.mockResolvedValue({
      companyName: '에프원소프트',
      departments: [
        { departmentId: 4, parentDepartmentId: null, departmentNm: '생산팀' },
        { departmentId: 5, parentDepartmentId: 4, departmentNm: '생산1팀' },
      ],
    });
  });

  async function renderPage(overrides: Partial<typeof PAGE_PROPS> = {}) {
    render(<EmployeeManagePage {...PAGE_PROPS} {...overrides} />);
    await screen.findByRole('button', { name: '홍길동 사원 정보 열기' });
  }

  const dialogOf = (name: string) => screen.findByRole('dialog', { name });

  it('재직 구분 기본값으로 목록을 조회하고 이름 링크와 상세 버튼을 보여 준다', async () => {
    await renderPage();
    expect(mocks.fetchEmployees).toHaveBeenCalledWith({ keyword: '', status: 'ACTIVE' });
    expect(screen.getByRole('gridcell', { name: '261102' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '김휴직' })).toBeInTheDocument();
  });

  it('이름 링크와 상세(연필) 버튼 모두 수정 팝업을 연다', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '홍길동' }));
    expect(await dialogOf('사원 정보 수정')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog', { name: '사원 정보 수정' })).getAllByRole('button', { name: '닫기' })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '사원 정보 수정' })).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: '김휴직 사원 정보 열기' }));
    const dialog = await dialogOf('사원 정보 수정');
    expect(within(dialog).getByRole('textbox', { name: /^이름/ })).toHaveValue('김휴직');
  });

  it('입력한 검색어를 조회 버튼으로 적용한다', async () => {
    await renderPage();
    fireEvent.change(screen.getByRole('textbox', { name: '사원 검색' }), { target: { value: '홍' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(mocks.fetchEmployees).toHaveBeenLastCalledWith({ keyword: '홍', status: 'ACTIVE' }));
  });

  it('이름을 누르면 기존 값으로 수정 팝업이 열리고 사번은 잠기며 저장하면 수정 API를 호출한다', async () => {
    mocks.updateEmployee.mockResolvedValue(row());
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '홍길동 사원 정보 열기' }));

    const dialog = await dialogOf('사원 정보 수정');
    expect(within(dialog).getByRole('textbox', { name: '사번' })).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: '사번' })).toHaveValue('261101');
    expect(within(dialog).getByRole('textbox', { name: /^이름/ })).toHaveValue('홍길동');
    expect(within(dialog).getByRole('textbox', { name: /부서/ })).toHaveValue('생산1팀');
    expect(within(dialog).getByRole('textbox', { name: '주민등록번호' })).toHaveAttribute('placeholder', '현재 900101-1******');
    expect(within(dialog).getByRole('checkbox', { name: /실사용자/ })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: /실사용자/ })).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: '로그인 아이디' })).toHaveValue('hong.gd');

    fireEvent.change(within(dialog).getByRole('textbox', { name: '영문이름' }), { target: { value: 'Gil Dong' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));

    await waitFor(() => expect(mocks.updateEmployee).toHaveBeenCalledTimes(1));
    const [userId, payload] = mocks.updateEmployee.mock.calls[0];
    expect(userId).toBe(5);
    expect(payload).toMatchObject({
      employeeNo: '261101', userNm: '홍길동', englishNm: 'Gil Dong', departmentId: 5, positionCode: 'MANAGER',
      levelId: 7, realUserAt: 'Y', loginCode: '', initialPassword: '', residentNo: '',
    });
    expect(payload).not.toHaveProperty('photoImage');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '사원 정보 수정' })).toBeNull());
  });

  it('사원 추가: 빈 값은 막고, 부서 도움창으로 부서를 고르고 필수값을 채우면 등록 API를 호출한다', async () => {
    mocks.createEmployee.mockResolvedValue(row({ userId: 9 }));
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '사원 추가' }));
    const dialog = await dialogOf('사원 등록');
    expect(within(dialog).getByRole('textbox', { name: '사번' })).toBeEnabled();

    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    expect(await within(dialog).findByText('이름을 입력해 주세요.')).toBeInTheDocument();
    expect(mocks.createEmployee).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByRole('textbox', { name: /^이름/ }), { target: { value: '박신규' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '선택' }));
    const picker = await dialogOf('부서 선택');
    fireEvent.click(await within(picker).findByRole('gridcell', { name: '생산1팀' }));
    await waitFor(() => expect(within(dialog).getByRole('textbox', { name: /부서/ })).toHaveValue('생산팀 > 생산1팀'));

    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /직위/ }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: '사원' }));
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /근무형태/ }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: '정규' }));
    fireEvent.change(within(dialog).getByRole('textbox', { name: /입사일/ }), { target: { value: '2026-11-05' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));

    await waitFor(() => expect(mocks.createEmployee).toHaveBeenCalledTimes(1));
    expect(mocks.createEmployee.mock.calls[0][0]).toMatchObject({
      employeeNo: '', userNm: '박신규', departmentId: 5, positionCode: 'STAFF', employmentTypeCode: 'REGULAR',
      joinDt: '2026-11-05', realUserAt: 'N', loginCode: '', initialPassword: '',
    });
  });

  it('직접 입력한 사번은 포커스를 벗어날 때 중복 여부를 안내한다', async () => {
    mocks.checkEmployeeNoAvailable.mockResolvedValue(false);
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '사원 추가' }));
    const dialog = await dialogOf('사원 등록');
    const field = within(dialog).getByRole('textbox', { name: '사번' });
    fireEvent.change(field, { target: { value: '261101' } });
    fireEvent.blur(field);

    expect(await within(dialog).findByText('이미 사용 중인 사번입니다.')).toBeInTheDocument();
    expect(mocks.checkEmployeeNoAvailable).toHaveBeenCalledWith('261101', null);
  });

  it('실사용자를 체크하면 로그인 아이디·초기 비밀번호 입력이 열린다', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '사원 추가' }));
    const dialog = await dialogOf('사원 등록');
    expect(within(dialog).queryByLabelText(/초기 비밀번호/)).toBeNull();

    fireEvent.click(within(dialog).getByRole('checkbox', { name: /실사용자/ }));
    expect(within(dialog).getByRole('textbox', { name: /로그인 아이디/ })).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/초기 비밀번호/)).toHaveAttribute('type', 'password');
  });

  it('로그인 아이디는 비워 둘 수 있고 직접 입력하면 포커스를 벗어날 때 중복 여부를 안내한다', async () => {
    mocks.checkLoginCodeAvailable.mockResolvedValue(false);
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '사원 추가' }));
    const dialog = await dialogOf('사원 등록');
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /실사용자/ }));
    const field = within(dialog).getByRole('textbox', { name: '로그인 아이디' });
    expect(field).not.toBeRequired();
    expect(within(dialog).getByText(/비워 두면 사번을 로그인 아이디로 씁니다/)).toBeInTheDocument();

    fireEvent.blur(field);
    expect(mocks.checkLoginCodeAvailable).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: 'hong.gd' } });
    fireEvent.blur(field);
    expect(await within(dialog).findByText('이미 사용 중인 로그인 아이디입니다.')).toBeInTheDocument();
    expect(mocks.checkLoginCodeAvailable).toHaveBeenCalledWith('hong.gd');
  });

  it('사번 칸에 한 번 부여하면 변경할 수 없다는 안내를 보여 준다', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '사원 추가' }));
    const dialog = await dialogOf('사원 등록');
    expect(within(dialog).getByText(/부여한 사번은 변경할 수 없습니다/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getAllByRole('button', { name: '닫기' })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '사원 등록' })).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: '홍길동' }));
    const edit = await dialogOf('사원 정보 수정');
    expect(within(edit).getByText('사번은 한 번 부여하면 변경할 수 없습니다.')).toBeInTheDocument();
  });

  it('주소 검색으로 우편번호와 주소를 채우고 상세주소로 이동한다', async () => {
    mocks.openPostcodeSearch.mockImplementation(async (onSelect: (value: { postalCode: string; address: string }) => void) => {
      onSelect({ postalCode: '13529', address: '경기 성남시 분당구 판교역로 166 (백현동)' });
    });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '사원 추가' }));
    const dialog = await dialogOf('사원 등록');
    expect(within(dialog).getByRole('textbox', { name: '우편번호' })).toHaveAttribute('readonly');
    expect(within(dialog).getByRole('textbox', { name: '주소' })).toHaveAttribute('readonly');

    fireEvent.click(within(dialog).getByRole('button', { name: '주소 검색' }));
    await waitFor(() => expect(within(dialog).getByRole('textbox', { name: '우편번호' })).toHaveValue('13529'));
    // 버튼 클릭이 칸의 클릭으로도 전달되어 검색 창이 두 번 열리면 브라우저가 팝업 차단 안내를 띄운다.
    expect(mocks.openPostcodeSearch).toHaveBeenCalledTimes(1);
    expect(within(dialog).getByRole('textbox', { name: '주소' })).toHaveValue('경기 성남시 분당구 판교역로 166 (백현동)');
    await waitFor(() => expect(within(dialog).getByRole('textbox', { name: '상세주소' })).toHaveFocus());
  });

  it('우편번호 서비스를 불러오지 못하면 팝업 안에 오류를 보여 준다', async () => {
    mocks.openPostcodeSearch.mockRejectedValue(new Error('우편번호 검색 서비스를 불러오지 못했습니다.'));
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '사원 추가' }));
    const dialog = await dialogOf('사원 등록');
    fireEvent.click(within(dialog).getByRole('button', { name: '주소 검색' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('우편번호 검색 서비스를 불러오지 못했습니다.');
  });

  it('내/외국인이 외국인이면 국적과 체류·계약 항목이 나타난다', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '사원 추가' }));
    const dialog = await dialogOf('사원 등록');
    expect(within(dialog).queryByRole('combobox', { name: '국적' })).toBeNull();

    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /내\/외국인/ }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: '외국인' }));

    expect(within(dialog).getByRole('combobox', { name: '국적' })).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /취업기간만료일/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /근로계약 종료일/ })).toBeInTheDocument();
  });

  it('서버 오류는 팝업 안에 보여 주고 팝업을 닫지 않는다', async () => {
    mocks.updateEmployee.mockRejectedValue(new Error('이미 사용 중인 이메일입니다.'));
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '홍길동 사원 정보 열기' }));
    const dialog = await dialogOf('사원 정보 수정');
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));

    expect(await within(dialog).findByText('이미 사용 중인 이메일입니다.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '사원 정보 수정' })).toBeInTheDocument();
  });

  it('수정 권한이 없으면 팝업은 조회 전용이다', async () => {
    await renderPage({ selectedMenuPermissions: { read: true, create: true, update: false, delete: false, excel: false } });
    fireEvent.click(screen.getByRole('button', { name: '홍길동 사원 정보 열기' }));
    const dialog = await dialogOf('사원 정보 수정');

    expect(within(dialog).queryByRole('button', { name: '저장' })).toBeNull();
    expect(within(dialog).getAllByRole('button', { name: '닫기' }).length).toBeGreaterThan(0);
  });

  it('테넌트 관리자가 아니면 사원 추가를 보여 주지 않는다', async () => {
    await renderPage({ isTenantAdmin: false });
    expect(screen.queryByRole('button', { name: '사원 추가' })).toBeNull();
  });
});
