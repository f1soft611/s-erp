import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { edgeScrollStep, scrollEdges } from '../src/pages/groupware/community/workspace/data/workspaceKanbanScroll';
import { KanbanBoard } from '../src/pages/groupware/community/workspace/components/KanbanBoard';
import { WorkspaceColumnSettings } from '../src/pages/groupware/community/workspace/components/WorkspaceColumnSettings';
import { WorkspaceFilterMenu } from '../src/pages/groupware/community/workspace/components/WorkspaceFilterMenu';
import { defaultPrefs } from '../src/pages/groupware/community/workspace/data/workspacePrefs';
import { createSampleStore } from '../src/pages/groupware/community/workspace/data/workspaceSamples';

const store = createSampleStore();
const salesRoom = store.rooms[0];
const salesPosts = store.posts.filter((post) => post.roomId === salesRoom.id);

const renderBoard = (overrides: Partial<Parameters<typeof KanbanBoard>[0]> = {}) => {
  const onMovePost = vi.fn();
  const onOpenPost = vi.fn();
  render(
    <KanbanBoard
      room={salesRoom}
      posts={salesPosts}
      prefs={defaultPrefs(salesRoom.columns)}
      canWrite
      onMovePost={onMovePost}
      onOpenPost={onOpenPost}
      {...overrides}
    />,
  );
  return { onMovePost, onOpenPost };
};

