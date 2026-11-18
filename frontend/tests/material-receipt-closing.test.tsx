import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Profiler } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost } from '../src/shared/services/apiClient';
import { MaterialReceiptClosingPage } from '../src/pages/materials/receipt/closing/MaterialReceiptClosingPage';
import {
  createClosingRowColumns,
  createClosingSearchColumns,
} from '../src/pages/materials/receipt/closing/data/materialReceiptClosingColumns';
import {
  CLOSE_TYPE_OPTIONS,
  formatClosingMonth,
  monthOfDate,
  toMaterialReceiptClosingFilters,
} from '../src/pages/materials/receipt/closing/services/materialReceiptClosing.service';
import type {
  MaterialReceiptClosingRow,
  MaterialReceiptClosingSupplier,
} from '../src/pages/materials/receipt/closing/types/materialReceiptClosing.types';

vi.mock('../src/shared/services/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/shared/services/apiClient')>();
  return { ...actual, apiGet: vi.fn(), apiPost: vi.fn() };
});

vi.mock('../src/shared/hooks/usePageSearchDefaults', () => ({
  usePageSearchDefaults: () => ({
    values: { receiptDt: { from: '2026-11-01', to: '2026-11-30' } },
    loading: false,
    error: null,
    retry: vi.fn(),
    initialLoad: { loading: false, error: null, hasLoaded: true },
  }),
}));

const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);
// 검색 기본값 mock의 입고일 종료일(서버 날짜)이 2026-11-30이므로 기본 마감월은 2026-11이다.
const MONTH = '202611';

describe('material receipt closing service', () => {
  it('formats a closing month and derives the default month from the server date only', () => {
    expect(formatClosingMonth('202611')).toBe('2026-11');
    expect(formatClosingMonth(null)).toBe('');
    expect(monthOfDate('2026-11-30')).toBe('202611');
    expect(monthOfDate('2027-02-01')).toBe('202702');
    // 서버 날짜를 알 수 없으면 브라우저 날짜로 대체하지 않고 빈 값이다.
    expect(monthOfDate(undefined)).toBe('');
    expect(monthOfDate('')).toBe('');
    expect(monthOfDate('2026-11')).toBe('');
    expect(CLOSE_TYPE_OPTIONS.map((option) => option.label)).toEqual(['전체', '마감등록', '마감미등록']);
  });

  it('maps search values and falls back to the server-date month and all when a stored session lacks them', () => {
    expect(toMaterialReceiptClosingFilters(' 볼트 ', {
      receiptDt: { from: '2026-11-01', to: '2026-11-30' },
      closingMonth: '202610',
      closeType: 'OPEN',
      orderNo: 'PO-1',
    })).toEqual({
      keyword: '볼트', receiptFrom: '2026-11-01', receiptTo: '2026-11-30', closingMonth: '202610',
      closeType: 'OPEN', orderNo: 'PO-1',
    });
    const fallback = toMaterialReceiptClosingFilters('', { receiptDt: { from: '2026-11-01', to: '2026-11-30' } });
    expect(fallback.closingMonth).toBe(MONTH);
    expect(fallback.closeType).toBe('ALL');
  });

  it('declares the search fields: required period, month and type without an empty choice', () => {
    const columns = createClosingSearchColumns();
    const byField = Object.fromEntries(columns.map((column) => [String(column.field), column]));
    expect(byField.receiptDt.search?.required).toBe(true);
    expect(byField.closingMonth.search).toMatchObject({ required: true, inputType: 'month' });
    expect(byField.closeType.search).toMatchObject({ required: true, allowEmpty: false });
  });
});

