import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../src/shared/services/apiClient';
import type {
  QualityInspectionDetailItem,
  QualityInspectionItem,
} from '../src/pages/quality/inspect/create/types/qualityInspection.types';
import { QualityInspectionStatusPage } from '../src/pages/quality/inspect/status/QualityInspectionStatusPage';
import {
  QUALITY_INSPECTION_STATUS_OPTIONS,
  searchQualityInspectionStatus,
  toQualityInspectionStatusFilters,
} from '../src/pages/quality/inspect/status/services/qualityInspectionStatus.service';
import type { QualityInspectionStatusRow } from '../src/pages/quality/inspect/status/types/qualityInspectionStatus.types';

vi.mock('../src/shared/services/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/shared/services/apiClient')>();
  return { ...actual, apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn() };
});

vi.mock('../src/shared/hooks/usePageSearchDefaults', () => ({
  usePageSearchDefaults: () => ({
    values: { inspectionDt: { from: '2026-11-01', to: '2026-11-30' } },
    loading: false,
    error: null,
    retry: vi.fn(),
    initialLoad: { loading: false, error: null, hasLoaded: true },
  }),
}));

const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);
const apiPutMock = vi.mocked(apiPut);

const STATUS_PATH = '/api/v1/quality/quality-inspection-status';

describe('material inspection status service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers normal (default), canceled and all as the status choices', () => {
    expect(QUALITY_INSPECTION_STATUS_OPTIONS).toEqual([
      { value: 'ACTIVE', label: '정상' },
      { value: 'CANCELED', label: '취소' },
      { value: 'ALL', label: '전체' },
    ]);
  });

  it('maps search values to API filters and keeps the normal status when none is chosen', async () => {
    expect(toQualityInspectionStatusFilters(' QI ', {
      inspectionDt: { from: '2026-11-01', to: '2026-11-30' },
      inspectionNo: 'QI-2026',
      supplierName: '테스트',
      status: 'ALL',
      materialCode: 'M-1',
      orderNo: 'PO-1',
      arrivalNo: 'MP-1',
      inspectorName: '홍길동',
    })).toEqual({
      keyword: 'QI', inspectionNo: 'QI-2026', inspectionDtFrom: '2026-11-01', inspectionDtTo: '2026-11-30',
      supplierKeyword: '테스트', status: 'ALL', materialKeyword: 'M-1', orderNo: 'PO-1', arrivalNo: 'MP-1',
      inspectorKeyword: '홍길동',
    });
    expect(toQualityInspectionStatusFilters('', { inspectionDt: { from: '2026-11-01', to: '2026-11-30' } }).status)
      .toBe('ACTIVE');
    apiGetMock.mockResolvedValue({ resultList: [] });
    await searchQualityInspectionStatus({ keyword: 'QI', status: 'CANCELED' });
    expect(apiGetMock).toHaveBeenLastCalledWith(`${STATUS_PATH}?keyword=QI&status=CANCELED`);
  });
});

describe('QualityInspectionStatusPage', () => {
  let current: QualityInspectionItem;

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    current = inspectionItem('Y');
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith(STATUS_PATH)) return { resultList: [row(71), row(72)] };
      if (path === '/api/v1/quality/quality-inspections/900') return { item: current };
      return { resultList: [] };
    });
    apiPutMock.mockResolvedValue({ item: inspectionItem('Y') });
    apiPostMock.mockResolvedValue({ item: inspectionItem('N') });
  });

  async function openDetail() {
    renderPage();
    const grid = await screen.findByRole('grid', { name: '자재수입검사현황 목록' });
    await waitFor(() => expect(within(grid).getAllByText('정상').length).toBeGreaterThan(0));
    fireEvent.click(within(grid).getAllByRole('button', { name: 'QI-20261117-0001 상세 보기' })[0]);
    expect(await screen.findByText('검사번호: QI-20261117-0001')).toBeInTheDocument();
  }

  it('lists only the normal inspections by default', async () => {
    renderPage();
    await screen.findByRole('grid', { name: '자재수입검사현황 목록' });
    await waitFor(() => expect(apiGetMock).toHaveBeenCalled());
    const listCalls = apiGetMock.mock.calls.map(([path]) => path as string).filter((path) => path.startsWith(STATUS_PATH));
    expect(listCalls.length).toBeGreaterThan(0);
    expect(listCalls.every((path) => path.includes('status=ACTIVE'))).toBe(true);
  });

  it('opens the detail from the inspection number and summarizes the quantities and the pass rate', async () => {
    await openDetail();
    const summary = screen.getByLabelText('검사 요약');
    expect(summary).toHaveTextContent('12');
    expect(summary).toHaveTextContent('10');
    expect(summary).toHaveTextContent('83.3%');
    fireEvent.click(screen.getByRole('button', { name: '검사 더보기' }));
    expect(screen.getByRole('menuitem', { name: '자세히보기' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '수정' })).toBeInTheDocument();
  });

  it('does not offer edit for canceled inspections and opens a read-only view', async () => {
    current = inspectionItem('N');
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '검사 더보기' }));
    expect(screen.queryByRole('menuitem', { name: '수정' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: '자세히보기' }));
    const dialog = await screen.findByRole('dialog', { name: '검사 상세보기' });
    await waitFor(() => expect(within(dialog).getByLabelText('검사번호')).toHaveValue('QI-20261117-0001'));
    expect(within(dialog).getByText('취소된 검사입니다. 조회만 할 수 있습니다.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '선택 행 빼기' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '검사 취소' })).not.toBeInTheDocument();
  });

  it('cancels the whole inspection after a confirmation that explains the arrival rows are released', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '검사 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '검사 수정' });
    await waitFor(() => expect(within(dialog).getByLabelText('검사번호')).toHaveValue('QI-20261117-0001'));
    fireEvent.click(await within(dialog).findByRole('button', { name: '검사 취소' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '확인' });
    expect(within(confirmDialog).getByText(/검사번호 QI-20261117-0001를 취소하시겠습니까/)).toBeInTheDocument();
    expect(within(confirmDialog).getByText(/가입고 행의 수정·삭제가 다시 가능해지고 검사 대기량이 복구됩니다/)).toBeInTheDocument();
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '확인' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith('/api/v1/quality/quality-inspections/900/cancel', {}));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '검사 수정' })).not.toBeInTheDocument());
  });

  it('disables the inspection cancel and explains why when a pass quantity has been received', async () => {
    current = { ...inspectionItem('Y'), details: [{ ...detail(71), receivedQty: 4, receiptNo: 'MI-20261117-0003' }, detail(72)] };
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: '검사 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const dialog = await screen.findByRole('dialog', { name: '검사 수정' });
    await waitFor(() => expect(within(dialog).getByLabelText('검사번호')).toHaveValue('QI-20261117-0001'));
    expect(await within(dialog).findByText(/합격분이 입고된 품목이 있습니다\(입고 MI-20261117-0003\)/)).toBeInTheDocument();
    expect(await within(dialog).findByRole('button', { name: '검사 취소' })).toBeDisabled();
  });

  it('moves to the arrival status screen with the arrival id from the arrival number link', async () => {
    renderPage();
    const grid = await screen.findByRole('grid', { name: '자재수입검사현황 목록' });
    await waitFor(() => expect(within(grid).getAllByText('정상').length).toBeGreaterThan(0));
    fireEvent.click(within(grid).getAllByRole('button', { name: 'MP-20261117-0001 가입고 보기' })[0]);
    expect(await screen.findByTestId('arrival-status-location')).toHaveTextContent(
      '/materials/arrival/arrival-status?arrivalId=800',
    );
  });

  it('opens the detail straight away when the arrival screen links with an inspection id', async () => {
    renderPage('/?inspectionId=900');
    expect(await screen.findByText('검사번호: QI-20261117-0001')).toBeInTheDocument();
    expect(apiGetMock).toHaveBeenCalledWith('/api/v1/quality/quality-inspections/900');
  });
});

