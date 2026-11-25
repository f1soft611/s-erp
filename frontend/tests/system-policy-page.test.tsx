import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { SystemPolicyPage } from '../src/pages/settings/system/policies/SystemPolicyPage';
import { createPolicy, deletePolicy, getPolicies, getPolicyHistory, searchPolicyUsers, updatePolicy } from '../src/pages/settings/system/policies/services/systemPolicy.service';

vi.mock('../src/pages/settings/system/policies/services/systemPolicy.service', () => ({
  createPolicy: vi.fn(), deletePolicy: vi.fn(), getPolicies: vi.fn(),
  getPolicyHistory: vi.fn(), searchPolicyUsers: vi.fn(), updatePolicy: vi.fn(),
}));

const row = {
  policyId: 1, policyCode: 'OVER_DELIVERY_POLICY', policyName: '초과납품 처리',
  category: '영업관리', description: '기준수량을 유지합니다.', valueType: 'SELECT',
  value: 'BLOCK', options: [{ value: 'BLOCK', label: '차단' }, { value: 'WARN', label: '경고 확인' }],
  minValue: null, maxValue: null, unit: '', version: 3, systemPolicy: true, updatedAt: '2026-11-05 15:00:00',
};
const props = {
  isPlatformAdmin: true,
  selectedMenuPermissions: { read: true, create: true, update: true, delete: true, excel: false },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPolicies).mockResolvedValue([row] as never);
  vi.mocked(getPolicyHistory).mockResolvedValue([]);
  vi.mocked(searchPolicyUsers).mockResolvedValue([{ userId: 7, userName: '담당자' }]);
  vi.mocked(createPolicy).mockResolvedValue({ ...row, policyId: 2 } as never);
  vi.mocked(updatePolicy).mockResolvedValue({ ...row, value: 'WARN', version: 4 } as never);
  vi.mocked(deletePolicy).mockResolvedValue(undefined);
});

it('preserves a legacy policy when editing one numeric type', async () => {
  vi.mocked(getPolicies).mockResolvedValue([{
    ...row, policyId: 9, policyCode: 'GRID_DECIMAL_SALES', policyName: '영업관리 그리드 소수점', valueType: 'NUMBER',
    value: 2, options: [], minValue: 0, maxValue: 6, unit: '자리', systemPolicy: false,
  }] as never);
  render(<SystemPolicyPage {...props} />);
  await screen.findByText('영업관리 그리드 소수점');
  fireEvent.click(screen.getByRole('button', { name: '영업관리 그리드 소수점 수정' }));
  const dialog = screen.getByRole('dialog', { name: '정책 수정' });
  expect(within(dialog).getByLabelText('decimal 소수점 자릿수')).toHaveValue(2);
  fireEvent.mouseDown(within(dialog).getByLabelText('decimal 소수점 0 표시'));
  fireEvent.click(await screen.findByRole('option', { name: /있을 때만 표시/ }));
  fireEvent.mouseDown(within(dialog).getByLabelText('decimal 반올림 방식'));
  fireEvent.click(await screen.findByRole('option', { name: '내림' }));
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updatePolicy).toHaveBeenCalledWith(9, expect.objectContaining({
    value: {
      number: { places: 2, trailingZeros: 'FIXED', rounding: 'HALF_UP' },
      decimal: { places: 2, trailingZeros: 'AUTO', rounding: 'DOWN' },
      currency: { places: 2, trailingZeros: 'FIXED', rounding: 'HALF_UP' },
    },
  })));
});

