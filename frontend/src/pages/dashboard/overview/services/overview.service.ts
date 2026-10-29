import { apiGet } from '../../../../shared/services/apiClient';
import type { DashboardOverview, DashboardSales } from '../types/overview';

export const formatNumber = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isMoney = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const hasTimestamp = (value: Record<string, unknown>) =>
  isDate(value.asOfDate) && typeof value.fetchedAt === 'string'
  && Number.isFinite(Date.parse(value.fetchedAt));

export function isDashboardMonth(value: string) {
  return /^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(value)
    && value.slice(0, 4) !== '9999';
}

export async function fetchDashboardOverview(signal?: AbortSignal): Promise<DashboardOverview> {
  const response = await apiGet<{ item?: unknown }>('/api/v1/dashboard/overview', signal);
  const item = response.item;
  if (!isRecord(item) || !hasTimestamp(item)
    || ![item.canReadApprovals, item.canReadNotices, item.canReadSales].every((v) => typeof v === 'boolean')
    || ![item.approvalStatus, item.noticeStatus].every((v) => ['ready', 'error', 'forbidden'].includes(String(v)))
    || (item.canReadApprovals
      ? !['/groupware/doc/write', '/groupware/doc/read'].includes(String(item.approvalPath))
      : item.approvalPath !== null)
    || (item.approvalStatus === 'ready'
      ? !isRecord(item.approval)
        || ![item.approval.actionRequiredCount, item.approval.draftCount, item.approval.revisionRequestedCount].every(isCount)
        || !isCount(item.approval.referenceConfirmationRequiredCount)
        || !Array.isArray(item.approval.referenceConfirmationItems)
        || !item.approval.referenceConfirmationItems.every((v) => isRecord(v)
          && isCount(v.electronicApprovalId) && v.electronicApprovalId > 0 && typeof v.title === 'string')
        || !Array.isArray(item.approval.notices)
        || !item.approval.notices.every((v) => isRecord(v) && isCount(v.electronicApprovalId)
          && v.electronicApprovalId > 0 && typeof v.title === 'string' && typeof v.noticeType === 'string')
      : item.approval !== null)
    || !Array.isArray(item.notices) || item.notices.length > 5
    || !item.notices.every((v) => isRecord(v) && isCount(v.postId) && v.postId > 0
      && typeof v.title === 'string' && ['Y', 'N'].includes(String(v.isPinned))
      && typeof v.createdAt === 'string')) {
    throw new Error('종합현황 응답을 확인할 수 없습니다.');
  }
  return item as DashboardOverview;
}

export async function fetchDashboardSales(month: string, signal?: AbortSignal): Promise<DashboardSales> {
  if (!isDashboardMonth(month)) throw new Error('조회 월을 확인해 주세요.');
  const response = await apiGet<{ item?: unknown }>(
    `/api/v1/dashboard/sales?${new URLSearchParams({ month })}`, signal,
  );
  const item = response.item;
  if (!isRecord(item) || !hasTimestamp(item) || item.month !== month
    || !isDate(item.from) || !isDate(item.to)
    || ![item.orderCount, item.upcomingCount].every(isCount)
    || ![item.supplyAmount, item.totalAmount].every(isMoney)
    || !Array.isArray(item.trend) || item.trend.length !== 6
    || !item.trend.every((v) => isRecord(v) && typeof v.month === 'string'
      && /^\d{4}-(0[1-9]|1[0-2])$/.test(v.month) && isCount(v.orderCount) && isMoney(v.supplyAmount))
    || !Array.isArray(item.upcoming) || item.upcoming.length > 5
    || !item.upcoming.every((v) => isRecord(v) && isCount(v.salesOrderId) && v.salesOrderId > 0
      && typeof v.orderNo === 'string' && (v.customerName === null || typeof v.customerName === 'string')
      && isDate(v.deliveryDt))) {
    throw new Error('수주 집계 응답을 확인할 수 없습니다.');
  }
  return item as DashboardSales;
}

export function salesMonthPath(month: string) {
  return `/sales/order/status?${new URLSearchParams({ dashboardMonth: month })}`;
}

export function salesDuePath(asOfDate: string, orderNo?: string) {
  const end = new Date(`${asOfDate}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const params = new URLSearchParams({
    dashboardDueFrom: asOfDate,
    dashboardDueTo: end.toISOString().slice(0, 10),
  });
  if (orderNo) params.set('dashboardOrderNo', orderNo);
  return `/sales/order/status?${params}`;
}
