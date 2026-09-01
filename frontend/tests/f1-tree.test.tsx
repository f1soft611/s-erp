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

  it('expands every parent on first render when defaultExpandAll is enabled', () => {
    render(
      <F1Tree
        rows={[
          ...rows,
          {
            id: 'grandchild',
            parentId: 'child',
            order: 1,
            name: 'Grand child',
            hasChildren: false,
            allowed: false,
          },
        ]}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 초기 전체 펼침 테스트"
        defaultExpanded="root"
        defaultExpandAll
      />,
    );

    expect(screen.getByRole('gridcell', { name: 'Child' })).toBeVisible();
    expect(screen.getByRole('gridcell', { name: 'Grand child' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Root 접기' })).toBeVisible();
  });

  it('expands every parent when rows load after the first render', () => {
    const { rerender } = render(
      <F1Tree
        rows={[]}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 지연 로드 전체 펼침 테스트"
        defaultExpandAll
      />,
    );

    rerender(
      <F1Tree
        rows={[
          ...rows,
          {
            id: 'grandchild',
            parentId: 'child',
            order: 1,
            name: 'Grand child',
            hasChildren: false,
            allowed: false,
          },
        ]}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 지연 로드 전체 펼침 테스트"
        defaultExpandAll
      />,
    );

    expect(screen.getByRole('gridcell', { name: 'Child' })).toBeVisible();
    expect(screen.getByRole('gridcell', { name: 'Grand child' })).toBeVisible();
  });

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

  it('supports optional tree checkbox selection with parent-child cascade', () => {
    render(
      <F1Tree
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 트리 체크박스 테스트"
        defaultExpanded="all"
        treeCheckbox
      />,
    );

    const rootTreeCheckbox = screen.getByRole('checkbox', {
      name: 'Root 트리 선택',
    });
    const childTreeCheckbox = screen.getByRole('checkbox', {
      name: 'Child 트리 선택',
    });

    expect(rootTreeCheckbox).toBeInTheDocument();
    expect(childTreeCheckbox).toBeInTheDocument();

    fireEvent.click(rootTreeCheckbox);
    expect(rootTreeCheckbox).toBeChecked();
    expect(childTreeCheckbox).toBeChecked();

    fireEvent.click(childTreeCheckbox);
    expect(rootTreeCheckbox).not.toBeChecked();
    expect(childTreeCheckbox).not.toBeChecked();
  });

  it('syncs checkbox-type data columns when treeCheckbox is toggled', () => {
    const columnsWithCheckbox = [
      ...columns,
      {
        field: 'allowed' as const,
        headerName: '허용',
        type: 'checkbox' as const,
      },
    ];
    render(
      <F1Tree
        rows={rows}
        columns={columnsWithCheckbox}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 체크박스 컬럼 동기화 테스트"
        defaultExpanded="all"
        treeCheckbox
      />,
    );

    const rootTreeCheckbox = screen.getByRole('checkbox', {
      name: 'Root 트리 선택',
    });
    const rootAllowedCheckbox = screen.getByRole('checkbox', {
      name: '허용 root',
    });
    const childAllowedCheckbox = screen.getByRole('checkbox', {
      name: '허용 child',
    });

    expect(rootAllowedCheckbox).not.toBeChecked();

    fireEvent.click(rootTreeCheckbox);
    expect(rootAllowedCheckbox).toBeChecked();
    expect(childAllowedCheckbox).toBeChecked();

    fireEvent.click(rootTreeCheckbox);
    expect(rootAllowedCheckbox).not.toBeChecked();
    expect(childAllowedCheckbox).not.toBeChecked();
  });

  it('skips syncing checkbox columns marked with syncWithTreeCheckbox: false', () => {
    const columnsWithCheckbox = [
      ...columns,
      {
        field: 'allowed' as const,
        headerName: '허용',
        type: 'checkbox' as const,
        syncWithTreeCheckbox: false,
      },
    ];
    render(
      <F1Tree
        rows={rows}
        columns={columnsWithCheckbox}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 체크박스 컬럼 동기화 제외 테스트"
        defaultExpanded="all"
        treeCheckbox
      />,
    );

    const rootTreeCheckbox = screen.getByRole('checkbox', {
      name: 'Root 트리 선택',
    });
    const rootAllowedCheckbox = screen.getByRole('checkbox', {
      name: '허용 root',
    });

    fireEvent.click(rootTreeCheckbox);
    expect(rootAllowedCheckbox).not.toBeChecked();
  });

  it('hides the row selection checkbox column when the checkbox option is disabled', () => {
    render(
      <F1Tree
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 체크박스 옵션 테스트"
        defaultExpanded="all"
        showCheckbox={false}
      />,
    );

    expect(screen.queryByLabelText('root 행 선택')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('전체 행 선택')).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'Root' })).toBeVisible();
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

  it('wraps long tree cell text after row height is increased', () => {
    const longText = '트리 셀 안에서 여러 줄로 보이는 매우 긴 메뉴 이름입니다.';
    render(
      <F1Tree
        rows={[{ ...rows[0], name: longText }]}
        columns={[
          {
            field: 'name',
            headerName: '메뉴명',
            editable: true,
            wrapText: true,
          },
        ]}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 줄바꿈 테스트"
        defaultExpanded="all"
      />,
    );

    const text = screen.getByText(longText);
    expect(text).toHaveStyle({ whiteSpace: 'nowrap' });

    fireEvent.keyDown(
      screen.getByRole('button', { name: /root 행 높이 조절/ }),
      { key: 'ArrowDown' },
    );

    expect(text).toHaveStyle({ whiteSpace: 'normal' });
  });

  it('allows paste while a tree cell editor is active', () => {
    render(
      <F1Tree
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 붙여넣기 허용 테스트"
        defaultExpanded="all"
      />,
    );

    const rootCell = screen.getByRole('gridcell', { name: 'Root' });
    fireEvent.doubleClick(rootCell);
    const input = screen.getByDisplayValue('Root');

    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { getData: () => '새 이름' },
    });
    input.dispatchEvent(pasteEvent);

    expect(input).toBeInTheDocument();
    expect(pasteEvent.defaultPrevented).toBe(false);
  });
});
