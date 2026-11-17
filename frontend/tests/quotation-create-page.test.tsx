import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost } from '../src/shared/services/apiClient';
import { QuotationCreatePage } from '../src/pages/sales/quotation/create/QuotationCreatePage';
import {
  calculateQuotationLineAmount,
} from '../src/pages/sales/quotation/create/data/quotationDetail';
import type { ModuleItem } from '../src/pages/dashboard/types/dashboard';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);
const moduleItem: ModuleItem = {
  id: 'sales',
  name: '영업관리',
  icon: null,
  tree: [],
  menus: [],
};

describe('quotation create page', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    apiGetMock.mockResolvedValue({ today: '2026-11-16' });
  });

  it('uses the system business date and presents the quotation header and manual line flow', async () => {
    const router = createMemoryRouter([{
      path: '/',
      element: (
        <QuotationCreatePage
          selectedModule={moduleItem}
          currentMenuName="견적서작성"
          content={{ title: '견적서작성', description: '견적 작성', cards: [], items: [] }}
          breadcrumbItems={['영업관리', '견적관리', '견적서작성']}
          selectedMenuPermissions={{ read: true, create: true, update: true, delete: true }}
        />
      ),
    }]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('region', { name: '견적 입력 내용' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByDisplayValue('2026-11-16')).toBeInTheDocument());
    expect(screen.getByLabelText('견적번호')).toHaveValue('저장 시 자동 채번');
    expect(screen.getByRole('button', { name: '견적작성일 달력 열기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '견적제출일 달력 열기' })).toBeInTheDocument();
    expect(screen.getByText(/품목명을 직접 입력/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '상세 행 추가' })).toBeEnabled();
    expect(apiGetMock).toHaveBeenCalledWith('/api/v1/common/system-date');
  });

  it('marks an invalid optional submit date and blocks saving', async () => {
    const router = createMemoryRouter([{
      path: '/',
      element: (
        <QuotationCreatePage
          selectedModule={moduleItem}
          currentMenuName="견적서작성"
          content={{ title: '견적서작성', description: '', cards: [], items: [] }}
          breadcrumbItems={[]}
          selectedMenuPermissions={{ read: true, create: true }}
        />
      ),
    }]);
    render(<RouterProvider router={router} />);

    const submitDate = await screen.findByLabelText('견적제출일');
    fireEvent.change(submitDate, { target: { value: '2026-02-31' } });
    fireEvent.blur(submitDate);

    expect(await screen.findByText('올바른 견적제출일을 입력해 주세요.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByText('올바른 견적제출일을 입력해 주세요.')).toBeInTheDocument();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('allows the writer to edit a loaded quotation when the system date lookup fails', async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/api/v1/common/system-date') {
        return Promise.reject(new Error('System date unavailable'));
      }
      return Promise.resolve({
        item: {
          quotationId: 21,
          quotationNo: 'QT-20261116-0001',
          quotationDt: '2026-11-16',
          customerId: 10,
          customerCode: 'C-10',
          customerName: '고객 10',
          writer: true,
          details: [],
        },
      });
    });
    const router = createMemoryRouter([{
      path: '/',
      element: (
        <QuotationCreatePage
          selectedModule={moduleItem}
          currentMenuName="견적서작성"
          content={{ title: '견적서작성', description: '', cards: [], items: [] }}
          breadcrumbItems={[]}
          selectedMenuPermissions={{ read: true, create: false, update: true, delete: false }}
          mode="edit"
          quotationId={21}
        />
      ),
    }]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('System date unavailable')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('견적번호')).toHaveValue('QT-20261116-0001'));
    expect(screen.getByLabelText('참조')).toBeEnabled();
    expect(screen.getByRole('button', { name: '상세 행 추가' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('참조'), { target: { value: '수정 참조' } });
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
  });

  it('supports direct snapshots and master snapshots while calculating rounded line amounts', () => {
    expect(calculateQuotationLineAmount(1, 1.005)).toBe(1.01);
  });
});