describe('KanbanBoard', () => {
  it('does not render columns hidden in the prefs', () => {
    renderBoard({
      prefs: { ...defaultPrefs(salesRoom.columns), hiddenColumnIds: ['col-done'] },
    });
    expect(screen.queryByText('완료')).toBeNull();
    expect(screen.getByText('요청')).toBeTruthy();
  });

  it('renders columns in the order stored in the prefs', () => {
    renderBoard({
      prefs: { ...defaultPrefs(salesRoom.columns), columnOrder: ['col-done', 'col-request', 'col-doing'] },
    });
    const headings = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(headings.map((text) => text?.replace(/\s*\d+$/, ''))).toEqual(['완료', '요청', '진행중']);
  });

  it('gives a read-only user neither drag handles nor the move menu', () => {
    renderBoard({ canWrite: false });
    expect(document.querySelector('[draggable="true"]')).toBeNull();
    expect(screen.queryByRole('button', { name: '카드 더보기' })).toBeNull();
  });

  it('moves a card to another column from the move menu', () => {
    const { onMovePost } = renderBoard();
    const card = screen.getByText('견적 문의 - A사').closest('[data-post-id]') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: '카드 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '진행중' }));
    expect(onMovePost).toHaveBeenCalledWith('post-1', 'col-doing');
  });

  it('offers edit in the more menu only on a card the user wrote', () => {
    const onEditPost = vi.fn();
    renderBoard({ currentUserId: 'u2', onEditPost });
    const mine = screen.getByText('견적 문의 - A사').closest('[data-post-id]') as HTMLElement;
    fireEvent.click(within(mine).getByRole('button', { name: '카드 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '글 수정' }));
    expect(onEditPost).toHaveBeenCalledWith('post-1');
    const authors = Object.fromEntries(salesPosts.map((post) => [post.id, post.authorId]));
    const others = salesPosts.filter((post) => post.authorId !== 'u2');
    expect(others.length).toBeGreaterThan(0);
    expect(authors['post-1']).toBe('u2');
  });

  it('moves a card when it is dropped on a column', () => {
    const { onMovePost } = renderBoard();
    const card = screen.getByText('견적 문의 - A사').closest('[data-post-id]') as HTMLElement;
    const doing = screen.getByRole('heading', { level: 3, name: /진행중/ }).closest('[data-column-id]') as HTMLElement;
    const dataTransfer = { setData: vi.fn(), getData: () => 'post-1', effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(doing, { dataTransfer });
    fireEvent.drop(doing, { dataTransfer });
    expect(onMovePost).toHaveBeenCalledWith('post-1', 'col-doing');
  });

  it('shows guidance in an empty column', () => {
    renderBoard({ posts: salesPosts.filter((post) => post.columnId !== 'col-done') });
    expect(screen.getByText('카드를 여기로 끌어 놓으세요')).toBeTruthy();
  });

  it('exposes the card title as a focusable button so the keyboard can open it', () => {
    const { onOpenPost } = renderBoard();
    const titleButton = screen.getByRole('button', { name: '계약서 검토' }) as HTMLButtonElement;
    expect(titleButton.tabIndex).toBeGreaterThanOrEqual(0);
    fireEvent.click(titleButton);
    expect(onOpenPost).toHaveBeenCalledTimes(1);
    expect(onOpenPost).toHaveBeenCalledWith('post-2');
    fireEvent.keyDown(titleButton, { key: 'Enter' });
    expect(onOpenPost).toHaveBeenCalledTimes(2);
  });

  it('opens a card when it is clicked', () => {
    const { onOpenPost } = renderBoard();
    fireEvent.click(screen.getByText('계약서 검토'));
    expect(onOpenPost).toHaveBeenCalledWith('post-2');
  });
});

describe('WorkspaceFilterMenu', () => {
  const renderMenu = (prefs = defaultPrefs(salesRoom.columns)) => {
    const onPrefsChange = vi.fn();
    render(<WorkspaceFilterMenu prefs={prefs} onPrefsChange={onPrefsChange} />);
    return { onPrefsChange };
  };

  it('keeps the filter options hidden until the filter icon is clicked', () => {
    renderMenu();
    expect(screen.queryByRole('checkbox', { name: '내가 쓴 글' })).toBeNull();
    expect(screen.queryByLabelText('글 검색')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '글 필터' }));
    expect(screen.getByRole('checkbox', { name: '내가 쓴 글' })).toBeTruthy();
    expect(screen.getByLabelText('글 검색')).toBeTruthy();
  });

  it('toggles only-mine and updates the keyword from the opened menu', () => {
    const { onPrefsChange } = renderMenu();
    fireEvent.click(screen.getByRole('button', { name: '글 필터' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '내가 쓴 글' }));
    expect(onPrefsChange).toHaveBeenCalledWith({ onlyMine: true });
    fireEvent.change(screen.getByLabelText('글 검색'), { target: { value: '계약' } });
    expect(onPrefsChange).toHaveBeenCalledWith({ keyword: '계약' });
  });

  it('shows removable chips for the active filters like the document list', () => {
    const { onPrefsChange } = renderMenu({ ...defaultPrefs(salesRoom.columns), onlyMine: true, keyword: '계약' });
    expect(screen.getByLabelText('내가 쓴 글 필터 해제')).toBeTruthy();
    fireEvent.click(screen.getByTestId('filter-delete-icon-mine'));
    expect(onPrefsChange).toHaveBeenCalledWith({ onlyMine: false });
    expect(screen.getByLabelText('검색어 필터 해제')).toBeTruthy();
    fireEvent.click(screen.getByTestId('filter-delete-icon-keyword'));
    expect(onPrefsChange).toHaveBeenCalledWith({ keyword: '' });
  });
});

// jsdom에는 DragEvent가 없어 clientX를 실을 수 있는 MouseEvent로 dragover를 보낸다.
const dragOverAt = (target: Element, clientX: number) =>
  act(() => {
    target.dispatchEvent(new MouseEvent('dragover', { bubbles: true, cancelable: true, clientX }));
  });

describe('KanbanBoard with many columns', () => {
  it('tells which edges still have content to scroll to', () => {
    expect(scrollEdges(0, 400, 400)).toEqual({ left: false, right: false });
    expect(scrollEdges(0, 400, 900)).toEqual({ left: false, right: true });
    expect(scrollEdges(200, 400, 900)).toEqual({ left: true, right: true });
    expect(scrollEdges(500, 400, 900)).toEqual({ left: true, right: false });
  });

  it('scrolls toward an edge faster the closer the pointer is, and not at all in the middle', () => {
    expect(edgeScrollStep(200, 0, 400)).toBe(0);
    expect(edgeScrollStep(395, 0, 400)).toBeGreaterThan(0);
    expect(edgeScrollStep(5, 0, 400)).toBeLessThan(0);
    expect(edgeScrollStep(399, 0, 400)).toBeGreaterThan(edgeScrollStep(360, 0, 400));
    expect(Math.abs(edgeScrollStep(1000, 0, 400))).toBeLessThanOrEqual(28);
    expect(Math.abs(edgeScrollStep(-200, 0, 400))).toBeLessThanOrEqual(28);
  });

  it('auto-scrolls the board while a card is dragged near its left or right edge', () => {
    renderBoard();
    const board = document.querySelector('[data-kanban-board]') as HTMLElement;
    board.getBoundingClientRect = () =>
      ({ left: 0, right: 400, top: 0, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    const scrollBy = vi.fn();
    board.scrollBy = scrollBy;
    dragOverAt(board, 200);
    expect(scrollBy).not.toHaveBeenCalled();
    dragOverAt(board, 396);
    expect(scrollBy.mock.calls.at(-1)?.[0].left).toBeGreaterThan(0);
    dragOverAt(board, 4);
    expect(scrollBy.mock.calls.at(-1)?.[0].left).toBeLessThan(0);
  });

  it('fills the available height when asked so the scrollbar sits at the bottom edge of the board', () => {
    const { unmount } = render(
      <KanbanBoard
        room={salesRoom}
        posts={salesPosts}
        prefs={defaultPrefs(salesRoom.columns)}
        canWrite
        fillHeight
        onMovePost={vi.fn()}
        onOpenPost={vi.fn()}
      />,
    );
    expect(document.querySelector('[data-kanban-board]')?.getAttribute('data-kanban-fill')).toBe('true');
    unmount();
    renderBoard();
    expect(document.querySelector('[data-kanban-board]')?.hasAttribute('data-kanban-fill')).toBe(false);
  });

  it('keeps the horizontal board on wide screens and snaps columns into place', () => {
    renderBoard();
    const board = document.querySelector('[data-kanban-board]') as HTMLElement;
    expect(board).toBeTruthy();
    expect(board.getAttribute('data-kanban-layout')).toBe('board');
    expect(screen.queryByRole('tab')).toBeNull();
    expect(document.querySelectorAll('[data-column-id]')).toHaveLength(3);
  });

  it('shows one column at a time with count tabs on narrow screens', () => {
    renderBoard({ layout: 'tabs' });
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['요청 1', '진행중 1', '완료 1']);
    expect(document.querySelectorAll('[data-column-id]')).toHaveLength(1);
    expect(screen.getByText('견적 문의 - A사')).toBeTruthy();
    expect(screen.queryByText('계약서 검토')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: '진행중 1' }));
    expect(screen.getByText('계약서 검토')).toBeTruthy();
    expect(screen.queryByText('견적 문의 - A사')).toBeNull();
  });

  it('leaves hidden columns out of the tabs and still lets cards move to the other visible columns', () => {
    const { onMovePost } = renderBoard({
      layout: 'tabs',
      prefs: { ...defaultPrefs(salesRoom.columns), hiddenColumnIds: ['col-done'] },
    });
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['요청 1', '진행중 1']);
    fireEvent.click(screen.getByRole('button', { name: '카드 더보기' }));
    expect(screen.queryByRole('menuitem', { name: '완료' })).toBeNull();
    fireEvent.click(screen.getByRole('menuitem', { name: '진행중' }));
    expect(onMovePost).toHaveBeenCalledWith('post-1', 'col-doing');
  });
});

