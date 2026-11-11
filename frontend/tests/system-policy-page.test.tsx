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
