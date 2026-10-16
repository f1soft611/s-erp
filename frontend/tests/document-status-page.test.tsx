import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  getDetail: vi.fn(),
  getEmbeddedImage: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: api.get,
}));

vi.mock(
  '../src/pages/groupware/documents/write/services/documentApproval.service',
  () => ({
    getDocumentApprovalDetail: api.getDetail,
    fetchApprovalEmbeddedImageBlob: api.getEmbeddedImage,
  }),
);

import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { pageContentMap } from '../src/pages/dashboard/services/dashboardData';
import { createDocumentStatusColumns } from '../src/pages/groupware/documents/status/components/DocumentStatusGrid';
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

const detail = {
  ...row,
  viewCount: 1,
  isDrafter: false,
  draftingWorkCategoryId: null,
  contentsJson: '{}',
  contentsHtml: '<p>Read-only body</p>',
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
    api.getDetail.mockResolvedValue(detail);
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
      '과거 전자결재 문서를 검색하고 상세 내용을 읽기 전용으로 확인합니다.',
    );
  });

  it('renders the status page for the /groupware/doc/read menu key', async () => {
    renderDocumentStatusPage('read');

    expect(
      await screen.findByRole('grid', { name: '문서현황' }),
    ).toBeInTheDocument();
  });

  it('opens the documents menu with a one-month submitted date range and read-only detail', async () => {
    renderDocumentStatusPage();

    expect(await screen.findByText('001')).toBeInTheDocument();
    const request = getListRequest();
    const expectedRange = expectedRecentMonthRange(new Date());
    expect(request.get('scope')).toBe('ALL');
    expect(request.get('offset')).toBe('0');
    expect(request.get('limit')).toBe('200');
    expect(request.get('submittedAtFrom')).toBe(expectedRange.from);
    expect(request.get('submittedAtTo')).toBe(expectedRange.to);

    const selectedRow = screen.getByRole('row', { name: /41 행 선택/ });
    fireEvent.click(within(selectedRow).getByRole('checkbox'));

    expect(await screen.findByText('Read-only body')).toBeInTheDocument();
    expect(api.getDetail).toHaveBeenCalledWith(41);
    expect(screen.queryByRole('button', { name: '승인' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '문서 수정' }),
    ).not.toBeInTheDocument();
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
