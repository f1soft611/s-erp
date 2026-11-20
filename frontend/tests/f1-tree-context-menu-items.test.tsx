import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { F1Tree } from '../src/shared/components/f1-grid';

type Row = { id: string; parentId: string | null; name: string };

const rows: Row[] = [
  { id: 'root', parentId: null, name: '본사' },
  { id: 'team', parentId: 'root', name: '영업팀' },
];
const columns = [{ field: 'name' as const, headerName: '부서명' }];

function renderTree(
  items?: Array<{
    key: string;
    label: string;
    disabled?: (rowId?: string | number) => boolean;
    onClick: (rowId?: string | number) => void;
  }>,
) {
  return render(
    <F1Tree
      rows={rows}
      columns={columns}
      rowKey="id"
      parentKey="parentId"
      treeColumn="name"
      defaultExpandAll
      ariaLabel="부서 트리"
      rowFormPlugin={{ enabled: false }}
      allowAddRowInContextMenu={false}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
      treeContextMenu={{
        onAddRoot: vi.fn(),
        onAddChild: vi.fn(),
        addRootLabel: '최상위 부서 추가',
        addChildLabel: '하위 부서 추가',
        items,
      }}
    />,
  );
}

describe('F1Tree treeContextMenu.items', () => {
  it('옵션이 없으면 추가 항목을 그리지 않는다', () => {
    renderTree();
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '영업팀' }));
    expect(screen.queryByRole('menuitem', { name: '편집' })).toBeNull();
  });

  it('우클릭한 행의 id를 넘겨 추가 항목을 실행하고 메뉴를 닫는다', () => {
    const onEdit = vi.fn();
    renderTree([
      { key: 'edit', label: '편집', onClick: onEdit },
      { key: 'use', label: '사용안함', disabled: (rowId) => rowId === 'root', onClick: vi.fn() },
    ]);
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '영업팀' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '편집' }));
    expect(onEdit).toHaveBeenCalledWith('team');
    expect(screen.queryByRole('menuitem', { name: '편집' })).toBeNull();

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '본사' }));
    expect(screen.getByRole('menuitem', { name: '사용안함' })).toHaveAttribute('aria-disabled', 'true');
  });
});
