import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import {
  createCustomerColumns,
  createCustomerRow,
} from '../src/pages/co/master/customers/components/CustomerGrid';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { buildGridFormSections } from '../src/shared/components/f1-grid/form/GridFormModel';
import { toPageSearchFields } from '../src/shared/components/page-search/searchFields';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import { useCustomerManagement } from '../src/pages/co/master/customers/hooks/useCustomerManagement';
import { normalizeCustomerRow } from '../src/pages/co/master/customers/services/customerManagement.service';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

const customer = {
  customerId: 12,
  tenantId: 9,
  customerCode: '000012',
  customerName: 'Acme',
  custNameAbbr: 'AC',
  presidentName: 'Lee',
  businessNo: '123-45-67890',
  juridNo: '110111-1234567',
  businessStatus1: '도소매',
  businessItem1: '식품',
  postCode: '01234',
  address: '서울',
  telephoneNo: '02-1234-5678',
  facsimileNo: '02-1234-5679',
  custMemo: '메모',
  useAt: 'Y',
};

function renderCustomerPage(isTenantAdmin = true) {
  return render(
    <ThemeProvider theme={createTheme()}>
      <NotificationProvider>
        <DashboardContent
          selectedModule={{
            id: 'co',
            name: '기준정보',
            icon: null,
            tree: [],
            menus: [],
          }}
          currentMenuName="거래처 관리"
          currentPageKey="customers"
          breadcrumbItems={['기준정보', '거래처 관리']}
          content={{
            title: '거래처 관리',
            description: '거래처 기준정보를 관리합니다.',
            cards: [],
            items: [],
          }}
          selectedMenuPermissions={{
            read: true,
            create: true,
            update: true,
            delete: false,
            excel: false,
          }}
          isTenantAdmin={isTenantAdmin}
        />
      </NotificationProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.apiGet.mockResolvedValue({ resultList: [customer] });
});

