import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../src/shared/services/apiClient';
import { MaterialInspectionCreatePage } from '../src/pages/quality/inspect/create/MaterialInspectionCreatePage';
import { calculateInspectQty } from '../src/pages/quality/inspect/create/data/materialInspectionColumns';
import {
  buildInspectionPayload,
  cancelMaterialInspection,
  candidateToRow,
  countRemovedRows,
  createMaterialInspection,
  detailToRow,
  getMaterialInspection,
  searchInspectionCandidates,
  updateMaterialInspection,
  validateInspectionInput,
} from '../src/pages/quality/inspect/create/services/materialInspection.service';
import type {
  MaterialInspectionCandidate,
  MaterialInspectionDetailItem,
  MaterialInspectionItem,
} from '../src/pages/quality/inspect/create/types/materialInspection.types';
import { getSystemDate } from '../src/shared/services/systemDateService';

// 작성 기준일은 서버 날짜(GET /api/v1/common/system-date)로 채운다. 기본은 2026-11-17이고 테스트가 값을 바꾼다.
vi.mock('../src/shared/services/systemDateService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/shared/services/systemDateService')>()),
  getSystemDate: vi.fn(async () => '2026-11-17'),
}));

vi.mock('../src/shared/services/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/shared/services/apiClient')>();
  return { ...actual, apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn() };
});

const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);
const apiPutMock = vi.mocked(apiPut);

const CANDIDATE_PATH = '/api/v1/quality/material-inspections/candidates';

function candidate(id: number, overrides: Partial<MaterialInspectionCandidate> = {}): MaterialInspectionCandidate {
  return {
    materialArrivalDetailId: id,
    materialArrivalId: 800 + id,
    arrivalNo: `MP-20261117-00${id}`,
    arrivalDt: '2026-11-17',
    supplierName: `구매처 ${id}`,
    purchaseOrderDetailId: id + 100,
    orderNo: 'PO-20261113-0001',
    materialId: id + 200,
    materialCode: `M-${id}`,
    materialName: `품목 ${id}`,
    materialSpec: null,
    unit: 'KG',
    arrivalQty: 10,
    inspectedQty: 4,
    passQty: 3,
    failQty: 1,
    waitQty: 6,
    ...overrides,
  };
}

function detail(id: number, overrides: Partial<MaterialInspectionDetailItem> = {}): MaterialInspectionDetailItem {
  return {
    materialInspectionDetailId: id,
    lineNo: id === 71 ? 1 : 2,
    materialArrivalDetailId: id - 50,
    materialArrivalId: 800,
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
    ...overrides,
  };
}

function inspectionItem(useAt: 'Y' | 'N' = 'Y', details = [detail(71), detail(72)]): MaterialInspectionItem {
  return {
    materialInspectionId: 900,
    inspectionNo: 'QI-20261117-0001',
    inspectionDt: '2026-11-17',
    inspectorId: 5,
    inspectorName: '홍길동',
    remark: null,
    useAt,
    status: useAt === 'Y' ? 'ACTIVE' : 'CANCELED',
    details,
  };
}

