import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessManagementPage } from '../src/pages/pr/process/ProcessManagementPage';
import {
  fetchProcessMasters, fetchProcesses, saveProcessMasters, saveProcesses,
} from '../src/pages/pr/process/services/processManagement.service';
import { AppSettingsProvider } from '../src/shared/context/AppSettingsContext';
import { NotificationContext } from '../src/shared/context/notification';

const flags = {
  inactive: false, productionOutsource: false, purchaseOutsource: false, inspection: false, packing: false,
  stockManagement: false, previousStockOut: false, finalProcess: false, plannedEquipment: false,
  actualEquipmentRequired: false,
};
const master = (id: number, name: string, inactive = false) => ({
  id: `p:${id}`, parentId: null, code: String(id), processId: id, name, description: '', image: '', ...flags, inactive,
});

vi.mock('../src/pages/pr/process/services/processManagement.service', () => ({
  fetchProcesses: vi.fn(async () => [
    { id: 'g:1', parentId: null, code: '1', processId: null, name: '가공', description: '', image: '', inactive: false },
    { id: 'm:2', parentId: 'g:1', code: '2', processId: 2, name: '혼합', description: '', image: '', inactive: false },
  ]),
  saveProcesses: vi.fn(async () => []),
  fetchProcessMasters: vi.fn(async () => [master(2, '혼합'), master(3, '포장'), master(4, '폐기', true)]),
  saveProcessMasters: vi.fn(async () => [master(2, '혼합'), master(3, '포장'), master(5, '검사')]),
}));

const full = { read: true, create: true, update: true, delete: true } as never;
function renderPage(permissions: never = full, withSettings = false) {
  const page = (
    <MemoryRouter>
      <ProcessManagementPage selectedModule={{ id: 'pr', name: '생산관리' } as never}
        currentMenuName="공정관리" content={{ description: '' } as never}
        breadcrumbItems={['생산관리', '기준정보', '공정관리']} selectedMenuPermissions={permissions} />
    </MemoryRouter>
  );
  return render(withSettings ? <AppSettingsProvider>{page}</AppSettingsProvider> : page);
}

