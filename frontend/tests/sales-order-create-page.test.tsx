import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSalesOrder,
  deleteSalesOrder,
  getSalesOrder,
  updateSalesOrder,
} from '../src/pages/sales/order/create/services/salesOrder.service';
import { SalesOrderCreatePage } from '../src/pages/sales/order/create/SalesOrderCreatePage';
import type {
  SalesOrderCreated,
  SalesOrderItem,
} from '../src/pages/sales/order/create/types/salesOrder.types';
import type { MenuPermission } from '../src/pages/dashboard/types/dashboard';

vi.mock('../src/pages/sales/order/create/services/salesOrder.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/pages/sales/order/create/services/salesOrder.service')>();
  return {
    ...actual,
    createSalesOrder: vi.fn(),
    deleteSalesOrder: vi.fn(),
    getSalesOrder: vi.fn(),
    updateSalesOrder: vi.fn(),
  };
});

vi.mock('../src/pages/sales/order/create/services/salesOrderMaster.service', () => ({
  searchOrderCustomers: vi.fn(async () => [
    { id: 10, code: 'C-10', name: '거래처 10' },
  ]),
  searchOrderMaterials: vi.fn(async () => [
    { id: 20, code: 'M-20', name: '품목 20' },
  ]),
}));

const createSalesOrderMock = vi.mocked(createSalesOrder);
const getSalesOrderMock = vi.mocked(getSalesOrder);
const updateSalesOrderMock = vi.mocked(updateSalesOrder);
const deleteSalesOrderMock = vi.mocked(deleteSalesOrder);

