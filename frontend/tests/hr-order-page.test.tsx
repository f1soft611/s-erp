import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderManagePage } from '../src/pages/hr/order/OrderManagePage';
import { todayString } from '../src/pages/hr/order/data/orderGridData';
import type { OrderEmployee, OrderTypeDef } from '../src/pages/hr/order/types/order.types';

const mocks = vi.hoisted(() => ({
  fetchOrderTypes: vi.fn(),
  fetchOrderCodeOptions: vi.fn(),
  fetchOrderEmployee: vi.fn(),
  processOrder: vi.fn(),
  fetchOrderHistory: vi.fn(),
}));

vi.mock('../src/pages/hr/order/services/order.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/pages/hr/order/services/order.service')>()),
  fetchOrderTypes: mocks.fetchOrderTypes,
  fetchOrderCodeOptions: mocks.fetchOrderCodeOptions,
  fetchOrderEmployee: mocks.fetchOrderEmployee,
  processOrder: mocks.processOrder,
  fetchOrderHistory: mocks.fetchOrderHistory,
}));

// 도움창은 선택 결과만 확인하면 되므로 버튼 하나로 대신한다.
vi.mock('../src/shared/components/employee-picker', () => ({
  EmployeePickerDialog: ({ open, onApply }: { open: boolean; onApply: (items: Array<{ userId: number }>) => void }) => (
    open ? <button type="button" onClick={() => onApply([{ userId: 11 }, { userId: 12 }])}>사원 2명 담기</button> : null
  ),
}));
vi.mock('../src/shared/components/department-picker', () => ({
  DepartmentPickerDialog: ({ open, onChange }: { open: boolean; onChange: (value: { departmentId: number; departmentNm: string }) => void }) => (
    open ? <button type="button" onClick={() => onChange({ departmentId: 8, departmentNm: '경영지원팀' })}>경영지원팀 고르기</button> : null
  ),
}));

const TYPES: OrderTypeDef[] = [
  { code: 'TRANSFER', name: '부서이동', fieldCode: 'DEPARTMENT', fieldName: '부서', inputKind: 'department', codeGroup: '' },
  { code: 'PROMOTION', name: '승진', fieldCode: 'POSITION', fieldName: '직위', inputKind: 'code', codeGroup: 'POSITION' },
  { code: 'LEAVE', name: '휴직', fieldCode: 'SUSPEND_DT', fieldName: '휴직일', inputKind: 'date', codeGroup: '' },
];

const employee = (userId: number, userNm: string): OrderEmployee => ({
  userId, employeeNo: `26110${userId}`, userNm, departmentNm: '생산1팀', positionNm: '사원', levelNm: '대리',
  employmentTypeNm: '정규', suspendDt: '', backDt: '', retireDt: '', employmentStatus: 'ACTIVE',
});

const PAGE_PROPS = {
  selectedModule: { id: 'hr', name: '인사관리', icon: null, tree: [], menus: [] },
  currentMenuName: '인사명령',
  content: { title: '인사명령', description: '인사명령을 처리합니다.', cards: [], items: [] },
  selectedMenuPermissions: { read: true, create: true, update: false, delete: false, excel: true },
  isTenantAdmin: true,
};