it('edits each numeric type independently for a typed decimal policy', async () => {
  const rule = (places: number) => ({ places, trailingZeros: 'FIXED', rounding: 'HALF_UP' });
  vi.mocked(getPolicies).mockResolvedValue([{
    ...row, policyId: 9, policyCode: 'GRID_DECIMAL_SALES', policyName: '영업관리 그리드 소수점', valueType: 'NUMBER',
    value: { number: rule(0), decimal: rule(3), currency: rule(3) },
    options: [], minValue: 0, maxValue: 6, unit: '자리', systemPolicy: false,
  }] as never);
  render(<SystemPolicyPage {...props} />);
  await screen.findByText('영업관리 그리드 소수점');
  fireEvent.click(screen.getByRole('button', { name: '영업관리 그리드 소수점 수정' }));
  const dialog = screen.getByRole('dialog', { name: '정책 수정' });
  expect(within(dialog).getByLabelText('number 소수점 자릿수')).toHaveValue(0);
  fireEvent.change(within(dialog).getByLabelText('decimal 소수점 자릿수'), { target: { value: '5' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updatePolicy).toHaveBeenCalledWith(9, expect.objectContaining({
    value: { number: rule(0), decimal: rule(5), currency: rule(3) },
  })));
});

it('denies tenant administrators even with all menu permissions', () => {
  render(<SystemPolicyPage {...props} isPlatformAdmin={false} />);
  expect(screen.getByText('플랫폼 관리자만 사용할 수 있습니다.')).toBeInTheDocument();
  expect(getPolicies).not.toHaveBeenCalled();
});

it('searches policies and updates a protected policy value using its current version', async () => {
  render(<SystemPolicyPage {...props} />);
  await screen.findByText('초과납품 처리');
  fireEvent.change(screen.getByLabelText('정책 검색'), { target: { value: '없음' } });
  expect(screen.queryByText('초과납품 처리')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('정책 검색'), { target: { value: '' } });
  expect(screen.queryByRole('button', { name: '초과납품 처리 삭제' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '초과납품 처리 수정' }));
  const dialog = screen.getByRole('dialog', { name: '정책 수정' });
  expect(within(dialog).getByLabelText('정책 코드')).toBeDisabled();
  fireEvent.mouseDown(within(dialog).getByLabelText('정책값'));
  fireEvent.click(await screen.findByRole('option', { name: '경고 확인' }));
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(updatePolicy).toHaveBeenCalledWith(1, expect.objectContaining({ version: 3, value: 'WARN' })));
});

it.each([
  ['BOOLEAN', false], ['NUMBER', 0], ['USER_LIST', []],
])('creates %s policy preserving falsy typed values', async (valueType, expected) => {
  render(<SystemPolicyPage {...props} />);
  await screen.findByText('초과납품 처리');
  fireEvent.click(screen.getByRole('button', { name: '정책 추가' }));
  const dialog = screen.getByRole('dialog', { name: '정책 추가' });
  fireEvent.change(within(dialog).getByLabelText('정책 코드'), { target: { value: 'TEST_POLICY' } });
  fireEvent.change(within(dialog).getByLabelText('정책 이름'), { target: { value: '새 정책' } });
  fireEvent.mouseDown(within(dialog).getByLabelText('값 타입'));
  fireEvent.click(await screen.findByRole('option', { name: ({ BOOLEAN: '사용 여부', NUMBER: '숫자', USER_LIST: '사용자 목록' } as Record<string, string>)[valueType] }));
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(createPolicy).toHaveBeenCalledWith(expect.objectContaining({ valueType, value: expected })));
});