describe('sales order entry page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSalesOrderMock.mockResolvedValue(loadedOrder());
  });

  it('renders the sales order form with its breadcrumb and API notice', () => {
    renderSalesOrderPage();

    const formGrid = screen.getByLabelText('수주번호')
      .closest('.MuiFormControl-root')
      ?.parentElement;

    expect(formGrid).toHaveStyle({ columnGap: '16px', rowGap: '8px' });
    expect(
      screen.getByRole('button', { name: '거래처 선택' }).parentElement,
    ).toHaveStyle({ marginTop: '0px' });
    expect(screen.getByLabelText('수주번호')).toHaveValue(
      '저장 시 자동 채번',
    );
    expect(screen.getByText('영업관리 > 수주관리 > 수주등록')).toBeInTheDocument();
    expect(
      screen.queryByText(/저장 API는 아직 연결되지 않았습니다/),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();

  });

  it('places add-row beside material picker in the grid header and removes rows via the context menu', () => {
    renderSalesOrderPage();

    expect(
      screen.queryByRole('button', { name: '선택 행 삭제' }),
    ).not.toBeInTheDocument();
    const gridHeader = screen.getByTestId('sales-order-detail-toolbar');
    const toolbarButtons = within(gridHeader)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(toolbarButtons).toEqual(['상세 행 추가', '품목 선택']);

    fireEvent.click(
      within(gridHeader).getByRole('button', { name: '상세 행 추가' }),
    );
    expect(screen.getByRole('grid', { name: '수주 상세 목록' })).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /order-line-.*행 선택/ });

    fireEvent.contextMenu(within(row).getAllByRole('gridcell')[1]);
    fireEvent.click(screen.getByRole('menuitem', { name: '행 삭제' }));
    expect(
      screen.queryByRole('row', { name: /order-line-.*행 선택/ }),
    ).not.toBeInTheDocument();
  });

  it('duplicates a detail row from the context menu with a new row id', async () => {
    renderSalesOrderPage();
    await addAndCompleteDetail();

    const sourceRow = screen.getByRole('row', { name: /order-line-.*행 선택/ });
    fireEvent.contextMenu(within(sourceRow).getAllByRole('gridcell')[1]);
    fireEvent.click(screen.getByRole('menuitem', { name: '행 복사' }));

    const rows = screen.getAllByRole('row', { name: /order-line-.*행 선택/ });
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(within(row).getByRole('gridcell', { name: 'M-20' })).toBeInTheDocument();
    }
  }, 15000);

  it('lets users select a material from the selected detail row without editing a cell', async () => {
    renderSalesOrderPage();
    fireEvent.click(screen.getByRole('button', { name: '상세 행 추가' }));

    expect(screen.getByRole('button', { name: '품목 선택' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '품목 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'M-20 품목 20 선택' }),
    );
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const updatedRow = screen.getByRole('row', {
      name: /order-line-.*행 선택/,
    });
    expect(
      within(updatedRow).getByRole('gridcell', { name: 'M-20' }),
    ).toBeInTheDocument();
    expect(
      within(updatedRow).getByRole('gridcell', { name: '품목 20' }),
    ).toBeInTheDocument();
  }, 10000);

  it('recalculates line and order totals when grid amounts are edited', () => {
    renderSalesOrderPage();

    fireEvent.click(screen.getByRole('button', { name: '상세 행 추가' }));

    const editCell = (cellIndex: number, value: string) => {
      const row = screen.getByRole('row', {
        name: /order-line-.*행 선택/,
      });
      const cell = within(row).getAllByRole('gridcell')[cellIndex];
      fireEvent.doubleClick(cell);
      const editor = screen.getByRole('spinbutton');
      fireEvent.change(editor, { target: { value } });
      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
    };

    editCell(3, '2');
    editCell(4, '100');

    const grid = screen.getByRole('grid', { name: '수주 상세 목록' });
    expect(within(grid).getByRole('gridcell', { name: '200.00' })).toBeInTheDocument();
    expect(screen.getByLabelText('수주 금액 합계')).toHaveTextContent(
      /공급가 합계\s*200\.00\s*부가세 합계\s*20\.00\s*총 합계\s*220\.00/,
    );

    editCell(6, '30');
    expect(screen.getByLabelText('수주 금액 합계')).toHaveTextContent(
      /공급가 합계\s*200\.00\s*부가세 합계\s*30\.00\s*총 합계\s*230\.00/,
    );
  });

  it('marks required header fields and detail grid columns', () => {
    renderSalesOrderPage();

    expect(screen.getByLabelText(/수주일자/)).toBeRequired();
    expect(screen.getByLabelText(/거래처/, { selector: 'input' })).toBeRequired();
    expect(screen.getByLabelText(/견적번호/)).not.toBeRequired();

    fireEvent.click(screen.getByRole('button', { name: '상세 행 추가' }));
    const grid = screen.getByRole('grid', { name: '수주 상세 목록' });
    expect(within(grid).getByLabelText('품목코드 필수')).toBeInTheDocument();
    expect(within(grid).getByLabelText('주문수량 필수')).toBeInTheDocument();
    expect(within(grid).getByLabelText('단가 필수')).toBeInTheDocument();
    expect(within(grid).queryByLabelText('납기 필수')).not.toBeInTheDocument();
  });

  it('highlights invalid detail cells with F1-Grid validation and clears them after correction', async () => {
    renderSalesOrderPage();
    await selectCustomer();
    fireEvent.click(screen.getByRole('button', { name: '상세 행 추가' }));

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(createSalesOrderMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/거래처/, { selector: 'input' })).not.toHaveAttribute(
      'aria-invalid',
      'true',
    );
    const grid = screen.getByRole('grid', { name: '수주 상세 목록' });
    expect(
      grid.querySelector('[data-grid-error="품목코드은(는) 필수입니다."]'),
    ).not.toBeNull();
    expect(
      grid.querySelector('[data-grid-error="주문수량은 0보다 커야 합니다."]'),
    ).not.toBeNull();

    const row = screen.getByRole('row', { name: /order-line-.*행 선택/ });
    fireEvent.doubleClick(within(row).getAllByRole('gridcell')[3]);
    const editor = screen.getByRole('spinbutton');
    fireEvent.change(editor, { target: { value: '2' } });
    fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(
        grid.querySelector('[data-grid-error="주문수량은 0보다 커야 합니다."]'),
      ).toBeNull();
    });
    expect(
      grid.querySelector('[data-grid-error="품목코드은(는) 필수입니다."]'),
    ).not.toBeNull();
  });

  it('shows each detail validation message once even when several rows fail', async () => {
    renderSalesOrderPage();
    await selectCustomer();
    for (let index = 0; index < 3; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: '상세 행 추가' }));
    }

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    const alert = await screen.findByRole('alert');
    const messages = within(alert).getAllByRole('listitem').map((item) => item.textContent);
    expect(messages).toEqual([...new Set(messages)]);
    expect(messages).toContain('주문수량은 0보다 큰 유효한 값이어야 합니다.');
  });

  it('shows required-field feedback without sending an invalid order', async () => {
    renderSalesOrderPage();
    fireEvent.change(screen.getByLabelText(/수주일자/), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(screen.getByLabelText(/수주일자/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByText('수주일자를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByLabelText(/거래처/, { selector: 'input' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getAllByText('거래처를 선택해 주세요.').length).toBeGreaterThan(0);
    expect(
      screen.getByText('품목 상세를 1건 이상 입력해 주세요.'),
    ).toBeInTheDocument();
    expect(createSalesOrderMock).not.toHaveBeenCalled();
  });

  it('saves validated header and detail fields and shows the returned order number', async () => {
    createSalesOrderMock.mockResolvedValue(createdOrder());
    const { router } = renderSalesOrderPage();
    await selectCustomer();
    await addAndCompleteDetail();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(createSalesOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 10,
          details: [
            expect.objectContaining({
              materialId: 20,
              orderQty: 2,
              unitPrice: 100,
              vatAmt: 20,
            }),
          ],
        }),
      );
    });
    expect(
      await screen.findByText(/SO-20261027-0001/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    const confirm = vi.spyOn(window, 'confirm');
    await act(async () => {
      await router.navigate('/other');
    });
    expect(confirm).not.toHaveBeenCalled();
    expect(await screen.findByText('다른 화면')).toBeInTheDocument();
    confirm.mockRestore();
  }, 10000);

  it('keeps entered data and prevents duplicate submits while the save is pending', async () => {
    let resolveSave: (order: SalesOrderCreated) => void = () => undefined;
    createSalesOrderMock.mockImplementation(
      () => new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    renderSalesOrderPage();
    await selectCustomer();
    await addAndCompleteDetail();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const saveButton = screen.getByRole('button', { name: '저장' });
    await waitFor(() => expect(saveButton).toBeDisabled());
    fireEvent.click(saveButton);
    expect(createSalesOrderMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: '거래처' })).toHaveValue(
      'C-10 · 거래처 10',
    );

    await act(async () => {
      resolveSave(createdOrder());
    });
    await screen.findByText(/SO-20261027-0001/);
  }, 10000);

  it('shows save failure and retains all entered values', async () => {
    createSalesOrderMock.mockRejectedValue(new Error('저장을 완료하지 못했습니다.'));
    renderSalesOrderPage();
    await selectCustomer();
    await addAndCompleteDetail();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(
      await screen.findByText('저장을 완료하지 못했습니다.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '거래처' })).toHaveValue(
      'C-10 · 거래처 10',
    );
    expect(screen.getByLabelText('견적번호')).toHaveValue('');
    expect(screen.getByLabelText(/수주일자/)).toHaveValue('2026-10-27');
    const row = screen.getByRole('row', { name: /order-line-.*행 선택/ });
    expect(within(row).getByRole('gridcell', { name: 'M-20' })).toBeInTheDocument();
    expect(within(row).getByRole('gridcell', { name: '2.00' })).toBeInTheDocument();
    expect(within(row).getByRole('gridcell', { name: '100.00' })).toBeInTheDocument();
    expect(createSalesOrderMock).toHaveBeenCalledTimes(1);
  }, 10000);

  it('prompts before leaving a changed order and stays on the form when cancelled', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { router } = renderSalesOrderPage();
    fireEvent.change(screen.getByLabelText('견적번호'), {
      target: { value: 'QT-100' },
    });

    await act(async () => {
      await router.navigate('/other');
    });

    const dialog = await screen.findByRole('dialog', {
      name: '저장하지 않은 변경사항',
    });
    expect(dialog).toHaveTextContent('저장되지 않은 수주');
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: '계속 작성' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText('견적번호')).toHaveValue('QT-100');
    expect(screen.queryByText('다른 화면')).not.toBeInTheDocument();

    await act(async () => {
      await router.navigate('/other');
    });
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: '변경사항 버리고 이동',
      }),
    );
    expect(await screen.findByText('다른 화면')).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  }, 10000);

  it('cancels internal navigation with Escape and keeps browser unload protection', async () => {
    const { router } = renderSalesOrderPage();
    fireEvent.change(screen.getByLabelText('견적번호'), {
      target: { value: 'QT-100' },
    });
    await act(async () => { await router.navigate('/other'); });
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText('견적번호')).toHaveValue('QT-100');
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not warn for an untouched or reverted order', async () => {
    const { router } = renderSalesOrderPage();
    const pristineEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(pristineEvent);
    expect(pristineEvent.defaultPrevented).toBe(false);
    fireEvent.change(screen.getByLabelText('견적번호'), {
      target: { value: 'QT-100' },
    });
    fireEvent.change(screen.getByLabelText('견적번호'), {
      target: { value: '' },
    });
    const revertedEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(revertedEvent);
    expect(revertedEvent.defaultPrevented).toBe(false);
    await act(async () => { await router.navigate('/other'); });
    expect(await screen.findByText('다른 화면')).toBeInTheDocument();
  });

  it('warns before browser unload when the order has unsaved changes', () => {
    renderSalesOrderPage();
    fireEvent.change(screen.getByLabelText('견적번호'), {
      target: { value: 'QT-100' },
    });

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('reloads the saved order into the header and grid and updates it with PUT', async () => {
    createSalesOrderMock.mockResolvedValue(createdOrder());
    renderSalesOrderPage();
    await selectCustomer();
    await addAndCompleteDetail();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(getSalesOrderMock).toHaveBeenCalledWith(300));
    expect(await screen.findByLabelText('수주번호')).toHaveValue('SO-20261027-0001');
    expect(screen.getByLabelText('견적번호')).toHaveValue('Q-LOADED');
    expect(screen.getByRole('textbox', { name: '거래처' })).toHaveValue('C-10 · 거래처 10');
    const row = screen.getByRole('row', { name: /order-line-450.*행 선택/ });
    expect(within(row).getByRole('gridcell', { name: 'M-20' })).toBeInTheDocument();
    expect(within(row).getByRole('gridcell', { name: '220.00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '상세 행 추가' })).toBeEnabled();

    updateSalesOrderMock.mockResolvedValue({ ...loadedOrder(), quotNo: 'Q-EDIT' });
    fireEvent.change(screen.getByLabelText('견적번호'), { target: { value: 'Q-EDIT' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(updateSalesOrderMock).toHaveBeenCalledWith(
        300,
        expect.objectContaining({
          quotNo: 'Q-EDIT',
          details: [expect.objectContaining({ materialId: 20, orderQty: 2 })],
        }),
      );
    });
    expect(createSalesOrderMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/수주가 수정되었습니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  }, 15000);

  it('deletes the loaded order after confirmation in the common dialog and resets to a new order', async () => {
    createSalesOrderMock.mockResolvedValue(createdOrder());
    deleteSalesOrderMock.mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm');
    renderSalesOrderPage();
    await selectCustomer();
    await addAndCompleteDetail();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByLabelText('수주번호')).toHaveValue('SO-20261027-0001');

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    let confirmDialog = await screen.findByRole('dialog', { name: '수주 삭제' });
    expect(confirmDialog).toHaveTextContent('SO-20261027-0001');
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '수주 삭제' })).not.toBeInTheDocument(),
    );
    expect(deleteSalesOrderMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    confirmDialog = await screen.findByRole('dialog', { name: '수주 삭제' });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(deleteSalesOrderMock).toHaveBeenCalledWith(300));
    expect(await screen.findByText(/수주가 삭제되었습니다/)).toBeInTheDocument();
    expect(screen.getByLabelText('수주번호')).toHaveValue('저장 시 자동 채번');
    expect(screen.getByLabelText('견적번호')).toHaveValue('');
    expect(screen.queryAllByRole('row', { name: /order-line-.*행 선택/ })).toHaveLength(0);
    expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled();
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  }, 15000);

  it('resets the header and detail grid with the new button after confirming unsaved changes', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderSalesOrderPage();
    const today = (screen.getByLabelText(/수주일자/) as HTMLInputElement).value;
    await selectCustomer();
    fireEvent.change(screen.getByLabelText(/수주일자/), { target: { value: '2026-01-02' } });
    fireEvent.change(screen.getByLabelText('견적번호'), { target: { value: 'QT-100' } });
    fireEvent.click(screen.getByRole('button', { name: '상세 행 추가' }));

    fireEvent.click(screen.getByRole('button', { name: '신규' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('신규로 초기화'));
    expect(screen.getByLabelText('견적번호')).toHaveValue('QT-100');

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: '신규' }));

    expect(screen.getByLabelText('견적번호')).toHaveValue('');
    expect(screen.getByRole('textbox', { name: '거래처' })).toHaveValue('');
    expect(screen.getByLabelText(/수주일자/)).toHaveValue(today);
    expect(screen.queryAllByRole('row', { name: /order-line-.*행 선택/ })).toHaveLength(0);

    confirm.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '신규' }));
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  }, 15000);

  it('shows new/save only with write permission and delete only with delete permission', () => {
    renderSalesOrderPage({ read: true, create: false, update: false, delete: false });

    expect(screen.queryByRole('button', { name: '신규' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '상세 행 추가' }),
    ).not.toBeInTheDocument();
  });
});

