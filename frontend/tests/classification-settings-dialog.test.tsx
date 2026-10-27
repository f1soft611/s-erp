import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
beforeEach(() => {
  vi.resetAllMocks();
  service.fetchClassifications.mockResolvedValue([leaf, child, root]);
});

describe('classification settings dialog', () => {
  it('shows loading and retry after fetch failure, then orders parents before children', async () => {
    let reject!: (error: Error) => void;
    service.fetchClassifications.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    show();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await act(async () => reject(new Error('Load failed')));
    expect(screen.getByRole('alert')).toHaveTextContent('Load failed');
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    await screen.findByRole('button', { name: 'Root' });
    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(names.indexOf('Root')).toBeLessThan(names.indexOf('Child'));
    expect(names.indexOf('Child')).toBeLessThan(names.indexOf('Leaf'));
  });

  it('creates root and child classifications, reloads and selects the saved node', async () => {
    const added = { ...root, id: 4, name: 'Added' };
    service.createClassification.mockResolvedValue(added);
    show();
    await screen.findByRole('button', { name: 'Root' });
    fireEvent.click(screen.getByRole('button', { name: '최상위 추가' }));
    fireEvent.change(screen.getByRole('textbox', { name: '분류명' }), { target: { value: ' Added ' } });
    service.fetchClassifications.mockResolvedValue([root, added]);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(service.createClassification).toHaveBeenCalledWith('item', {
      name: 'Added', parentId: null, sortSeq: 0, useAt: 'Y',
    }));
    await screen.findByRole('button', { name: 'Added' });
    await waitFor(() => expect(screen.getByRole('textbox', { name: '분류명' })).toHaveValue('Added'));
    fireEvent.click(screen.getByRole('button', { name: 'Root' }));
    fireEvent.click(screen.getByRole('button', { name: '하위 추가' }));
    fireEvent.change(screen.getByRole('textbox', { name: '분류명' }), { target: { value: 'Sub' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(service.createClassification).toHaveBeenLastCalledWith('item', {
      name: 'Sub', parentId: 1, sortSeq: 0, useAt: 'Y',
    }));
  });

  it('updates only mutable fields and preserves edits when save fails', async () => {
    service.updateClassification.mockRejectedValueOnce(new Error('Active children'));
    show();
    await screen.findByRole('button', { name: 'Root' });
    fireEvent.change(screen.getByRole('textbox', { name: '분류명' }), { target: { value: 'Renamed' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: '정렬순서' }), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '사용' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(service.updateClassification).toHaveBeenCalledWith('item', 1, {
      name: 'Renamed', sortSeq: 7, useAt: 'N',
    }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Active children');
    expect(screen.getByRole('textbox', { name: '분류명' })).toHaveValue('Renamed');
  });

  it('validates names and whole nonnegative sort orders before sending', async () => {
    show();
    await screen.findByRole('button', { name: 'Root' });
    fireEvent.click(screen.getByRole('button', { name: '최상위 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('분류명');
    fireEvent.change(screen.getByRole('textbox', { name: '분류명' }), { target: { value: 'Valid' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: '정렬순서' }), { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByRole('alert')).toHaveTextContent('정렬순서');
    expect(service.createClassification).not.toHaveBeenCalled();
  });

  it('keeps create and update permissions independent and respects item maximum depth', async () => {
    const view = show({ canUpdate: false });
    await screen.findByRole('button', { name: 'Root' });
    expect(screen.getByRole('textbox', { name: '분류명' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Leaf' }));
    expect(screen.getByRole('button', { name: '하위 추가' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '최상위 추가' }));
    expect(screen.getByRole('textbox', { name: '분류명' })).toBeEnabled();
    view.unmount();
    show({ canCreate: false });
    await screen.findByRole('button', { name: 'Root' });
    expect(screen.queryByRole('button', { name: '최상위 추가' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '분류명' })).toBeEnabled();
  });

  it('limits partner depth to two and blocks adding below inactive nodes', async () => {
    service.fetchClassifications.mockResolvedValue([root, child, { ...root, id: 4, name: 'Inactive', useAt: 'N' }]);
    show({ kind: 'partner' });
    expect(screen.getByRole('dialog')).toHaveAccessibleName('거래처분류설정');
    await screen.findByRole('button', { name: 'Child' });
    fireEvent.click(screen.getByRole('button', { name: 'Child' }));
    expect(screen.getByRole('button', { name: '하위 추가' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Inactive' }));
    expect(screen.getByRole('button', { name: '하위 추가' })).toBeDisabled();
  });

  it('confirms discarding dirty edits before selecting, adding or closing', async () => {
    const onClose = vi.fn();
    show({ onClose });
    await screen.findByRole('button', { name: 'Root' });
    fireEvent.change(screen.getByRole('textbox', { name: '분류명' }), { target: { value: 'Unsaved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Child' }));
    expect(await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(await screen.findByRole('textbox', { name: '분류명' })).toHaveValue('Unsaved');
    fireEvent.click(screen.getByRole('button', { name: '최상위 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '계속' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: '분류명' })).toHaveValue(''));
    fireEvent.change(screen.getByRole('textbox', { name: '분류명' }), { target: { value: 'New unsaved' } });
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '계속' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not resubmit a create after save succeeds but reload fails', async () => {
    service.createClassification.mockResolvedValue({ ...root, id: 4, name: 'Added' });
    show();
    await screen.findByRole('button', { name: 'Root' });
    fireEvent.click(screen.getByRole('button', { name: '최상위 추가' }));
    fireEvent.change(screen.getByRole('textbox', { name: '분류명' }), { target: { value: 'Added' } });
    service.fetchClassifications.mockRejectedValueOnce(new Error('Reload failed'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reload failed');
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    service.fetchClassifications.mockResolvedValue([root, { ...root, id: 4, name: 'Added' }]);
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    await screen.findByRole('button', { name: 'Added' });
    expect(screen.getByRole('textbox', { name: '분류명' })).toHaveValue('Added');
    expect(service.createClassification).toHaveBeenCalledOnce();
  });
});