describe('material inspection rows and payload', () => {
  it('turns a waiting arrival row into a grid row that passes the whole waiting quantity by default', () => {
    expect(candidateToRow(candidate(51))).toMatchObject({
      rowId: 'arrival-51', materialInspectionDetailId: null, materialArrivalDetailId: 51, arrivalNo: 'MP-20261117-0051',
      arrivalQty: 10, otherInspectedQty: 4, maxQty: 6, passQty: 6, failQty: 0, inspectQty: 6,
    });
  });

  it('turns a saved detail into a grid row with the input limit and the computed inspect quantity', () => {
    expect(detailToRow(detail(71))).toMatchObject({
      rowId: 'inspection-71', materialInspectionDetailId: 71, materialArrivalDetailId: 21, arrivalQty: 10,
      otherInspectedQty: 2, maxQty: 8, passQty: 5, failQty: 1, inspectQty: 6,
    });
  });

  it('keeps the received quantity of a row and refuses to lower its passed quantity below it', () => {
    const received = { ...detail(71), receivedQty: 4, receiptNo: 'MI-20261117-0003' };
    expect(detailToRow(received)).toMatchObject({ receivedQty: 4, receiptNo: 'MI-20261117-0003' });
    expect(candidateToRow(candidate(51))).toMatchObject({ receivedQty: 0, receiptNo: '' });
    const row = detailToRow(received);
    const input = { inspectionDt: '2026-11-17' };
    expect(validateInspectionInput(input, [row])).toEqual([]);
    expect(validateInspectionInput(input, [{ ...row, passQty: 3, failQty: 1 }]))
      .toContain('품목 71(MP-20261117-0001)는 합격분 4이(가) 입고되어 합격량을 줄일 수 없습니다.');
    expect(validateInspectionInput(input, [{ ...row, passQty: 4, failQty: 3 }])).toEqual([]);
  });

  it('adds pass and fail without floating point drift', () => {
    expect(calculateInspectQty(0.1, 0.2)).toBe(0.3);
    expect(calculateInspectQty(null, 2)).toBe(2);
  });

  it('counts the saved rows that are being removed', () => {
    const rows = [detailToRow(detail(71)), detailToRow(detail(72))];
    expect(countRemovedRows([detail(71), detail(72)], rows)).toBe(0);
    expect(countRemovedRows([detail(71), detail(72)], [rows[0]])).toBe(1);
  });

  it('validates the header, quantities and the waiting quantity limit', () => {
    const rows = [detailToRow(detail(71))];
    const input = { inspectionDt: '2026-11-17' };
    expect(validateInspectionInput(input, rows)).toEqual([]);
    expect(validateInspectionInput(input, [{ ...rows[0], passQty: 8, failQty: 0 }])).toEqual([]);
    expect(validateInspectionInput(input, [{ ...rows[0], passQty: 8, failQty: 0.5 }])[0])
      .toBe('품목 71(MP-20261117-0001)의 검사량이 검사 대기량 8을(를) 초과했습니다.');
    expect(validateInspectionInput(input, [{ ...rows[0], passQty: 0, failQty: 0 }]))
      .toContain('합격량과 불합격량의 합은 0보다 커야 합니다.');
    expect(validateInspectionInput(input, [{ ...rows[0], passQty: -1, failQty: 2 }]))
      .toContain('합격량은 0 이상이어야 합니다.');
    expect(validateInspectionInput(input, [{ ...rows[0], passQty: null }])).toContain('합격량을 입력해 주세요.');
    expect(validateInspectionInput(input, [{ ...rows[0], failQty: null }])).toContain('불합격량을 입력해 주세요.');
    expect(validateInspectionInput({ inspectionDt: '' }, []))
      .toEqual(expect.arrayContaining(['검사일을 입력해 주세요.', '검사할 가입고 품목을 불러와 주세요.']));
  });

  it('builds a create payload with arrival row ids and an update payload with detail ids and the inspector', () => {
    const created = { ...candidateToRow(candidate(51)), passQty: 5, failQty: 1, remark: ' 메모 ' };
    expect(buildInspectionPayload({ inspectionDt: '2026-11-17', remark: ' 비고 ' }, [created])).toEqual({
      inspectionDt: '2026-11-17', remark: '비고',
      details: [{ materialArrivalDetailId: 51, passQty: 5, failQty: 1, remark: '메모' }],
    });
    const saved = detailToRow(detail(71));
    expect(buildInspectionPayload({ inspectionDt: '2026-11-17', remark: '', inspectorId: 5 }, [saved])).toEqual({
      inspectionDt: '2026-11-17', inspectorId: 5, remark: null,
      details: [{ materialInspectionDetailId: 71, passQty: 5, failQty: 1, remark: null }],
    });
  });

  it('calls the inspection endpoints', async () => {
    apiGetMock.mockResolvedValue({ resultList: [candidate(51)], total: 7 });
    expect(await searchInspectionCandidates({ fromDt: '2026-11-01', toDt: '2026-11-30', keyword: ' 한일 ' }))
      .toMatchObject({ total: 7, rows: [{ materialArrivalDetailId: 51 }] });
    expect(apiGetMock).toHaveBeenLastCalledWith(`${CANDIDATE_PATH}?fromDt=2026-11-01&toDt=2026-11-30&keyword=%ED%95%9C%EC%9D%BC`);
    apiGetMock.mockResolvedValue({ resultList: [candidate(51)] });
    expect((await searchInspectionCandidates()).total).toBe(1);
    expect(apiGetMock).toHaveBeenLastCalledWith(CANDIDATE_PATH);

    const payload = { inspectionDt: '2026-11-17' } as never;
    apiPostMock.mockResolvedValue({ item: { materialInspectionId: 900 } });
    await createMaterialInspection(payload);
    expect(apiPostMock).toHaveBeenLastCalledWith('/api/v1/quality/material-inspections', payload);
    apiGetMock.mockResolvedValue({ item: { materialInspectionId: 900 } });
    await getMaterialInspection(900);
    expect(apiGetMock).toHaveBeenLastCalledWith('/api/v1/quality/material-inspections/900');
    apiPutMock.mockResolvedValue({ item: { materialInspectionId: 900 } });
    await updateMaterialInspection(900, payload);
    expect(apiPutMock).toHaveBeenLastCalledWith('/api/v1/quality/material-inspections/900', payload);
    apiPostMock.mockResolvedValue({ item: { materialInspectionId: 900 } });
    await cancelMaterialInspection(900);
    expect(apiPostMock).toHaveBeenLastCalledWith('/api/v1/quality/material-inspections/900/cancel', {});
    apiPostMock.mockResolvedValue({ item: null });
    await expect(cancelMaterialInspection(900)).rejects.toThrow('검사 취소 응답에 검사 정보가 없습니다.');
  });
});

