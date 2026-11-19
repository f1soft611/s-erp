import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DepartmentPickerDialog } from '../src/shared/components/department-picker';
import {
  buildDepartmentPath,
  buildPickerRows,
  PICKER_COMPANY_ROW_ID,
} from '../src/shared/components/department-picker/departmentPicker.utils';
import type { DepartmentPickerDepartment } from '../src/shared/components/department-picker/departmentPicker.types';

const mocks = vi.hoisted(() => ({ fetchPickerDepartments: vi.fn() }));
vi.mock('../src/shared/components/department-picker/departmentPicker.service', () => mocks);

const d = (id: number, parent: number | null, name: string): DepartmentPickerDepartment => ({
  departmentId: id, parentDepartmentId: parent, departmentNm: name,
});
const DEPARTMENTS = [
  d(1, null, '영업팀'), d(2, 1, '영업팀(내부)'), d(3, 1, '영업팀(외부)'),
  d(4, null, '생산팀'), d(5, 4, '생산1팀'), d(6, 4, '생산2팀'), d(7, null, '품질팀'),
];

describe('부서 선택 도움창 도우미', () => {
  it('회사 노드를 맨 위에 얹고 최상위 부서만 회사 아래로 연결한다', () => {
    const rows = buildPickerRows('에프원소프트', DEPARTMENTS);
    expect(rows[0]).toMatchObject({ departmentId: PICKER_COMPANY_ROW_ID, isCompany: true, departmentNm: '에프원소프트' });
    expect(rows.find((row) => row.departmentId === 1)?.parentDepartmentId).toBe(PICKER_COMPANY_ROW_ID);
    expect(rows.find((row) => row.departmentId === 5)?.parentDepartmentId).toBe(4);
    expect(buildPickerRows('', [])[0].departmentNm).toBe('회사');
  });

  it('검색하면 일치한 부서와 그 상위 부서만 남기고 회사 노드는 유지한다', () => {
    const rows = buildPickerRows('에프원소프트', DEPARTMENTS, ' 생산1 ');
    expect(rows.map((row) => row.departmentId)).toEqual([PICKER_COMPANY_ROW_ID, 4, 5]);
    expect(buildPickerRows('에프원소프트', DEPARTMENTS, '없는부서').map((row) => row.departmentId)).toEqual([PICKER_COMPANY_ROW_ID]);
  });

  it('상위 부서를 포함한 경로를 만든다', () => {
    expect(buildDepartmentPath(DEPARTMENTS, 5)).toBe('생산팀 > 생산1팀');
    expect(buildDepartmentPath(DEPARTMENTS, 7)).toBe('품질팀');
  });
});

describe('DepartmentPickerDialog', () => {
  const onChange = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchPickerDepartments.mockResolvedValue({ companyName: '에프원소프트', departments: DEPARTMENTS });
  });

  async function open(props: { selectedId?: number | null } = {}) {
    render(<DepartmentPickerDialog open onClose={onClose} onChange={onChange} {...props} />);
    await screen.findByRole('gridcell', { name: '에프원소프트' });
  }

  it('열면 부서를 조회해 회사와 부서 트리를 보여 준다', async () => {
    await open();
    expect(mocks.fetchPickerDepartments).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: '부서 선택' })).toBeInTheDocument();
    for (const name of ['영업팀', '영업팀(내부)', '생산1팀', '품질팀']) {
      expect(screen.getByRole('gridcell', { name })).toBeInTheDocument();
    }
    expect(screen.getAllByTestId('BusinessOutlinedIcon')).toHaveLength(1);
  });

  it('부서를 클릭하면 부서와 경로를 돌려주고 닫힌다', async () => {
    await open();
    fireEvent.click(screen.getByRole('gridcell', { name: '생산1팀' }));
    expect(onChange).toHaveBeenCalledWith({ departmentId: 5, departmentNm: '생산1팀', departmentPath: '생산팀 > 생산1팀' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('부모가 선택에 반응해 다시 그려져도 선택은 한 번만 전달한다(반복 호출로 화면이 멈추지 않는다)', async () => {
    const picked = vi.fn();
    function Parent() {
      const [chosen, setChosen] = useState<number | null>(null);
      return (
        <DepartmentPickerDialog
          open
          selectedId={chosen}
          onClose={onClose}
          onChange={(option) => { picked(option.departmentId); setChosen(option.departmentId); }}
        />
      );
    }
    render(<Parent />);
    await screen.findByRole('gridcell', { name: '에프원소프트' });
    fireEvent.click(screen.getByRole('gridcell', { name: '생산1팀' }));
    await waitFor(() => expect(screen.getByText('현재 선택: 생산팀 > 생산1팀')).toBeInTheDocument());
    expect(picked).toHaveBeenCalledTimes(1);
    expect(picked).toHaveBeenCalledWith(5);
  });

  it('회사는 선택할 수 없고 안내만 보여 준다', async () => {
    await open();
    fireEvent.click(screen.getByRole('gridcell', { name: '에프원소프트' }));
    expect(await screen.findByText('회사는 선택할 수 없습니다. 부서를 선택해 주세요.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('검색하면 일치한 부서와 상위 부서만 보이고 없으면 안내한다', async () => {
    await open();
    fireEvent.change(screen.getByRole('textbox', { name: '부서 검색' }), { target: { value: '생산1' } });
    await waitFor(() => expect(screen.queryByRole('gridcell', { name: '영업팀' })).toBeNull());
    expect(screen.getByRole('gridcell', { name: '생산팀' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '생산1팀' })).toBeInTheDocument();
    expect(screen.queryByRole('gridcell', { name: '생산2팀' })).toBeNull();

    fireEvent.change(screen.getByRole('textbox', { name: '부서 검색' }), { target: { value: '없는부서' } });
    expect(await screen.findByText('검색 결과가 없습니다.')).toBeInTheDocument();
  });

  it('현재 선택된 부서의 경로를 안내한다', async () => {
    await open({ selectedId: 6 });
    expect(screen.getByText('현재 선택: 생산팀 > 생산2팀')).toBeInTheDocument();
  });

  it('조회에 실패하면 오류를 보여 준다', async () => {
    mocks.fetchPickerDepartments.mockRejectedValue(new Error('서버 오류'));
    render(<DepartmentPickerDialog open onClose={onClose} onChange={onChange} />);
    expect(await screen.findByText('서버 오류')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
