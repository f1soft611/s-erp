import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../src/shared/services/apiClient';
import { QuotationCreatePage } from '../src/pages/sales/quotation/create/QuotationCreatePage';
import {
  calculateQuotationLineAmount,
} from '../src/pages/sales/quotation/create/data/quotationDetail';
import type { ModuleItem } from '../src/pages/dashboard/types/dashboard';
import { GridDecimalModuleProvider } from '../src/shared/components/f1-grid/core/GridDecimalPolicy';
import * as decimalPolicyService from '../src/shared/services/gridDecimalPolicy.service';

vi.mock('../src/shared/services/apiClient', () => {
  const apiGet = vi.fn();
  const apiPost = vi.fn();
  const apiPut = vi.fn();
  return {
    apiGet, apiPost, apiPut, apiDelete: vi.fn(),
    apiGetWithExactDecimals: (path: string) => apiGet(path),
    apiPostWithExactDecimals: (path: string, payload: unknown) => apiPost(path, payload),
    apiPutWithExactDecimals: (path: string, payload: unknown) => apiPut(path, payload),
  };
});

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
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/api/v1/common/system-date') return Promise.resolve({ today: '2026-11-16' });
      if (path === '/api/v1/co/master/common-code/groups') return Promise.resolve({
        resultList: ['INCOTERMS', 'PAYMENT_TERM', 'CURRENCY', 'ITEM_UNIT'].map((groupCode, index) => ({
          commonCodeGroupId: index + 1, groupCode, useAt: 'Y',
        })),
      });
      return Promise.resolve({ resultList: [{
        itemCode: 'API_CODE', itemNm: 'API 표시명', sortOrder: 1, useAt: 'Y',
      }] });
    });
  });

  it('disables quotation editing and saving when the decimal policy cannot be loaded', async () => {
    const policy = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockRejectedValue(new Error('offline'));
    try {
      const router = createMemoryRouter([{ path: '/', element: <GridDecimalModuleProvider moduleCode="SALES">
        <QuotationCreatePage selectedModule={moduleItem} currentMenuName="견적서작성"
          content={{ title: '견적서작성', description: '', cards: [], items: [] }}
          breadcrumbItems={[]} selectedMenuPermissions={{ read: true, create: true }} />
      </GridDecimalModuleProvider> }]);
      render(<RouterProvider router={router} />);
      expect(await screen.findByText('소수점 정책을 불러오지 못했습니다. 다시 조회해 주세요.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
    } finally { policy.mockRestore(); }
  });

  it('updates loaded quotation totals when the currency policy arrives later', async () => {
    const rules = { SALES: {
      number: { places: 0, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
      decimal: { places: 6, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
      currency: { places: 6, trailingZeros: 'FIXED' as const, rounding: 'HALF_UP' as const },
    } };
    let resolvePolicy!: (value: typeof rules) => void;
    const strict = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict')
      .mockImplementation(() => new Promise((resolve) => { resolvePolicy = resolve; }));
    const standard = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicy').mockResolvedValue(rules);
    const lookup = apiGetMock.getMockImplementation()!;
    apiGetMock.mockImplementation((path: string) => path === '/api/v1/sales/quotations/21'
      ? Promise.resolve({ item: {
        quotationId: 21, quotationNo: 'QT-OLD', quotationDt: '2026-11-16',
        customerId: 10, customerCode: 'C-10', customerName: '고객 10', writer: true,
        details: [{ quotationDetailId: 1, materialId: null, materialName: '품목',
          quotationQty: '1', unitPrice: '1.234567', lineAmt: '1.234567' }],
      } }) : lookup(path));
    try {
      const router = createMemoryRouter([{ path: '/', element: <GridDecimalModuleProvider moduleCode="SALES">
        <QuotationCreatePage selectedModule={moduleItem} currentMenuName="견적서작성"
          content={{ title: '견적서작성', description: '', cards: [], items: [] }}
          breadcrumbItems={[]} selectedMenuPermissions={{ read: true, update: true }}
          quotationId={21} mode="edit" />
      </GridDecimalModuleProvider> }]);
      render(<RouterProvider router={router} />);
      await screen.findByDisplayValue('QT-OLD');
      await act(async () => { resolvePolicy(rules); });
      await waitFor(() => expect(screen.getByLabelText('견적 금액 합계')).toHaveTextContent(
        /공급가액\s*1\.234567\s*부가세 \(10%\)\s*0\.123457\s*총액\s*1\.358024/,
      ));
    } finally { strict.mockRestore(); standard.mockRestore(); }
  });

  describe('saving a loaded quotation', () => {
    afterEach(() => { vi.restoreAllMocks(); });

    const loaded = (remark: string) => ({ item: {
      quotationId: 21, quotationNo: 'QT-OLD', quotationDt: '2026-11-16',
      customerId: 10, customerCode: 'C-10', customerName: '고객 10', writer: true, remark,
      details: [{ quotationDetailId: 1, materialId: null, materialName: '품목',
        quotationQty: '2', unitPrice: '1.234567', lineAmt: '2.469134' }],
    } });

    function renderEdit(getRemark: () => string) {
      const rules = { SALES: {
        number: { places: 0, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
        decimal: { places: 6, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
        currency: { places: 6, trailingZeros: 'FIXED' as const, rounding: 'HALF_UP' as const },
      } };
      vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockResolvedValue(rules);
      vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicy').mockResolvedValue(rules);
      const lookup = apiGetMock.getMockImplementation()!;
      apiGetMock.mockImplementation((path: string) => path === '/api/v1/sales/quotations/21'
        ? Promise.resolve(loaded(getRemark())) : lookup(path));
      const router = createMemoryRouter([{ path: '/', element: <GridDecimalModuleProvider moduleCode="SALES">
        <QuotationCreatePage selectedModule={moduleItem} currentMenuName="견적서작성"
          content={{ title: '견적서작성', description: '', cards: [], items: [] }}
          breadcrumbItems={[]} selectedMenuPermissions={{ read: true, update: true }}
          quotationId={21} mode="edit" />
      </GridDecimalModuleProvider> }]);
      render(<RouterProvider router={router} />);
    }

    async function editRemark(text: string) {
      await screen.findByDisplayValue('QT-OLD');
      fireEvent.change(screen.getByRole('textbox', { name: '비고' }), { target: { value: text } });
      await waitFor(() => expect(screen.getByRole('button', { name: '저장', exact: true })).toBeEnabled());
    }

    it('shows progress, blocks duplicate submits, confirms success and clears the dirty state', async () => {
      let savedRemark = '';
      let finishSave!: (value: unknown) => void;
      vi.mocked(apiPut).mockReset();
      vi.mocked(apiPut).mockImplementation(() => new Promise((resolve) => { finishSave = resolve; }));
      renderEdit(() => savedRemark);
      await editRemark('새 비고');

      fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
      await waitFor(() => expect(screen.getByRole('region', { name: '견적 입력 내용' })).toHaveAttribute('aria-busy', 'true'));
      expect(screen.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
      expect(vi.mocked(apiPut)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(apiPut).mock.calls[0][0]).toBe('/api/v1/sales/quotations/21');
      expect(screen.getByRole('textbox', { name: '비고' })).toHaveValue('새 비고');

      savedRemark = '새 비고';
      await act(async () => { finishSave({ item: { quotationId: 21, quotationNo: 'QT-OLD' } }); });
      expect(await screen.findByText('견적이 수정되었습니다. 견적번호: QT-OLD')).toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole('region', { name: '견적 입력 내용' })).toHaveAttribute('aria-busy', 'false'));
      expect(screen.getByRole('textbox', { name: '비고' })).toHaveValue('새 비고');
      expect(screen.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
      const unload = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(unload);
      expect(unload.defaultPrevented).toBe(false);
    });

    it('shows a save failure, keeps the entered values and allows a retry that succeeds', async () => {
      let savedRemark = '';
      vi.mocked(apiPut).mockReset();
      vi.mocked(apiPut).mockRejectedValueOnce(new Error('서버가 저장하지 못했습니다.'))
        .mockResolvedValueOnce({ item: { quotationId: 21, quotationNo: 'QT-OLD' } });
      renderEdit(() => savedRemark);
      await editRemark('재시도 비고');

      fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
      expect(await screen.findByText('서버가 저장하지 못했습니다.')).toBeInTheDocument();
      expect(screen.queryByText(/견적이 수정되었습니다/)).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: '비고' })).toHaveValue('재시도 비고');
      expect(screen.getByRole('button', { name: '저장', exact: true })).toBeEnabled();
      const unload = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(unload);
      expect(unload.defaultPrevented).toBe(true);

      savedRemark = '재시도 비고';
      fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
      expect(await screen.findByText('견적이 수정되었습니다. 견적번호: QT-OLD')).toBeInTheDocument();
      expect(screen.queryByText('서버가 저장하지 못했습니다.')).not.toBeInTheDocument();
      expect(vi.mocked(apiPut)).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
    });
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
    expect(screen.getByRole('grid', { name: '견적 상세 목록' }).parentElement).toHaveStyle({
      paddingLeft: '16px', paddingRight: '16px',
    });
    await waitFor(() => expect(screen.getByDisplayValue('2026-11-16')).toBeInTheDocument());
    expect(screen.getByLabelText('견적번호')).toHaveValue('저장 시 자동 채번');
    expect(screen.getByRole('button', { name: '견적작성일 달력 열기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '견적제출일 달력 열기' })).toBeInTheDocument();
    expect(screen.getByText(/품목명을 직접 입력/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '상세 행 추가' })).toBeEnabled();
    expect(apiGetMock).toHaveBeenCalledWith('/api/v1/common/system-date');
    for (const label of ['Incoterms', '결제조건', '화폐단위']) {
      expect(screen.getByRole('combobox', { name: label })).toBeEnabled();
    }
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '결제조건' }));
    fireEvent.click(await screen.findByRole('option', { name: 'API 표시명' }));
    expect(screen.getByRole('combobox', { name: '결제조건' })).toHaveTextContent('API 표시명');
  });

  it('shows a lookup failure and enables common-code selects after retry', async () => {
    const lookup = apiGetMock.getMockImplementation()!;
    apiGetMock.mockImplementation((path: string) => path.includes('common-code')
      ? Promise.reject(new Error('코드 조회 실패'))
      : lookup(path));
    const router = createMemoryRouter([{ path: '/', element: (
      <QuotationCreatePage selectedModule={moduleItem} currentMenuName="견적서작성"
        content={{ title: '견적서작성', description: '', cards: [], items: [] }}
        breadcrumbItems={[]} selectedMenuPermissions={{ read: true, create: true }} />
    ) }]);
    render(<RouterProvider router={router} />);
    expect(await screen.findByText('코드 조회 실패')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Incoterms' })).toHaveAttribute('aria-disabled', 'true');
    apiGetMock.mockImplementation(lookup);
    fireEvent.click(screen.getByRole('button', { name: '공통코드 재시도' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Incoterms' }))
      .not.toHaveAttribute('aria-disabled', 'true'));
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

  it.each(['edit', 'view'] as const)('preserves unregistered stored codes in %s mode', async (mode) => {
    const lookup = apiGetMock.getMockImplementation()!;
    apiGetMock.mockImplementation((path: string) => path === '/api/v1/sales/quotations/21'
      ? Promise.resolve({ item: {
        quotationId: 21, quotationNo: 'QT-OLD', quotationDt: '2026-11-16',
        customerId: 10, customerCode: 'C-10', customerName: '고객 10', writer: true,
        incoterms: '과거 인도조건', paymentTerm: '과거 결제조건', currencyCode: 'OLD',
        details: [],
      } })
      : lookup(path));
    const router = createMemoryRouter([{ path: '/', element: (
      <QuotationCreatePage selectedModule={moduleItem} currentMenuName="견적서작성"
        content={{ title: '견적서작성', description: '', cards: [], items: [] }}
        breadcrumbItems={[]} selectedMenuPermissions={{ read: true, update: true }}
        quotationId={21} mode={mode} />
    ) }]);
    render(<RouterProvider router={router} />);
    const incotermsSelect = await screen.findByRole('combobox', { name: 'Incoterms' });
    await waitFor(() => expect(incotermsSelect).toHaveTextContent('과거 인도조건'));
    expect(screen.getByRole('combobox', { name: '결제조건' })).toHaveTextContent('과거 결제조건');
    expect(screen.getByRole('combobox', { name: '화폐단위' })).toHaveTextContent('OLD');
    if (mode === 'view') {
      expect(incotermsSelect).toHaveAttribute('aria-disabled', 'true');
    } else {
      await waitFor(() => expect(incotermsSelect).not.toHaveAttribute('aria-disabled', 'true'));
      fireEvent.mouseDown(incotermsSelect);
      expect(await screen.findByRole('option', { name: '과거 인도조건' }))
        .toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('calculates line amounts only with an explicit policy rule instead of a fixed two places', () => {
    expect(calculateQuotationLineAmount(1, 1.005, { places: 2, rounding: 'HALF_UP' })).toBe(1.01);
    expect(calculateQuotationLineAmount(1, 1.005, { places: 3, rounding: 'DOWN' })).toBe(1.005);
    expect(() => calculateQuotationLineAmount(1, 1.005)).toThrow('소수점 정책을 불러오지 못했습니다.');
  });
});
