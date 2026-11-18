import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseOrderConfirmPicker } from '../src/pages/materials/order/create/components/PurchaseOrderConfirmPicker';
import { PurchaseConfirmPicker } from '../src/pages/materials/request/confirm/components/PurchaseConfirmPicker';
import { PurchaseRequestSourcePicker } from '../src/pages/materials/request/confirm/components/PurchaseRequestSourcePicker';
import { MaterialArrivalOrderPicker } from '../src/pages/materials/arrival/create/components/MaterialArrivalOrderPicker';
import { MaterialReceiptInspectionPicker } from '../src/pages/materials/receipt/create/components/MaterialReceiptInspectionPicker';
import { MaterialInspectionArrivalPicker } from '../src/pages/quality/inspect/create/components/MaterialInspectionArrivalPicker';
import { usePickerDateRange } from '../src/shared/hooks/usePickerDateRange';
import { apiGet } from '../src/shared/services/apiClient';
import { getSystemDate } from '../src/shared/services/systemDateService';

vi.mock('../src/shared/services/systemDateService', () => ({ getSystemDate: vi.fn() }));
vi.mock('../src/shared/services/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/shared/services/apiClient')>();
  return { ...actual, apiGet: vi.fn() };
});
const getSystemDateMock = vi.mocked(getSystemDate);
const apiGetMock = vi.mocked(apiGet);

describe('usePickerDateRange', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fills the end date with the server date and the start date one month earlier when first opened', async () => {
    getSystemDateMock.mockResolvedValue('2026-11-18');
    const { result, rerender } = renderHook(({ open }) => usePickerDateRange(open), { initialProps: { open: false } });
    expect(result.current).toMatchObject({ fromDt: '', toDt: '', ready: false });
    expect(getSystemDateMock).not.toHaveBeenCalled();
    rerender({ open: true });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current).toMatchObject({ fromDt: '2026-10-18', toDt: '2026-11-18' });
    rerender({ open: false });
    rerender({ open: true });
    expect(getSystemDateMock).toHaveBeenCalledTimes(1);
  });

  it('queries without a period when the server date cannot be read (no browser-date fallback)', async () => {
    getSystemDateMock.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => usePickerDateRange(true));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current).toMatchObject({ fromDt: '', toDt: '' });
  });
});

const noop = () => undefined;
const PICKERS: Array<[string, () => JSX.Element, string, RegExp]> = [
  ['구매요청 선택', () => <PurchaseRequestSourcePicker open onClose={noop} onSelect={noop} />, '요청일', /purchase-request-confirms\/candidates\?/],
  ['구매요청확정 선택', () => <PurchaseConfirmPicker open onClose={noop} onSelect={noop} />, '확정일', /purchase-request-confirms\?/],
  ['확정 품목 선택', () => <PurchaseOrderConfirmPicker open onClose={noop} onSelect={noop} />, '확정일', /purchase-orders\/candidates\?/],
  ['발주 품목 선택', () => <MaterialArrivalOrderPicker open onClose={noop} onSelect={noop} />, '발주일', /material-arrivals\/candidates\?/],
  ['수입검사 합격분 선택', () => <MaterialReceiptInspectionPicker open onClose={noop} onSelect={noop} />, '검사일', /material-receipts\/candidates\?/],
  ['검사 대기 가입고 선택', () => <MaterialInspectionArrivalPicker open onClose={noop} onSelect={noop} />, '가입고일', /material-inspections\/candidates\?/],
];

describe('every picker opens with the default one-month period and sends it to the search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSystemDateMock.mockResolvedValue('2026-11-18');
    apiGetMock.mockResolvedValue({ resultList: [] });
  });

  it.each(PICKERS)('%s', async (_name, renderPicker, label, pathPattern) => {
    render(renderPicker());
    const from = await screen.findByRole('textbox', { name: new RegExp(`^${label} 시작`) });
    const to = screen.getByRole('textbox', { name: new RegExp(`^${label} 종료`) });
    await waitFor(() => expect(from).toHaveValue('2026-10-18'));
    expect(to).toHaveValue('2026-11-18');
    await waitFor(() => expect(apiGetMock).toHaveBeenCalled());
    const path = String(apiGetMock.mock.calls[0][0]);
    expect(path).toMatch(pathPattern);
    expect(path).toContain('fromDt=2026-10-18');
    expect(path).toContain('toDt=2026-11-18');
    // 기본 기간이 채워지기 전에는 조회하지 않는다(기간 없는 전체 조회가 먼저 나가지 않는다)
    expect(apiGetMock).toHaveBeenCalledTimes(1);
  });
});
