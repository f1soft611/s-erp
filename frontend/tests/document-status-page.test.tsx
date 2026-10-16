import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: api.get,
}));

vi.mock(
  '../src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed',
  () => ({
    DocumentApprovalDetailFeed: vi.fn(() => null),
  }),
);
vi.mock(
  '../src/pages/groupware/documents/write/components/DocumentComposerDialog',
  () => ({
    DocumentComposerDialog: vi.fn(() => null),
  }),
);

import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { pageContentMap } from '../src/pages/dashboard/services/dashboardData';
import { DocumentApprovalDetailFeed } from '../src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed';
import { DocumentComposerDialog } from '../src/pages/groupware/documents/write/components/DocumentComposerDialog';
import { createDocumentStatusColumns } from '../src/pages/groupware/documents/status/components/DocumentStatusGrid';
import type { DocumentApprovalDetail } from '../src/pages/groupware/documents/write/types/documentWrite.types';
import type { DocumentStatusRow } from '../src/pages/groupware/documents/status/types/documentStatus.types';
import { toPageSearchFields } from '../src/shared/components/page-search/searchFields';

const row: DocumentStatusRow = {
  electronicApprovalId: 41,
  eabusNo: '001',
  title: 'Annual plan',
  documentType: 'DRAFTING',
  documentStatus: 'COMPLETED',
  submittedAt: '2026-10-10T09:00:00',
  drafterName: 'Morgan',
  drafterDepartmentName: 'Finance',
  participantName: 'Sam',
  approvalProgress: '2/2',
  updatedAt: '2026-10-11T10:00:00',
};

const detail: DocumentApprovalDetail = {
  ...row,
  viewCount: 1,
  isDrafter: false,
  draftingWorkCategoryId: null,
  contentsJson: '{}',
  contentsHtml: '<p>Approval body</p>',
  approvalLines: [
    {
      electronicApprovalLineId: 501,
      stageOrder: 1,
      participantOrder: 1,
      participantType: 'APPROVAL',
      participantUserId: '102',
      participantName: 'Sam',
      actionStatus: 'APPROVED',
    },
  ],
  attachments: [],
  systemEvents: [],
};

const selectedModule = {
  id: 'groupware',
  name: '그룹웨어',
  icon: null,
  tree: [],
  menus: [],
};

function renderDocumentStatusPage(currentPageKey = 'documents') {
  return render(
    <DashboardContent
      selectedModule={selectedModule}
      currentMenuName="문서현황"
      currentPageKey={currentPageKey}
      breadcrumbItems={['그룹웨어', '문서현황']}
      content={{
        title: '문서현황',
        description: '전자결재 문서를 검색하고 확인합니다.',
        cards: [],
        items: [],
      }}
    />,
  );
}

function getListRequest(): URLSearchParams {
  const calls = api.get.mock.calls.filter(([path]) =>
    String(path).includes('/api/v1/groupware/approvals/documents?'),
  );
  const call = calls[calls.length - 1];
  if (!call) throw new Error('문서현황 목록 요청을 찾을 수 없습니다.');
  return new URL(String(call[0]), 'http://localhost').searchParams;
}

function getListRequests(): number {
  return api.get.mock.calls.filter(([path]) =>
    String(path).includes('/api/v1/groupware/approvals/documents?'),
  ).length;
}

function expectedRecentMonthRange(today: Date) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastDayOfPreviousMonth = new Date(
    previousMonth.getFullYear(),
    previousMonth.getMonth() + 1,
    0,
  ).getDate();
  const start = new Date(
    previousMonth.getFullYear(),
    previousMonth.getMonth(),
    Math.min(today.getDate(), lastDayOfPreviousMonth),
  );
  const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { from: format(start), to: format(end) };
}

