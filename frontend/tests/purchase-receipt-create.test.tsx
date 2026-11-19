import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../src/shared/services/apiClient';
import { PurchaseReceiptCreatePage } from '../src/pages/materials/receipt/create/PurchaseReceiptCreatePage';
import {
  buildReceiptPayload,
  candidateToRow,
  cancelPurchaseReceipt,
  countRemovedNoInspectionRows,
  countRowsOverRemaining,
  createPurchaseReceipt,
  detailToRow,
  distinctReceiptCandidateCurrencies,
  getPurchaseReceipt,
  isLinkedNoInspection,
  searchReceiptCandidates,
  updatePurchaseReceipt,
  validateReceiptInput,
} from '../src/pages/materials/receipt/create/services/purchaseReceipt.service';
import type {
  PurchaseReceiptCandidate,
  PurchaseReceiptDetailItem,
  PurchaseReceiptItem,
} from '../src/pages/materials/receipt/create/types/purchaseReceipt.types';
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
    { itemCode: 'EXEMPT', itemNm: '면세', useAt: 'Y', sortOrder: 30 },
  ]),
}));

const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);
const apiPutMock = vi.mocked(apiPut);

function detail(id: number, overrides: Partial<PurchaseReceiptDetailItem> = {}): PurchaseReceiptDetailItem {
  return {
    purchaseReceiptDetailId: id,
    lineNo: id === 71 ? 1 : 2,
    purchaseArrivalDetailId: id - 50,
    purchaseArrivalId: 800,
    arrivalActive: 'Y',
    inspectAt: 'N',
    arrivalNo: 'MP-20261117-0001',
    purchaseOrderDetailId: id - 20,
    orderNo: 'PO-20261113-0001',
    materialId: id + 100,
    materialCode: `M-${id}`,
    materialName: `품목 ${id}`,
    materialSpec: null,
    unit: 'KG',
    orderQty: 10,
    remainQty: 8,
    arrivalQty: 5,
    receiptQty: 5,
    unitPrice: 1000,
    supplyAmt: 5000,
    vatAmt: 500,
    totalAmt: 5500,
    warehouseId: 1,
    warehouseName: '자재창고',
    manufactureDt: null,
    expireDt: null,
    lotNo: null,
    remark: null,
    ...overrides,
  };
}

const CANDIDATE_PATH = '/api/v1/materials/purchase-receipts/candidates';

function candidate(id: number, overrides: Partial<PurchaseReceiptCandidate> = {}): PurchaseReceiptCandidate {
  return {
    qualityInspectionDetailId: id,
    qualityInspectionId: 950 + (id > 31 ? 1 : 0),
    inspectionNo: id > 31 ? 'QI-20261117-0002' : 'QI-20261117-0001',
    inspectionDt: '2026-11-17',
    purchaseArrivalDetailId: id - 10,
    arrivalNo: `MP-20261117-00${id}`,
    supplierId: 4,
    supplierCode: 'S4',
    supplierName: '테스트 구매처',
    currencyCode: 'KRW',
    taxType: 'TAXABLE',
    vatIncludedAt: 'N',
    purchaseOrderDetailId: id - 20,
    orderNo: 'PO-20261113-0002',
    materialId: id + 200,
    materialCode: `M-${id}`,
    materialName: `품목 ${id}`,
    materialSpec: null,
    unit: 'KG',
    passQty: 10,
    receivedQty: 4,
    receivableQty: 6,
    unitPrice: 1000,
    warehouseId: 1,
    warehouseName: '자재창고',
    manufactureDt: null,
    expireDt: null,
    ...overrides,
  };
}

function inspectionDetail(id: number, overrides: Partial<PurchaseReceiptDetailItem> = {}): PurchaseReceiptDetailItem {
  return detail(id, {
    inspectAt: 'Y', qualityInspectionDetailId: id - 40, inspectionNo: 'QI-20261117-0001', remainQty: null,
    orderQty: null, receivableQty: 6, ...overrides,
  });
}

