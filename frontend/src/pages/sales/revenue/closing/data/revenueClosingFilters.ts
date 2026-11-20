import type { RevenueClosingDetailRow } from '../types/revenueClosing.types';

export function filterRevenueClosingDetails(
  rows: RevenueClosingDetailRow[],
  customerId: number | null,
): RevenueClosingDetailRow[] {
  return customerId === null
    ? rows
    : rows.filter((row) => row.customerId === customerId);
}
