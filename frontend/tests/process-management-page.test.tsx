import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessManagementPage } from '../src/pages/pr/process/ProcessManagementPage';
import { fetchProcesses, saveProcesses } from '../src/pages/pr/process/services/processManagement.service';
import { AppSettingsProvider } from '../src/shared/context/AppSettingsContext';

vi.mock('../src/pages/pr/process/services/processManagement.service', () => ({
  fetchProcesses: vi.fn(async () => [
    { id: 'g:1', parentId: null, code: '1', name: '가공', description: '', image: '', inactive: false },
    { id: 'p:2', parentId: 'g:1', code: '2', name: '혼합', description: '', image: '', inactive: false },
  ]),
  saveProcesses: vi.fn(async () => []),
}));

describe('공정관리', () => {
  beforeEach(() => vi.clearAllMocks());
  it('aligns the search input with the icon under the application theme', async () => {
    render(
      <AppSettingsProvider>
        <MemoryRouter>
          <ProcessManagementPage selectedModule={{ id: 'pr', name: '생산관리' } as never}
            currentMenuName="공정관리" content={{ description: '' } as never}
            breadcrumbItems={[]} selectedMenuPermissions={{ read: true } as never} />
        </MemoryRouter>
      </AppSettingsProvider>,
    );
    await screen.findByText('가공');
    const field = screen.getByRole('textbox', { name: '공정 검색' }).closest('.MuiFormControl-root');
    expect(field).not.toBeNull();
    expect(getComputedStyle(field!).marginTop).toBe('0px');
    expect(getComputedStyle(field!).height).toBe('40px');
  }, 30000);

  it('loads the group and process and adds a group as a root', async () => {
    render(
      <MemoryRouter>
        <ProcessManagementPage
          selectedModule={{ id: 'pr', name: '생산관리' } as never}
          currentMenuName="공정관리"
          content={{ description: '' } as never}
          breadcrumbItems={['생산관리', '기준정보', '공정관리']}
          selectedMenuPermissions={{ read: true, create: true, update: true, delete: true } as never}
        />
      </MemoryRouter>,
    );
    expect(await screen.findByText('가공')).toBeInTheDocument();
    expect(screen.getByText('혼합')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '코드' })).not.toBeInTheDocument();
    const group = document.querySelector('[data-f1-grid-row-id="g:1"]')!;
    const process = document.querySelector('[data-f1-grid-row-id="p:2"]')!;
    expect(within(group as HTMLElement).queryByRole('img', { name: '공정 이미지 없음' })).not.toBeInTheDocument();
    expect(within(process as HTMLElement).getByRole('img', { name: '공정 이미지 없음' })).toBeInTheDocument();
    expect(fetchProcesses).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '공정그룹 추가' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    expect(saveProcesses).not.toHaveBeenCalled();
  }, 30000);

  it('adds a process beneath the selected group and submits its parent', async () => {
    render(
      <MemoryRouter>
        <ProcessManagementPage
          selectedModule={{ id: 'pr', name: '생산관리' } as never}
          currentMenuName="공정관리"
          content={{ description: '' } as never}
          breadcrumbItems={['생산관리', '기준정보', '공정관리']}
          selectedMenuPermissions={{ read: true, create: true, update: true, delete: true } as never}
        />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByText('가공'));
    fireEvent.click(screen.getByRole('button', { name: '공정 추가' }));
    const newRow = document.querySelector('[data-f1-grid-row-id^="p:new-"]');
    expect(newRow).not.toBeNull();
    fireEvent.doubleClick(newRow!.querySelector('[role="gridcell"]')!);
    const input = await within(newRow as HTMLElement).findByRole('textbox');
    fireEvent.change(input, { target: { value: '포장' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(saveProcesses).toHaveBeenCalledWith(expect.objectContaining({
      insertedRows: [expect.objectContaining({ parentId: 'g:1', name: '포장' })],
    })));
  }, 30000);

  it('can select an unsaved group and add a child process', async () => {
    render(
      <MemoryRouter>
        <ProcessManagementPage selectedModule={{ id: 'pr', name: '생산관리' } as never}
          currentMenuName="공정관리" content={{ description: '' } as never}
          breadcrumbItems={[]} selectedMenuPermissions={{ read: true, create: true, update: true, delete: true } as never} />
      </MemoryRouter>,
    );
    await screen.findByText('가공');
    fireEvent.click(screen.getByRole('button', { name: '공정그룹 추가' }));
    const group = document.querySelector('[data-f1-grid-row-id^="g:new-"]');
    expect(group).not.toBeNull();
    fireEvent.click(group!.querySelector('[role="gridcell"]')!);
    await waitFor(() => expect(screen.getByRole('button', { name: '공정 추가' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '공정 추가' }));
    expect(document.querySelector('[data-f1-grid-row-id^="p:new-"]')).not.toBeNull();
  }, 30000);

  it('adds groups and processes from the renamed context menu', async () => {
    render(
      <MemoryRouter>
        <ProcessManagementPage selectedModule={{ id: 'pr', name: '생산관리' } as never}
          currentMenuName="공정관리" content={{ description: '' } as never}
          breadcrumbItems={[]} selectedMenuPermissions={{ read: true, create: true, update: true, delete: true } as never} />
      </MemoryRouter>,
    );
    fireEvent.contextMenu(await screen.findByRole('gridcell', { name: '혼합' }));
    expect(screen.getByRole('menuitem', { name: '공정그룹 추가' })).toBeVisible();
    fireEvent.click(screen.getByRole('menuitem', { name: '공정 추가' }));
    const child = document.querySelector('[data-f1-grid-row-id^="p:new-"]');
    expect(child).not.toBeNull();
    fireEvent.doubleClick(child!.querySelector('[role="gridcell"]')!);
    const input = await within(child as HTMLElement).findByRole('textbox');
    fireEvent.change(input, { target: { value: '포장' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(saveProcesses).toHaveBeenCalledWith(expect.objectContaining({
      insertedRows: [expect.objectContaining({ parentId: 'g:1', name: '포장' })],
    })));
  }, 30000);

  it('centers process checkboxes', async () => {
    render(
      <MemoryRouter>
        <ProcessManagementPage selectedModule={{ id: 'pr', name: '생산관리' } as never}
          currentMenuName="공정관리" content={{ description: '' } as never}
          breadcrumbItems={[]} selectedMenuPermissions={{ read: true, update: true } as never} />
      </MemoryRouter>,
    );
    const checkbox = await screen.findByRole('checkbox', { name: '생산외주 p:2' });
    expect(getComputedStyle(checkbox.closest('[role="gridcell"]')!).justifyContent).toBe('center');
  }, 30000);

  it('adds a process beneath a right-clicked group', async () => {
    render(
      <MemoryRouter>
        <ProcessManagementPage selectedModule={{ id: 'pr', name: '생산관리' } as never}
          currentMenuName="공정관리" content={{ description: '' } as never}
          breadcrumbItems={[]} selectedMenuPermissions={{ read: true, create: true } as never} />
      </MemoryRouter>,
    );
    fireEvent.contextMenu(await screen.findByRole('gridcell', { name: '가공' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '공정 추가' }));
    const child = document.querySelector('[data-f1-grid-row-id^="p:new-"]');
    expect(child).not.toBeNull();
    fireEvent.doubleClick(child!.querySelector('[role="gridcell"]')!);
    const input = await within(child as HTMLElement).findByRole('textbox');
    fireEvent.change(input, { target: { value: '포장' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(saveProcesses).toHaveBeenCalledWith(expect.objectContaining({
      insertedRows: [expect.objectContaining({ parentId: 'g:1' })],
    })));
  }, 30000);

  it('disables context additions without create permission or while filtering', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <ProcessManagementPage selectedModule={{ id: 'pr', name: '생산관리' } as never}
          currentMenuName="공정관리" content={{ description: '' } as never}
          breadcrumbItems={[]} selectedMenuPermissions={{ read: true } as never} />
      </MemoryRouter>,
    );
    fireEvent.contextMenu(await screen.findByRole('gridcell', { name: '가공' }));
    expect(screen.getByRole('menuitem', { name: '공정그룹 추가' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: '공정 추가' })).toHaveAttribute('aria-disabled', 'true');
    unmount();
    render(
      <MemoryRouter>
        <ProcessManagementPage selectedModule={{ id: 'pr', name: '생산관리' } as never}
          currentMenuName="공정관리" content={{ description: '' } as never}
          breadcrumbItems={[]} selectedMenuPermissions={{ read: true, create: true } as never} />
      </MemoryRouter>,
    );
    await screen.findByText('가공');
    const search = screen.getByRole('textbox', { name: '공정 검색' });
    fireEvent.change(search, { target: { value: '가공' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '가공' }));
    expect(screen.getByRole('menuitem', { name: '공정그룹 추가' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: '공정 추가' })).toHaveAttribute('aria-disabled', 'true');
  }, 30000);

  it('disables process addition when the context menu has no row target', async () => {
    render(
      <MemoryRouter>
        <ProcessManagementPage selectedModule={{ id: 'pr', name: '생산관리' } as never}
          currentMenuName="공정관리" content={{ description: '' } as never}
          breadcrumbItems={[]} selectedMenuPermissions={{ read: true, create: true } as never} />
      </MemoryRouter>,
    );
    await screen.findByText('가공');
    fireEvent.contextMenu(screen.getByTestId('f1-grid-body-scroll'));
    expect(screen.getByRole('menuitem', { name: '공정그룹 추가' })).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: '공정 추가' })).toHaveAttribute('aria-disabled', 'true');
  }, 30000);
});
