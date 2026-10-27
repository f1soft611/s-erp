import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassificationPickerDialog } from '../src/pages/co/master/classification/components/ClassificationPickerDialog';
import type { Classification } from '../src/pages/co/master/classification/types/classification.types';

const service = vi.hoisted(() => ({ fetchClassifications: vi.fn() }));
vi.mock('../src/pages/co/master/classification/services/classification.service', () => service);
const root: Classification = { id: 1, name: 'Root', level: 1, parentId: null, sortSeq: 0, useAt: 'Y' };
const child: Classification = { ...root, id: 2, name: 'Child', level: 2, parentId: 1 };
const leaf: Classification = { ...root, id: 3, name: 'Leaf', level: 3, parentId: 2 };
const inactive: Classification = { ...root, id: 4, name: 'Inactive', useAt: 'N' };
const blocked: Classification = { ...child, id: 5, name: 'Blocked', parentId: 4 };
const other: Classification = { ...root, id: 6, name: 'Other' };
const otherChild: Classification = { ...child, id: 7, name: 'Other child', parentId: 6 };
beforeEach(() => {
  vi.resetAllMocks();
  service.fetchClassifications.mockResolvedValue([root, child, leaf, inactive, blocked, other, otherChild]);
});
const select = (id: number) => fireEvent.click(within(
  document.querySelector(`[data-f1-grid-row-id="${id}"]`) as HTMLElement,
).getAllByRole('gridcell')[0]);
const confirm = () => screen.getByRole('button', { name: '선택', exact: true });

describe('classification picker', () => {
  it.each([['item', undefined], ['partner', 1], ['partner', 2]] as const)(
    'shows only select then cancel in the %s level %s footer', async (kind, level) => {
      render(<ClassificationPickerDialog open kind={kind} level={level} onClose={vi.fn()} onSelect={vi.fn()} />);
      await screen.findByText('Root', { exact: true });
      const footer = screen.getByTestId('common-dialog-actions');
      expect(within(footer).getAllByRole('button').map((button) => button.textContent))
        .toEqual(['선택', '취소']);
      expect(screen.queryByRole('button', { name: '선택 해제' })).not.toBeInTheDocument();
    },
  );
  it.each([1, 2, 3])('selects item depth %s with its full path', async (id) => {
    const onSelect = vi.fn();
    render(<ClassificationPickerDialog open kind="item" onClose={vi.fn()} onSelect={onSelect} />);
    await screen.findByText('Leaf', { exact: true });
    select(id);
    fireEvent.click(confirm());
    expect(onSelect).toHaveBeenCalledWith({
      row: [root, child, leaf][id - 1],
      path: ['Root', 'Root > Child', 'Root > Child > Leaf'][id - 1],
      parent: id === 1 ? undefined : id === 2 ? root : child,
    });
  });

  it('disallows inactive nodes and inactive ancestors without editing the tree', async () => {
    render(<ClassificationPickerDialog open kind="item" onClose={vi.fn()} onSelect={vi.fn()} />);
    await screen.findByText('Blocked', { exact: true });
    for (const id of [4, 5]) {
      select(id);
      expect(confirm()).toBeDisabled();
    }
    fireEvent.doubleClick(screen.getByText('Root', { exact: true }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '최상위 추가' })).not.toBeInTheDocument();
  });

  it('filters partner selection by level and selected parent', async () => {
    render(<ClassificationPickerDialog open kind="partner" level={2} parentId={1}
      onClose={vi.fn()} onSelect={vi.fn()} />);
    await screen.findByText('Child', { exact: true });
    for (const id of [1, 3, 7]) { select(id); expect(confirm()).toBeDisabled(); }
    select(2);
    expect(confirm()).toBeEnabled();
  });

  it('allows a child without a preselected parent and returns the parent', async () => {
    const onSelect = vi.fn();
    render(<ClassificationPickerDialog open kind="partner" level={2} onClose={vi.fn()} onSelect={onSelect} />);
    await screen.findByText('Child', { exact: true });
    select(2); fireEvent.click(confirm());
    expect(onSelect).toHaveBeenCalledWith({ row: child, path: 'Root > Child', parent: root });
  });

  it('cancels without changing values and retries a failed load', async () => {
    let reject!: (error: Error) => void;
    service.fetchClassifications.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    const onSelect = vi.fn(), onClose = vi.fn();
    render(<ClassificationPickerDialog open kind="item" onClose={onClose} onSelect={onSelect} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    await act(async () => reject(new Error('Load failed')));
    expect(screen.getByRole('alert')).toHaveTextContent('Load failed');
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    await screen.findByText('Root', { exact: true });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
