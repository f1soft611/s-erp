export type WidgetStatus = 'ready' | 'error' | 'forbidden';

export type DashboardOverview = {
  asOfDate: string;
  fetchedAt: string;
  canReadApprovals: boolean;
  canReadNotices: boolean;
  canReadSales: boolean;
  approvalPath: string | null;
  approvalStatus: WidgetStatus;
  noticeStatus: WidgetStatus;
  approval: {
    actionRequiredCount: number;
    draftCount: number;
    revisionRequestedCount: number;
    referenceConfirmationRequiredCount: number;
    referenceConfirmationItems: { electronicApprovalId: number; title: string }[];
    notices: { electronicApprovalId: number; title: string; noticeType: string }[];
  } | null;
  notices: { postId: number; title: string; isPinned: string; createdAt: string }[];
};

export type DashboardSales = {
  month: string;
  from: string;
  to: string;
  asOfDate: string;
  fetchedAt: string;
  orderCount: number;
  supplyAmount: number;
  totalAmount: number;
  upcomingCount: number;
  trend: { month: string; orderCount: number; supplyAmount: number }[];
  upcoming: { salesOrderId: number; orderNo: string; customerName: string | null; deliveryDt: string }[];
};
