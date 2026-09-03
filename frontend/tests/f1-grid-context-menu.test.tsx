import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  F1Grid,
  F1Tree,
  type F1GridColumn,
} from '../src/shared/components/f1-grid';

type FlatRow = {
  id: string;
  name: string;
};

type TreeRow = {
  id: string;
  parentId: string | null;
  name: string;
  order: number;
};

const flatRows: FlatRow[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Beta' },
];

const flatColumns: F1GridColumn<FlatRow>[] = [
  { field: 'name', headerName: '이름', editable: true },
];

const treeRows: TreeRow[] = [
  { id: '1', parentId: null, name: 'Alpha', order: 1 },
  { id: '2', parentId: null, name: 'Beta', order: 2 },
];

const treeColumns: F1GridColumn<TreeRow>[] = [
  { field: 'name', headerName: '이름', editable: true },
];

function createFlatRow(): FlatRow {
  return { id: `new-${Math.random()}`, name: '새 행' };
}

function createTreeRow(): TreeRow {
  return {
    id: `new-${Math.random()}`,
    parentId: null,
    name: '새 행',
    order: 0,
  };
}

function getGridBody(ariaLabel: string) {
  const grid = screen.getByRole('grid', { name: ariaLabel });
  return grid.lastElementChild as HTMLElement;
}

describe('F1-Grid context menu', () => {
  it('opens the context menu on body right-click but not on header right-click', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        createRow={createFlatRow}
      />,
    );

    fireEvent.contextMenu(screen.getByRole('columnheader', { name: /이름/ }));
    expect(
      screen.queryByRole('menuitem', { name: '행 추가' }),
    ).not.toBeInTheDocument();

    fireEvent.contextMenu(getGridBody('테스트 그리드'));
    expect(screen.getByRole('menuitem', { name: '행 추가' })).toBeVisible();
  });

  it('hides the excel export item when canExportExcel is not set', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));

    expect(
      screen.queryByRole('menuitem', { name: '엑셀 내보내기' }),
    ).not.toBeInTheDocument();
  });

  it('shows the excel export item when canExportExcel is true and triggers a download', async () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        canExportExcel
        excelFileName="test-export"
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));
    fireEvent.click(screen.getByRole('menuitem', { name: '엑셀 내보내기' }));

    await waitFor(
      () => {
        expect(URL.createObjectURL).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
  });

  it('does not show the root add item for a plain F1Grid', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        createRow={createFlatRow}
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));

    expect(
      screen.queryByRole('menuitem', { name: '루트 추가' }),
    ).not.toBeInTheDocument();
  });

  it('shows the root add item for F1Tree and adds a root row', () => {
    render(
      <F1Tree
        rows={treeRows}
        columns={treeColumns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="테스트 트리"
        createRow={createTreeRow}
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 트리'));
    fireEvent.click(screen.getByRole('menuitem', { name: '루트 추가' }));

    expect(screen.getAllByRole('gridcell', { name: '새 행' })).toHaveLength(1);
  });

  it('adds a new row as the child of the row that was right-clicked', () => {
    render(
      <F1Tree
        rows={treeRows}
        columns={treeColumns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="테스트 트리"
        createRow={createTreeRow}
        defaultExpandAll
      />,
    );

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'Alpha' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '행 추가' }));

    expect(screen.getByRole('gridcell', { name: '새 행' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Alpha 접기' })).toBeVisible();
  });

  it('adds a new row at the root level when the empty area is right-clicked', () => {
    render(
      <F1Tree
        rows={treeRows}
        columns={treeColumns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="테스트 트리"
        createRow={createTreeRow}
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 트리'));
    fireEvent.click(screen.getByRole('menuitem', { name: '행 추가' }));

    expect(screen.getByRole('gridcell', { name: '새 행' })).toBeVisible();
  });

  it('deletes only the row that was right-clicked when nothing else is selected', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        createRow={createFlatRow}
        createDuplicate={(row) => ({ ...row, id: `${row.id}-copy` })}
      />,
    );

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'Beta' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '행 삭제' }));

    expect(screen.queryByRole('gridcell', { name: 'Beta' })).toBeNull();
    expect(screen.getByRole('gridcell', { name: 'Alpha' })).toBeVisible();
  });

  it('disables the row copy/delete items when there is no target or selected row', () => {
    render(
      <F1Grid
        rows={[]}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        createRow={createFlatRow}
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));

    expect(screen.getByRole('menuitem', { name: '행 복사' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('menuitem', { name: '행 삭제' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('disables the filter/sort clear items until a filter or sort is applied', async () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));
    expect(screen.getByRole('menuitem', { name: '필터 해제' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('menuitem', { name: '정렬 해제' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    fireEvent.keyDown(screen.getByRole('menu'), {
      key: 'Escape',
      code: 'Escape',
    });

    fireEvent.click(screen.getByRole('button', { name: '이름 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '오름차순 정렬' }));

    fireEvent.contextMenu(getGridBody('테스트 그리드'));
    expect(
      screen.getByRole('menuitem', { name: '정렬 해제' }),
    ).not.toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(screen.getByRole('menuitem', { name: '정렬 해제' }));

    fireEvent.contextMenu(getGridBody('테스트 그리드'));
    await waitFor(() => {
      expect(
        screen.getByRole('menuitem', { name: '정렬 해제' }),
      ).toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('restores column order, width, and visibility to defaults and clears saved storage', async () => {
    const storageKey = 'context-menu-reset-test';
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        storageKey={storageKey}
        resizableColumns
      />,
    );

    const resizeHandle = screen.getByRole('separator', {
      name: '이름 컬럼 너비 조절',
    });
    fireEvent.mouseDown(resizeHandle, { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 120 });
    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(
        JSON.parse(window.localStorage.getItem(storageKey) ?? '{}').widths,
      ).toBeTruthy();
    });

    fireEvent.contextMenu(getGridBody('테스트 그리드'));
    fireEvent.click(
      screen.getByRole('menuitem', { name: '설정을 기본값으로 복원' }),
    );

    await waitFor(() => {
      expect(
        JSON.parse(window.localStorage.getItem(storageKey) ?? '{}').widths,
      ).toEqual({});
    });
  });
});
