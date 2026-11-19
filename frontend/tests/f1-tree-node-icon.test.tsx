import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { F1Tree } from '../src/shared/components/f1-grid';

type Row = { id: string; parentId: string | null; name: string };

const rows: Row[] = [
  { id: 'root', parentId: null, name: '본사' },
  { id: 'team', parentId: 'root', name: '영업팀' },
  { id: 'alone', parentId: null, name: '감사실' },
];
const columns = [{ field: 'name' as const, headerName: '부서명' }];

function renderTree(withIcon: boolean) {
  return render(
    <F1Tree
      rows={rows}
      columns={columns}
      rowKey="id"
      parentKey="parentId"
      treeColumn="name"
      defaultExpandAll
      ariaLabel="부서 트리"
      treeNodeIcon={
        withIcon
          ? ({ expanded, hasChildren }) => (
              <span data-testid="node-icon">
                {hasChildren ? (expanded ? 'open' : 'closed') : 'leaf'}
              </span>
            )
          : undefined
      }
    />,
  );
}

describe('F1Tree treeNodeIcon', () => {
  it('옵션이 없으면 아이콘을 그리지 않는다', () => {
    renderTree(false);
    expect(screen.queryByTestId('node-icon')).toBeNull();
  });

  it('트리 컬럼에 열림·닫힘·하위 없음 상태를 전달해 아이콘을 그린다', () => {
    renderTree(true);
    const iconOf = (id: string) =>
      document.querySelector(`[data-f1-grid-row-id="${id}"] [data-testid="node-icon"]`);
    expect(iconOf('root')).toHaveTextContent('open');
    expect(iconOf('team')).toHaveTextContent('leaf');
    expect(iconOf('alone')).toHaveTextContent('leaf');

    fireEvent.click(screen.getByRole('button', { name: '본사 접기' }));
    expect(iconOf('root')).toHaveTextContent('closed');
    expect(document.querySelectorAll('[data-testid="node-icon"]')).toHaveLength(2);
  });
});