describe('MaterialInspectionCreatePage', () => {
  let current: MaterialInspectionItem;

  beforeEach(() => {
    vi.clearAllMocks();
    current = inspectionItem();
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith(CANDIDATE_PATH)) {
        return { resultList: [candidate(51), candidate(52, { supplierName: '구매처 52' })], total: 2 };
      }
      if (path === '/api/v1/quality/material-inspections/900') return { item: current };
      return { resultList: [] };
    });
    apiPostMock.mockResolvedValue({ item: inspectionItem() });
    apiPutMock.mockImplementation(async () => ({ item: current }));
  });

  async function openPicker() {
    renderPage({ mode: 'create' });
    fireEvent.click(await screen.findByRole('button', { name: '가입고 불러오기' }));
    const dialog = await screen.findByRole('dialog', { name: '검사 대기 가입고 선택' });
    const grid = within(dialog).getByRole('grid', { name: '검사 대기 가입고 목록' });
    await within(grid).findByText('품목 51');
    return { dialog, grid };
  }

  it('tells how many waiting rows exist and disables saving until rows are loaded', async () => {
    renderPage({ mode: 'create' });
    await screen.findByText('검사 기본정보');
    expect(await screen.findByText(/검사 대기 2건이 있습니다/)).toBeInTheDocument();
    expect(screen.getByText(/하나의 검사번호로 묶입니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  });

  it('says so when nothing is waiting for inspection', async () => {
    apiGetMock.mockImplementation(async () => ({ resultList: [], total: 0 }));
    renderPage({ mode: 'create' });
    expect(await screen.findByText('검사 대기 중인 가입고 품목이 없습니다.')).toBeInTheDocument();
  });

  it('loads several arrival rows into one inspection, fills the whole waiting quantity as passed and saves them together', async () => {
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('51 행 선택'));
    fireEvent.click(within(grid).getByLabelText('52 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 불러오기 (2)' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '검사 대기 가입고 선택' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText('검사량 합계')).toHaveValue('12'));
    expect(screen.getByLabelText('합격량 합계')).toHaveValue('12');
    expect(screen.getByLabelText('불합격량 합계')).toHaveValue('0');
    expect(screen.getByLabelText('검사자')).toHaveValue('로그인 사용자');

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    const [path, payload] = apiPostMock.mock.calls[0];
    expect(path).toBe('/api/v1/quality/material-inspections');
    expect(payload).toMatchObject({
      inspectionDt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      details: [
        { materialArrivalDetailId: 51, passQty: 6, failQty: 0 },
        { materialArrivalDetailId: 52, passQty: 6, failQty: 0 },
      ],
    });
    expect((payload as Record<string, unknown>).inspectorId).toBeUndefined();
    expect(await screen.findByText(/검사번호: QI-20261117-0001/)).toBeInTheDocument();
    // 저장하면 입력이 비워지고 다시 신규 상태가 된다.
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeDisabled());
  });

  it('hides the rows that are already loaded when the picker is opened again', async () => {
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('51 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 불러오기 (1)' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '검사 대기 가입고 선택' })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '가입고 불러오기' }));
    const again = await screen.findByRole('dialog', { name: '검사 대기 가입고 선택' });
    const againGrid = within(again).getByRole('grid', { name: '검사 대기 가입고 목록' });
    await within(againGrid).findByText('품목 52');
    expect(within(againGrid).queryByText('품목 51')).not.toBeInTheDocument();
  });

  it('loads a saved inspection, shows its limits and enables save after an edit, sending the inspector and row ids', async () => {
    renderPage({ mode: 'edit', materialInspectionId: 900 });
    await waitFor(() => expect(screen.getByLabelText('검사번호')).toHaveValue('QI-20261117-0001'));
    expect(screen.getByLabelText('검사자')).toHaveValue('홍길동');
    expect(screen.getByLabelText('검사량 합계')).toHaveValue('12');
    expect(screen.getByLabelText('합격량 합계')).toHaveValue('10');
    expect(screen.getByLabelText('불합격량 합계')).toHaveValue('2');
    expect(screen.getByText(/검사 취소 또는 행 빼기를 하면 해당 가입고 행의 수정·삭제가 다시 가능해집니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('비고'), { target: { value: '비고 수정' } });
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
    const [path, payload] = apiPutMock.mock.calls[0] as [string, {
      remark: string; inspectorId: number; details: { materialInspectionDetailId: number; passQty: number; failQty: number }[];
    }];
    expect(path).toBe('/api/v1/quality/material-inspections/900');
    expect(payload.remark).toBe('비고 수정');
    expect(payload.inspectorId).toBe(5);
    expect(payload.details.map((line) => line.materialInspectionDetailId)).toEqual([71, 72]);
    expect(payload.details[0]).toMatchObject({ passQty: 5, failQty: 1 });
    expect(await screen.findByText(/검사를 수정했습니다/)).toBeInTheDocument();
  });

  it('asks before removing a row because the waiting quantity and the arrival lock are released', async () => {
    renderPage({ mode: 'edit', materialInspectionId: 900 });
    await screen.findByRole('grid', { name: '검사 상세 목록' });
    await waitFor(() => expect(screen.getByLabelText('검사번호')).toHaveValue('QI-20261117-0001'));
    // 불러온 뒤 그리드가 다시 만들어지므로 이전 요소를 쥐지 않고 항상 그려지는 행 선택 체크박스를 화면에서 찾는다.
    fireEvent.click(await screen.findByLabelText('inspection-72 행 선택'));
    fireEvent.click(screen.getByRole('button', { name: '선택 행 빼기' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '확인' });
    expect(within(confirmDialog).getByText(/빠지는 행 1건/)).toBeInTheDocument();
    expect(within(confirmDialog).getByText(/검사 대기량이 복구됩니다/)).toBeInTheDocument();
    expect(apiPutMock).not.toHaveBeenCalled();
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '확인' })).not.toBeInTheDocument());
    expect(apiPutMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    fireEvent.click(await within(await screen.findByRole('dialog', { name: '확인' })).findByRole('button', { name: '확인' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
    const payload = apiPutMock.mock.calls[0][1] as { details: { materialInspectionDetailId: number }[] };
    expect(payload.details.map((line) => line.materialInspectionDetailId)).toEqual([71]);
  });

  it('warns about the received rows, blocks removing them and keeps them in the grid', async () => {
    current = inspectionItem('Y', [
      { ...detail(71), receivedQty: 4, receiptNo: 'MI-20261117-0003' }, detail(72)]);
    renderPage({ mode: 'edit', materialInspectionId: 900 });
    await screen.findByRole('grid', { name: '검사 상세 목록' });
    expect(await screen.findByText(/합격분이 입고된 품목이 있습니다\(입고 MI-20261117-0003\)/)).toBeInTheDocument();
    expect(screen.getByText(/먼저 입고를 취소해 주세요/)).toBeInTheDocument();
    fireEvent.click(await screen.findByLabelText('inspection-71 행 선택'));
    fireEvent.click(screen.getByRole('button', { name: '선택 행 빼기' }));
    expect(await screen.findByText(/입고된 합격분이 있는 품목 1건은 검사에서 뺄 수 없습니다\. 입고 MI-20261117-0003에서 처리해 주세요/))
      .toBeInTheDocument();
    expect(screen.getByLabelText('inspection-71 행 선택')).toBeInTheDocument();
    // 입고가 없는 행은 뺄 수 있다.
    fireEvent.click(await screen.findByLabelText('inspection-72 행 선택'));
    fireEvent.click(screen.getByRole('button', { name: '선택 행 빼기' }));
    await waitFor(() => expect(screen.queryByLabelText('inspection-72 행 선택')).not.toBeInTheDocument());
  });

  it('is read only for a canceled inspection', async () => {
    current = inspectionItem('N');
    renderPage({ mode: 'edit', materialInspectionId: 900 });
    await waitFor(() => expect(screen.getByLabelText('검사번호')).toHaveValue('QI-20261117-0001'));
    expect(screen.getByText('취소된 검사입니다. 조회만 할 수 있습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '선택 행 빼기' })).not.toBeInTheDocument();
    expect(screen.queryByText(/검사 취소 또는 행 빼기를 하면/)).not.toBeInTheDocument();
  });

  it('shows no save or load button without update permission', async () => {
    renderPage({ mode: 'edit', materialInspectionId: 900, permissions: { read: true } });
    await waitFor(() => expect(screen.getByLabelText('검사번호')).toHaveValue('QI-20261117-0001'));
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '가입고 불러오기' })).not.toBeInTheDocument();
  });
});