function renderSalesOrderPage(
  permissions: MenuPermission = { read: true, create: true, update: true, delete: true },
) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <SalesOrderCreatePage
            {...salesOrderPageProps}
            selectedMenuPermissions={permissions}
          />
        ),
      },
      { path: '/other', element: <div>다른 화면</div> },
    ],
    { initialEntries: ['/'] },
  );
  return {
    ...render(<RouterProvider router={router} />),
    router,
  };
}

const salesOrderPageProps = {
  selectedModule: {
    id: 'sales',
    name: '영업관리',
    icon: null,
    tree: [],
    menus: [],
  },
  currentMenuName: '수주등록',
  breadcrumbItems: ['영업관리', '수주관리', '수주등록'],
  content: {
    title: '수주등록',
    description: '수주 정보를 입력합니다.',
    cards: [],
    items: [],
  },
};

async function selectCustomer() {
  fireEvent.click(screen.getByRole('button', { name: '거래처 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '검색' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'C-10 거래처 10 선택' }),
  );
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

async function addAndCompleteDetail() {
  fireEvent.click(screen.getByRole('button', { name: '상세 행 추가' }));
  const row = screen.getByRole('row', { name: /order-line-.*행 선택/ });
  fireEvent.doubleClick(within(row).getAllByRole('gridcell')[1]);
  fireEvent.click(within(row).getByRole('button', { name: '코드 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '검색' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'M-20 품목 20 선택' }),
  );
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  const editCell = (cellIndex: number, value: string) => {
    const currentRow = screen.getByRole('row', {
      name: /order-line-.*행 선택/,
    });
    const cell = within(currentRow).getAllByRole('gridcell')[cellIndex];
    fireEvent.doubleClick(cell);
    const editor = screen.getByRole('spinbutton');
    fireEvent.change(editor, { target: { value } });
    fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
  };
  editCell(3, '2');
  editCell(4, '100');
}

function createdOrder(): SalesOrderCreated {
  return {
    salesOrderId: 300,
    orderNo: 'SO-20261027-0001',
    orderDt: '2026-10-27',
    customerId: 10,
    totalAmt: 220,
  };
}

function loadedOrder(): SalesOrderItem {
  return {
    salesOrderId: 300,
    orderNo: 'SO-20261027-0001',
    orderDt: '2026-10-27',
    customerId: 10,
    customerCode: 'C-10',
    customerName: '거래처 10',
    quotNo: 'Q-LOADED',
    deliveryDt: null,
    deliveryPlace: null,
    deliveryMethod: null,
    status: '수주등록',
    totalAmt: 220,
    remark: null,
    details: [
      {
        salesOrderDetailId: 450,
        lineNo: 1,
        materialId: 20,
        materialCode: 'M-20',
        materialName: '품목 20',
        orderQty: 2,
        unitPrice: 100,
        supplyAmt: 200,
        vatAmt: 20,
        totalAmt: 220,
        deliveryDt: null,
        shippedQty: 0,
        lineStatus: '대기',
      },
    ],
  };
}
