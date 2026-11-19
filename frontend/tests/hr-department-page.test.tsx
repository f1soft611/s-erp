import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DepartmentManagePage } from '../src/pages/hr/department/DepartmentManagePage';
import {
  buildDepartmentPath,
  buildTreeRows,
  collectDescendantIds,
  COMPANY_ROW_ID,
  listParentCandidates,
} from '../src/pages/hr/department/data/departmentTree';
import type { DepartmentRow } from '../src/pages/hr/department/types/department.types';

const mocks = vi.hoisted(() => ({
  fetchDepartments: vi.fn(),
  fetchDepartmentUsers: vi.fn(),
  fetchUnassignedUsers: vi.fn(),
  createDepartment: vi.fn(),
  updateDepartment: vi.fn(),
  changeDepartmentUse: vi.fn(),
}));

vi.mock('../src/pages/hr/department/services/department.service', () => mocks);

function dept(id: number, parent: number | null, name: string, useAt: 'Y' | 'N' = 'Y'): DepartmentRow {
  return {
    departmentId: id,
    parentDepartmentId: parent,
    departmentNm: name,
    managerUserId: null,
    managerUserNm: '',
    departmentDc: '',
    sortOrder: 0,
    useAt,
    childCount: 0,
    userCount: 0,
  };
}

const ROWS = [dept(1, null, '본사'), dept(2, 1, '영업팀'), dept(3, 2, '영업1파트'), dept(9, 1, '폐지팀', 'N')];

describe('부서 트리 도우미', () => {
  it('하위 부서와 경로를 계산하고 상위 부서 후보에서 자기 자신·하위·사용안함을 뺀다', () => {
    expect([...collectDescendantIds(ROWS, 1)].sort()).toEqual([2, 3, 9]);
    expect(buildDepartmentPath(ROWS, 3)).toBe('본사 > 영업팀 > 영업1파트');
    expect(listParentCandidates(ROWS, 2).map((c) => c.departmentId)).toEqual([1]);
    expect(listParentCandidates(ROWS, null).map((c) => c.departmentId).sort()).toEqual([1, 2, 3]);
  });

  it('회사 노드를 맨 위에 얹고 최상위 부서만 회사 아래로 연결한다', () => {
    const tree = buildTreeRows('에프원소프트', ROWS);
    expect(tree[0]).toMatchObject({ departmentId: COMPANY_ROW_ID, departmentNm: '에프원소프트', isCompany: true, parentDepartmentId: null, childCount: 1 });
    expect(tree.find((row) => row.departmentId === 1)?.parentDepartmentId).toBe(COMPANY_ROW_ID);
    expect(tree.find((row) => row.departmentId === 2)?.parentDepartmentId).toBe(1);
    expect(ROWS[0].parentDepartmentId).toBeNull();
    expect(buildTreeRows('', [])[0].departmentNm).toBe('회사');
  });
});