describe('공정관리', () => {
  beforeEach(() => vi.clearAllMocks());
  it('keeps a 16px outer gutter around the process grid', async () => {
    const { container } = renderPage({ read: true } as never);
    await screen.findByRole('grid');
    const content = container.firstElementChild!.lastElementChild!;
    expect(getComputedStyle(content).paddingTop).toBe('16px');
    expect(getComputedStyle(content).paddingLeft).toBe('16px');
  }, 30000);

  it('aligns the search input with the icon under the application theme', async () => {
    renderPage({ read: true } as never, true);
    await screen.findByText('가공');
    const field = screen.getByRole('textbox', { name: '공정 검색' }).closest('.MuiFormControl-root');
    expect(field).not.toBeNull();
    expect(getComputedStyle(field!).marginTop).toBe('0px');
    expect(getComputedStyle(field!).height).toBe('40px');
  }, 30000);

  it('loads the workplace and its linked process and adds a workplace as a root', async () => {
    renderPage();
    expect(await screen.findByText('가공')).toBeInTheDocument();
    expect(screen.getByText('혼합')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '작업장 / 공정명' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '코드' })).not.toBeInTheDocument();
    const group = document.querySelector('[data-f1-grid-row-id="g:1"]')!;
    const linked = document.querySelector('[data-f1-grid-row-id="m:2"]')!;
    expect(within(group as HTMLElement).queryByRole('img', { name: '공정 이미지 없음' })).not.toBeInTheDocument();
    expect(within(linked as HTMLElement).getByRole('img', { name: '공정 이미지 없음' })).toBeInTheDocument();
    expect(fetchProcesses).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '작업장 추가' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    expect(saveProcesses).not.toHaveBeenCalled();
  }, 30000);

  it('does not let a linked process be edited in the workplace tree', async () => {
    renderPage();
    await screen.findByText('혼합');
    const linked = document.querySelector('[data-f1-grid-row-id="m:2"]')!;
    fireEvent.doubleClick(linked.querySelector('[role="gridcell"]')!);
    expect(within(linked as HTMLElement).queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  }, 30000);

  it('picks only registered, unlinked, active processes and submits the link', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('가공'));
    fireEvent.click(screen.getByRole('button', { name: '공정 추가' }));
    const dialog = await screen.findByRole('dialog', { name: '공정 선택' });
    await within(dialog).findByText('포장');
    expect(within(dialog).queryByText('혼합')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('폐기')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '추가' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: '포장 선택' }));
    fireEvent.click(within(dialog).getByRole('button', { name: '추가' }));
    const link = document.querySelector('[data-f1-grid-row-id^="m:new-"]');
    expect(link).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(saveProcesses).toHaveBeenCalledWith(expect.objectContaining({
      insertedRows: [expect.objectContaining({ parentId: 'g:1', processId: 3, name: '포장' })],
    })));
  }, 30000);

  it('can select an unsaved workplace and open the process picker for it', async () => {
    renderPage();
    await screen.findByText('가공');
    fireEvent.click(screen.getByRole('button', { name: '작업장 추가' }));
    const group = document.querySelector('[data-f1-grid-row-id^="g:new-"]');
    expect(group).not.toBeNull();
    fireEvent.click(group!.querySelector('[role="gridcell"]')!);
    await waitFor(() => expect(screen.getByRole('button', { name: '공정 추가' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '공정 추가' }));
    expect(await screen.findByRole('dialog', { name: '공정 선택' })).toBeInTheDocument();
  }, 30000);

  it('opens the picker from the renamed context menu of a linked process', async () => {
    renderPage();
    fireEvent.contextMenu(await screen.findByRole('gridcell', { name: '혼합' }));
    expect(screen.getByRole('menuitem', { name: '작업장 추가' })).toBeVisible();
    fireEvent.click(screen.getByRole('menuitem', { name: '공정 추가' }));
    const dialog = await screen.findByRole('dialog', { name: '공정 선택' });
    expect(await within(dialog).findByText('포장')).toBeInTheDocument();
    expect(fetchProcessMasters).toHaveBeenCalled();
  }, 30000);

  it('shows a guide when no registered process can be linked', async () => {
    vi.mocked(fetchProcessMasters).mockResolvedValueOnce([master(2, '혼합')]);
    renderPage();
    fireEvent.contextMenu(await screen.findByRole('gridcell', { name: '가공' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '공정 추가' }));
    const dialog = await screen.findByRole('dialog', { name: '공정 선택' });
    expect(await within(dialog).findByText(/추가할 수 있는 공정이 없습니다/)).toBeInTheDocument();
  }, 30000);

  it('centers process checkboxes', async () => {
    renderPage({ read: true, update: true } as never);
    const checkbox = await screen.findByRole('checkbox', { name: '생산외주 m:2' });
    expect(getComputedStyle(checkbox.closest('[role="gridcell"]')!).justifyContent).toBe('center');
  }, 30000);

  it('disables context additions without create permission or while filtering', async () => {
    const { unmount } = renderPage({ read: true } as never);
    fireEvent.contextMenu(await screen.findByRole('gridcell', { name: '가공' }));
    expect(screen.getByRole('menuitem', { name: '작업장 추가' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: '공정 추가' })).toHaveAttribute('aria-disabled', 'true');
    unmount();
    renderPage({ read: true, create: true } as never);
    await screen.findByText('가공');
    const search = screen.getByRole('textbox', { name: '공정 검색' });
    fireEvent.change(search, { target: { value: '가공' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '가공' }));
    expect(screen.getByRole('menuitem', { name: '작업장 추가' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: '공정 추가' })).toHaveAttribute('aria-disabled', 'true');
  }, 30000);

  it('disables process addition when the context menu has no row target', async () => {
    renderPage({ read: true, create: true } as never);
    await screen.findByText('가공');
    fireEvent.contextMenu(screen.getByTestId('f1-grid-body-scroll'));
    expect(screen.getByRole('menuitem', { name: '작업장 추가' })).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: '공정 추가' })).toHaveAttribute('aria-disabled', 'true');
  }, 30000);

  it('hides process settings without any write permission and blocks them while the tree has changes', async () => {
    const { unmount } = renderPage({ read: true } as never);
    await screen.findByText('가공');
    expect(screen.queryByRole('button', { name: '공정 설정' })).not.toBeInTheDocument();
    unmount();
    renderPage();
    await screen.findByText('가공');
    expect(screen.getByRole('button', { name: '공정 설정' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '작업장 추가' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '공정 설정' })).toBeDisabled());
  }, 30000);

  it('registers a process in the settings dialog and reloads the workplace tree', async () => {
    const showSuccess = vi.fn();
    const notices = { showSuccess, showWarning: vi.fn(), showError: vi.fn() };
    render(<NotificationContext.Provider value={notices}><MemoryRouter><ProcessManagementPage selectedModule={{ id: 'pr', name: '생산관리' } as never} currentMenuName="공정관리" content={{ description: '' } as never} breadcrumbItems={[]} selectedMenuPermissions={full} /></MemoryRouter></NotificationContext.Provider>);
    await screen.findByText('가공');
    fireEvent.click(screen.getByRole('button', { name: '공정 설정' }));
    const dialog = await screen.findByRole('dialog', { name: '공정 설정' });
    expect(await within(dialog).findByText('포장')).toBeInTheDocument();
    expect(fetchProcessMasters).toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: '공정 추가' }));
    const row = dialog.querySelector('[data-f1-grid-row-id^="p:new-"]');
    expect(row).not.toBeNull();
    fireEvent.doubleClick(row!.querySelector('[role="gridcell"]')!);
    const input = await within(row as HTMLElement).findByRole('textbox');
    fireEvent.change(input, { target: { value: '검사' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(saveProcessMasters).toHaveBeenCalledWith(expect.objectContaining({
      insertedRows: [expect.objectContaining({ parentId: null, name: '검사' })],
    })));
    await waitFor(() => expect(fetchProcesses).toHaveBeenCalledTimes(2));
    expect(showSuccess).toHaveBeenCalledWith("공정을 저장했습니다.");
  }, 30000);

  it('orders the buttons as settings, add workplace, ..., search, save and shows search only with read permission', async () => {
    const { unmount } = renderPage({ create: true } as never);
    await screen.findByText('가공');
    expect(screen.queryByRole('button', { name: '조회' })).not.toBeInTheDocument();
    unmount();
    renderPage();
    await screen.findByText('가공');
    const labels = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? button.textContent);
    expect(labels.indexOf('공정 설정')).toBeLessThan(labels.indexOf('작업장 추가'));
    expect(labels.indexOf('조회')).toBeGreaterThan(labels.indexOf('공정 추가'));
    expect(labels.indexOf('조회')).toBeLessThan(labels.indexOf('저장'));
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(fetchProcesses).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' })).not.toBeInTheDocument();
  }, 30000);

  it('confirms with the common dialog before a search discards unsaved changes', async () => {
    renderPage();
    await screen.findByText('가공');
    fireEvent.click(screen.getByRole('button', { name: '작업장 추가' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    expect(screen.getByRole('button', { name: '조회' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    const dialog = await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' });
    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' })).not.toBeInTheDocument());
    expect(fetchProcesses).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' })).getByRole('button', { name: '조회' }));
    await waitFor(() => expect(fetchProcesses).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeDisabled());
  }, 30000);
});