it('preserves input after save rejection and confirms discarding edits', async () => {
  vi.mocked(createPolicy).mockRejectedValue(new Error('이미 사용 중인 코드입니다.'));
  render(<SystemPolicyPage {...props} />);
  await screen.findByText('초과납품 처리');
  fireEvent.click(screen.getByRole('button', { name: '정책 추가' }));
  const dialog = screen.getByRole('dialog', { name: '정책 추가' });
  fireEvent.change(within(dialog).getByLabelText('정책 코드'), { target: { value: 'TEST_POLICY' } });
  fireEvent.change(within(dialog).getByLabelText('정책 이름'), { target: { value: '보존될 정책' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  expect(await within(dialog).findByText('이미 사용 중인 코드입니다.')).toBeInTheDocument();
  expect(within(dialog).getByLabelText('정책 이름')).toHaveValue('보존될 정책');
  fireEvent.click(within(dialog).getByRole('button', { name: '취소', exact: true }));
  expect(await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' })).toBeInTheDocument();
});

it('confirms deletion of custom policies and shows change history', async () => {
  vi.mocked(getPolicies).mockResolvedValue([{ ...row, policyId: 2, systemPolicy: false, policyName: '사용자 정책' }] as never);
  vi.mocked(getPolicyHistory).mockResolvedValue([{ action: 'UPDATE', changedBy: '운영자', changedAt: '2026-11-05', beforeValue: false, afterValue: true }]);
  render(<SystemPolicyPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: '사용자 정책 이력' }));
  expect(await screen.findByText('운영자')).toBeInTheDocument();
  const historyDialog = screen.getByRole('dialog', { name: '정책 변경 이력 · 사용자 정책' });
  expect(within(historyDialog).getByRole('group', { name: '변경 전' }).querySelector('mark')).toHaveTextContent('false');
  expect(within(historyDialog).getByRole('group', { name: '변경 후' }).querySelector('mark')).toHaveTextContent('true');
  fireEvent.click(
    within(within(historyDialog).getByTestId('common-dialog-actions')).getByRole(
      'button',
      { name: '닫기' },
    ),
  );
  fireEvent.click(await screen.findByRole('button', { name: '사용자 정책 삭제' }));
  expect(deletePolicy).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('dialog', { name: '정책 삭제' })).getByRole('button', { name: '삭제', exact: true }));
  await waitFor(() => expect(deletePolicy).toHaveBeenCalledWith(2, 3));
});

it('shows decimal policy history as readable before and after rules, including legacy values', async () => {
  const rule = (places: number, trailingZeros = 'FIXED', rounding = 'HALF_UP') => ({ places, trailingZeros, rounding });
  vi.mocked(getPolicies).mockResolvedValue([{
    ...row, policyId: 9, policyCode: 'GRID_DECIMAL_SALES', policyName: '영업관리 그리드 소수점', valueType: 'NUMBER',
    value: { number: rule(0), decimal: rule(3), currency: rule(3) },
    options: [], minValue: 0, maxValue: 6, unit: '자리', systemPolicy: false,
  }] as never);
  vi.mocked(getPolicyHistory).mockResolvedValue([
    { action: 'UPDATE', changedBy: '관리자', changedAt: '2026-11-24T14:37:15', beforeValue: rule(3, 'AUTO'), afterValue: {
      number: rule(0), decimal: rule(3, 'FIXED', 'DOWN'), currency: rule(3),
    } },
    { action: 'CREATE', changedBy: '관리자', changedAt: '2026-11-17T14:54:35', beforeValue: null, afterValue: 3 },
  ]);
  render(<SystemPolicyPage {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: '영업관리 그리드 소수점 이력' }));
  const dialog = await screen.findByRole('dialog', { name: '정책 변경 이력 · 영업관리 그리드 소수점' });
  expect(await within(dialog).findByText('2026-11-24 14:37:15')).toBeInTheDocument();
  const before = within(dialog).getAllByRole('group', { name: '변경 전' });
  const after = within(dialog).getAllByRole('group', { name: '변경 후' });
  const rows = (group: HTMLElement) => within(group).getAllByTestId('policy-history-row');
  const marked = (group: HTMLElement) => Array.from(group.querySelectorAll('mark[data-changed="true"]')).map((node) => node.textContent);
  expect(within(before[0]).getByText('전체 타입')).toBeInTheDocument();
  expect(rows(before[0])[0]).toHaveTextContent('3자리 · 0 있을 때만 표시 · 반올림');
  expect(within(after[0]).getByText('number')).toBeInTheDocument();
  expect(rows(after[0]).map((row) => row.textContent)).toEqual([
    'number0자리 · 0 항상 표시 · 반올림', 'decimal3자리 · 0 항상 표시 · 내림', 'currency3자리 · 0 항상 표시 · 반올림',
  ]);
  // 변경 전 전체 규칙(3·AUTO·반올림)과 다른 부분만 강조한다.
  expect(marked(before[0])).toEqual(['3자리', '0 있을 때만 표시', '반올림']);
  expect(marked(after[0])).toEqual(['0자리', '0 항상 표시', '0 항상 표시', '내림', '0 항상 표시']);
  expect(within(after[0]).getByText('5곳 변경')).toBeInTheDocument();
  expect(within(dialog).getAllByTestId('policy-history-arrow')).toHaveLength(2);
  expect(within(before[1]).getByText('없음')).toBeInTheDocument();
  expect(within(after[1]).getByText('전체 타입')).toBeInTheDocument();
  expect(marked(after[1])).toEqual(['3자리', '0 항상 표시', '반올림']);
  expect(within(dialog).queryByText(/"places"/)).not.toBeInTheDocument();
});