describe('인사명령 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchOrderTypes.mockResolvedValue(TYPES);
    mocks.fetchOrderCodeOptions.mockResolvedValue({ POSITION: [{ value: 'MANAGER', label: '과장' }] });
    mocks.fetchOrderEmployee.mockImplementation(async (userId: number) => employee(userId, userId === 11 ? '홍길동' : '김철수'));
    mocks.processOrder.mockResolvedValue({ orderId: 5, count: 2, items: [] });
    mocks.fetchOrderHistory.mockResolvedValue([]);
  });

  async function renderPage(overrides: Partial<typeof PAGE_PROPS> = {}) {
    render(<OrderManagePage {...PAGE_PROPS} {...overrides} />);
    await waitFor(() => expect(mocks.fetchOrderTypes).toHaveBeenCalled());
  }

  async function chooseType(name: string) {
    await waitFor(() => expect(screen.getByRole('combobox', { name: /명령 유형/ })).not.toHaveAttribute('aria-disabled', 'true'));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /명령 유형/ }));
    fireEvent.click(await screen.findByRole('option', { name }));
  }

  async function addTwoEmployees() {
    fireEvent.click(screen.getByRole('button', { name: '사원 선택' }));
    fireEvent.click(await screen.findByRole('button', { name: '사원 2명 담기' }));
    await screen.findByRole('gridcell', { name: '홍길동' });
    await screen.findByRole('gridcell', { name: '김철수' });
  }

  it('탭 두 개(인사명령 처리·처리 내역)를 보여 주고 명령 유형을 불러온다', async () => {
    await renderPage();
    expect(screen.getByRole('tab', { name: '인사명령 처리', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '처리 내역' })).toBeInTheDocument();
    expect(mocks.fetchOrderCodeOptions).toHaveBeenCalledWith(['POSITION']);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /명령 유형/ }));
    for (const name of ['부서이동', '승진', '휴직']) {
      expect(await screen.findByRole('option', { name })).toBeInTheDocument();
    }
  });

  it('유형을 고르기 전에는 사원 선택이 막혀 있고, 처리 버튼은 대상이 없으면 비활성이다', async () => {
    await renderPage();
    expect(screen.getByRole('button', { name: '사원 선택' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '발령 처리' })).toBeDisabled();
  });

  it('부서이동: 부서를 한 번 고르고 사원을 여러 명 담으면 명령 전 값이 채워지고 확인 후 한 번에 처리한다', async () => {
    await renderPage();
    await chooseType('부서이동');
    fireEvent.click(screen.getByRole('button', { name: '부서 선택' }));
    fireEvent.click(await screen.findByRole('button', { name: '경영지원팀 고르기' }));
    await addTwoEmployees();

    const grid = within(screen.getByRole('grid', { name: '대상 사원' }));
    expect(grid.getAllByText('생산1팀').length).toBeGreaterThanOrEqual(2);
    expect(grid.getAllByText('경영지원팀')).toHaveLength(2);
    expect(screen.getByText(/대상 2명/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('비고'), { target: { value: '  조직 개편  ' } });
    fireEvent.click(screen.getByRole('button', { name: '발령 처리' }));
    const dialog = await screen.findByRole('dialog', { name: '인사명령 처리' });
    expect(within(dialog).getByText(/부서이동 · 명령일 .* · 2명/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '처리' }));

    await waitFor(() => expect(mocks.processOrder).toHaveBeenCalledTimes(1));
    expect(mocks.processOrder).toHaveBeenCalledWith({
      orderType: 'TRANSFER',
      orderDt: todayString(),
      remark: '조직 개편',
      items: [{ userId: 11, postValue: '8' }, { userId: 12, postValue: '8' }],
    });
    // 처리 뒤에는 대상이 비워지고 처리 내역을 다시 조회한다.
    await waitFor(() => expect(screen.getByText(/대상 0명/)).toBeInTheDocument());
    await waitFor(() => expect(mocks.fetchOrderHistory.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('명령 후 값을 비워 둔 채 처리하면 확인창 없이 입력 오류를 보여 준다', async () => {
    await renderPage();
    await chooseType('부서이동');
    await addTwoEmployees();
    fireEvent.click(screen.getByRole('button', { name: '발령 처리' }));

    expect(await screen.findByText('홍길동, 김철수: 명령 후 부서 값을 입력해 주세요.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '인사명령 처리' })).toBeNull();
    expect(mocks.processOrder).not.toHaveBeenCalled();
  });

  it('휴직 같은 날짜 명령은 명령 후 값이 명령일 기본값으로 채워진다', async () => {
    await renderPage();
    await chooseType('휴직');
    await addTwoEmployees();
    fireEvent.click(screen.getByRole('button', { name: '발령 처리' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '인사명령 처리' })).getByRole('button', { name: '처리' }));

    await waitFor(() => expect(mocks.processOrder).toHaveBeenCalled());
    expect(mocks.processOrder.mock.calls[0][0].items).toEqual([
      { userId: 11, postValue: todayString() }, { userId: 12, postValue: todayString() },
    ]);
  });

  it('서버 오류는 상단에 보여 주고 대상 사원은 그대로 둔다', async () => {
    mocks.processOrder.mockRejectedValue(new Error('김철수: 현재와 같은 부서입니다.'));
    await renderPage();
    await chooseType('휴직');
    await addTwoEmployees();
    fireEvent.click(screen.getByRole('button', { name: '발령 처리' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '인사명령 처리' })).getByRole('button', { name: '처리' }));

    expect(await screen.findByText('김철수: 현재와 같은 부서입니다.')).toBeInTheDocument();
    expect(screen.getByText(/대상 2명/)).toBeInTheDocument();
  });

  it('확인창에서 취소하면 처리하지 않는다', async () => {
    await renderPage();
    await chooseType('휴직');
    await addTwoEmployees();
    fireEvent.click(screen.getByRole('button', { name: '발령 처리' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '인사명령 처리' })).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '인사명령 처리' })).toBeNull());
    expect(mocks.processOrder).not.toHaveBeenCalled();
  });

  it('처리 내역 탭은 최근 한 달 기간으로 조회하고 결과를 표로 보여 준다', async () => {
    mocks.fetchOrderHistory.mockResolvedValue([{
      orderDtId: 1, orderId: 3, createdAt: '2026-11-20 10:30', orderDt: '2026-11-20', orderType: 'TRANSFER', orderTypeName: '부서이동',
      source: 'ORDER', userId: 11, userNm: '홍길동', employeeNo: '261101', fieldCode: 'DEPARTMENT', fieldName: '부서',
      preName: '생산1팀', postName: '경영지원팀', remark: '조직 개편', createdByName: '관리자',
    }]);
    await renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '처리 내역' }));

    expect(await screen.findByRole('gridcell', { name: '경영지원팀' })).toBeInTheDocument();
    for (const text of ['부서이동', '인사명령']) {
      expect(screen.getAllByRole('gridcell', { name: text }).length).toBeGreaterThan(0);
    }
    const filters = mocks.fetchOrderHistory.mock.calls[0][0];
    expect(filters.to).toBe(todayString());
    expect(filters.from && filters.from < todayString()).toBe(true);
    expect(screen.queryByRole('button', { name: '발령 처리' })).toBeNull();
  });

  it('처리 내역 조회가 실패하면 상단에 오류를 보여 준다', async () => {
    mocks.fetchOrderHistory.mockRejectedValue(new Error('처리 내역을 불러오지 못했습니다.'));
    await renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '처리 내역' }));

    expect(await screen.findByText('처리 내역을 불러오지 못했습니다.')).toBeInTheDocument();
  });

  it('테넌트 관리자가 아니면 처리 버튼이 없고 입력이 잠긴다', async () => {
    await renderPage({ isTenantAdmin: false });
    expect(screen.queryByRole('button', { name: '발령 처리' })).toBeNull();
    expect(screen.getByRole('button', { name: '사원 선택' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /명령 유형/ })).toHaveAttribute('aria-disabled', 'true');
  });
});
