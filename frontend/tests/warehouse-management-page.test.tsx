import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WarehouseManagementPage } from '../src/pages/settings/system/warehouses/WarehouseManagementPage';

const warehouseServices = vi.hoisted(() => ({
  fetchWarehouseRows: vi.fn(),
  createWarehouse: vi.fn(),
  updateWarehouse: vi.fn(),
  deleteWarehouse: vi.fn(),
}));

vi.mock(
  '../src/pages/settings/system/warehouses/services/warehouseManagement.service',
  () => warehouseServices,
);

const selectedModule = {
  id: 'settings',
  name: '환경설정',
  icon: null,
  tree: [],
  menus: [],
};

const content = {
  title: '창고관리',
  description: '창고를 관리합니다.',
  cards: [],
  items: [],
};

const warehouseRows = (warehouseName = '중앙 창고', use = true) => [
  { id: '1', warehouseName, use },
];

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const renderPage = () =>
  render(
    <WarehouseManagementPage
      selectedModule={selectedModule}
      currentMenuName="창고관리"
      content={content}
      selectedMenuPermissions={{
        read: true,
        create: true,
        update: true,
        delete: true,
      }}
    />,
  );

beforeEach(() => {
  vi.resetAllMocks();
});

describe('WarehouseManagementPage', () => {
  it('retains ordinary loading while the initial warehouse query is pending', async () => {
    const initialRequest = deferred<ReturnType<typeof warehouseRows>>();
    const manualRequest = deferred<ReturnType<typeof warehouseRows>>();
    warehouseServices.fetchWarehouseRows
      .mockReturnValueOnce(initialRequest.promise)
      .mockReturnValueOnce(manualRequest.promise);
    renderPage();

    expect(await screen.findByRole('grid', { name: 'F1-GRID 창고 관리' })).toBeVisible();
    expect(screen.getByTestId('f1-grid-loading-overlay')).toBeVisible();

    initialRequest.resolve(warehouseRows());
    expect(
      await screen.findByRole('gridcell', { name: '중앙 창고' }),
    ).toBeVisible();
    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() =>
      expect(warehouseServices.fetchWarehouseRows).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByTestId('f1-grid-loading-overlay')).toBeVisible();
    manualRequest.resolve(warehouseRows('중앙 창고 최신'));
    expect(
      await screen.findByRole('gridcell', { name: '중앙 창고 최신' }),
    ).toBeVisible();
    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
  });

  it('locks warehouse edits, context actions, search, and refresh through the quiet save refresh', async () => {
    const saveRequest = deferred<void>();
    const refreshRequest = deferred<ReturnType<typeof warehouseRows>>();
    warehouseServices.fetchWarehouseRows
      .mockResolvedValueOnce(warehouseRows())
      .mockReturnValueOnce(refreshRequest.promise);
    warehouseServices.updateWarehouse.mockReturnValue(saveRequest.promise);

    renderPage();
    const grid = await screen.findByRole('grid', { name: 'F1-GRID 창고 관리' });
    await screen.findByRole('gridcell', { name: '중앙 창고' });
    const useCheckbox = within(grid).getAllByRole('checkbox').at(-1);
    expect(useCheckbox).toBeDefined();
    fireEvent.click(useCheckbox as HTMLElement);
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(warehouseServices.updateWarehouse).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByRole('gridcell', { name: '중앙 창고' })).toBeVisible();
    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '조회' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '창고 검색' })).toBeDisabled();

    const currentUseCheckbox = within(grid).getAllByRole('checkbox').at(-1) as HTMLElement;
    const checkedDuringSave = (currentUseCheckbox as HTMLInputElement).checked;
    fireEvent.click(currentUseCheckbox);
    expect((currentUseCheckbox as HTMLInputElement).checked).toBe(checkedDuringSave);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(warehouseServices.updateWarehouse).toHaveBeenCalledTimes(1);
    expect(warehouseServices.fetchWarehouseRows).toHaveBeenCalledTimes(1);

    saveRequest.resolve();
    await waitFor(() =>
      expect(warehouseServices.fetchWarehouseRows).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByRole('gridcell', { name: '중앙 창고' })).toBeVisible();
    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '조회' })).toBeDisabled();

    refreshRequest.resolve(warehouseRows('중앙 창고 갱신됨', false));
    expect(
      await screen.findByRole('gridcell', { name: '중앙 창고 갱신됨' }),
    ).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '조회' })).toBeEnabled(),
    );
  });

  it('hides warehouse add and delete context actions while saving', async () => {
    const saveRequest = deferred<void>();
    const refreshRequest = deferred<ReturnType<typeof warehouseRows>>();
    warehouseServices.fetchWarehouseRows
      .mockResolvedValueOnce(warehouseRows())
      .mockReturnValueOnce(refreshRequest.promise);
    warehouseServices.updateWarehouse.mockReturnValue(saveRequest.promise);

    renderPage();
    const grid = await screen.findByRole('grid', { name: 'F1-GRID 창고 관리' });
    await screen.findByRole('gridcell', { name: '중앙 창고' });
    fireEvent.click(within(grid).getAllByRole('checkbox').at(-1) as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(warehouseServices.updateWarehouse).toHaveBeenCalledTimes(1),
    );

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '중앙 창고' }));
    expect(screen.queryByRole('menuitem', { name: '행 추가' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '행 삭제' })).not.toBeInTheDocument();

    saveRequest.resolve();
    await waitFor(() =>
      expect(warehouseServices.fetchWarehouseRows).toHaveBeenCalledTimes(2),
    );
    refreshRequest.resolve(warehouseRows('중앙 창고 갱신됨', false));
    await waitFor(() =>
      expect(document.body).toHaveTextContent('중앙 창고 갱신됨'),
    );
  });

  it('retains warehouse changes and permits retry after a write failure', async () => {
    warehouseServices.fetchWarehouseRows.mockResolvedValue(warehouseRows());
    warehouseServices.updateWarehouse
      .mockRejectedValueOnce(new Error('창고 저장 실패'))
      .mockResolvedValueOnce(undefined);

    renderPage();
    const grid = await screen.findByRole('grid', { name: 'F1-GRID 창고 관리' });
    await screen.findByRole('gridcell', { name: '중앙 창고' });
    const useCheckbox = within(grid).getAllByRole('checkbox').at(-1) as HTMLElement;
    fireEvent.click(useCheckbox);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('창고 저장 실패')).toBeVisible();
    expect(screen.getByRole('gridcell', { name: '중앙 창고' })).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(warehouseServices.updateWarehouse).toHaveBeenCalledTimes(2),
    );
  });

  it('preserves warehouse changes and retry state when the quiet refresh fails', async () => {
    warehouseServices.fetchWarehouseRows
      .mockResolvedValueOnce(warehouseRows())
      .mockRejectedValueOnce(new Error('창고 재조회 실패'))
      .mockResolvedValueOnce(warehouseRows('중앙 창고 재조회 완료', false));
    warehouseServices.updateWarehouse.mockResolvedValue(undefined);

    renderPage();
    const grid = await screen.findByRole('grid', { name: 'F1-GRID 창고 관리' });
    await screen.findByRole('gridcell', { name: '중앙 창고' });
    fireEvent.click(within(grid).getAllByRole('checkbox').at(-1) as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('창고 재조회 실패')).toBeVisible();
    expect(screen.getByRole('gridcell', { name: '중앙 창고' })).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
    expect(warehouseServices.updateWarehouse).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(warehouseServices.fetchWarehouseRows).toHaveBeenCalledTimes(3),
    );
    expect(warehouseServices.updateWarehouse).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole('gridcell', { name: '중앙 창고 재조회 완료' }),
    ).toBeVisible();
  });
});
