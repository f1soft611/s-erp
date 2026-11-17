import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../src/shared/services/apiClient';
import { MaterialArrivalCreatePage } from '../src/pages/materials/arrival/create/MaterialArrivalCreatePage';
import {
  buildArrivalPayload,
  candidateToRow,
  cancelMaterialArrival,
  countRowsOverRemaining,
  createMaterialArrival,
  distinctCandidateCurrencies,
  getMaterialArrival,
  searchArrivalCandidates,
  updateMaterialArrival,
  validateArrivalInput,
} from '../src/pages/materials/arrival/create/services/materialArrival.service';
import type { MaterialArrivalCandidate } from '../src/pages/materials/arrival/create/types/materialArrival.types';
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

vi.mock('../src/pages/co/master/warehouse/services/warehouseManagement.service', () => ({
  fetchWarehouses: vi.fn(async () => [{ warehouseId: 1, warehouseName: '자재창고' }]),
}));

vi.mock('../src/pages/co/master/common-code/services/commonCodeManagement.service', () => ({
  fetchCommonCodeGroups: vi.fn(async () => [{ id: 9, groupCode: 'PURCHASE_TAX_TYPE' }]),
  fetchCommonCodeItems: vi.fn(async () => [
    { itemCode: 'TAXABLE', itemNm: '과세', useAt: 'Y', sortOrder: 10 },
    { itemCode: 'ZERO_RATED', itemNm: '영세', useAt: 'Y', sortOrder: 20 },
    { itemCode: 'EXEMPT', itemNm: '면세', useAt: 'Y', sortOrder: 30 },
  ]),
}));

const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);
const apiPutMock = vi.mocked(apiPut);

function candidate(detailId: number, supplierId: number, overrides: Partial<MaterialArrivalCandidate> = {}): MaterialArrivalCandidate {
  return {
    purchaseOrderDetailId: detailId,
    orderNo: `PO-20261113-000${detailId % 10}`,
    orderDt: '2026-11-13',
    taxType: 'TAXABLE',
    vatIncludedAt: 'N',
    supplierId,
    supplierCode: `S${supplierId}`,
    supplierName: `구매처${supplierId}`,
    materialId: 100 + detailId,
    materialCode: `M${detailId}`,
    materialName: `품목 ${detailId}`,
    materialSpec: null,
    unit: 'KG',
    materialTypeCode: 'RAW',
    inspectAt: 'N',
    orderQty: 10,
    arrivedQty: 0,
    remainQty: 10,
    deliveryDt: '2026-11-20',
    warehouseId: 1,
    warehouseName: '자재창고',
    unitPrice: 1000,
    currencyCode: 'KRW',
    orderTypeName: '원자재',
    useTypeName: '생산',
    remark: null,
    ...overrides,
  };
}

