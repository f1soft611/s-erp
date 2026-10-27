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
import type { F1GridSavedRow } from '../src/shared/components/f1-grid';
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
const acceptRows = <T extends object,>(saved: F1GridSavedRow<T>[]) => saved.map(({ row }) => row);

function renderCustomerPage(isTenantAdmin = true, create = true, update = true) {
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
            create,
            update,
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
  it.each([
    [true, false], [false, true], [false, false],
  ])('classification settings follow menu create=%s update=%s without admin role', async (create, update) => {
    apiMocks.apiGet.mockImplementation(async (url: string) => ({
      resultList: url.includes('/classifications/') ? [] : [customer],
    }));
    renderCustomerPage(false, create, update);
    await screen.findByText('Acme');
    const action = screen.queryByRole('button', { name: '거래처분류설정' });
    if (!create && !update) {
      expect(action).not.toBeInTheDocument();
      return;
    }
    expect(action).toBeInTheDocument();
    fireEvent.click(action!);
    expect(await screen.findByRole('dialog', { name: '거래처분류설정' })).toBeInTheDocument();
    await waitFor(() => expect(apiMocks.apiGet).toHaveBeenCalledWith('/api/v1/co/master/classifications/partners'));
    expect(Boolean(screen.queryByRole('button', { name: '최상위 추가' }))).toBe(create);
  });

  it('rejects a trimmed duplicate customer name in the form and on final save', async () => {
    expect(createCustomerColumns(true).find((column) => column.field === 'customerName')?.validation)
      .toEqual({ unique: true });
    renderCustomerPage();
    await screen.findByText('Acme');
    fireEvent.click(screen.getByRole('button', { name: '거래처 추가' }));
    const dialog = screen.getByRole('dialog', { name: '거래처 등록' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: '거래처명' }), { target: { value: ' Acme ' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: '사업자번호' }), { target: { value: '2234567890' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent('거래처명 값이 중복되었습니다.');
    expect(within(dialog).getByRole('textbox', { name: '거래처명' })).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(within(dialog).getByRole('textbox', { name: '거래처명' }), { target: { value: 'Unique' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
    const nameCell = screen.getByRole('gridcell', { name: 'Unique' });
    fireEvent.doubleClick(nameCell);
    const editor = screen.getByDisplayValue('Unique');
    fireEvent.change(editor, { target: { value: 'Acme' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByRole('alert')).toHaveTextContent('거래처명 값이 중복되었습니다.');
    expect(nameCell).toHaveAttribute('data-grid-error', '거래처명 값이 중복되었습니다.');
    expect(apiMocks.apiPost).not.toHaveBeenCalled();
  }, 10_000);

  it('declares customer name and business number required in shared column metadata', () => {
    const requiredFields = createCustomerColumns(true)
      .filter((column) => column.required)
      .map((column) => column.field);
    expect(requiredFields).toEqual(['customerName', 'businessNo']);
  });

  it('reports form required and digit-count errors above the page and clears them on valid apply', async () => {
    renderCustomerPage();
    await screen.findByText('Acme');
    fireEvent.click(screen.getByRole('button', { name: '거래처 추가' }));
    const dialog = screen.getByRole('dialog', { name: '거래처 등록' });
    const name = within(dialog).getByRole('textbox', { name: '거래처명' });
    const businessNo = within(dialog).getByRole('textbox', { name: '사업자번호' });
    expect(name).toHaveAttribute('aria-required', 'true');
    expect(businessNo).toHaveAttribute('aria-required', 'true');
    fireEvent.change(name, { target: { value: '   ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent('거래처명은(는) 필수입니다.');
    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent('사업자번호은(는) 필수입니다.');
    expect(businessNo).toHaveAttribute('aria-invalid', 'true');
    expect(businessNo.closest('.MuiInputBase-root')).toHaveClass('Mui-error');
    await waitFor(() => expect(name).toHaveFocus());
    fireEvent.change(name, { target: { value: 'New customer' } });
    fireEvent.change(businessNo, { target: { value: '123456789' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent('사업자번호은(는) 10자리여야 합니다.');
    await waitFor(() => expect(businessNo).toHaveFocus());
    expect(apiMocks.apiPost).not.toHaveBeenCalled();
    fireEvent.change(businessNo, { target: { value: '2234567890' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('New customer')).toBeInTheDocument();
  });

  it.each([
    ['', '사업자번호은(는) 필수입니다.'],
    ['123-45-6789', '사업자번호은(는) 10자리여야 합니다.'],
  ])('blocks saving an existing invalid business number "%s" with its actual error', async (businessNo, message) => {
    apiMocks.apiGet.mockResolvedValue({ resultList: [{ ...customer, businessNo }] });
    renderCustomerPage();
    const nameCell = await screen.findByRole('gridcell', { name: 'Acme' });
    fireEvent.doubleClick(nameCell);
    const editor = screen.getByDisplayValue('Acme');
    fireEvent.change(editor, { target: { value: 'Updated customer' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    const invalidCell = document.querySelector('[data-grid-error]');
    expect(invalidCell).toHaveAttribute('data-grid-error', message);
    expect(invalidCell).toHaveAttribute('title', message);
    expect(apiMocks.apiPost).not.toHaveBeenCalled();
  });

  it('keeps a focused invalid cell outline red after save validation', async () => {
    renderCustomerPage();
    await screen.findByText('Acme');
    const businessCell = screen.getByRole('gridcell', { name: '123-45-67890' });
    fireEvent.doubleClick(businessCell);
    const editor = screen.getByDisplayValue('123-45-67890');
    fireEvent.change(editor, { target: { value: '123456789' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(businessCell).toHaveAttribute('data-grid-error', '사업자번호은(는) 10자리여야 합니다.');
    expect(getComputedStyle(businessCell).outlineColor).toBe('rgb(211, 47, 47)');
    expect(apiMocks.apiPost).not.toHaveBeenCalled();
  });

  it('rejects business number duplicates across formatting differences in form apply and final save', async () => {
    expect(createCustomerColumns(true).find((column) => column.field === 'businessNo')?.validation)
      .toEqual({ unique: 'digits' });
    apiMocks.apiGet.mockResolvedValue({
      resultList: [{ ...customer, businessNo: '1234567890', useAt: 'N' }],
    });
    renderCustomerPage();
    await screen.findByText('Acme');
    fireEvent.click(screen.getByRole('button', { name: '거래처 추가' }));
    const dialog = screen.getByRole('dialog', { name: '거래처 등록' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: '거래처명' }), {
      target: { value: 'Different name' },
    });
    const businessNo = within(dialog).getByRole('textbox', { name: '사업자번호' });
    fireEvent.change(businessNo, { target: { value: '123-45-67890' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent('사업자번호 값이 중복되었습니다.');
    expect(businessNo).toHaveAttribute('aria-invalid', 'true');
    expect(businessNo.closest('.MuiInputBase-root')).toHaveClass('Mui-error');
    fireEvent.change(businessNo, { target: { value: '2234567890' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const cell = screen.getByRole('gridcell', { name: '223-45-67890' });
    fireEvent.doubleClick(cell);
    const editor = screen.getByDisplayValue('223-45-67890');
    fireEvent.change(editor, { target: { value: '1234567890' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByRole('alert')).toHaveTextContent('사업자번호 값이 중복되었습니다.');
    expect(cell).toHaveAttribute('data-grid-error', '사업자번호 값이 중복되었습니다.');
    expect(apiMocks.apiPost).not.toHaveBeenCalled();
  });

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

  it('requires an explicit query after saving succeeds but acknowledgement is invalid', async () => {
    apiMocks.apiPost.mockResolvedValue({ item: { customers: [customer] } });
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
    await act(async () => result.current.saveChanges(changes, acceptRows));
    expect(result.current.hasChanges).toBe(true);
    expect(result.current.error).toBe(
      '저장은 완료했지만 화면 반영에 실패했습니다. 조회를 다시 실행해 주세요.',
    );
    await act(async () => result.current.saveChanges(changes, acceptRows));
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiGet).toHaveBeenCalledTimes(1);
  });

  it('retains update-code and deletion business rules before submitting a batch', async () => {
    const { result } = renderHook(() => useCustomerManagement(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <NotificationProvider>{children}</NotificationProvider>
      ),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const changes = {
      insertedRows: [],
      updatedRows: [{ ...normalizeCustomerRow(customer), customerCode: '' }],
      deletedRows: [],
    };
    act(() => result.current.handleChangesChange(changes));
    await act(async () => result.current.saveChanges(changes, acceptRows));
    expect(result.current.error).toBe('수정 시 거래처코드를 입력해 주세요.');
    expect(result.current.hasChanges).toBe(true);
    await act(async () => result.current.saveChanges({
      insertedRows: [],
      updatedRows: [],
      deletedRows: [normalizeCustomerRow(customer)],
    }, acceptRows));
    expect(result.current.error).toContain('거래처는 삭제할 수 없습니다.');
    expect(apiMocks.apiPost).not.toHaveBeenCalled();
  });

  it('saves all dirty rows in one batch without reapplying active filters', async () => {
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
    apiMocks.apiPost.mockResolvedValue({ item: {
      customers: [customer, { ...customer, customerId: 31, customerName: 'New customer' }],
      rowIdMappings: { [String(changes.insertedRows[0].customerId)]: 31, '12': 12 },
    } });
    act(() => result.current.handleChangesChange(changes));
    await act(async () => result.current.saveChanges(changes, acceptRows));

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
    expect(apiMocks.apiGet).toHaveBeenCalledTimes(2);
    expect(result.current.gridKey).toBe(0);
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
      saving = result.current.saveChanges(changes, acceptRows);
      void result.current.saveChanges(changes, acceptRows);
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

  it('keeps the customer code visible but out of the form and cell editing', () => {
    const columns = createCustomerColumns(true);
    const codeColumn = columns.find((column) => column.field === 'customerCode');
    const formFields = buildGridFormSections(columns, createCustomerRow())
      .flatMap((section) => section.fields)
      .map((field) => String(field.field));

    expect(codeColumn?.editable).toBe(false);
    expect(codeColumn?.form?.hidden).toBe(true);
    expect(codeColumn?.hidden).not.toBe(true);
    expect(formFields).not.toContain('customerCode');
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
    const codeCell = await screen.findByRole('gridcell', { name: '000012' });
    fireEvent.click(codeCell);
    fireEvent.paste(codeCell, {
      clipboardData: { getData: () => '999999' },
    });
    expect(screen.queryByRole('gridcell', { name: '999999' })).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '000012' })).toBeVisible();
    fireEvent.doubleClick(codeCell);
    expect(screen.queryByDisplayValue('000012')).not.toBeInTheDocument();
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/customers',
    );
  });

  it('accepts canonical customer rows without a reload or grid recreation', async () => {
    let finishSave!: (value: unknown) => void;
    let listRequests = 0;
    apiMocks.apiGet.mockImplementation((url: string) => {
      if (url !== '/api/v1/co/master/customers') return Promise.resolve({});
      listRequests += 1;
      return listRequests === 1
        ? Promise.resolve({ resultList: [customer] })
        : Promise.reject(new Error('Unexpected reload'));
    });
    apiMocks.apiPost.mockImplementation(
      () => new Promise((resolve) => { finishSave = resolve; }),
    );

    renderCustomerPage();
    const nameCell = await screen.findByRole('gridcell', { name: 'Acme' });
    const originalGrid = screen.getByRole('grid', { name: '거래처 목록' });
    fireEvent.doubleClick(nameCell);
    const editor = screen.getByDisplayValue('Acme');
    fireEvent.change(editor, { target: { value: 'Updated Acme' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalled());
    expect(screen.getByRole('progressbar', { name: '거래처 저장 중' })).toBeVisible();
    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'Updated Acme' })).toBeVisible();

    await act(async () => finishSave({ item: {
      customers: [{ ...customer, customerName: 'Canonical Acme' }], rowIdMappings: { '12': 12 },
    } }));
    expect(listRequests).toBe(1);
    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
    expect(screen.getByRole('grid', { name: '거래처 목록' })).toBe(originalGrid);
    await waitFor(() => expect(screen.queryByRole('progressbar', { name: '거래처 저장 중' })).not.toBeInTheDocument());
    expect(screen.getByRole('gridcell', { name: 'Canonical Acme' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
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
