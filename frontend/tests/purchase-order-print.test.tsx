import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { amountInKorean } from '../src/shared/utils/amountInKorean';
import {
  PurchaseOrderPrint,
  ROWS_PER_PAGE,
  paginateRows,
  rowLines,
} from '../src/pages/materials/order/print/PurchaseOrderPrint';
import { vatLabel } from '../src/pages/materials/order/print/services/purchaseOrderPrint.service';
import type {
  PurchaseOrderPrintData,
  PurchaseOrderPrintDetail,
} from '../src/pages/materials/order/print/types/purchaseOrderPrint.types';

function detail(lineNo: number, overrides: Partial<PurchaseOrderPrintDetail> = {}): PurchaseOrderPrintDetail {
  return {
    lineNo,
    materialCode: `3-${lineNo}`,
    materialName: `품목 ${lineNo}`,
    materialSpec: 'kg',
    unit: 'kg',
    orderQty: 5,
    unitPrice: 5900,
    deliveryDt: '2026-11-13',
    supplyAmt: 29500,
    vatAmt: 2950,
    totalAmt: 32450,
    remark: null,
    ...overrides,
  };
}

/** 사용자가 제공한 발주서.PDF 양식의 예시 값 */
function pdfExample(overrides: Partial<PurchaseOrderPrintData> = {}): PurchaseOrderPrintData {
  return {
    purchaseOrderId: 700,
    orderNo: 'PO-20261112-0001',
    orderDt: '2026-11-12',
    currencyCode: 'KRW',
    taxType: 'TAXABLE',
    vatIncludedAt: 'Y',
    supplyAmt: 357000,
    vatAmt: 35700,
    totalAmt: 392700,
    remark: '오전 납품 요청',
    printAt: 'N',
    companyName: '(주)정안',
    companyBusinessNo: '471-86-01812',
    companyPresidentName: '김정은',
    companyPostCode: '18271',
    companyAddress: '경기도 화성시 효행구 봉담읍 분천길 19-11 1층',
    companyTelephoneNo: '031-8067-7182',
    companyFacsimileNo: null,
    companyStampImage: 'data:image/png;base64,AAAA',
    companyLogoImage: null,
    vendorName: '(주) 제원인터내쇼날',
    vendorBusinessNo: null,
    vendorPresidentName: null,
    vendorPostCode: null,
    vendorAddress: null,
    vendorTelephoneNo: '010-7794-7915',
    vendorFacsimileNo: null,
    vendorCharge: '박담당',
    ordererName: '김안나',
    ordererMobileNo: '031-8067-7182',
    details: [
      detail(1, { materialCode: '3-40-31', materialName: '스테릴가르다 생크림', orderQty: 40, unitPrice: 6000,
        supplyAmt: 240000, vatAmt: 24000, deliveryDt: '2026-11-13' }),
      detail(2, { materialCode: '3-32', materialName: '라프티스노우', unitPrice: 5900, supplyAmt: 29500, vatAmt: 2950,
        deliveryDt: '2026-11-14' }),
      detail(3, { materialCode: '3-21', materialName: '딸기퓨레 [프랑스]', unitPrice: 17500, supplyAmt: 87500, vatAmt: 8750,
        deliveryDt: '2026-11-15' }),
    ],
    ...overrides,
  };
}

describe('amountInKorean (shared)', () => {
  it('converts amounts the same way as the statement print', () => {
    expect(amountInKorean(392700)).toBe('삼십구만이천칠백원 정');
    expect(amountInKorean(0)).toBe('영원 정');
    expect(amountInKorean(1)).toBe('일원 정');
    expect(amountInKorean(10)).toBe('십원 정');
    expect(amountInKorean(110)).toBe('백십원 정');
    expect(amountInKorean(10000)).toBe('일만원 정');
    expect(amountInKorean(100000000)).toBe('일억원 정');
    expect(amountInKorean(-1000)).toBe('마이너스 천원 정');
  });

  it('returns an empty string for non-integer or unsafe amounts', () => {
    expect(amountInKorean(1.5)).toBe('');
    expect(amountInKorean(Number.NaN)).toBe('');
    expect(amountInKorean(Number.MAX_SAFE_INTEGER + 2)).toBe('');
  });
});

describe('purchase order print layout helpers', () => {
  it('labels the vat mode', () => {
    expect(vatLabel('TAXABLE', 'Y')).toBe('VAT포함');
    expect(vatLabel('TAXABLE', 'N')).toBe('VAT별도');
    expect(vatLabel('ZERO_RATED', 'N')).toBe('영세');
    expect(vatLabel('EXEMPT', 'N')).toBe('면세');
  });

  it('splits rows into pages by line count', () => {
    const rows = Array.from({ length: 30 }, (_, index) => detail(index + 1));
    const pages = paginateRows(rows);
    expect(ROWS_PER_PAGE).toBe(24);
    expect(pages.map((page) => page.length)).toEqual([24, 6]);
    expect(paginateRows([])).toEqual([[]]);
    const long = detail(1, { materialName: '가'.repeat(80) });
    expect(rowLines(long)).toBeGreaterThan(1);
    const longRows = Array.from({ length: 13 }, (_, index) => detail(index + 1, { materialName: '가'.repeat(60) }));
    expect(paginateRows(longRows).length).toBeGreaterThan(1);
  });
});