describe('material arrival rows and payload', () => {
  it('defaults a row to the remaining quantity and the order price with the order vat rules', () => {
    const row = candidateToRow(candidate(51, 4, { remainQty: 7 }), 'TAXABLE', false);
    expect(row).toMatchObject({
      purchaseOrderDetailId: 51, arrivalQty: 7, remainQty: 7, unitPrice: 1000, warehouseId: '1',
      inspectAt: false, lotNo: '', manufactureDt: '', expireDt: '',
      supplyAmt: 7000, vatAmt: 700, totalAmt: 7700,
    });
    const included = candidateToRow(candidate(51, 4, { unitPrice: 1100, remainQty: 1 }), 'TAXABLE', true);
    expect(included).toMatchObject({ supplyAmt: 1000, vatAmt: 100, totalAmt: 1100 });
    const exempt = candidateToRow(candidate(51, 4, { remainQty: 2 }), 'EXEMPT', false);
    expect(exempt).toMatchObject({ vatAmt: 0, totalAmt: 2000 });
  });

  it('keeps a missing order price empty so the user must enter one', () => {
    expect(candidateToRow(candidate(51, 4, { unitPrice: null }), 'TAXABLE', false).unitPrice).toBeNull();
  });

  it('validates required header and row values and allows a zero price', () => {
    const rows = [candidateToRow(candidate(51, 4), 'TAXABLE', false)];
    const input = { arrivalDt: '2026-11-16', supplierId: 4, taxType: 'TAXABLE' };
    expect(validateArrivalInput(input, rows)).toEqual([]);
    expect(validateArrivalInput(input, [{ ...rows[0], unitPrice: 0 }])).toEqual([]);
    expect(validateArrivalInput(input, [{ ...rows[0], unitPrice: null }])).toContain('가입고단가를 입력해 주세요.');
    // 잔량 초과는 오류가 아니라 저장 전 확인창 대상이다.
    expect(validateArrivalInput(input, [{ ...rows[0], arrivalQty: 10.01 }])).toEqual([]);
    expect(validateArrivalInput(input, [{ ...rows[0], arrivalQty: 0 }])).toContain('가입고수량은 0보다 커야 합니다.');
    expect(validateArrivalInput(input, [{ ...rows[0], warehouseId: '' }])).toContain('입고창고를 선택해 주세요.');
    expect(validateArrivalInput(input, [{ ...rows[0], manufactureDt: '2026-11-10', expireDt: '2026-11-01' }]))
      .toContain('소비기한은 제조일 이후여야 합니다.');
    expect(validateArrivalInput({ ...input, arrivalDt: '', supplierId: null }, []))
      .toEqual(expect.arrayContaining(['가입고일을 입력해 주세요.', '구매처를 확인해 주세요.', '가입고할 발주 품목을 불러와 주세요.']));
  });

  it('counts only the rows whose quantity is over the order remaining', () => {
    const base = candidateToRow(candidate(51, 4, { remainQty: 7 }), 'TAXABLE', false);
    expect(countRowsOverRemaining([base, { ...base, arrivalQty: 7.01 }, { ...base, arrivalQty: 3 }])).toBe(1);
    expect(countRowsOverRemaining([])).toBe(0);
  });

  it('builds the save payload with vat, empty dates as null and the row ids', () => {
    const row = { ...candidateToRow(candidate(51, 4), 'TAXABLE', false), remark: ' 메모 ', manufactureDt: '2026-11-01' };
    expect(buildArrivalPayload({
      arrivalDt: '2026-11-16', supplierId: 4, taxType: 'TAXABLE', vatIncluded: false, remark: ' 비고 ',
    }, [row])).toEqual({
      arrivalDt: '2026-11-16', supplierId: 4, taxType: 'TAXABLE', vatIncludedAt: 'N', remark: '비고',
      details: [{
        materialArrivalDetailId: null, purchaseOrderDetailId: 51, arrivalQty: 10, unitPrice: 1000,
        warehouseId: 1, vatAmt: 1000, manufactureDt: '2026-11-01', expireDt: null, remark: '메모',
      }],
    });
    expect(buildArrivalPayload({
      arrivalDt: '2026-11-16', supplierId: 4, taxType: 'EXEMPT', vatIncluded: true, remark: '',
    }, [row]).vatIncludedAt).toBe('N');
  });

  it('detects mixed currencies and calls the arrival endpoints', async () => {
    expect(distinctCandidateCurrencies([candidate(51, 4), candidate(52, 4, { currencyCode: 'USD' })])).toEqual(['KRW', 'USD']);
    apiGetMock.mockResolvedValue({ resultList: [candidate(51, 4)] });
    await searchArrivalCandidates({ fromDt: '2026-11-01', toDt: '2026-11-30', keyword: ' 한일 ' });
    expect(apiGetMock).toHaveBeenLastCalledWith(
      '/api/v1/materials/material-arrivals/candidates?fromDt=2026-11-01&toDt=2026-11-30&keyword=%ED%95%9C%EC%9D%BC',
    );
    const payload = { arrivalDt: '2026-11-16' } as never;
    apiPostMock.mockResolvedValue({ item: { materialArrivalId: 1, arrivalNo: 'MP-20261116-0001' } });
    await createMaterialArrival(payload);
    expect(apiPostMock).toHaveBeenLastCalledWith('/api/v1/materials/material-arrivals', payload);
    apiGetMock.mockResolvedValue({ item: { materialArrivalId: 1 } });
    await getMaterialArrival(1);
    expect(apiGetMock).toHaveBeenLastCalledWith('/api/v1/materials/material-arrivals/1');
    apiPutMock.mockResolvedValue({ item: { materialArrivalId: 1 } });
    await updateMaterialArrival(1, payload);
    expect(apiPutMock).toHaveBeenLastCalledWith('/api/v1/materials/material-arrivals/1', payload);
    apiPostMock.mockResolvedValue({ item: { materialArrivalId: 1 } });
    await cancelMaterialArrival(1);
    expect(apiPostMock).toHaveBeenLastCalledWith('/api/v1/materials/material-arrivals/1/cancel', {});
    apiPostMock.mockResolvedValue({ item: null });
    await expect(createMaterialArrival(payload)).rejects.toThrow('가입고 등록 응답에 가입고 정보가 없습니다.');
  });
});