describe('closing row columns', () => {
  const open = closingRow(101, { receiptQty: 10, unitPrice: 1000, supplyAmt: 10000, vatAmt: 1000, totalAmt: 11000 });
  const closed = closingRow(102, { closed: true, closingMonth: '202611' });
  const column = (field: string, canEdit = true) =>
    createClosingRowColumns({ canEdit }).find((item) => String(item.field) === field)!;
  const isEditable = (field: string, row: MaterialReceiptClosingRow, canEdit = true) => {
    const editable = column(field, canEdit).editable;
    return typeof editable === 'function' ? editable(row) : Boolean(editable);
  };

  it('lets only open rows be edited and only with the update permission', () => {
    expect(isEditable('unitPrice', open)).toBe(true);
    expect(isEditable('unitPrice', closed)).toBe(false);
    expect(isEditable('unitPrice', open, false)).toBe(false);
    expect(isEditable('taxType', open)).toBe(true);
    expect(isEditable('taxType', closed)).toBe(false);
  });

  it('recalculates amounts when the unit price changes', () => {
    const patch = column('unitPrice').onValueChange!(open, 1500) as Partial<MaterialReceiptClosingRow>;
    expect(patch).toMatchObject({ unitPrice: 1500, supplyAmt: 15000, vatAmt: 1500, totalAmt: 16500 });
  });

  it('recalculates with the included tax rule and clears the inclusion for exempt rows', () => {
    const included = column('vatIncludedAt').onValueChange!(
      { ...open, unitPrice: 1100, receiptQty: 10 }, 'Y') as Partial<MaterialReceiptClosingRow>;
    expect(included).toMatchObject({ vatIncludedAt: 'Y', supplyAmt: 10000, vatAmt: 1000, totalAmt: 11000 });

    const exempt = column('taxType').onValueChange!(
      { ...open, vatIncludedAt: 'Y' }, 'EXEMPT') as Partial<MaterialReceiptClosingRow>;
    expect(exempt).toMatchObject({ taxType: 'EXEMPT', vatIncludedAt: 'N', vatAmt: 0, totalAmt: 10000 });
  });

  it('only allows the included choice for taxable rows', () => {
    expect(isEditable('vatIncludedAt', open)).toBe(true);
    expect(isEditable('vatIncludedAt', { ...open, taxType: 'EXEMPT' })).toBe(false);
  });
});

