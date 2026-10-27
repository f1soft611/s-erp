import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassificationSettingsDialog } from '../src/pages/co/master/classification/components/ClassificationSettingsDialog';

const service = vi.hoisted(() => ({
  fetchClassifications: vi.fn(), createClassification: vi.fn(), updateClassification: vi.fn(),
}));
vi.mock('../src/pages/co/master/classification/services/classification.service', () => service);
const root = { id: 1, name: 'Root', level: 1, parentId: null, sortSeq: 0, useAt: 'Y' };
const child = { id: 2, name: 'Child', level: 2, parentId: 1, sortSeq: 2, useAt: 'Y' };
const leaf = { id: 3, name: 'Leaf', level: 3, parentId: 2, sortSeq: 0, useAt: 'Y' };

function show(props = {}) {
  return render(<ClassificationSettingsDialog open kind="item" canCreate canUpdate onClose={vi.fn()} {...props} />);
}
const rowElement = (id: number) => document.querySelector(`[data-f1-grid-row-id="${id}"]`) as HTMLElement;
function edit(id: number, column: number, value: string) {
  fireEvent.doubleClick(within(rowElement(id)).getAllByRole('gridcell')[column]);
  const input = screen.getByRole(column === 1 ? 'spinbutton' : 'textbox');
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
}
const select = (id: number) => fireEvent.click(within(rowElement(id)).getAllByRole('gridcell')[0]);
const save = () => fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
const unloadIsBlocked = () => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};
beforeEach(() => {
  vi.resetAllMocks();
  service.fetchClassifications.mockResolvedValue([leaf, child, root]);
  service.updateClassification.mockImplementation(async (_kind, id, payload) => ({
    ...[root, child, leaf].find((row) => row.id === id), ...payload,
  }));
});