describe('MaterialArrivalCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/materials/material-arrivals/candidates')) {
        return { resultList: [candidate(51, 4), candidate(52, 4), candidate(61, 5), candidate(71, 4, { unitPrice: null })] };
      }
      return { resultList: [] };
    });
    apiPostMock.mockResolvedValue({ item: { materialArrivalId: 1, arrivalNo: 'MP-20261116-0001' } });
  });

  async function openPicker() {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '발주 불러오기' }));
    const dialog = await screen.findByRole('dialog', { name: '발주 품목 선택' });
    const grid = within(dialog).getByRole('grid', { name: '가입고 대상 발주 품목 목록' });
    await within(grid).findByText('품목 51');
    return { dialog, grid };
  }

  it('locks the supplier of the first checked row and drops other suppliers from the selection', async () => {
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('51 행 선택'));
    expect(await within(dialog).findByText('구매처: 구매처4')).toBeInTheDocument();
    fireEvent.click(within(grid).getByLabelText('61 행 선택'));
    expect(await within(dialog).findByText(/구매처 1곳만 담을 수 있습니다/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '선택 불러오기 (1)' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('구매처 선택 초기화'));
    await waitFor(() => expect(within(dialog).getByText(/첫 번째로 체크한 품목의 구매처로 고정/)).toBeInTheDocument());
  });

  it('loads rows of one supplier, shows totals with vat and saves the arrival', async () => {
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('51 행 선택'));
    fireEvent.click(within(grid).getByLabelText('52 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 불러오기 (2)' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '발주 품목 선택' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText('공급가액')).toHaveValue('20,000'));
    expect(screen.getByLabelText('부가세액')).toHaveValue('2,000');
    expect(screen.getByLabelText('합계액')).toHaveValue('22,000');
    expect(screen.getByLabelText('구매처')).toHaveValue('구매처4 (S4)');

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    const [path, payload] = apiPostMock.mock.calls[0];
    expect(path).toBe('/api/v1/materials/material-arrivals');
    expect(payload).toMatchObject({
      supplierId: 4, taxType: 'TAXABLE', vatIncludedAt: 'N',
      details: [
        { purchaseOrderDetailId: 51, arrivalQty: 10, unitPrice: 1000, warehouseId: 1 },
        { purchaseOrderDetailId: 52, arrivalQty: 10, unitPrice: 1000, warehouseId: 1 },
      ],
    });
    expect(await screen.findByText(/가입고번호: MP-20261116-0001/)).toBeInTheDocument();
  });

  it('tells the user which receipt was registered automatically for the no-inspection rows', async () => {
    apiPostMock.mockResolvedValue({
      item: {
        materialArrivalId: 1, arrivalNo: 'MP-20261117-0001', autoReceiptNo: 'MI-20261117-0001', autoReceiptCount: 1,
      },
    });
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('51 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 불러오기 (1)' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '발주 품목 선택' })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText(
      /가입고번호: MP-20261117-0001 무검사 품목 1건은 입고 MI-20261117-0001에 자동 등록되었습니다/,
    )).toBeInTheDocument();
  });

  it('blocks saving when a row has no unit price', async () => {
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('71 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 불러오기 (1)' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '발주 품목 선택' })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('가입고단가를 입력해 주세요.')).toBeInTheDocument();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('exempt tax type disables the vat-included switch', async () => {
    renderPage();
    const taxSelect = await screen.findByRole('combobox', { name: /부가세구분/ });
    fireEvent.mouseDown(taxSelect);
    fireEvent.click(await screen.findByRole('option', { name: '면세' }));
    await waitFor(() => expect(screen.getByLabelText('부가세 포함')).toBeDisabled());
  });

  it('shows no save or load button without update permission', async () => {
    renderPage({ read: true });
    await screen.findByText('가입고 기본정보');
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '발주 불러오기' })).not.toBeInTheDocument();
  });
});

function renderPage(permissions: { read: boolean; update?: boolean } = { read: true, update: true }) {
  const router = createMemoryRouter([{
    path: '/',
    element: (
      <MaterialArrivalCreatePage
        selectedModule={{ id: 'materials', name: '구매자재', icon: null, tree: [], menus: [] }}
        currentMenuName="가입고등록"
        breadcrumbItems={['구매자재', '입고관리', '가입고등록']}
        content={{ title: '가입고등록', description: '', cards: [], items: [] }}
        selectedMenuPermissions={permissions}
      />
    ),
  }], { initialEntries: ['/'] });
  return render(<RouterProvider router={router} />);
}

describe('가입고등록 server date default', () => {
  it('fills the 가입고일 from the server date, not the browser clock', async () => {
    vi.mocked(getSystemDate).mockResolvedValueOnce('2031-05-06');
    renderPage();
    await waitFor(() => expect(screen.getByRole('textbox', { name: /^가입고일/ })).toHaveValue('2031-05-06'));
  });

  it('leaves the 가입고일 empty and shows the error when the server date cannot be loaded', async () => {
    vi.mocked(getSystemDate).mockRejectedValueOnce(new Error('연결 실패'));
    renderPage();
    expect(await screen.findByText(/서버 기준일을 불러오지 못했습니다\. 연결 실패/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^가입고일/ })).toHaveValue('');
  });
});