describe('MaterialReceiptClosingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/materials/purchase-closings/suppliers')) return { resultList: suppliers() };
      if (path.startsWith('/api/v1/materials/purchase-closings')) return { resultList: rows() };
      return { resultList: [] };
    });
    apiPostMock.mockResolvedValue({ count: 2 });
  });

  async function openPage(update = true) {
    renderPage(update);
    await screen.findByRole('grid', { name: '매입마감 입고 행' });
    await waitFor(() => expect(screen.getAllByText('MI-A-1').length).toBeGreaterThan(0));
  }

  it('clears supplier, row selection and edits from the first reloaded data commit only', async () => {
    const commits: Array<{ filtered: boolean; checked: number; text: string }> = [];
    renderPage(true, () => {
      if (!document.body.textContent?.includes('구매처A-REFRESH')) return;
      const grid = document.querySelector('[aria-label="매입마감 입고 행"]');
      commits.push({
        filtered: document.querySelector('[aria-label="구매처 선택 해제"]') !== null,
        checked: grid?.querySelectorAll('input[type="checkbox"]:checked').length ?? 0,
        text: grid?.textContent ?? '',
      });
    });
    await screen.findByText('MI-A-1');
    const rowGrid = () => screen.getByRole('grid', { name: '매입마감 입고 행' });
    fireEvent.click(within(screen.getByRole('grid', { name: '구매처별 매입마감 요약' })).getByText('구매처A'));
    const row = within(rowGrid()).getByText('MI-A-1').closest('[role="row"]') as HTMLElement;
    const body = within(rowGrid()).getByTestId('f1-grid-body-scroll');
    body.scrollLeft = 1000;
    fireEvent.scroll(body);
    await waitFor(() => expect(within(row).getAllByRole('gridcell', { name: /^1,000(?:\.00)?$/ }).length).toBeGreaterThan(0));
    fireEvent.doubleClick(within(row).getAllByRole('gridcell', { name: /^1,000(?:\.00)?$/ })[0]);
    const editor = screen.getByRole('spinbutton');
    fireEvent.change(editor, { target: { value: '1500' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.click(await screen.findByLabelText('101 행 선택'));
    fireEvent.change(screen.getByRole('textbox', { name: '매입마감 빠른 검색' }), { target: { value: 'M-1' } });
    expect(screen.getByLabelText('구매처 선택 해제')).toBeInTheDocument();
    expect(within(rowGrid()).getAllByText(/^1,500(?:\.00)?$/).length).toBeGreaterThan(0);
    expect(rowGrid().querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(1);
    expect(apiGetMock).toHaveBeenCalledTimes(2);
    apiGetMock.mockImplementation(async (path: string) => ({
      resultList: path.startsWith('/api/v1/materials/purchase-closings/suppliers')
        ? suppliers().map((supplier) => ({ ...supplier, supplierName: `${supplier.supplierName}-REFRESH` }))
        : rows().map((item) => ({ ...item, receiptNo: `${item.receiptNo}-REFRESH`, unitPrice: 2000 })),
    }));
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await screen.findByText('MI-B-1-REFRESH');
    expect(commits.length).toBeGreaterThan(0);
    expect(commits[0].filtered).toBe(false);
    expect(commits[0].checked).toBe(0);
    expect(commits[0].text).toContain('MI-A-1-REFRESH');
    expect(commits[0].text).toContain('MI-B-1-REFRESH');
    expect(commits.every((commit) => !commit.filtered && commit.checked === 0 && !commit.text.includes('1,500'))).toBe(true);
    expect(apiGetMock).toHaveBeenCalledTimes(4);
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('loads the supplier summary and the receipt rows for the applied conditions', async () => {
    await openPage();
    const paths = apiGetMock.mock.calls.map(([path]) => path as string);
    const supplierCall = paths.find((path) => path.startsWith('/api/v1/materials/purchase-closings/suppliers'))!;
    expect(supplierCall).toContain('closingMonth=' + MONTH);
    expect(supplierCall).toContain('receiptFrom=2026-11-01');
    expect(supplierCall).not.toContain('closeType');
    const rowCall = paths.find((path) => path.startsWith('/api/v1/materials/purchase-closings?'))!;
    expect(rowCall).toContain('closeType=ALL');
    expect(screen.getByRole('grid', { name: '구매처별 매입마감 요약' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: '구매처 요약과 입고 행 분리기' })).toBeInTheDocument();
  });

  it('shows only the selected supplier rows and clears the selection from the chip', async () => {
    await openPage();
    const rowGrid = () => screen.getByRole('grid', { name: '매입마감 입고 행' });
    expect(within(rowGrid()).getByText('MI-A-1')).toBeInTheDocument();
    expect(within(rowGrid()).getByText('MI-B-1')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('grid', { name: '구매처별 매입마감 요약' })).getByText('구매처B'));
    await waitFor(() => expect(within(rowGrid()).queryByText('MI-A-1')).not.toBeInTheDocument());
    expect(within(rowGrid()).getByText('MI-B-1')).toBeInTheDocument();

    fireEvent.click(await screen.findByLabelText('구매처 선택 해제'));
    await waitFor(() => expect(within(rowGrid()).getByText('MI-A-1')).toBeInTheDocument());
  });

  it('closes the checked open rows after a confirmation and sends no amounts', async () => {
    await openPage();
    fireEvent.click(await screen.findByLabelText('101 행 선택'));
    fireEvent.click(await screen.findByLabelText('103 행 선택'));
    fireEvent.click(screen.getByRole('button', { name: '마감' }));
    const dialog = await screen.findByRole('dialog', { name: '매입마감' });
    expect(within(dialog).getByText(/선택한 2건을/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '마감' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    const [path, body] = apiPostMock.mock.calls[0] as [string, { closingMonth: string; rows: unknown[] }];
    expect(path).toBe('/api/v1/materials/purchase-closings/close');
    expect(body.closingMonth).toBe(MONTH);
    expect(body.rows).toEqual([
      { receiptDetailId: 101, unitPrice: 1000, taxType: 'TAXABLE', vatIncludedAt: 'N' },
      { receiptDetailId: 103, unitPrice: 500, taxType: 'EXEMPT', vatIncludedAt: 'N' },
    ]);
    expect(await screen.findByText(/2건을 .* 마감했습니다/)).toBeInTheDocument();
  });

  it('releases a checked closed row and keeps close/release off for a mixed selection', async () => {
    await openPage();
    fireEvent.click(await screen.findByLabelText('102 행 선택'));
    expect(screen.getByRole('button', { name: '해제' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '마감' })).toBeDisabled();

    fireEvent.click(await screen.findByLabelText('101 행 선택'));
    expect(screen.getByRole('button', { name: '해제' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '마감' })).toBeDisabled();
    expect(screen.getByText('마감 행과 미마감 행을 함께 선택할 수 없습니다')).toBeInTheDocument();

    fireEvent.click(await screen.findByLabelText('101 행 선택'));
    fireEvent.click(screen.getByRole('button', { name: '해제' }));
    const dialog = await screen.findByRole('dialog', { name: '매입마감 해제' });
    fireEvent.click(within(dialog).getByRole('button', { name: '해제' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v1/materials/purchase-closings/release', { receiptDetailIds: [102] }));
  });

  it('shows the server message when closing fails', async () => {
    apiPostMock.mockRejectedValue(new Error('이미 마감된 행입니다. 입고 MI-A-1'));
    await openPage();
    fireEvent.click(await screen.findByLabelText('101 행 선택'));
    fireEvent.click(screen.getByRole('button', { name: '마감' }));
    const dialog = await screen.findByRole('dialog', { name: '매입마감' });
    fireEvent.click(within(dialog).getByRole('button', { name: '마감' }));
    expect(await screen.findByText('이미 마감된 행입니다. 입고 MI-A-1')).toBeInTheDocument();
  });

  it('is read only without the update permission', async () => {
    await openPage(false);
    expect(screen.queryByLabelText('101 행 선택')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '마감' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '해제' })).not.toBeInTheDocument();
  });
});

function renderPage(update: boolean, onCommit?: () => void) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <MaterialReceiptClosingPage
            selectedModule={{ id: 'materials', name: '구매자재', icon: null, tree: [], menus: [] }}
            currentMenuName="매입마감처리"
            breadcrumbItems={['구매자재', '입고관리', '매입마감처리']}
            content={{ title: '매입마감처리', description: '', cards: [], items: [] }}
            selectedMenuPermissions={{ read: true, update, excel: true }}
          />
        ),
      },
    ],
    { initialEntries: ['/'] },
  );
  const page = <RouterProvider router={router} />;
  return render(onCommit ? <Profiler id="closing-reload" onRender={onCommit}>{page}</Profiler> : page);
}

function suppliers(): MaterialReceiptClosingSupplier[] {
  return [
    { supplierId: 1, supplierCode: 'A', supplierName: '구매처A', businessNo: '111-11-11111', receiptCount: 2,
      receiptAmount: 12100, monthClosedCount: 1, monthClosedAmount: 5500, openCount: 1 },
    { supplierId: 2, supplierCode: 'B', supplierName: '구매처B', businessNo: '222-22-22222', receiptCount: 1,
      receiptAmount: 500, monthClosedCount: 0, monthClosedAmount: 0, openCount: 1 },
  ];
}

function rows(): MaterialReceiptClosingRow[] {
  return [
    closingRow(101, { receiptNo: 'MI-A-1', supplierId: 1, supplierName: '구매처A' }),
    closingRow(102, { receiptNo: 'MI-A-2', supplierId: 1, supplierName: '구매처A', closed: true, closingMonth: MONTH }),
    closingRow(103, {
      receiptNo: 'MI-B-1', supplierId: 2, supplierName: '구매처B', receiptQty: 1, unitPrice: 500,
      taxType: 'EXEMPT', supplyAmt: 500, vatAmt: 0, totalAmt: 500,
    }),
  ];
}

function closingRow(id: number, overrides: Partial<MaterialReceiptClosingRow> = {}): MaterialReceiptClosingRow {
  return {
    materialReceiptId: 900 + id,
    materialReceiptDetailId: id,
    receiptNo: `MI-${id}`,
    receiptDt: '2026-11-17',
    supplierId: 1,
    supplierName: '구매처A',
    materialCode: 'M-1',
    materialName: '볼트',
    materialSpec: 'M8',
    unit: 'EA',
    orderNo: 'PO-1',
    inspectionNo: null,
    receiptQty: 10,
    unitPrice: 1000,
    taxType: 'TAXABLE',
    vatIncludedAt: 'N',
    supplyAmt: 10000,
    vatAmt: 1000,
    totalAmt: 11000,
    warehouseName: '자재창고',
    remark: null,
    closingMonth: null,
    closedAt: null,
    closedBy: null,
    closed: false,
    ...overrides,
  };
}