describe('부서관리 페이지', () => {
  const baseProps = {
    selectedModule: { id: 'hr', name: '인사관리', icon: null, tree: [], menus: [] },
    currentMenuName: '부서관리',
    content: { title: '부서관리', description: '부서를 관리합니다.', cards: [], items: [] },
    selectedMenuPermissions: { read: true, create: true, update: true, delete: false, excel: false },
    isTenantAdmin: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchDepartments.mockResolvedValue({
      companyName: '에프원소프트',
      departments: ROWS.filter((row) => row.useAt === 'Y'),
    });
    mocks.fetchUnassignedUsers.mockResolvedValue([
      { userId: 8, userNm: '미배정사원', levelNm: '', loginCode: 'free', mobileNo: '', emailAddr: '', managerYn: 'N' },
    ]);
    mocks.fetchDepartmentUsers.mockResolvedValue([
      { userId: 5, userNm: '홍길동', levelNm: '과장', loginCode: 'hong', mobileNo: '', emailAddr: '', managerYn: 'Y' },
    ]);
  });

  async function renderPage(overrides: Partial<typeof baseProps> = {}) {
    render(<DepartmentManagePage {...baseProps} {...overrides} />);
    await screen.findByRole('gridcell', { name: '본사' });
  }

  it('열림·닫힘 폴더와 하위 없음 아이콘으로 계층을 보여 준다', async () => {
    await renderPage();
    expect(mocks.fetchDepartments).toHaveBeenCalledWith(false);
    expect(screen.getAllByTestId('FolderOpenOutlinedIcon')).toHaveLength(2);
    expect(screen.getAllByTestId('DescriptionOutlinedIcon')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '영업팀 접기' }));
    expect(screen.getAllByTestId('FolderOutlinedIcon')).toHaveLength(1);
  });

  it('최상단은 회사명 노드이고 편집·사용안함·복원은 막히며 하위 부서 추가만 가능하다', async () => {
    await renderPage();
    expect(screen.getByRole('gridcell', { name: '에프원소프트' })).toBeInTheDocument();
    expect(screen.getAllByTestId('BusinessOutlinedIcon')).toHaveLength(1);

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '에프원소프트' }));
    for (const name of ['편집', '사용안함', '복원']) {
      expect(screen.getByRole('menuitem', { name })).toHaveAttribute('aria-disabled', 'true');
    }
    fireEvent.click(screen.getByRole('menuitem', { name: '하위 부서 추가' }));
    const dialog = await screen.findByRole('dialog', { name: '부서 등록' });
    expect(within(dialog).getByRole('combobox', { name: '상위 부서' })).toHaveValue('에프원소프트(최상위)');
  });

  it('회사 노드를 선택하면 부서 미지정 사원을 보여 준다', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('gridcell', { name: '에프원소프트' }));
    await waitFor(() => expect(mocks.fetchUnassignedUsers).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('미배정사원')).toBeInTheDocument();
    expect(screen.getByText(/에프원소프트 부서 미지정 사원 \(1명\)/)).toBeInTheDocument();
    expect(mocks.fetchDepartmentUsers).not.toHaveBeenCalled();
  });

  it('부서를 선택하면 소속 사원을 불러온다', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('gridcell', { name: '영업팀' }));
    await waitFor(() => expect(mocks.fetchDepartmentUsers).toHaveBeenCalledWith(2, 'ACTIVE'));
    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText(/본사 > 영업팀 소속 사원/)).toBeInTheDocument();
  });

  it('소속 사원 목록에 사번·직위·재직상태가 보이고 재직 구분을 바꾸면 다시 조회한다', async () => {
    mocks.fetchDepartmentUsers.mockResolvedValue([
      { userId: 5, userNm: '홍길동', levelNm: '대리', loginCode: 'hong', mobileNo: '', emailAddr: '', managerYn: 'N',
        employeeNo: '261101', positionNm: '과장', employmentStatus: 'LEAVE' },
    ]);
    await renderPage();
    fireEvent.click(screen.getByRole('gridcell', { name: '영업팀' }));
    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '261101' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '과장' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '휴직' })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '재직 구분' }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: '퇴직' }));
    await waitFor(() => expect(mocks.fetchDepartmentUsers).toHaveBeenLastCalledWith(2, 'RETIRED'));
  });

  it('우클릭 편집은 현재 값으로 팝업을 열고 저장하면 수정 API를 호출한다', async () => {
    mocks.updateDepartment.mockResolvedValue(dept(2, 1, '영업1팀'));
    await renderPage();
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '영업팀' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '편집' }));

    const dialog = await screen.findByRole('dialog', { name: '부서 편집' });
    const nameInput = within(dialog).getByRole('textbox', { name: /부서명/ });
    expect(nameInput).toHaveValue('영업팀');
    fireEvent.change(nameInput, { target: { value: '영업1팀' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));

    await waitFor(() => expect(mocks.updateDepartment).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ departmentNm: '영업1팀', parentDepartmentId: 1 }),
    ));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '부서 편집' })).toBeNull());
  });

  it('우클릭 하위 부서 추가는 상위 부서가 정해진 등록 팝업을 열고 서버 오류를 팝업에 보여 준다', async () => {
    mocks.createDepartment.mockRejectedValue(new Error('같은 상위 부서 아래에 동일한 부서명이 있습니다.'));
    await renderPage();
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '영업팀' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '하위 부서 추가' }));

    const dialog = await screen.findByRole('dialog', { name: '부서 등록' });
    expect(within(dialog).getByRole('combobox', { name: '상위 부서' })).toHaveValue('본사 > 영업팀');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /부서명/ }), { target: { value: '영업2파트' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));

    expect(await within(dialog).findByText('같은 상위 부서 아래에 동일한 부서명이 있습니다.')).toBeInTheDocument();
    expect(mocks.createDepartment).toHaveBeenCalledWith(
      expect.objectContaining({ parentDepartmentId: 2, departmentNm: '영업2파트' }),
    );
  });

  it('부서장 선택지는 그 부서의 소속 사원만이고 신규 부서에서는 지정할 수 없다', async () => {
    await renderPage();
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '영업팀' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '편집' }));
    const edit = await screen.findByRole('dialog', { name: '부서 편집' });
    expect(mocks.fetchDepartmentUsers).toHaveBeenCalledWith(2, 'ACTIVE');
    const managerBox = within(edit).getByRole('combobox', { name: '부서장' });
    expect(managerBox).toBeEnabled();
    fireEvent.mouseDown(managerBox);
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['홍길동 과장']);
    expect(screen.queryByRole('option', { name: /미배정사원/ })).toBeNull();
    fireEvent.click(within(edit).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '부서 편집' })).toBeNull());
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '에프원소프트' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '하위 부서 추가' }));
    const create = await screen.findByRole('dialog', { name: '부서 등록' });
    expect(within(create).getByRole('combobox', { name: '부서장' })).toBeDisabled();
  });

  it('부서장이 소속에서 빠졌어도 이름만 고치면 부서장이 지워지지 않는다', async () => {
    mocks.fetchDepartments.mockResolvedValue({
      companyName: '에프원소프트',
      departments: [{ ...dept(2, null, '영업팀'), managerUserId: 77, managerUserNm: '전출자' }],
    });
    mocks.fetchDepartmentUsers.mockResolvedValue([]);
    mocks.updateDepartment.mockResolvedValue(dept(2, null, '영업1팀'));
    render(<DepartmentManagePage {...baseProps} />);
    await screen.findByRole('gridcell', { name: '영업팀' });
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '영업팀' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '편집' }));
    const edit = await screen.findByRole('dialog', { name: '부서 편집' });
    expect(within(edit).getByRole('combobox', { name: '부서장' })).toHaveValue('전출자 (소속 아님)');
    fireEvent.change(within(edit).getByRole('textbox', { name: /부서명/ }), { target: { value: '영업1팀' } });
    fireEvent.click(within(edit).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(mocks.updateDepartment).toHaveBeenCalledWith(
      2, expect.objectContaining({ managerUserId: 77, departmentNm: '영업1팀' }),
    ));
  });

  it('사용안함은 확인 후 요청하고, 서버가 막으면 안내 메시지를 보여 준다', async () => {
    mocks.changeDepartmentUse.mockRejectedValue(new Error('하위 부서 또는 소속 사원이 있어 사용안함 처리할 수 없습니다.'));
    await renderPage();
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '본사' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '사용안함' }));

    const confirmDialog = await screen.findByRole('dialog', { name: '부서 사용안함' });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '사용안함' }));

    await waitFor(() => expect(mocks.changeDepartmentUse).toHaveBeenCalledWith(1, 'N'));
    expect(await screen.findByText('하위 부서 또는 소속 사원이 있어 사용안함 처리할 수 없습니다.')).toBeInTheDocument();
  });

  it('쓰기 권한이 없으면 우클릭의 추가·편집·사용안함이 비활성이다', async () => {
    await renderPage({ isTenantAdmin: false });
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '영업팀' }));
    for (const name of ['하위 부서 추가', '편집', '사용안함']) {
      expect(screen.getByRole('menuitem', { name })).toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('사용안함 포함을 켜면 사용안함 부서까지 다시 조회한다', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('checkbox', { name: '사용안함 포함' }));
    await waitFor(() => expect(mocks.fetchDepartments).toHaveBeenLastCalledWith(true));
  });
});