function renderPage({
  mode,
  materialInspectionId,
  permissions = { read: true, update: true },
}: {
  mode: 'create' | 'edit' | 'view';
  materialInspectionId?: number;
  permissions?: { read: boolean; update?: boolean };
}) {
  const router = createMemoryRouter([{
    path: '/',
    element: (
      <MaterialInspectionCreatePage
        selectedModule={{ id: 'quality', name: '품질관리', icon: null, tree: [], menus: [] }}
        currentMenuName="자재수입검사등록"
        breadcrumbItems={['품질관리', '수입검사', '자재수입검사등록']}
        content={{ title: '자재수입검사등록', description: '', cards: [], items: [] }}
        selectedMenuPermissions={permissions}
        mode={mode}
        materialInspectionId={materialInspectionId}
      />
    ),
  }], { initialEntries: ['/'] });
  return render(<RouterProvider router={router} />);
}

describe('자재수입검사등록 server date default', () => {
  it('fills the 검사일 from the server date, not the browser clock', async () => {
    vi.mocked(getSystemDate).mockResolvedValueOnce('2031-05-06');
    renderPage({ mode: 'create' });
    await waitFor(() => expect(screen.getByRole('textbox', { name: /^검사일/ })).toHaveValue('2031-05-06'));
  });

  it('leaves the 검사일 empty and shows the error when the server date cannot be loaded', async () => {
    vi.mocked(getSystemDate).mockRejectedValueOnce(new Error('연결 실패'));
    renderPage({ mode: 'create' });
    expect(await screen.findByText(/서버 기준일을 불러오지 못했습니다\. 연결 실패/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^검사일/ })).toHaveValue('');
  });
});