function receiptItem(useAt: 'Y' | 'N' = 'Y', details = [detail(71), detail(72)]): PurchaseReceiptItem {
  return {
    purchaseReceiptId: 900,
    receiptNo: 'MI-20261117-0001',
    receiptDt: '2026-11-17',
    supplierId: 4,
    supplierCode: 'S4',
    supplierName: '테스트 구매처',
    receiverName: '홍길동',
    currencyCode: 'KRW',
    taxType: 'TAXABLE',
    vatIncludedAt: 'N',
    supplyAmt: 10000,
    vatAmt: 1000,
    totalAmt: 11000,
    remark: null,
    useAt,
    details,
  };
}

describe('material receipt rows and payload', () => {
  it('knows which rows move together with an arrival row (no inspection, arrival still active)', () => {
    expect(isLinkedNoInspection(detail(71))).toBe(true);
    expect(isLinkedNoInspection(detail(71, { inspectAt: 'Y' }))).toBe(false);
    expect(isLinkedNoInspection(detail(71, { purchaseArrivalDetailId: null, inspectAt: null }))).toBe(false);
    expect(isLinkedNoInspection(detail(71, { arrivalActive: 'N' }))).toBe(false);
  });

  it('turns a saved detail into a grid row with the order remaining as a reference', () => {
    expect(detailToRow(detail(71))).toMatchObject({
      rowId: 'receipt-71', purchaseReceiptDetailId: 71, arrivalNo: 'MP-20261117-0001', arrivalQty: 5,
      remainQty: 8, receiptQty: 5, unitPrice: 1000, warehouseId: '1', lotNo: '', linkedNoInspection: true,
    });
  });

  it('counts rows over the remaining and the no-inspection rows that are being removed', () => {
    const rows = [detailToRow(detail(71)), detailToRow(detail(72))];
    expect(countRowsOverRemaining(rows)).toBe(0);
    expect(countRowsOverRemaining([{ ...rows[0], receiptQty: 8.01 }, rows[1]])).toBe(1);
    const saved = [detail(71), detail(72), detail(73, { inspectAt: 'Y' })];
    expect(countRemovedNoInspectionRows(saved, [rows[0]])).toBe(1);
    expect(countRemovedNoInspectionRows(saved, rows)).toBe(0);
    expect(countRemovedNoInspectionRows(saved, [])).toBe(2);
  });

  it('validates required header and row values and allows a zero price', () => {
    const rows = [detailToRow(detail(71))];
    const input = { receiptDt: '2026-11-17', taxType: 'TAXABLE' };
    expect(validateReceiptInput(input, rows)).toEqual([]);
    expect(validateReceiptInput(input, [{ ...rows[0], unitPrice: 0 }])).toEqual([]);
    expect(validateReceiptInput(input, [{ ...rows[0], receiptQty: 8.01 }])).toEqual([]);
    expect(validateReceiptInput(input, [{ ...rows[0], unitPrice: null }])).toContain('입고단가를 입력해 주세요.');
    expect(validateReceiptInput(input, [{ ...rows[0], receiptQty: 0 }])).toContain('입고수량은 0보다 커야 합니다.');
    expect(validateReceiptInput(input, [{ ...rows[0], warehouseId: '' }])).toContain('입고창고를 선택해 주세요.');
    expect(validateReceiptInput(input, [{ ...rows[0], manufactureDt: '2026-11-10', expireDt: '2026-11-01' }]))
      .toContain('소비기한은 제조일 이후여야 합니다.');
    expect(validateReceiptInput({ receiptDt: '', taxType: '' }, []))
      .toEqual(expect.arrayContaining(['입고일을 입력해 주세요.', '부가세구분을 선택해 주세요.', '모든 행을 뺄 수 없습니다. 입고 취소를 사용해 주세요.']));
  });

  it('builds the update payload with row ids, vat and empty dates as null', () => {
    const row = { ...detailToRow(detail(71)), remark: ' 메모 ', manufactureDt: '2026-11-01' };
    expect(buildReceiptPayload({ receiptDt: '2026-11-17', taxType: 'TAXABLE', vatIncluded: false, remark: ' 비고 ' }, [row]))
      .toEqual({
        receiptDt: '2026-11-17', taxType: 'TAXABLE', vatIncludedAt: 'N', remark: '비고',
        details: [{
          purchaseReceiptDetailId: 71, receiptQty: 5, unitPrice: 1000, warehouseId: 1, vatAmt: 500,
          manufactureDt: '2026-11-01', expireDt: null, remark: '메모',
        }],
      });
    expect(buildReceiptPayload({ receiptDt: '2026-11-17', taxType: 'EXEMPT', vatIncluded: true, remark: '' }, [row]).vatIncludedAt)
      .toBe('N');
  });

  it('calls the receipt endpoints', async () => {
    apiGetMock.mockResolvedValue({ item: { purchaseReceiptId: 900 } });
    await getPurchaseReceipt(900);
    expect(apiGetMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-receipts/900');
    const payload = { receiptDt: '2026-11-17' } as never;
    apiPutMock.mockResolvedValue({ item: { purchaseReceiptId: 900 } });
    await updatePurchaseReceipt(900, payload);
    expect(apiPutMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-receipts/900', payload);
    apiPostMock.mockResolvedValue({ item: { purchaseReceiptId: 900 } });
    await cancelPurchaseReceipt(900);
    expect(apiPostMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-receipts/900/cancel', {});
    apiPostMock.mockResolvedValue({ item: null });
    await expect(cancelPurchaseReceipt(900)).rejects.toThrow('입고 취소 응답에 입고 정보가 없습니다.');
  });
});

describe('material receipt from inspection pass quantities', () => {
  beforeEach(() => vi.clearAllMocks());

  it('turns a candidate into a row that receives the whole receivable quantity with the arrival defaults', () => {
    expect(candidateToRow(candidate(31), 'TAXABLE', false)).toMatchObject({
      rowId: 'inspection-31', purchaseReceiptDetailId: null, qualityInspectionDetailId: 31,
      inspectionNo: 'QI-20261117-0001', receivableQty: 6, receiptQty: 6, unitPrice: 1000, warehouseId: '1',
      remainQty: null, linkedNoInspection: false, supplyAmt: 6000, vatAmt: 600, totalAmt: 6600,
    });
    expect(candidateToRow(candidate(31, { unitPrice: null, warehouseId: null }), 'EXEMPT', false))
      .toMatchObject({ unitPrice: null, warehouseId: '', vatAmt: 0 });
  });

  it('turns a saved inspection-linked detail into a row with its receivable limit and no order remaining', () => {
    expect(detailToRow(inspectionDetail(91))).toMatchObject({
      purchaseReceiptDetailId: 91, qualityInspectionDetailId: 51, inspectionNo: 'QI-20261117-0001',
      receivableQty: 6, remainQty: null, linkedNoInspection: false,
    });
  });

  it('excludes inspection rows from the order remaining confirmation but not from the receivable limit', () => {
    const noInspection = { ...detailToRow(detail(71)), receiptQty: 9999 };
    const inspected = { ...candidateToRow(candidate(31), 'TAXABLE', false), receiptQty: 7 };
    expect(countRowsOverRemaining([noInspection, inspected])).toBe(1);
    expect(countRowsOverRemaining([inspected])).toBe(0);
    const input = { receiptDt: '2026-11-17', taxType: 'TAXABLE' };
    expect(validateReceiptInput(input, [inspected], true)[0])
      .toBe('품목 31(검사 QI-20261117-0001)의 입고수량이 입고 가능량 6을(를) 초과했습니다.');
    expect(validateReceiptInput(input, [{ ...inspected, receiptQty: 6 }], true)).toEqual([]);
    expect(validateReceiptInput(input, [], true)).toContain('입고할 수입검사 합격분을 불러와 주세요.');
    expect(validateReceiptInput(input, [], false)).toContain('모든 행을 뺄 수 없습니다. 입고 취소를 사용해 주세요.');
  });

  it('builds a create payload with inspection row ids and keeps saved rows pointing at the receipt row id', () => {
    const created = { ...candidateToRow(candidate(31), 'TAXABLE', false), remark: ' 메모 ' };
    expect(buildReceiptPayload({ receiptDt: '2026-11-17', taxType: 'TAXABLE', vatIncluded: false, remark: '' }, [created]))
      .toEqual({
        receiptDt: '2026-11-17', taxType: 'TAXABLE', vatIncludedAt: 'N', remark: null,
        details: [{
          qualityInspectionDetailId: 31, receiptQty: 6, unitPrice: 1000, warehouseId: 1, vatAmt: 600,
          manufactureDt: null, expireDt: null, remark: '메모',
        }],
      });
    const saved = detailToRow(inspectionDetail(91));
    expect(buildReceiptPayload({ receiptDt: '2026-11-17', taxType: 'TAXABLE', vatIncluded: false, remark: '' }, [saved])
      .details[0]).toMatchObject({ purchaseReceiptDetailId: 91 });
    expect(distinctReceiptCandidateCurrencies([candidate(31), candidate(32, { currencyCode: 'USD' })])).toEqual(['KRW', 'USD']);
  });

  it('calls the candidate and create endpoints', async () => {
    apiGetMock.mockResolvedValue({ resultList: [candidate(31)], total: 5 });
    expect(await searchReceiptCandidates({ fromDt: '2026-11-01', toDt: '2026-11-30', keyword: ' 한일 ' }))
      .toMatchObject({ total: 5, rows: [{ qualityInspectionDetailId: 31 }] });
    expect(apiGetMock).toHaveBeenLastCalledWith(`${CANDIDATE_PATH}?fromDt=2026-11-01&toDt=2026-11-30&keyword=%ED%95%9C%EC%9D%BC`);
    apiGetMock.mockResolvedValue({ resultList: [candidate(31)] });
    expect((await searchReceiptCandidates()).total).toBe(1);
    expect(apiGetMock).toHaveBeenLastCalledWith(CANDIDATE_PATH);
    const payload = { receiptDt: '2026-11-17' } as never;
    apiPostMock.mockResolvedValue({ item: { purchaseReceiptId: 900 } });
    await createPurchaseReceipt(payload);
    expect(apiPostMock).toHaveBeenLastCalledWith('/api/v1/materials/purchase-receipts', payload);
    apiPostMock.mockResolvedValue({ item: null });
    await expect(createPurchaseReceipt(payload)).rejects.toThrow('입고 등록 응답에 입고 정보가 없습니다.');
  });
});

describe('PurchaseReceiptCreatePage', () => {
  let current: PurchaseReceiptItem;

  beforeEach(() => {
    vi.clearAllMocks();
    current = receiptItem();
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === '/api/v1/materials/purchase-receipts/900') return { item: current };
      return { resultList: [] };
    });
    apiPutMock.mockImplementation(async () => ({ item: current }));
  });

  async function openPicker() {
    renderPage({ mode: 'create' });
    fireEvent.click(await screen.findByRole('button', { name: '수입검사 불러오기' }));
    const dialog = await screen.findByRole('dialog', { name: '수입검사 합격분 선택' });
    const grid = within(dialog).getByRole('grid', { name: '입고 대상 수입검사 합격분 목록' });
    await within(grid).findByText('품목 31');
    return { dialog, grid };
  }

  function mockCandidates(rows: PurchaseReceiptCandidate[], total = rows.length) {
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith(CANDIDATE_PATH)) return { resultList: rows, total };
      if (path === '/api/v1/materials/purchase-receipts/900') return { item: current };
      return { resultList: [] };
    });
  }

  it('tells how many inspection pass quantities can be received and keeps saving disabled until rows are loaded', async () => {
    mockCandidates([candidate(31), candidate(32)], 2);
    renderPage({ mode: 'create' });
    await screen.findByText('입고 기본정보');
    expect(await screen.findByText(/입고 가능한 수입검사 합격분 2건이 있습니다/)).toBeInTheDocument();
    expect(screen.getByText(/무검사 품목은 가입고를 저장하면 입고가 자동으로 등록됩니다/)).toBeInTheDocument();
    expect(screen.getByLabelText('담당자')).toHaveValue('로그인 사용자');
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  });

  it('says so when there is nothing to receive', async () => {
    mockCandidates([], 0);
    renderPage({ mode: 'create' });
    expect(await screen.findByText(/입고 가능한 수입검사 합격분이 없습니다/)).toBeInTheDocument();
  });

  it('locks the supplier of the first checked row, drops other suppliers and rejects mixed currencies', async () => {
    mockCandidates([candidate(31), candidate(32), candidate(33, { supplierId: 5, supplierName: '다른 구매처' }),
      candidate(34, { currencyCode: 'USD' })]);
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('31 행 선택'));
    expect(await within(dialog).findByText('구매처: 테스트 구매처')).toBeInTheDocument();
    fireEvent.click(within(grid).getByLabelText('33 행 선택'));
    expect(await within(dialog).findByText(/구매처 1곳만 담을 수 있습니다/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '선택 불러오기 (1)' })).toBeInTheDocument();
    fireEvent.click(within(grid).getByLabelText('34 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 불러오기 (2)' }));
    expect(await within(dialog).findByText(/통화가 다른 수입검사 품목은 한 입고에 담을 수 없습니다/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('구매처 선택 초기화'));
    await waitFor(() => expect(within(dialog).getByText(/첫 번째로 체크한 품목의 구매처로 고정/)).toBeInTheDocument());
  });

  it('loads rows of two inspections into one receipt, fills the receivable quantity and saves them together', async () => {
    mockCandidates([candidate(31), candidate(32)]);
    apiPostMock.mockResolvedValue({ item: receiptItem() });
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('31 행 선택'));
    fireEvent.click(within(grid).getByLabelText('32 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 불러오기 (2)' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '수입검사 합격분 선택' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText('공급가액')).toHaveValue('12,000'));
    expect(screen.getByLabelText('부가세액')).toHaveValue('1,200');
    expect(screen.getByLabelText('합계액')).toHaveValue('13,200');
    expect(screen.getByLabelText('구매처')).toHaveValue('테스트 구매처 (S4)');

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    const [path, payload] = apiPostMock.mock.calls[0];
    expect(path).toBe('/api/v1/materials/purchase-receipts');
    expect(payload).toMatchObject({
      taxType: 'TAXABLE', vatIncludedAt: 'N',
      details: [
        { qualityInspectionDetailId: 31, receiptQty: 6, unitPrice: 1000, warehouseId: 1 },
        { qualityInspectionDetailId: 32, receiptQty: 6, unitPrice: 1000, warehouseId: 1 },
      ],
    });
    expect(await screen.findByText(/입고를 등록했습니다\. 입고번호: MI-20261117-0001/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeDisabled());
  });

  it('saves a shortcut date as ISO even when the save button is pressed without leaving the date field', async () => {
    mockCandidates([candidate(31)]);
    apiPostMock.mockResolvedValue({ item: receiptItem() });
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('31 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 불러오기 (1)' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '수입검사 합격분 선택' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText('공급가액')).toHaveValue('6,000'));

    fireEvent.change(screen.getByRole('textbox', { name: /^입고일/ }), { target: { value: '20261118' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    expect(apiPostMock.mock.calls[0][1]).toMatchObject({ receiptDt: '2026-11-18' });
  });

  it('does not save an invalid date and tells the user which field to fix', async () => {
    mockCandidates([candidate(31)]);
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('31 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 불러오기 (1)' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '수입검사 합격분 선택' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText('공급가액')).toHaveValue('6,000'));

    fireEvent.change(screen.getByRole('textbox', { name: /^입고일/ }), { target: { value: '20261340' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('올바른 입고일을 입력해 주세요.')).toBeInTheDocument();
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /^입고일/ })).toHaveValue('20261340');
  });

  it('does not ask the order-remaining confirmation for inspection rows', async () => {
    mockCandidates([candidate(31)]);
    apiPostMock.mockResolvedValue({ item: receiptItem() });
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('31 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 불러오기 (1)' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '수입검사 합격분 선택' })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog', { name: '확인' })).not.toBeInTheDocument();
  });

  it('hides the rows that are already loaded when the picker is opened again', async () => {
    mockCandidates([candidate(31), candidate(32)]);
    const { dialog, grid } = await openPicker();
    fireEvent.click(within(grid).getByLabelText('31 행 선택'));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 불러오기 (1)' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '수입검사 합격분 선택' })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '수입검사 불러오기' }));
    const again = await screen.findByRole('dialog', { name: '수입검사 합격분 선택' });
    const againGrid = within(again).getByRole('grid', { name: '입고 대상 수입검사 합격분 목록' });
    await within(againGrid).findByText('품목 32');
    expect(within(againGrid).queryByText('품목 31')).not.toBeInTheDocument();
  });

  it('shows the inspection number and the receivable limit of a saved inspection receipt and enables save after an edit', async () => {
    current = receiptItem('Y', [inspectionDetail(91), inspectionDetail(92)]);
    renderPage({ mode: 'edit', purchaseReceiptId: 900 });
    await waitFor(() => expect(screen.getByLabelText('입고번호')).toHaveValue('MI-20261117-0001'));
    // 무검사 행이 없으므로 가입고에 반영된다는 안내가 없다.
    expect(screen.queryByText(/가입고에도 함께 반영됩니다/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('비고'), { target: { value: '비고 수정' } });
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
    const payload = apiPutMock.mock.calls[0][1] as { details: { purchaseReceiptDetailId: number; qualityInspectionDetailId?: number }[] };
    expect(payload.details.map((line) => line.purchaseReceiptDetailId)).toEqual([91, 92]);
    expect(payload.details.every((line) => line.qualityInspectionDetailId === undefined)).toBe(true);
    // 입고 가능량 초과는 확인창 없이 저장된다(서버 상한 검증은 수량이 바뀔 때만 의미가 있다).
    expect(screen.queryByRole('dialog', { name: '확인' })).not.toBeInTheDocument();
  });

  it('loads a saved receipt, tells that no-inspection edits reach the arrival and enables save after an edit', async () => {
    renderPage({ mode: 'edit', purchaseReceiptId: 900 });
    await waitFor(() => expect(screen.getByLabelText('입고번호')).toHaveValue('MI-20261117-0001'));
    expect(screen.getByLabelText('구매처')).toHaveValue('테스트 구매처 (S4)');
    expect(screen.getByLabelText('합계액')).toHaveValue('11,000');
    expect(screen.getByText(/무검사 품목\(2건\)의 수량·단가·창고·제조일·소비기한 수정은 가입고에도 함께 반영됩니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('비고'), { target: { value: '비고 수정' } });
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
    const [path, payload] = apiPutMock.mock.calls[0] as [string, { remark: string; details: { purchaseReceiptDetailId: number }[] }];
    expect(path).toBe('/api/v1/materials/purchase-receipts/900');
    expect(payload.remark).toBe('비고 수정');
    expect(payload.details.map((line) => line.purchaseReceiptDetailId)).toEqual([71, 72]);
    expect(await screen.findByText(/입고를 수정했습니다/)).toBeInTheDocument();
  });

  it('asks before removing a no-inspection row because the arrival row is deleted with it', async () => {
    renderPage({ mode: 'edit', purchaseReceiptId: 900 });
    await screen.findByRole('grid', { name: '입고 상세 목록' });
    await waitFor(() => expect(screen.getByLabelText('입고번호')).toHaveValue('MI-20261117-0001'));
    // 불러온 뒤 그리드가 다시 만들어지므로 이전 요소를 쥐지 않고 항상 그려지는 행 선택 체크박스를 화면에서 찾는다.
    fireEvent.click(await screen.findByLabelText('receipt-72 행 선택'));
    fireEvent.click(screen.getByRole('button', { name: '선택 행 빼기' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '확인' });
    expect(within(confirmDialog).getByText(/빠지는 무검사 품목 1건은 가입고에서도 함께 삭제됩니다/)).toBeInTheDocument();
    expect(apiPutMock).not.toHaveBeenCalled();
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '확인' })).not.toBeInTheDocument());
    expect(apiPutMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    fireEvent.click(await within(await screen.findByRole('dialog', { name: '확인' })).findByRole('button', { name: '확인' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
    const payload = apiPutMock.mock.calls[0][1] as { details: { purchaseReceiptDetailId: number }[] };
    expect(payload.details.map((line) => line.purchaseReceiptDetailId)).toEqual([71]);
  });

  it('is read only for a canceled receipt', async () => {
    current = receiptItem('N');
    renderPage({ mode: 'edit', purchaseReceiptId: 900 });
    await waitFor(() => expect(screen.getByLabelText('입고번호')).toHaveValue('MI-20261117-0001'));
    expect(screen.getByText('취소된 입고입니다. 조회만 할 수 있습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '선택 행 빼기' })).not.toBeInTheDocument();
    expect(screen.queryByText(/수정은 가입고에도 함께 반영됩니다/)).not.toBeInTheDocument();
  });

  it('warns that the receipt is closed for purchase closing and is read only', async () => {
    current = receiptItem('Y', [detail(71), detail(72, { closingMonth: '202611' })]);
    renderPage({ mode: 'edit', purchaseReceiptId: 900 });
    await waitFor(() => expect(screen.getByLabelText('입고번호')).toHaveValue('MI-20261117-0001'));
    expect(screen.getByText(/매입마감된 입고입니다\(마감 1건, 마감월 2026-11\)/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '선택 행 빼기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '입고 취소' })).not.toBeInTheDocument();
  });

  it('shows no save button without update permission', async () => {
    renderPage({ mode: 'edit', purchaseReceiptId: 900, permissions: { read: true } });
    await waitFor(() => expect(screen.getByLabelText('입고번호')).toHaveValue('MI-20261117-0001'));
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '수입검사 불러오기' })).not.toBeInTheDocument();
  });
});

function renderPage({
  mode,
  purchaseReceiptId,
  permissions = { read: true, update: true },
}: {
  mode: 'create' | 'edit' | 'view';
  purchaseReceiptId?: number;
  permissions?: { read: boolean; update?: boolean };
}) {
  const router = createMemoryRouter([{
    path: '/',
    element: (
      <PurchaseReceiptCreatePage
        selectedModule={{ id: 'materials', name: '구매자재', icon: null, tree: [], menus: [] }}
        currentMenuName="입고등록"
        breadcrumbItems={['구매자재', '입고관리', '입고등록']}
        content={{ title: '입고등록', description: '', cards: [], items: [] }}
        selectedMenuPermissions={permissions}
        mode={mode}
        purchaseReceiptId={purchaseReceiptId}
      />
    ),
  }], { initialEntries: ['/'] });
  return render(<RouterProvider router={router} />);
}

describe('입고등록 server date default', () => {
  it('fills the 입고일 from the server date, not the browser clock', async () => {
    vi.mocked(getSystemDate).mockResolvedValueOnce('2031-05-06');
    renderPage({ mode: 'create' });
    await waitFor(() => expect(screen.getByRole('textbox', { name: /^입고일/ })).toHaveValue('2031-05-06'));
  });

  it('keeps the saved receipt date and does not ask for the server date when a saved receipt is opened', async () => {
    vi.mocked(getSystemDate).mockClear();
    renderPage({ mode: 'edit', purchaseReceiptId: 900 });
    await waitFor(() => expect(screen.getByLabelText('입고번호')).toHaveValue('MI-20261117-0001'));
    expect(screen.getByRole('textbox', { name: /^입고일/ })).toHaveValue('2026-11-17');
    expect(getSystemDate).not.toHaveBeenCalled();
  });

  it('leaves the 입고일 empty and shows the error when the server date cannot be loaded', async () => {
    vi.mocked(getSystemDate).mockRejectedValueOnce(new Error('연결 실패'));
    renderPage({ mode: 'create' });
    expect(await screen.findByText(/서버 기준일을 불러오지 못했습니다\. 연결 실패/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^입고일/ })).toHaveValue('');
  });
});