describe('PurchaseOrderPrint', () => {
  beforeEach(() => {
    window.print = vi.fn();
  });

  it('shows the PDF layout with per-row delivery dates, vat label and totals', () => {
    render(<PurchaseOrderPrint data={pdfExample()} onClose={vi.fn()} onPrint={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: '발주서 미리보기' });
    expect(within(dialog).getByRole('heading', { name: '발 주 서' })).toBeInTheDocument();
    expect(within(dialog).getByText('PO-20261112-0001', { exact: false })).toBeInTheDocument();
    expect(within(dialog).getByText('(주) 제원인터내쇼날')).toBeInTheDocument();
    expect(within(dialog).getByText('박담당')).toBeInTheDocument();
    expect(within(dialog).getByText('010-7794-7915')).toBeInTheDocument();
    expect(within(dialog).getByText('471-86-01812')).toBeInTheDocument();
    expect(within(dialog).getByText(/\(주\)정안 \/ 김정은/)).toBeInTheDocument();
    expect(within(dialog).getByText(/김안나 \/ 031-8067-7182/)).toBeInTheDocument();
    expect(within(dialog).getByAltText('회사 직인')).toBeInTheDocument();
    expect(within(dialog).queryByAltText('회사 로고')).not.toBeInTheDocument();
    expect(within(dialog).getByText('금 액 : 삼십구만이천칠백원 정')).toBeInTheDocument();
    expect(within(dialog).getByText('(₩ 392,700원) / VAT포함')).toBeInTheDocument();
    // 행마다 납기일이 다르다
    expect(within(dialog).getByText('2026/11/13')).toBeInTheDocument();
    expect(within(dialog).getByText('2026/11/14')).toBeInTheDocument();
    expect(within(dialog).getByText('2026/11/15')).toBeInTheDocument();
    expect(within(dialog).getByText('40 kg')).toBeInTheDocument();
    // 합계 줄: 수량 합 50, 공급가액 357,000, VAT 35,700, 합계 392,700
    const summary = dialog.querySelector('.order-print-summary') as HTMLElement;
    expect(summary).toHaveTextContent('50');
    expect(summary).toHaveTextContent('357,000');
    expect(summary).toHaveTextContent('35,700');
    expect(summary).toHaveTextContent('392,700');
    expect(within(dialog).getByText('비고: 오전 납품 요청')).toBeInTheDocument();
    expect(dialog.querySelectorAll('.order-print-items tbody tr')).toHaveLength(ROWS_PER_PAGE);
  });

  it('prints the same amounts on every page and keeps each row once', () => {
    const details = Array.from({ length: 30 }, (_, index) => detail(index + 1));
    render(<PurchaseOrderPrint data={pdfExample({ details })} onClose={vi.fn()} onPrint={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: '발주서 미리보기' });
    expect(dialog.querySelectorAll('.order-print-page')).toHaveLength(2);
    const summaries = dialog.querySelectorAll('.order-print-summary');
    expect(summaries).toHaveLength(2);
    summaries.forEach((summary) => expect(summary).toHaveTextContent('392,700'));
    expect(within(dialog).getAllByText('품목 30 [kg]')).toHaveLength(1);
    // 수량 합계는 전체 기준(30행 × 5)
    summaries.forEach((summary) => expect(summary).toHaveTextContent('150'));
  });

  it('shows vat variants, missing values and no korean amount for fractional totals', () => {
    render(<PurchaseOrderPrint
      data={pdfExample({ taxType: 'EXEMPT', vatIncludedAt: 'N', totalAmt: 1000.5, vendorCharge: null,
        companyLogoImage: 'data:image/png;base64,BBBB', companyStampImage: null, remark: null })}
      onClose={vi.fn()}
      onPrint={vi.fn()}
    />);
    const dialog = screen.getByRole('dialog', { name: '발주서 미리보기' });
    expect(within(dialog).getByText('(₩ 1,000.5원) / 면세')).toBeInTheDocument();
    expect(within(dialog).getByText('금 액 : -')).toBeInTheDocument();
    expect(within(dialog).getByAltText('회사 로고')).toBeInTheDocument();
    expect(within(dialog).queryByAltText('회사 직인')).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/^비고:/)).not.toBeInTheDocument();
  });

  it('opens the browser print dialog and reports the print when 인쇄 is pressed', () => {
    const onPrint = vi.fn();
    const onClose = vi.fn();
    render(<PurchaseOrderPrint data={pdfExample()} onClose={onClose} onPrint={onPrint} />);
    fireEvent.click(screen.getByRole('button', { name: '인쇄' }));
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(onPrint).toHaveBeenCalledTimes(1);
    fireEvent.click(within(screen.getByTestId('common-dialog-actions')).getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('turns the order print rules on only while the preview is mounted', () => {
    expect(document.body.classList.contains('order-printing')).toBe(false);
    const { unmount } = render(<PurchaseOrderPrint data={pdfExample()} onClose={vi.fn()} onPrint={vi.fn()} />);
    // 영업 거래명세표 CSS가 앱 전체에 걸어 둔 인쇄 규칙을 이기도록, 발주서 인쇄 중에만 body 표시 클래스를 켠다.
    expect(document.body.classList.contains('order-printing')).toBe(true);
    unmount();
    expect(document.body.classList.contains('order-printing')).toBe(false);
  });

  it('renders a hidden host copy for printing using order-specific classes only', () => {
    render(<PurchaseOrderPrint data={pdfExample()} onClose={vi.fn()} onPrint={vi.fn()} />);
    const host = document.body.querySelector('.order-print-host');
    expect(host).not.toBeNull();
    expect(host?.querySelector('.order-print-sheet')).not.toBeNull();
    expect(document.body.querySelector('.statement-print-host')).toBeNull();
  });
});