describe('document status page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((path: string) =>
      path.includes('/documents?')
        ? Promise.resolve({ resultList: [row], totalRowCount: 1 })
        : Promise.resolve({}),
    );
  });

  it('derives detailed search fields from the F1-Grid column metadata', () => {
    const columns = createDocumentStatusColumns();
    const fields = toPageSearchFields(columns);

    expect(columns.map((column) => String(column.field))).toEqual([
      'rowNumber',
      'eabusNo',
      'title',
      'documentType',
      'documentStatus',
      'submittedAt',
      'drafterName',
      'drafterDepartmentName',
      'participantName',
      'approvalProgress',
      'updatedAt',
    ]);
    expect(fields.map((field) => field.field)).toEqual([
      'eabusNo',
      'title',
      'documentType',
      'documentStatus',
      'submittedAt',
      'drafterName',
      'drafterDepartmentName',
      'participantName',
      'updatedAt',
    ]);
    expect(fields.find((field) => field.field === 'submittedAt')?.type).toBe(
      'date',
    );
  });

  it('provides document status content for the read route alias', () => {
    expect(pageContentMap.read.description).toBe(
      '과거 전자결재 문서를 검색하고 권한에 따라 상세 및 후속 업무를 처리합니다.',
    );
  });

  it('renders the status page for the /groupware/doc/read menu key', async () => {
    renderDocumentStatusPage('read');

    expect(
      await screen.findByRole('grid', { name: '문서현황' }),
    ).toBeInTheDocument();
  });

  it('opens the documents menu with a one-month submitted date range', async () => {
    renderDocumentStatusPage();

    expect(await screen.findByText('001')).toBeInTheDocument();
    const request = getListRequest();
    const expectedRange = expectedRecentMonthRange(new Date());
    expect(request.get('scope')).toBe('ALL');
    expect(request.get('offset')).toBe('0');
    expect(request.get('limit')).toBe('200');
    expect(request.get('submittedAtFrom')).toBe(expectedRange.from);
    expect(request.get('submittedAtTo')).toBe(expectedRange.to);

  });

  it('opens the existing approval detail overlay for the selected document and closes it', async () => {
    renderDocumentStatusPage();
    await screen.findByText('001');

    const selectedRow = screen.getByRole('row', { name: /41 행 선택/ });
    fireEvent.click(within(selectedRow).getByRole('checkbox'));

    expect(await screen.findByTestId('page-area-overlay')).toBeInTheDocument();
    const feedCall = vi.mocked(DocumentApprovalDetailFeed).mock.calls.at(-1);
    expect(feedCall?.[0].electronicApprovalId).toBe(41);

    fireEvent.click(screen.getByTestId('page-area-overlay-backdrop'));
    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();
  });

  it('forwards detail actions to the existing composer and refreshes the list', async () => {
    renderDocumentStatusPage();
    await screen.findByText('001');
    const selectedRow = screen.getByRole('row', { name: /41 행 선택/ });
    fireEvent.click(within(selectedRow).getByRole('checkbox'));
    await screen.findByTestId('page-area-overlay');

    const initialFeedCall = vi.mocked(DocumentApprovalDetailFeed).mock.calls.at(-1);
    expect(initialFeedCall).toBeDefined();
    if (!initialFeedCall) throw new Error('Detail panel props were not captured.');

    act(() => initialFeedCall[0].onEditDocument(detail));
    await waitFor(() => {
      const composerProps = vi.mocked(DocumentComposerDialog).mock.calls.at(-1)?.[0];
      expect(composerProps?.open).toBe(true);
      expect(composerProps?.initialDocument).toEqual(detail);
    });

    const previousListRequests = getListRequests();
    act(() => initialFeedCall[0].onActionComplete());
    await waitFor(() =>
      expect(getListRequests()).toBeGreaterThan(previousListRequests),
    );
  });

  it('applies the detailed title filter to the next remote query', async () => {
    renderDocumentStatusPage();
    await screen.findByText('001');

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: 'Budget' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() => {
      expect(getListRequest().get('title')).toBe('Budget');
    });
  });

  it('shows an explicit empty state when no historical documents match', async () => {
    api.get.mockResolvedValue({ resultList: [], totalRowCount: 0 });
    renderDocumentStatusPage();

    expect(
      await screen.findByText(/조회 결과가 없습니다.*기간을 넓히거나/),
    ).toBeInTheDocument();
  });
});