it('adds select options and requires a valid selected value before saving', async () => {
  render(<SystemPolicyPage {...props} />);
  await screen.findByText('초과납품 처리');
  fireEvent.click(screen.getByRole('button', { name: '정책 추가' }));
  const dialog = screen.getByRole('dialog', { name: '정책 추가' });
  fireEvent.change(within(dialog).getByLabelText('정책 코드'), { target: { value: 'TEST_SELECT' } });
  fireEvent.change(within(dialog).getByLabelText('정책 이름'), { target: { value: '선택형 정책' } });
  fireEvent.mouseDown(within(dialog).getByLabelText('값 타입'));
  fireEvent.click(await screen.findByRole('option', { name: '선택값' }));
  fireEvent.change(within(dialog).getByLabelText('선택지 1 값'), { target: { value: 'OPTION_A' } });
  fireEvent.change(within(dialog).getByLabelText('선택지 1 표시명'), { target: { value: '첫 번째 선택' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  expect(within(dialog).getByText('정책값을 선택하세요.')).toBeInTheDocument();
  expect(createPolicy).not.toHaveBeenCalled();
  fireEvent.mouseDown(within(dialog).getByLabelText('정책값'));
  fireEvent.click(await screen.findByRole('option', { name: '첫 번째 선택' }));
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  await waitFor(() => expect(createPolicy).toHaveBeenCalledWith(expect.objectContaining({
    value: 'OPTION_A', options: [{ value: 'OPTION_A', label: '첫 번째 선택' }],
  })));
});

it('rejects numeric values outside the configured range without losing edits', async () => {
  render(<SystemPolicyPage {...props} />);
  await screen.findByText('초과납품 처리');
  fireEvent.click(screen.getByRole('button', { name: '정책 추가' }));
  const dialog = screen.getByRole('dialog', { name: '정책 추가' });
  fireEvent.change(within(dialog).getByLabelText('정책 코드'), { target: { value: 'TEST_NUMBER' } });
  fireEvent.change(within(dialog).getByLabelText('정책 이름'), { target: { value: '숫자형 정책' } });
  fireEvent.mouseDown(within(dialog).getByLabelText('값 타입'));
  fireEvent.click(await screen.findByRole('option', { name: '숫자' }));
  fireEvent.change(within(dialog).getByLabelText('최솟값'), { target: { value: '1' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
  expect(within(dialog).getByText('정책값이 허용 범위를 벗어났습니다.')).toBeInTheDocument();
  expect(createPolicy).not.toHaveBeenCalled();
});

it('requires read permission and hides write actions from read-only platform administrators', async () => {
  const { unmount } = render(<SystemPolicyPage {...props} selectedMenuPermissions={{ read: false, create: true, update: true, delete: true }} />);
  expect(screen.getByText('시스템 정책 조회 권한이 없습니다.')).toBeInTheDocument();
  expect(getPolicies).not.toHaveBeenCalled();
  unmount();
  render(<SystemPolicyPage {...props} selectedMenuPermissions={{ read: true, create: false, update: false, delete: false }} />);
  await screen.findByText('초과납품 처리');
  expect(screen.queryByRole('button', { name: '정책 추가' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '초과납품 처리 수정' })).not.toBeInTheDocument();
});