describe('KanbanBoard column colors', () => {
  it('marks colored columns and leaves the others in the default look', () => {
    const colored = {
      ...salesRoom,
      columns: salesRoom.columns.map((column) => (column.id === 'col-request' ? { ...column, color: '#ef4444' } : column)),
    };
    render(
      <KanbanBoard
        room={colored}
        posts={salesPosts}
        prefs={defaultPrefs(colored.columns)}
        canWrite
        onMovePost={vi.fn()}
        onOpenPost={vi.fn()}
      />,
    );
    expect(document.querySelector('[data-column-id="col-request"]')?.getAttribute('data-column-color')).toBe('#ef4444');
    expect(document.querySelector('[data-column-id="col-doing"]')?.hasAttribute('data-column-color')).toBe(false);
  });
});

describe('WorkspaceColumnSettings personal colors', () => {
  it('sets a personal color for a column and resets it to the room color', () => {
    const onPrefsChange = vi.fn();
    const { rerender } = render(
      <WorkspaceColumnSettings prefs={defaultPrefs(salesRoom.columns)} columns={salesRoom.columns} onPrefsChange={onPrefsChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '컬럼 설정' }));
    fireEvent.click(screen.getByRole('button', { name: '진행중 색상' }));
    fireEvent.click(screen.getByRole('button', { name: '색상 #22c55e' }));
    expect(onPrefsChange).toHaveBeenCalledWith({ columnColors: { 'col-doing': '#22c55e' } });
    rerender(
      <WorkspaceColumnSettings
        prefs={{ ...defaultPrefs(salesRoom.columns), columnColors: { 'col-doing': '#22c55e', 'col-done': '#8b5cf6' } }}
        columns={salesRoom.columns}
        onPrefsChange={onPrefsChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '진행중 색상' }));
    fireEvent.click(screen.getByRole('button', { name: '방 기본 색상 사용' }));
    expect(onPrefsChange).toHaveBeenLastCalledWith({ columnColors: { 'col-done': '#8b5cf6' } });
  });
});

describe('WorkspaceColumnSettings', () => {
  it('hides, collapses and reorders columns from the column menu', () => {
    const onPrefsChange = vi.fn();
    render(<WorkspaceColumnSettings prefs={defaultPrefs(salesRoom.columns)} columns={salesRoom.columns} onPrefsChange={onPrefsChange} />);
    fireEvent.click(screen.getByRole('button', { name: '컬럼 설정' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '완료 표시' }));
    expect(onPrefsChange).toHaveBeenCalledWith({ hiddenColumnIds: ['col-done'] });
    fireEvent.click(screen.getByRole('checkbox', { name: '진행중 접기' }));
    expect(onPrefsChange).toHaveBeenCalledWith({ collapsedColumnIds: ['col-doing'] });
    fireEvent.click(screen.getByRole('button', { name: '진행중 위로' }));
    expect(onPrefsChange).toHaveBeenCalledWith({ columnOrder: ['col-doing', 'col-request', 'col-done'] });
  });
});