function ArrivalStatusLocation() {
  const location = useLocation();
  return <div data-testid="arrival-status-location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(initialEntry = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <QualityInspectionStatusPage
            selectedModule={{
              id: 'quality',
              name: '품질관리',
              icon: null,
              tree: [{
                id: 'inspect',
                name: '수입검사',
                children: [{
                  id: 'inspect-create',
                  name: '자재수입검사등록',
                  pageKey: 'inspect-create',
                  permissions: { read: true, update: true },
                }],
              }],
              menus: [],
            }}
            currentMenuName="자재수입검사현황"
            breadcrumbItems={['품질관리', '수입검사', '자재수입검사현황']}
            content={{ title: '자재수입검사현황', description: '', cards: [], items: [] }}
            selectedMenuPermissions={{ read: true, excel: true }}
          />
        ),
      },
      { path: '/materials/arrival/arrival-status', element: <ArrivalStatusLocation /> },
    ],
    { initialEntries: [initialEntry] },
  );
  return render(<RouterProvider router={router} />);
}

function row(detailId: number): QualityInspectionStatusRow {
  return {
    qualityInspectionId: 900,
    qualityInspectionDetailId: detailId,
    inspectionNo: 'QI-20261117-0001',
    inspectionDt: '2026-11-17',
    inspectorName: '홍길동',
    status: 'ACTIVE',
    headerRemark: null,
    lineNo: detailId === 71 ? 1 : 2,
    arrivalNo: 'MP-20261117-0001',
    purchaseArrivalId: 800,
    arrivalLinked: true,
    supplierName: '테스트 구매처',
    orderNo: 'PO-20261113-0001',
    materialCode: `M-${detailId}`,
    materialName: `품목 ${detailId}`,
    materialSpec: null,
    unit: 'KG',
    arrivalQty: 10,
    inspectQty: 6,
    passQty: 5,
    failQty: 1,
    passRate: 83.3,
    remark: null,
    createdByName: '관리자',
  };
}

function detail(id: number): QualityInspectionDetailItem {
  return {
    qualityInspectionDetailId: id,
    lineNo: id === 71 ? 1 : 2,
    purchaseArrivalDetailId: id - 50,
    purchaseArrivalId: 800,
    arrivalLinked: true,
    arrivalNo: 'MP-20261117-0001',
    supplierName: '테스트 구매처',
    purchaseOrderDetailId: id + 100,
    orderNo: 'PO-20261113-0001',
    materialId: id + 200,
    materialCode: `M-${id}`,
    materialName: `품목 ${id}`,
    materialSpec: null,
    unit: 'KG',
    arrivalQty: 10,
    otherInspectedQty: 2,
    maxQty: 8,
    passQty: 5,
    failQty: 1,
    inspectQty: 6,
    remark: null,
  };
}

function inspectionItem(useAt: 'Y' | 'N'): QualityInspectionItem {
  return {
    qualityInspectionId: 900,
    inspectionNo: 'QI-20261117-0001',
    inspectionDt: '2026-11-17',
    inspectorId: 5,
    inspectorName: '홍길동',
    remark: null,
    useAt,
    status: useAt === 'Y' ? 'ACTIVE' : 'CANCELED',
    details: [detail(71), detail(72)],
  };
}
