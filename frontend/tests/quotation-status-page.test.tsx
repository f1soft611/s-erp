import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/shared/services/apiClient';
import { QuotationStatusPage } from '../src/pages/sales/quotation/status/QuotationStatusPage';
import type { QuotationStatusRow } from '../src/pages/sales/quotation/status/types/quotationStatus.types';
import type { QuotationItem } from '../src/pages/sales/quotation/create/types/quotation.types';
import type { ModuleItem } from '../src/pages/dashboard/types/dashboard';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

const apiGetMock = vi.mocked(apiGet);
const statusRow: QuotationStatusRow = {
  quotationId: 21,
  quotationDetailId: 31,
  quotationNo: 'QT-20261116-0001',
  quotationDt: '2026-11-16',
  submitDt: '2026-11-17',
  customerId: 10,
  customerCode: 'C-10',
  customerName: '고객 10',
  customerReference: '담당자',
  incoterms: 'FOB',
  paymentTerm: '월말',
  validTerm: '30일',
  currencyCode: 'KRW',
  remark: '확인',
  supplyAmt: 10,
  vatAmt: 1,
  totalAmt: 11,
  createdBy: 'writer',
  lineNo: 1,
  materialId: null,
  materialCode: 'CUSTOM',
  materialName: '직접 입력 품목',
  materialSpec: '규격',
  unit: 'EA',
  quotationQty: 2,
  unitPrice: 5,
  lineAmt: 10,
  detailRemark: null,
};
const quotation: QuotationItem = {
  quotationId: 21,
  quotationNo: statusRow.quotationNo,
  quotationDt: statusRow.quotationDt,
  submitDt: statusRow.submitDt,
  customerId: 10,
  customerCode: 'C-10',
  customerName: '고객 10',
  customerReference: '담당자',
  incoterms: 'FOB',
  paymentTerm: '월말',
  validTerm: '30일',
  currencyCode: 'KRW',
  remark: '확인',
  supplyAmt: 10,
  vatAmt: 1,
  totalAmt: 11,
  createdBy: 'writer',
  createdByName: '홍길동',
  createdAt: '2026-11-16 10:00',
  writer: false,
  details: [{
    quotationDetailId: 31,
    lineNo: 1,
    materialId: null,
    materialCode: 'CUSTOM',
    materialName: '직접 입력 품목',
    materialSpec: '규격',
    unit: 'EA',
    quotationQty: 2,
    unitPrice: 5,
    lineAmt: 10,
    remark: null,
  }],
};
const moduleItem: ModuleItem = {
  id: 'sales',
  name: '영업관리',
  icon: null,
  tree: [
    { id: 'create', name: '견적서작성', pageKey: 'quotation-create', path: '/sales/quotation-create',
      permissions: { read: true, create: true, update: true, delete: true, excel: false } },
  ],
  menus: [],
};

describe('quotation status page', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    apiGetMock.mockReset();
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/api/v1/common/system-date') return Promise.resolve({ today: '2026-11-16' });
      if (path === '/api/v1/sales/quotations/21') return Promise.resolve({ item: quotation });
      return Promise.resolve({ resultList: [statusRow], resultCnt: 1 });
    });
  });

  it('requires a date range, lists detail-based results, and opens quotation detail', async () => {
    const router = createMemoryRouter([{
      path: '/',
      element: (
        <QuotationStatusPage
          selectedModule={moduleItem}
          currentMenuName="견적현황"
          breadcrumbItems={['영업관리', '견적관리', '견적현황']}
          content={{ title: '견적현황', description: '견적을 조회합니다.', cards: [], items: [] }}
          selectedMenuPermissions={{ read: true, create: false, update: false, delete: false, excel: true }}
        />
      ),
    }]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('button', { name: 'QT-20261116-0001 상세 보기' })).toBeInTheDocument();
    const statusRequest = apiGetMock.mock.calls
      .map(([path]) => String(path))
      .find((path) => path.startsWith('/api/v1/sales/quotation-status'));
    expect(statusRequest).toContain('quotationDtFrom=2026-10-16');
    expect(statusRequest).toContain('quotationDtTo=2026-11-16');
    fireEvent.click(screen.getByRole('button', { name: 'QT-20261116-0001 상세 보기' }));

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith('/api/v1/sales/quotations/21'));
    expect(await screen.findByText('견적 조건')).toBeInTheDocument();
    expect(screen.getAllByText('직접 입력 품목').length).toBeGreaterThan(0);
    expect(screen.getByText('FOB')).toBeInTheDocument();
  });
});
