import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeePickerDialog } from '../src/shared/components/employee-picker';
import { normalizePickerEmployee } from '../src/shared/components/employee-picker/employeePicker.service';
import type { EmployeePickerRow } from '../src/shared/components/employee-picker/employeePicker.types';

const mocks = vi.hoisted(() => ({ fetchPickerDepartments: vi.fn(), fetchPickerEmployees: vi.fn() }));
vi.mock('../src/shared/components/department-picker/departmentPicker.service', () => ({
  fetchPickerDepartments: mocks.fetchPickerDepartments,
}));
vi.mock('../src/shared/components/employee-picker/employeePicker.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/shared/components/employee-picker/employeePicker.service')>()),
  fetchPickerEmployees: mocks.fetchPickerEmployees,
}));

const DEPARTMENTS = [
  { departmentId: 4, parentDepartmentId: null, departmentNm: '생산팀' },
  { departmentId: 5, parentDepartmentId: 4, departmentNm: '생산1팀' },
  { departmentId: 7, parentDepartmentId: null, departmentNm: '품질팀' },
];

function employee(overrides: Partial<EmployeePickerRow> = {}): EmployeePickerRow {
  return {
    userId: 11, employeeNo: '261101', userNm: '홍길동', departmentId: 5, departmentNm: '생산1팀',
    positionCode: 'MANAGER', positionNm: '과장', photoImage: '', ...overrides,
  };
}

const ALL = [
  employee(),
  employee({ userId: 12, employeeNo: '261102', userNm: '김철수', departmentId: 7, departmentNm: '품질팀', positionCode: 'STAFF', positionNm: '사원' }),
  employee({ userId: 13, employeeNo: '261103', userNm: '무소속', departmentId: null, departmentNm: '', positionCode: '', positionNm: '' }),
];