describe('classification F1Tree settings', () => {
  it.each(['item', 'partner'] as const)('enables %s saving only for modified or added rows', async (kind) => {
    show({ kind });
    await screen.findByText('Root', { exact: true });
    const button = screen.getByRole('button', { name: '저장', exact: true });
    expect(button).toBeDisabled();
    select(2);
    expect(button).toBeDisabled();
    edit(1, 0, 'Changed');
    expect(button).toBeEnabled();
    edit(1, 0, 'Root');
    expect(button).toBeDisabled();
    fireEvent.doubleClick(within(rowElement(1)).getAllByRole('gridcell')[0]);
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Draft name' } });
    expect(button).toBeEnabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Root' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '최상위 추가' }));
    expect(button).toBeEnabled();
  });
  it.each([['item', 3], ['partner', 2]] as const)(
    'places the %s guidance in the common dialog header and closes via X', async (kind, depth) => {
      const onClose = vi.fn();
      show({ kind, onClose });
      await screen.findByText('Root', { exact: true });
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAccessibleDescription(
        `최대 ${depth}단계 · 셀을 더블클릭하여 편집한 뒤 저장하세요. 삭제 대신 사용여부를 해제하세요.`,
      );
      const close = screen.getAllByRole('button', { name: '닫기', exact: true })[0];
      expect(within(close).getByTestId('CloseIcon')).toBeInTheDocument();
      fireEvent.click(close);
      expect(onClose).toHaveBeenCalledOnce();
    },
  );
  it('renders an editable expandable tree instead of a separate detail form', async () => {
    show();
    await screen.findByText('Root', { exact: true });
    expect(screen.getByRole('grid', { name: '분류 트리' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '분류명' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Root 접기' }));
    expect(screen.queryByText('Child', { exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Root 펼치기' }));
    expect(screen.getByText('Leaf', { exact: true })).toBeInTheDocument();
    edit(1, 0, 'Renamed');
    expect(screen.getByText('Renamed', { exact: true })).toBeInTheDocument();
  });

  it('shows loading and retries a failed fetch', async () => {
    let reject!: (error: Error) => void;
    service.fetchClassifications.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    show();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await act(async () => reject(new Error('Load failed')));
    expect(screen.getByRole('alert')).toHaveTextContent('Load failed');
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    await screen.findByText('Root', { exact: true });
    const displayed = screen.getAllByRole('row').map((row) => row.getAttribute('data-f1-grid-row-id'));
    expect(displayed.indexOf('1')).toBeLessThan(displayed.indexOf('2'));
    expect(displayed.indexOf('2')).toBeLessThan(displayed.indexOf('3'));
  });

  it('saves several edited rows without discarding changes on selection', async () => {
    show();
    await screen.findByText('Root', { exact: true });
    edit(1, 0, ' Renamed ');
    select(2);
    edit(2, 1, '7');
    save();
    await waitFor(() => expect(service.updateClassification).toHaveBeenCalledTimes(2));
    expect(service.updateClassification).toHaveBeenCalledWith('item', 1, {
      name: 'Renamed', sortSeq: 0, useAt: 'Y',
    });
    expect(service.updateClassification).toHaveBeenCalledWith('item', 2, {
      name: 'Child', sortSeq: 7, useAt: 'Y',
    });
    await waitFor(() => expect(service.fetchClassifications).toHaveBeenCalledTimes(2));
  });

  it('creates an unsaved parent before its child using the generated parent id', async () => {
    service.createClassification
      .mockResolvedValueOnce({ ...root, id: 11, name: 'New root' })
      .mockResolvedValueOnce({ ...child, id: 12, parentId: 11, name: 'New child' });
    show();
    await screen.findByText('Root', { exact: true });
    fireEvent.click(screen.getByRole('button', { name: '최상위 추가' }));
    edit(-1, 0, 'New root');
    select(-1);
    fireEvent.click(screen.getByRole('button', { name: '하위 추가' }));
    edit(-2, 0, 'New child');
    save();
    await waitFor(() => expect(service.createClassification).toHaveBeenCalledTimes(2));
    expect(service.createClassification).toHaveBeenNthCalledWith(1, 'item', {
      name: 'New root', parentId: null, sortSeq: 0, useAt: 'Y',
    });
    expect(service.createClassification).toHaveBeenNthCalledWith(2, 'item', {
      name: 'New child', parentId: 11, sortSeq: 0, useAt: 'Y',
    });
  });

  it('keeps unsaved children after partial failure and does not recreate a saved parent', async () => {
    service.createClassification
      .mockResolvedValueOnce({ ...root, id: 11, name: 'New root' })
      .mockRejectedValueOnce(new Error('Child save failed'))
      .mockResolvedValueOnce({ ...child, id: 12, parentId: 11, name: 'New child' });
    show();
    await screen.findByText('Root', { exact: true });
    fireEvent.click(screen.getByRole('button', { name: '최상위 추가' }));
    edit(-1, 0, 'New root');
    select(-1);
    fireEvent.click(screen.getByRole('button', { name: '하위 추가' }));
    edit(-2, 0, 'New child');
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Child save failed');
    expect(screen.getByText('New child', { exact: true })).toBeInTheDocument();
    expect(unloadIsBlocked()).toBe(true);
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    save();
    await waitFor(() => expect(service.createClassification).toHaveBeenCalledTimes(3));
    expect(service.createClassification).toHaveBeenLastCalledWith('item', {
      name: 'New child', parentId: 11, sortSeq: 0, useAt: 'Y',
    });
    expect(service.fetchClassifications).toHaveBeenCalledTimes(2);
  });

  it('validates every changed row before sending any request', async () => {
    show();
    await screen.findByText('Root', { exact: true });
    edit(1, 0, 'Renamed');
    fireEvent.click(screen.getByRole('button', { name: '최상위 추가' }));
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('분류명');
    expect(service.updateClassification).not.toHaveBeenCalled();
    edit(-1, 0, 'Valid');
    edit(-1, 1, '1.5');
    save();
    expect(screen.getByRole('alert')).toHaveTextContent('정렬순서');
    expect(service.createClassification).not.toHaveBeenCalled();
  });

  it('keeps creation and update permissions independent and prevents context menu bypass', async () => {
    const view = show({ canUpdate: false });
    await screen.findByText('Root', { exact: true });
    fireEvent.doubleClick(within(rowElement(1)).getAllByRole('gridcell')[0]);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '최상위 추가' }));
    edit(-1, 0, 'Allowed');
    fireEvent.contextMenu(within(rowElement(1)).getAllByRole('gridcell')[0]);
    expect(screen.queryByRole('menuitem', { name: '행 추가' })).not.toBeInTheDocument();
    const rootCell = within(rowElement(1)).getAllByRole('gridcell')[0];
    fireEvent.click(rootCell);
    fireEvent.keyDown(rootCell, { key: 'Delete' });
    expect(screen.getByText('Root', { exact: true })).toBeInTheDocument();
    fireEvent.keyDown(rootCell, { key: 'd', ctrlKey: true });
    expect(screen.getAllByText('Root', { exact: true })).toHaveLength(1);
    view.unmount();
    show({ canCreate: false });
    await screen.findByText('Root', { exact: true });
    expect(screen.queryByRole('button', { name: '최상위 추가' })).not.toBeInTheDocument();
    edit(1, 0, 'Allowed update');
    expect(screen.getByText('Allowed update', { exact: true })).toBeInTheDocument();
  });

  it.each([['item', 3], ['partner', 2]] as const)(
    'limits %s depth and prevents child insertion under inactive nodes', async (kind, maxLevel) => {
      service.fetchClassifications.mockResolvedValue([
        root, child, ...(kind === 'item' ? [leaf] : []),
        { ...root, id: 4, name: 'Inactive', useAt: 'N' },
      ]);
      show({ kind });
      await screen.findByText('Root', { exact: true });
      select(maxLevel);
      expect(screen.getByRole('button', { name: '하위 추가' })).toBeDisabled();
      select(4);
      expect(screen.getByRole('button', { name: '하위 추가' })).toBeDisabled();
    },
  );

  it('deactivates children before parents and blocks an active child under an inactive parent', async () => {
    show();
    await screen.findByText('Root', { exact: true });
    fireEvent.click(screen.getByRole('checkbox', { name: '사용여부 1' }));
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('상위 분류');
    expect(service.updateClassification).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: '사용여부 2' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '사용여부 3' }));
    save();
    await waitFor(() => expect(service.updateClassification).toHaveBeenCalledTimes(3));
    expect(service.updateClassification.mock.calls.map((call) => call[1])).toEqual([3, 2, 1]);
  });

  it('protects dirty changes until saved, reverted or explicitly discarded on close', async () => {
    const onClose = vi.fn();
    const view = show({ onClose });
    await screen.findByText('Root', { exact: true });
    expect(unloadIsBlocked()).toBe(false);
    edit(1, 0, 'Unsaved');
    expect(unloadIsBlocked()).toBe(true);
    edit(1, 0, 'Root');
    expect(unloadIsBlocked()).toBe(false);
    edit(1, 0, 'Unsaved again');
    fireEvent.click(screen.getAllByRole('button', { name: '닫기', exact: true })[0]);
    const confirm = await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' });
    fireEvent.click(within(confirm).getByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' })).not.toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: '닫기', exact: true })[0]);
    fireEvent.click(screen.getByRole('button', { name: '계속' }));
    expect(onClose).toHaveBeenCalledOnce();
    view.rerender(<ClassificationSettingsDialog open={false} kind="item" canCreate canUpdate onClose={onClose} />);
    expect(unloadIsBlocked()).toBe(false);
  });

  it('does not resubmit a create when only the post-save reload fails', async () => {
    service.createClassification.mockResolvedValue({ ...root, id: 11, name: 'Added' });
    show();
    await screen.findByText('Root', { exact: true });
    fireEvent.click(screen.getByRole('button', { name: '최상위 추가' }));
    edit(-1, 0, 'Added');
    service.fetchClassifications.mockRejectedValueOnce(new Error('Reload failed'));
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Reload failed');
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    service.fetchClassifications.mockResolvedValue([root, { ...root, id: 11, name: 'Added' }]);
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    await screen.findByText('Root', { exact: true });
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    save();
    expect(service.createClassification).toHaveBeenCalledOnce();
  });

  it('protects an uncommitted cell draft and commits it when Save is clicked', async () => {
    show();
    await screen.findByText('Root', { exact: true });
    fireEvent.doubleClick(within(rowElement(1)).getAllByRole('gridcell')[0]);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Draft name' } });
    expect(unloadIsBlocked()).toBe(true);
    const button = screen.getByRole('button', { name: '저장', exact: true });
    fireEvent.pointerDown(button);
    expect(button).toBeEnabled();
    fireEvent.mouseDown(button);
    save();
    await waitFor(() => expect(service.updateClassification).toHaveBeenCalledWith('item', 1, {
      name: 'Draft name', sortSeq: 0, useAt: 'Y',
    }));
  });

  it('ignores the header close X while a save is in flight', async () => {
    let resolve!: (row: typeof root) => void;
    service.updateClassification.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const onClose = vi.fn();
    show({ onClose });
    await screen.findByText('Root', { exact: true });
    edit(1, 0, 'Saving');
    save();
    await waitFor(() => expect(screen.getByRole('progressbar', { name: '분류 저장 중' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /저장/ })).toBeDisabled();
    fireEvent.click(screen.getAllByRole('button', { name: '닫기', exact: true })[0]);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' })).not.toBeInTheDocument();
    await act(async () => resolve({ ...root, name: 'Saving' }));
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  });

  it.each(['item', 'partner'] as const)('uses only button loading during %s save and post-save reload', async (kind) => {
    let finishSave!: (row: typeof root) => void;
    let finishReload!: (rows: (typeof root | typeof child)[]) => void;
    service.updateClassification.mockReturnValueOnce(new Promise((done) => { finishSave = done; }));
    show({ kind });
    await screen.findByText('Root', { exact: true });
    service.fetchClassifications.mockReturnValueOnce(new Promise((done) => { finishReload = done; }));
    edit(1, 0, 'Quiet save');
    save();
    const tree = screen.getByRole('grid', { name: '분류 트리' });
    expect(within(tree).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '분류 저장 중' })).toBeInTheDocument();
    expect(screen.getByText('Quiet save', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '최상위 추가' })).toBeDisabled();
    fireEvent.doubleClick(within(rowElement(1)).getAllByRole('gridcell')[0]);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await act(async () => finishSave({ ...root, name: 'Quiet save' }));
    await waitFor(() => expect(service.fetchClassifications).toHaveBeenCalledTimes(2));
    expect(within(screen.getByRole('grid', { name: '분류 트리' })).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '분류 저장 중' })).toBeInTheDocument();
    expect(screen.getByText('Quiet save', { exact: true })).toBeInTheDocument();
    await act(async () => finishReload([{ ...root, name: 'Quiet save' }, child]));
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  });
});
