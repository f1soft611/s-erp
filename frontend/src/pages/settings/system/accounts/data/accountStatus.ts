import type { AccountRow, AccountStatus } from '../types/account.types';

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE: '사용',
  DISABLED: '미허용',
  LOCKED: '잠김',
  RETIRED: '퇴직',
};

/** 표시 우선순위는 퇴직 > 미허용 > 잠김 > 사용이다(서버 상태 필터와 같은 기준). */
export function resolveAccountStatus(row: Pick<AccountRow, 'retired' | 'useAt' | 'locked'>): AccountStatus {
  if (row.retired) return 'RETIRED';
  if (row.useAt === 'N') return 'DISABLED';
  if (row.locked) return 'LOCKED';
  return 'ACTIVE';
}