describe('customer management page', () => {
  it('configures reusable input formats for customer numbers and contacts', () => {
    const columns = createCustomerColumns(true);
    const formats = Object.fromEntries(
      columns.map((column) => [String(column.field), column.inputFormat]),
    );

    expect(formats).toMatchObject({
      businessNo: {
        type: 'digits',
        groupSizes: [3, 2],
        maxDigits: 10,
        validDigitCounts: [10],
      },
      juridNo: {
        type: 'digits',
        groupSizes: [6],
        maxDigits: 13,
        validDigitCounts: [13],
      },
      postCode: { type: 'digits', maxDigits: 5, validDigitCounts: [5] },
      telephoneNo: { type: 'korean-phone', maxDigits: 11 },
      facsimileNo: { type: 'korean-phone', maxDigits: 11 },
    });
  });

  it('does not leave saved inserts dirty when the subsequent reload fails', async () => {
    apiMocks.apiPost.mockResolvedValue({ item: { customers: [customer] } });
    const { result } = renderHook(() => useCustomerManagement(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <NotificationProvider>{children}</NotificationProvider>
      ),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    apiMocks.apiGet.mockRejectedValueOnce(new Error('목록 연결 실패'));
    const changes = {
      insertedRows: [{ ...createCustomerRow(), customerName: 'New customer' }],
      updatedRows: [],
      deletedRows: [],
    };
    act(() => result.current.handleChangesChange(changes));
    await act(async () => result.current.saveChanges(changes));
    expect(result.current.hasChanges).toBe(false);
    expect(result.current.error).toBe(
      '저장은 완료했지만 목록을 다시 불러오지 못했습니다. 조회를 다시 실행해 주세요.',
    );
  });

  it('validates every row and rejects deletion before submitting any batch', async () => {
    const { result } = renderHook(() => useCustomerManagement(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <NotificationProvider>{children}</NotificationProvider>
      ),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const changes = {
      insertedRows: [
        { ...createCustomerRow(), customerName: 'Valid' },
        { ...createCustomerRow(), customerName: '' },
      ],
      updatedRows: [],
      deletedRows: [],
    };
    act(() => result.current.handleChangesChange(changes));
    await act(async () => result.current.saveChanges(changes));
    expect(result.current.error).toBe('거래처명은 필수입니다.');
    expect(result.current.hasChanges).toBe(true);
    await act(async () => result.current.saveChanges({
      insertedRows: [],
      updatedRows: [],
      deletedRows: [normalizeCustomerRow(customer)],
    }));
    expect(result.current.error).toContain('거래처는 삭제할 수 없습니다.');
    expect(apiMocks.apiPost).not.toHaveBeenCalled();
  });

  it('saves all dirty rows in a single batch and reloads the active filters', async () => {
    apiMocks.apiPost.mockResolvedValue({ item: { customers: [customer] } });
    const { result } = renderHook(() => useCustomerManagement(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <NotificationProvider>{children}</NotificationProvider>
      ),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.applyFilters({ keyword: 'Acme' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const changes = {
      insertedRows: [{ ...createCustomerRow(), customerName: ' New customer ' }],
      updatedRows: [normalizeCustomerRow(customer)],
      deletedRows: [],
    };
    act(() => result.current.handleChangesChange(changes));
    await act(async () => result.current.saveChanges(changes));

    expect(apiMocks.apiPost).toHaveBeenCalledExactlyOnceWith(
      '/api/v1/co/master/customers/save-batch',
      {
        customers: {
          insertedRows: [expect.objectContaining({
            customerName: 'New customer',
            customerCode: '',
          })],
          updatedRows: [expect.objectContaining({ customerId: '12' })],
          deletedRows: [],
        },
      },
    );
    expect(apiMocks.apiPut).not.toHaveBeenCalled();
    expect(apiMocks.apiGet).toHaveBeenLastCalledWith(
      '/api/v1/co/master/customers?keyword=Acme',
    );
    expect(result.current.hasChanges).toBe(false);
  });

  it('keeps grid changes on batch failure and blocks concurrent saves', async () => {
    let rejectSave!: (error: Error) => void;
    apiMocks.apiPost.mockImplementation(() => new Promise((_, reject) => {
      rejectSave = reject;
    }));
    const { result } = renderHook(() => useCustomerManagement(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <NotificationProvider>{children}</NotificationProvider>
      ),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const changes = {
      insertedRows: [{ ...createCustomerRow(), customerName: 'New customer' }],
      updatedRows: [],
      deletedRows: [],
    };
    act(() => result.current.handleChangesChange(changes));
    let saving!: Promise<void>;
    act(() => {
      saving = result.current.saveChanges(changes);
      void result.current.saveChanges(changes);
    });
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
    await act(async () => {
      rejectSave(new Error('일괄 저장 실패'));
      await saving;
    });
    expect(result.current.error).toBe('일괄 저장 실패');
    expect(result.current.hasChanges).toBe(true);
    expect(result.current.saving).toBe(false);
    expect(apiMocks.apiGet).toHaveBeenCalledTimes(1);
  });

  it('keeps hidden business fields available in the customer form and detail search', () => {
    const columns = createCustomerColumns(true);
    const formFields = buildGridFormSections(columns, createCustomerRow())
      .flatMap((section) => section.fields)
      .map((field) => String(field.field));
    const searchFields = toPageSearchFields(columns).map((field) => field.field);

    expect(formFields).toEqual(
      expect.arrayContaining(['juridNo', 'postCode', 'facsimileNo', 'custMemo']),
    );
    expect(searchFields).toContain('juridNo');
  });

  it('configures numeric-hyphen filtering only for customer number/contact columns', () => {
    const columns = createCustomerColumns(true);
    const normalizedColumns = columns.filter((column) => column.sanitizeInput);
    expect(normalizedColumns.map((column) => column.field)).toEqual([
      'businessNo',
      'telephoneNo',
      'juridNo',
      'postCode',
      'facsimileNo',
    ]);
    for (const field of ['businessNo', 'juridNo']) {
      const searchField = toPageSearchFields(columns).find(
        (candidate) => candidate.field === field,
      );
      expect(searchField?.sanitizeInput?.('A01-2B')).toBe('01-2');
    }
    expect(
      columns.find((column) => column.field === 'customerName')?.sanitizeInput,
    ).toBeUndefined();
    expect(
      toPageSearchFields(columns).find((field) => field.field === 'presidentName')
        ?.sanitizeInput,
    ).toBeUndefined();
  });

  it('renders customer results through the co/customers dashboard route', async () => {
    renderCustomerPage();

    expect(
      await screen.findByRole('textbox', { name: '거래처 검색' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('grid', { name: '거래처 목록' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/customers',
    );
  });

  it('applies basic and detailed search values in one list request', async () => {
    renderCustomerPage();

    const keywordInput = await screen.findByRole('textbox', {
      name: '거래처 검색',
    });
    fireEvent.change(keywordInput, { target: { value: 'Acme' } });
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));

    fireEvent.change(screen.getByRole('textbox', { name: '대표자' }), {
      target: { value: 'Lee' },
    });
    const detailDialog = screen.getByRole('dialog', { name: '상세 검색' });
    fireEvent.click(within(detailDialog).getByRole('button', { name: '조회' }));

    await waitFor(() => {
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        '/api/v1/co/master/customers?keyword=Acme&presidentName=Lee',
      );
    });
  });

  it('does not expose create or update actions to a non-admin user', async () => {
    renderCustomerPage(false);

    await screen.findByRole('grid', { name: '거래처 목록' });

    expect(
      screen.queryByRole('button', { name: '거래처 추가' }),
    ).not.toBeInTheDocument();
  });
});