describe('사원 선택 도움창', () => {
  const onChange = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchPickerDepartments.mockResolvedValue({ companyName: '에프원소프트', departments: DEPARTMENTS });
    mocks.fetchPickerEmployees.mockImplementation(async (filters: { departmentId: number | null; keyword: string }) => {
      const byDepartment = filters.departmentId == null ? ALL : ALL.filter((row) => row.departmentId === filters.departmentId);
      return filters.keyword ? byDepartment.filter((row) => row.userNm.includes(filters.keyword)) : byDepartment;
    });
  });

  async function open() {
    render(<EmployeePickerDialog open onClose={onClose} onChange={onChange} />);
    await screen.findByRole('gridcell', { name: '에프원소프트' });
    await screen.findByRole('gridcell', { name: '홍길동' });
  }

  const tree = () => within(screen.getByRole('grid', { name: '사원 선택 부서 트리' }));
  const list = () => within(screen.getByRole('grid', { name: '사원 목록' }));

  it('열면 회사가 선택되어 전체 재직 인원을 보여 준다(부서 미지정 사원 포함)', async () => {
    await open();
    expect(screen.getByRole('dialog', { name: '사원 선택' })).toBeInTheDocument();
    expect(mocks.fetchPickerEmployees).toHaveBeenCalledWith({ departmentId: null, keyword: '' }, expect.anything());
    for (const name of ['홍길동', '김철수', '무소속']) {
      expect(list().getByRole('gridcell', { name })).toBeInTheDocument();
    }
    for (const header of ['사진', '부서명', '직위', '사번', '사원명']) {
      expect(list().getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
  });

  it('부서를 클릭하면 그 부서 소속 사원만, 회사를 클릭하면 다시 전체를 조회한다', async () => {
    await open();

    fireEvent.click(tree().getByRole('gridcell', { name: '생산1팀' }));
    await waitFor(() => expect(mocks.fetchPickerEmployees).toHaveBeenLastCalledWith({ departmentId: 5, keyword: '' }, expect.anything()));
    await waitFor(() => expect(list().queryByRole('gridcell', { name: '김철수' })).toBeNull());
    expect(list().getByRole('gridcell', { name: '홍길동' })).toBeInTheDocument();

    fireEvent.click(tree().getByRole('gridcell', { name: '에프원소프트' }));
    await waitFor(() => expect(mocks.fetchPickerEmployees).toHaveBeenLastCalledWith({ departmentId: null, keyword: '' }, expect.anything()));
    expect(await list().findByRole('gridcell', { name: '김철수' })).toBeInTheDocument();
  });

  it('상위 부서를 클릭하면 하위 부서 사원은 빼고 그 부서 소속만 조회한다', async () => {
    await open();
    fireEvent.click(tree().getByRole('gridcell', { name: '생산팀' }));
    await waitFor(() => expect(mocks.fetchPickerEmployees).toHaveBeenLastCalledWith({ departmentId: 4, keyword: '' }, expect.anything()));
    // 빈 목록 안내는 표(그리드)의 "데이터가 없습니다" 하나만 보여 준다(별도 안내 영역이 없어 도움창 크기가 변하지 않는다).
    expect(await list().findByText('데이터가 없습니다')).toBeInTheDocument();
    expect(screen.queryByText('조회된 사원이 없습니다.')).not.toBeInTheDocument();
  });

  it('통합검색어를 검색 버튼으로 적용한다', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('통합검색'), { target: { value: ' 김철 ' } });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    await waitFor(() => expect(mocks.fetchPickerEmployees).toHaveBeenLastCalledWith({ departmentId: null, keyword: '김철' }, expect.anything()));
    await waitFor(() => expect(list().queryByRole('gridcell', { name: '홍길동' })).toBeNull());
  });

  it('사원 행을 더블클릭하면 부서까지 포함한 값을 돌려주고 닫힌다', async () => {
    await open();
    fireEvent.doubleClick(list().getByRole('gridcell', { name: '홍길동' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      departmentId: 5, departmentNm: '생산1팀', userId: 11, positionCode: 'MANAGER', positionNm: '과장',
      employeeNo: '261101', userNm: '홍길동',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('한 번 클릭만으로는 선택을 확정하지 않는다', async () => {
    await open();
    fireEvent.click(list().getByRole('gridcell', { name: '홍길동' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('부서가 없는 사원은 부서 ID를 null, 부서명을 빈 문자열로 돌려준다', async () => {
    await open();
    fireEvent.doubleClick(list().getByRole('gridcell', { name: '무소속' }));
    expect(onChange).toHaveBeenCalledWith({
      departmentId: null, departmentNm: '', userId: 13, positionCode: '', positionNm: '', employeeNo: '261103', userNm: '무소속',
    });
  });

  it('더블클릭을 연달아 받아도 선택은 한 번만 전달한다', async () => {
    await open();
    const cell = list().getByRole('gridcell', { name: '홍길동' });
    fireEvent.doubleClick(cell);
    fireEvent.doubleClick(cell);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('조회에 실패하면 오류 메시지를 보여 준다', async () => {
    mocks.fetchPickerEmployees.mockRejectedValue(new Error('사원 목록을 조회하지 못했습니다.'));
    render(<EmployeePickerDialog open onClose={onClose} onChange={onChange} />);
    expect(await screen.findByText('사원 목록을 조회하지 못했습니다.')).toBeInTheDocument();
  });

  it('부서 조회가 실패해도 사원 목록은 보여 준다', async () => {
    mocks.fetchPickerDepartments.mockRejectedValue(new Error('부서 목록 오류'));
    render(<EmployeePickerDialog open onClose={onClose} onChange={onChange} />);
    expect(await screen.findByText('부서 목록 오류')).toBeInTheDocument();
    expect(await list().findByRole('gridcell', { name: '홍길동' })).toBeInTheDocument();
  });
});

describe('사원 선택 도움창 선택 해제', () => {
  const onChange = vi.fn();
  const onClose = vi.fn();
  const onClear = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchPickerDepartments.mockResolvedValue({ companyName: '에프원소프트', departments: DEPARTMENTS });
    mocks.fetchPickerEmployees.mockResolvedValue(ALL);
  });

  it('onClear를 주지 않으면 선택 해제 버튼이 없다', async () => {
    render(<EmployeePickerDialog open onClose={onClose} onChange={onChange} />);
    await screen.findByRole('gridcell', { name: '홍길동' });
    expect(screen.queryByRole('button', { name: '선택 해제' })).toBeNull();
  });

  it('onClear를 주면 선택 해제 버튼이 나타나고 누르면 호출하고 닫는다', async () => {
    render(<EmployeePickerDialog open onClose={onClose} onChange={onChange} onClear={onClear} />);
    await screen.findByRole('gridcell', { name: '홍길동' });

    fireEvent.click(screen.getByRole('button', { name: '선택 해제' }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('선택 해제는 한 번만 처리하고 이후 사원 선택은 받지 않는다', async () => {
    render(<EmployeePickerDialog open onClose={onClose} onChange={onChange} onClear={onClear} />);
    const row = await screen.findByRole('gridcell', { name: '홍길동' });

    fireEvent.click(screen.getByRole('button', { name: '선택 해제' }));
    fireEvent.click(screen.getByRole('button', { name: '선택 해제' }));
    fireEvent.doubleClick(row);

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('사원 선택 도움창 다중 선택', () => {
  const onApply = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchPickerDepartments.mockResolvedValue({ companyName: '에프원소프트', departments: DEPARTMENTS });
    mocks.fetchPickerEmployees.mockImplementation(async (filters: { departmentId: number | null; keyword: string }) =>
      (filters.departmentId == null ? ALL : ALL.filter((row) => row.departmentId === filters.departmentId)));
  });

  async function openMulti(extra: Partial<React.ComponentProps<typeof EmployeePickerDialog>> = {}) {
    render(<EmployeePickerDialog {...({ open: true, onClose, selectionMode: 'multiple', onApply, ...extra } as React.ComponentProps<typeof EmployeePickerDialog>)} />);
    await screen.findByRole('gridcell', { name: '홍길동' });
  }
  const list = () => within(screen.getByRole('grid', { name: '사원 목록' }));
  const check = (name: string) => fireEvent.click(list().getByRole('checkbox', { name: `${name} 선택` }));
  const dialog = () => within(screen.getByRole('dialog'));

  it('체크한 사원을 선택 순서대로 적용하고 선택 인원을 보여 준다', async () => {
    await openMulti();
    expect(dialog().getByText('선택 0명')).toBeInTheDocument();

    check('김철수');
    check('홍길동');
    expect(dialog().getByText('선택 2명')).toBeInTheDocument();
    fireEvent.click(dialog().getByRole('button', { name: '적용(2명)' }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith([
      { departmentId: 7, departmentNm: '품질팀', userId: 12, positionCode: 'STAFF', positionNm: '사원', employeeNo: '261102', userNm: '김철수' },
      { departmentId: 5, departmentNm: '생산1팀', userId: 11, positionCode: 'MANAGER', positionNm: '과장', employeeNo: '261101', userNm: '홍길동' },
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it('더블클릭으로는 적용하지 않고 취소하면 적용 콜백을 부르지 않는다', async () => {
    await openMulti();
    fireEvent.doubleClick(list().getByRole('gridcell', { name: '홍길동' }));
    expect(onApply).not.toHaveBeenCalled();
    check('홍길동');
    fireEvent.click(dialog().getByRole('button', { name: '취소' }));
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('부서를 바꿔도 이미 고른 사원은 선택이 유지되고 적용에 포함된다', async () => {
    await openMulti();
    check('홍길동');
    fireEvent.click(within(screen.getByRole('grid', { name: '사원 선택 부서 트리' })).getByRole('gridcell', { name: '품질팀' }));
    await waitFor(() => expect(list().queryByRole('gridcell', { name: '홍길동' })).toBeNull());
    check('김철수');
    expect(dialog().getByText('선택 2명')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('grid', { name: '사원 선택 부서 트리' })).getByRole('gridcell', { name: '에프원소프트' }));
    await list().findByRole('gridcell', { name: '홍길동' });
    expect(list().getByRole('checkbox', { name: '홍길동 선택' })).toBeChecked();
    fireEvent.click(dialog().getByRole('button', { name: '적용(2명)' }));
    expect(onApply.mock.calls[0][0].map((item: { userNm: string }) => item.userNm)).toEqual(['홍길동', '김철수']);
  });

  it('초기 선택을 체크해 두고 선택 해제·현재 목록 전체 선택·0명 적용을 지원한다', async () => {
    await openMulti({ selected: [{ departmentId: 5, departmentNm: '생산1팀', userId: 11, positionCode: 'MANAGER', positionNm: '과장', employeeNo: '261101', userNm: '홍길동' }] });
    expect(list().getByRole('checkbox', { name: '홍길동 선택' })).toBeChecked();
    expect(dialog().getByText('선택 1명')).toBeInTheDocument();

    fireEvent.click(dialog().getByRole('button', { name: '현재 목록 전체 선택' }));
    expect(dialog().getByText('선택 3명')).toBeInTheDocument();
    fireEvent.click(dialog().getByRole('button', { name: '선택 해제' }));
    expect(dialog().getByText('선택 0명')).toBeInTheDocument();
    fireEvent.click(dialog().getByRole('button', { name: '적용(0명)' }));
    expect(onApply).toHaveBeenCalledWith([]);
  });

  it('최대 인원을 넘기려 하면 안내 줄에 알리고 전체 선택도 한도까지만 채운다', async () => {
    await openMulti({ maxSelect: 2 });
    fireEvent.click(dialog().getByRole('button', { name: '현재 목록 전체 선택' }));
    expect(dialog().getByText('선택 2명')).toBeInTheDocument();
    expect(dialog().getByRole('alert')).toHaveTextContent('최대 2명까지 선택할 수 있습니다.');

    check('무소속');
    expect(dialog().getByText('선택 2명')).toBeInTheDocument();
    check('홍길동');
    expect(dialog().getByText('선택 1명')).toBeInTheDocument();
    expect(dialog().queryByRole('alert')).toBeNull();
  });

  it('다중에서는 단일용 선택 해제 버튼이 없고 다시 열면 초기 선택으로 돌아간다', async () => {
    const { rerender } = render(<EmployeePickerDialog open onClose={onClose} selectionMode="multiple" onApply={onApply} />);
    await screen.findByRole('gridcell', { name: '홍길동' });
    check('홍길동');
    expect(dialog().getByText('선택 1명')).toBeInTheDocument();

    rerender(<EmployeePickerDialog open={false} onClose={onClose} selectionMode="multiple" onApply={onApply} />);
    rerender(<EmployeePickerDialog open onClose={onClose} selectionMode="multiple" onApply={onApply} />);
    await screen.findByRole('gridcell', { name: '홍길동' });
    expect(dialog().getByText('선택 0명')).toBeInTheDocument();
  });
});

describe('사원 선택 응답 변환', () => {
  it('서버 항목을 행으로 바꾸고 부서·직위·사진이 없으면 빈 값을 쓴다', () => {
    expect(normalizePickerEmployee({ userId: '11', employeeNo: '1', userNm: '홍', departmentId: 5, departmentNm: '생산1팀', positionCode: 'M', positionNm: '과장', photoImage: 'data:x' }))
      .toEqual({ userId: 11, employeeNo: '1', userNm: '홍', departmentId: 5, departmentNm: '생산1팀', positionCode: 'M', positionNm: '과장', photoImage: 'data:x' });
    expect(normalizePickerEmployee({ userId: 12, userNm: '무소속' }))
      .toEqual({ userId: 12, employeeNo: '', userNm: '무소속', departmentId: null, departmentNm: '', positionCode: '', positionNm: '', photoImage: '' });
    expect(() => normalizePickerEmployee({ userNm: '번호없음' })).toThrow('사원 ID');
  });
});
