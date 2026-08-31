import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { F1Tree, type F1TreeRef } from '../src/shared/components/f1-grid';
import { projectTreeRows } from '../src/shared/components/f1-grid/tree/TreeProjection';

type TreeRow = {
  id: string;
  parentId: string | null;
  order: number;
  name: string;
  hasChildren: boolean;
  allowed: boolean;
  moduleId?: number;
  moduleName?: string;
  parentName?: string;
};

describe('F1Tree projection', () => {
  it('orders siblings, exposes expanded descendants, and retains depth metadata', () => {
    const projection = projectTreeRows(
      [
        { id: 'child-b', parentId: 'root', order: 2, name: 'B' },
        { id: 'root', parentId: null, order: 1, name: 'Root' },
        { id: 'child-a', parentId: 'root', order: 1, name: 'A' },
      ],
      { rowKey: 'id', parentKey: 'parentId', getRowOrder: (row) => row.order },
      new Set(['root']),
    );

    expect(projection.rows.map((row) => row.id)).toEqual([
      'root',
      'child-a',
      'child-b',
    ]);
    expect(projection.metaById.root).toMatchObject({
      depth: 0,
      hasChildren: true,
    });
    expect(projection.metaById['child-a']).toMatchObject({
      depth: 1,
      hasChildren: false,
    });
  });

  it('renders malformed parent links once at root level without recursion', () => {
    const projection = projectTreeRows(
      [
        { id: 'self', parentId: 'self', order: 1, name: 'Self' },
        { id: 'left', parentId: 'right', order: 2, name: 'Left' },
        { id: 'right', parentId: 'left', order: 1, name: 'Right' },
      ],
      { rowKey: 'id', parentKey: 'parentId', getRowOrder: (row) => row.order },
      new Set(['self', 'left', 'right']),
    );

    expect(projection.rows.map((row) => row.id)).toEqual([
      'self',
      'right',
      'left',
    ]);
  });
});

describe('F1Tree interaction', () => {
  const rows: TreeRow[] = [
    {
      id: 'root',
      parentId: null,
      order: 1,
      name: 'Root',
      hasChildren: false,
      allowed: false,
    },
    {
      id: 'child',
      parentId: 'root',
      order: 1,
      name: 'Child',
      hasChildren: false,
      allowed: false,
    },
  ];

  const columns = [
    { field: 'name' as const, headerName: '메뉴명', editable: true },
  ];

  it('toggles descendants and expands a parent before adding a child', () => {
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 테스트"
        defaultExpanded="root"
        createRow={() => ({
          id: 'new',
          parentId: null,
          order: 0,
          name: '새 메뉴',
          hasChildren: false,
          allowed: false,
        })}
      />,
    );

    expect(screen.getByRole('gridcell', { name: 'Child' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Root 접기' }));
    expect(
      screen.queryByRole('gridcell', { name: 'Child' }),
    ).not.toBeInTheDocument();

    act(() => {
      ref.current?.addChildRow('root');
    });
    expect(screen.getByRole('gridcell', { name: '새 메뉴' })).toBeVisible();
  });

  it('keeps the projected parent-child order and hides sort and filter controls', () => {
    render(
      <F1Tree
        rows={[
          { ...rows[0], name: 'Zulu' },
          { ...rows[1], name: 'Alpha' },
        ]}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 계층 보존 테스트"
        defaultExpanded="all"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '메뉴명 컬럼 메뉴' }));
    expect(
      screen.queryByRole('menuitem', { name: '오름차순 정렬' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: '필터' }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(
      screen.getAllByRole('gridcell').map((cell) => cell.textContent),
    ).toEqual(['Zulu', 'Alpha']);
  });

  it('merges supplied child values while enforcing the parent ID', () => {
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 자식 값 테스트"
        defaultExpanded="all"
        createRow={() => ({
          id: 'new-child',
          parentId: null,
          order: 0,
          name: '새 메뉴',
          hasChildren: false,
          allowed: false,
        })}
      />,
    );

    act(() => {
      ref.current?.addChildRow('root', {
        moduleId: 2,
        moduleName: '환경설정',
        parentName: 'Root',
        parentId: 'incorrect-parent',
      });
    });

    expect(ref.current?.getRows()).toContainEqual(
      expect.objectContaining({
        parentId: 'root',
        moduleId: 2,
        moduleName: '환경설정',
        parentName: 'Root',
      }),
    );
  });

  it('does not delete a selected node that has descendants', () => {
    const onDeleteBlocked = vi.fn();
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 삭제 테스트"
        defaultExpanded="all"
        onDeleteBlocked={onDeleteBlocked}
      />,
    );

    fireEvent.click(screen.getByLabelText('root 행 선택'));
    act(() => {
      ref.current?.deleteSelectedRows();
    });

    expect(onDeleteBlocked).toHaveBeenCalledWith(['root']);
    expect(screen.getByText('Root')).toBeVisible();
  });

  it('uses a newly added child to disable parent edits and block parent deletion', () => {
    const onDeleteBlocked = vi.fn();
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={[rows[0]]}
        columns={[
          { field: 'name', headerName: '메뉴명', editable: true },
          {
            field: 'allowed',
            headerName: '허용',
            type: 'checkbox',
            editable: (row) => !row.hasChildren,
          },
        ]}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 동적 자식 테스트"
        createRow={() => ({
          id: 'new-child',
          parentId: null,
          order: 0,
          name: 'New child',
          hasChildren: false,
          allowed: false,
        })}
        onDeleteBlocked={onDeleteBlocked}
      />,
    );

    fireEvent.click(screen.getByLabelText('root 행 선택'));
    act(() => {
      ref.current?.addChildRow('root');
    });

    expect(screen.getByLabelText('허용 root')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('root 행 선택'));
    act(() => {
      ref.current?.deleteSelectedRows();
    });
    expect(onDeleteBlocked).toHaveBeenCalledWith(['root']);
  });
});
