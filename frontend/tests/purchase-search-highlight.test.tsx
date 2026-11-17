import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { F1GridColumn } from '../src/shared/components/f1-grid';
import { createClosingRowColumns } from '../src/pages/materials/receipt/closing/data/materialReceiptClosingColumns';
import { createMaterialArrivalStatusColumns } from '../src/pages/materials/arrival/status/data/materialArrivalStatusColumns';
import { createMaterialReceiptStatusColumns } from '../src/pages/materials/receipt/status/data/materialReceiptStatusColumns';
import { createPurchaseOrderStatusColumns } from '../src/pages/materials/order/status/data/purchaseOrderStatusColumns';
import { createPurchaseRequestStatusColumns } from '../src/pages/materials/request/status/data/purchaseRequestStatusColumns';
import { createMaterialInspectionStatusColumns } from '../src/pages/quality/inspect/status/data/materialInspectionStatusColumns';

type AnyColumn = F1GridColumn<Record<string, unknown>>;

const highlighted = (columns: unknown[]) =>
  (columns as AnyColumn[]).filter((column) => column.highlightSearch === true).map((column) => String(column.field));

const spec = (columns: unknown[], fields: string[]) =>
  expect(highlighted(columns).sort()).toEqual([...fields].sort());

/** 서버 통합검색 SQL이 검색하는 컬럼만 강조한다(사양서 20261117_009 표). */
describe('purchase status screens highlight only the columns the server keyword search covers', () => {
  const noop = vi.fn();

  it('purchase request status: 요청번호·요청자·품목코드·품목명', () => {
    spec(createPurchaseRequestStatusColumns({ onOpenRequest: noop }), ['requestNo', 'requesterName', 'materialCode', 'materialName']);
  });

  it('purchase order status: 발주번호·구매처·발주담당자·품목코드·품목명', () => {
    spec(createPurchaseOrderStatusColumns({ onOpenOrder: noop }),
      ['orderNo', 'supplierName', 'ordererName', 'materialCode', 'materialName']);
  });

  it('arrival status: 가입고번호·구매처·담당자·품목코드·품목명', () => {
    spec(createMaterialArrivalStatusColumns({ onOpenArrival: noop }),
      ['arrivalNo', 'supplierName', 'receiverName', 'materialCode', 'materialName']);
  });

  it('receipt status: 입고번호·구매처·담당자·품목코드·품목명 (가입고번호·검사번호는 통합검색 대상이 아니다)', () => {
    spec(createMaterialReceiptStatusColumns({ onOpenReceipt: noop, onOpenArrival: noop }),
      ['receiptNo', 'supplierName', 'receiverName', 'materialCode', 'materialName']);
  });

  it('inspection status: 검사번호·가입고번호·구매처·검사자·품목코드·품목명', () => {
    spec(createMaterialInspectionStatusColumns({ onOpenInspection: noop, onOpenArrival: noop }),
      ['inspectionNo', 'arrivalNo', 'supplierName', 'inspectorName', 'materialCode', 'materialName']);
  });

  it('purchase closing rows: 품목코드·품목명만', () => {
    spec(createClosingRowColumns({ canEdit: true }), ['materialCode', 'materialName']);
  });
});

function cellOf(columns: unknown[], field: string, row: Record<string, unknown>, highlightKeyword?: string): ReactNode {
  const column = (columns as AnyColumn[]).find((candidate) => String(candidate.field) === field);
  expect(column?.renderCell).toBeTypeOf('function');
  return column!.renderCell!({
    row, rowId: 1, column: column!, field: field as never, value: row[field], rowIndex: 0, highlightKeyword,
  } as never);
}

describe('link columns highlight the matching text and keep the link behavior', () => {
  it('purchase request number link', () => {
    const onOpen = vi.fn();
    const columns = createPurchaseRequestStatusColumns({ onOpenRequest: onOpen });
    const row = { requestNo: 'MR-20261117-0003' };
    render(<>{cellOf(columns, 'requestNo', row, '0003')}</>);
    const link = screen.getByRole('button', { name: 'MR-20261117-0003 상세 보기' });
    expect(link.querySelectorAll('[data-f1-grid-highlight="true"]')).toHaveLength(1);
    expect(link.querySelector('[data-f1-grid-highlight="true"]')).toHaveTextContent('0003');
    fireEvent.click(link);
    expect(onOpen).toHaveBeenCalledWith(row);
  });

  it('without a keyword the link renders as before', () => {
    const columns = createMaterialReceiptStatusColumns({ onOpenReceipt: vi.fn() });
    render(<>{cellOf(columns, 'receiptNo', { receiptNo: 'MI-20261117-0003' }, undefined)}</>);
    const link = screen.getByRole('button', { name: 'MI-20261117-0003 상세 보기' });
    expect(link.querySelector('[data-f1-grid-highlight="true"]')).toBeNull();
    expect(link).toHaveTextContent('MI-20261117-0003');
  });

  it('is case-insensitive and highlights every match', () => {
    const columns = createPurchaseOrderStatusColumns({ onOpenOrder: vi.fn() });
    render(<>{cellOf(columns, 'orderNo', { orderNo: 'PO-0003-po' }, 'po')}</>);
    expect(screen.getByRole('button', { name: 'PO-0003-po 상세 보기' }).querySelectorAll('[data-f1-grid-highlight="true"]'))
      .toHaveLength(2);
  });

  it('inspection status highlights both the inspection number and the linked arrival number', () => {
    const columns = createMaterialInspectionStatusColumns({ onOpenInspection: vi.fn(), onOpenArrival: vi.fn() });
    const row = { inspectionNo: 'QI-20261117-0022', arrivalNo: 'MP-20261117-0040', arrivalLinked: true, materialArrivalId: 5 };
    const { unmount } = render(<>{cellOf(columns, 'inspectionNo', row, '22')}</>);
    expect(screen.getByRole('button', { name: 'QI-20261117-0022 상세 보기' }).querySelectorAll('[data-f1-grid-highlight="true"]'))
      .toHaveLength(1);
    unmount();
    render(<>{cellOf(columns, 'arrivalNo', row, '40')}</>);
    expect(screen.getByRole('button', { name: 'MP-20261117-0040 가입고 보기' }).querySelectorAll('[data-f1-grid-highlight="true"]'))
      .toHaveLength(1);
  });

  it('an unlinked arrival number is highlighted as plain text', () => {
    const columns = createMaterialInspectionStatusColumns({ onOpenInspection: vi.fn(), onOpenArrival: vi.fn() });
    const { container } = render(<>{cellOf(columns, 'arrivalNo', { arrivalNo: 'MP-20261117-0040', arrivalLinked: false }, '40')}</>);
    expect(container.querySelectorAll('[data-f1-grid-highlight="true"]')).toHaveLength(1);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
