import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// 서식 에디터와 공통 댓글 컴포넌트는 jsdom에서 불안정하므로 이 화면 테스트에서는 대체 구현을 쓴다.
// 두 컴포넌트의 실제 동작은 브라우저 검증에서 확인한다.
vi.mock('../src/shared/components/rich-text-editor/RichTextEditor', async () => {
  const React = await import('react');
  return {
    RichTextEditor: ({ onEditorReady, onContentChange, ariaLabel }: Record<string, any>) => {
      const [value, setValue] = React.useState('');
      const editor = React.useMemo(() => ({ value: '' }), []);
      const api = {
        getHTML: () => (editor.value ? `<p>${editor.value}</p>` : '<p></p>'),
        get isEmpty() {
          return editor.value === '';
        },
        commands: {},
      };
      React.useEffect(() => {
        onEditorReady?.(api);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return (
        <textarea
          aria-label={ariaLabel ?? '본문'}
          value={value}
          onChange={(event) => {
            editor.value = event.target.value;
            setValue(event.target.value);
            onContentChange?.(api);
          }}
        />
      );
    },
    RichTextEditorToolbar: () => null,
  };
});

vi.mock('../src/shared/components/feed/CommentThread', () => ({
  CommentThread: (props: Record<string, any>) => (
    <div data-testid="comment-thread-stub">
      {(props.comments as Array<{ id: string; content: string }>).map((comment) => (
        <p key={comment.id}>{comment.content.replace(/<[^>]+>/g, '')}</p>
      ))}
      {props.showComposer ? (
        <button type="button" onClick={() => void props.onSubmitComment('<p>상세 창 댓글</p>', [])}>
          댓글 등록 대체 버튼
        </button>
      ) : null}
    </div>
  ),
}));

import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { preloadDashboardPages } from '../src/pages/dashboard/components/dashboardPages';
import { pageContentMap } from '../src/pages/dashboard/services/dashboardData';
import type { MenuPermission, ModuleItem } from '../src/pages/dashboard/types/dashboard';
import { resetWorkspaceStore } from '../src/pages/groupware/community/workspace/services/workspace.service';

beforeAll(() => preloadDashboardPages(), 60_000);
// 전체 테스트를 병렬로 돌릴 때 느려지는 환경을 고려해 화면 테스트 제한 시간을 늘린다.
vi.setConfig({ testTimeout: 20_000 });

const moduleItem: ModuleItem = { id: 'groupware', name: '그룹웨어', icon: null, tree: [], menus: [] };
const fullPermissions: MenuPermission = { read: true, create: true, update: true, delete: true, excel: true };

const renderWorkspace = (permissions: MenuPermission = fullPermissions) =>
  render(
    <DashboardContent
      selectedModule={moduleItem}
      currentMenuName="협업공간"
      currentPageKey="workspace"
      breadcrumbItems={['그룹웨어', '협업공간']}
      content={pageContentMap.workspace}
      selectedMenuPermissions={permissions}
      isTenantAdmin
    />,
  );

const switchUser = (userId: string) =>
  fireEvent.change(screen.getByLabelText('사용자 전환'), { target: { value: userId } });

const openRoom = async () => {
  await screen.findByRole('button', { name: '영업팀 협업' });
  await screen.findByRole('heading', { level: 3, name: /요청/ });
};

const columnOf = (name: RegExp) =>
  screen.getByRole('heading', { level: 3, name }).closest('[data-column-id]') as HTMLElement;

const chooseView = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }));

describe('Workspace page', () => {
  beforeEach(() => {
    localStorage.clear();
    resetWorkspaceStore();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('is registered with a title and opens the first room as a kanban board', async () => {
    expect(pageContentMap.workspace?.title).toBe('협업공간');
    renderWorkspace();
    await openRoom();
    expect(within(columnOf(/요청/)).getByText('견적 문의 - A사')).toBeTruthy();
    expect(screen.getByRole('button', { name: '칸반형 보기' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('puts the new-post button in the page header and offers kanban, feed, list and file views', async () => {
    renderWorkspace();
    await openRoom();
    expect(screen.getByRole('button', { name: '새 글' })).toBeTruthy();
    ['칸반형 보기', '피드형 보기', '리스트형 보기', '파일형 보기'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    });
    // 문서작성 화면의 우측 요약 패널에 해당하는 방 정보 패널은 두지 않는다.
    expect(screen.queryByText('방 정보')).toBeNull();
  });

  it('puts the dev user switch first in the right panel, followed by the room list with the create button', async () => {
    renderWorkspace();
    await openRoom();
    const rightPanel = screen.getByTestId('view-mode-right-slot');
    const userSwitch = within(rightPanel).getByLabelText('사용자 전환');
    const roomsTitle = within(rightPanel).getByText('내 협업방');
    const roomButton = within(rightPanel).getByRole('button', { name: '영업팀 협업' });
    const createButton = within(rightPanel).getByRole('button', { name: '방 만들기' });
    const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(userSwitch, roomsTitle)).toBe(true);
    expect(before(roomsTitle, roomButton)).toBe(true);
    expect(before(roomButton, createButton)).toBe(true);
    // 목록 영역(왼쪽)에는 방 선택이 없다.
    const leftColumn = rightPanel.previousElementSibling as HTMLElement;
    expect(within(leftColumn).queryByRole('button', { name: '방 만들기' })).toBeNull();
  });

  it('switches rooms from the right panel', async () => {
    renderWorkspace();
    await openRoom();
    switchUser('u4');
    const rightPanel = screen.getByTestId('view-mode-right-slot');
    fireEvent.click(await within(rightPanel).findByRole('button', { name: '전사 자유게시' }));
    chooseView('피드형 보기');
    expect(await screen.findByText('점심 메뉴 추천 받습니다')).toBeTruthy();
  });

  it('keeps the post count, filter icon and column settings together on the left, away from the view buttons', async () => {
    renderWorkspace();
    await openRoom();
    expect(screen.getByText(/글 3건/)).toBeTruthy();
    // 내가 쓴 글·검색은 필터 아이콘을 누르기 전에는 보이지 않는다.
    expect(screen.queryByRole('checkbox', { name: '내가 쓴 글' })).toBeNull();
    const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const count = screen.getByText(/글 3건/);
    const filter = screen.getByRole('button', { name: '글 필터' });
    const columns = screen.getByRole('button', { name: '컬럼 설정' });
    const toggleGroup = screen.getByRole('group', { name: '글 보기 방식' });
    expect(before(count, filter)).toBe(true);
    expect(before(filter, columns)).toBe(true);
    // 왼쪽 그룹(글 N건과 같은 묶음) 안에 있고, 보기 전환 버튼 묶음 안에는 없다.
    expect(count.parentElement?.contains(columns)).toBe(true);
    expect(count.parentElement?.contains(filter)).toBe(true);
    expect(toggleGroup.contains(columns)).toBe(false);
  });

  it('filters to my posts from the filter menu and shows a removable chip', async () => {
    renderWorkspace();
    await openRoom();
    switchUser('u2');
    await waitFor(() => expect(screen.getByRole('button', { name: '글 필터' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '글 필터' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '내가 쓴 글' }));
    await waitFor(() => expect(screen.getByText(/글 2건/)).toBeTruthy());
    fireEvent.click(screen.getByTestId('filter-delete-icon-mine'));
    await waitFor(() => expect(screen.getByText(/글 3건/)).toBeTruthy());
  });

  it('shows posts as shared feed cards in the feed view', async () => {
    renderWorkspace();
    await openRoom();
    chooseView('피드형 보기');
    const cards = await screen.findAllByTestId('workspace-feed-card');
    expect(cards.length).toBe(3);
    expect(within(cards[0]).getByText('계약서 검토')).toBeTruthy();
    expect(document.querySelector('[data-column-id]')).toBeNull();
  });

  it('shows rows with status and comment badges in the list view and opens the detail panel on click', async () => {
    renderWorkspace();
    await openRoom();
    chooseView('리스트형 보기');
    const list = await screen.findByRole('region', { name: '리스트형 글 목록' });
    expect(within(list).getByText('계약서 검토')).toBeTruthy();
    expect(within(list).getAllByText('진행중').length).toBeGreaterThan(0);
    expect(within(list).getByText('댓글 2')).toBeTruthy();
    fireEvent.click(within(list).getByText('계약서 검토'));
    const panel = await screen.findByRole('region', { name: '글 상세' });
    expect(within(panel).getByText('계약서 검토')).toBeTruthy();
    expect(within(panel).getByText('2차 초안을 올립니다. 3조 수정 부분 확인 부탁드립니다.')).toBeTruthy();
    // 상세는 피드와 완전히 같은 카드(아바타·작성자·날짜·상태 배지·제목)로 그린다.
    const card = within(panel).getByTestId('workspace-feed-card');
    expect(within(card).getByText('박지훈')).toBeTruthy();
    expect(within(card).getByText('진행중')).toBeTruthy();
    expect(within(card).getByRole('heading', { name: '계약서 검토' })).toBeTruthy();
  });

  it('opens the same right-side detail panel when a kanban card is clicked and closes it again', async () => {
    renderWorkspace();
    await openRoom();
    fireEvent.click(screen.getByText('계약서 검토'));
    const panel = await screen.findByRole('region', { name: '글 상세' });
    expect(within(panel).getByText('3조 확인했습니다. 단가 문구만 조정이 필요합니다.')).toBeTruthy();
    fireEvent.click(within(panel).getByRole('button', { name: '상세 닫기' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: '글 상세' })).toBeNull());
  });

  it('adds a comment from the detail panel through the shared comment thread', async () => {
    renderWorkspace();
    await openRoom();
    fireEvent.click(screen.getByText('계약서 검토'));
    const panel = await screen.findByRole('region', { name: '글 상세' });
    fireEvent.click(within(panel).getByRole('button', { name: '댓글 등록 대체 버튼' }));
    expect(await within(panel).findByText('상세 창 댓글')).toBeTruthy();
  });

  it('lists every attachment of the room in the file view', async () => {
    renderWorkspace();
    await openRoom();
    chooseView('파일형 보기');
    expect(await screen.findByText('A사_견적요청.xlsx')).toBeTruthy();
    expect(screen.getByText('계약서_v2.pdf')).toBeTruthy();
  });

  it('shows a moved card in the same column to every user', async () => {
    renderWorkspace();
    await openRoom();
    const card = screen.getByText('견적 문의 - A사').closest('[data-post-id]') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: '카드 이동' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '진행중' }));
    await waitFor(() => expect(within(columnOf(/진행중/)).getByText('견적 문의 - A사')).toBeTruthy());
    switchUser('u4');
    await waitFor(() => expect(within(columnOf(/진행중/)).getByText('견적 문의 - A사')).toBeTruthy());
  });

  it('gives a read-only user no write or settings controls', async () => {
    renderWorkspace();
    await openRoom();
    expect(screen.getByRole('button', { name: '방 설정' })).toBeTruthy();
    switchUser('u4');
    await waitFor(() => expect(screen.queryByRole('button', { name: '새 글' })).toBeNull());
    expect(screen.queryByRole('button', { name: '카드 이동' })).toBeNull();
    expect(screen.queryByRole('button', { name: '방 설정' })).toBeNull();
  });

  it('lets a writer without admin rights post but not open room settings', async () => {
    renderWorkspace();
    await openRoom();
    switchUser('u2');
    await waitFor(() => expect(screen.queryByRole('button', { name: '방 설정' })).toBeNull());
    fireEvent.click(await screen.findByRole('button', { name: '새 글' }));
    fireEvent.change(await screen.findByLabelText('제목'), { target: { value: '화면 테스트 글' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));
    await waitFor(() => expect(within(columnOf(/요청/)).getByText('화면 테스트 글')).toBeTruthy());
  });

  it('keeps column visibility per user', async () => {
    renderWorkspace();
    await openRoom();
    fireEvent.click(screen.getByRole('button', { name: '컬럼 설정' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '완료 표시' }));
    await waitFor(() => expect(screen.queryByRole('heading', { level: 3, name: /완료/ })).toBeNull());
    switchUser('u2');
    expect(await screen.findByRole('heading', { level: 3, name: /완료/ })).toBeTruthy();
    switchUser('u1');
    await waitFor(() => expect(screen.queryByRole('heading', { level: 3, name: /완료/ })).toBeNull());
  });

  it('paints kanban columns with the room color and lets each user override it personally', async () => {
    renderWorkspace();
    await openRoom();
    // 설정 창이 닫히는 동안 뒤 화면이 aria-hidden일 수 있어 역할 대신 data 속성으로 컬럼을 찾는다.
    const requestColumnColor = () => document.querySelector('[data-column-id="col-request"]')?.getAttribute('data-column-color');
    // 방 설정에서 관리자가 컬럼 색을 정한다.
    fireEvent.click(screen.getByRole('button', { name: '방 설정' }));
    fireEvent.click(await screen.findByRole('button', { name: '컬럼 1 색상' }));
    fireEvent.click(screen.getByRole('button', { name: '색상 #ef4444' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(requestColumnColor()).toBe('#ef4444'));
    // 사용자별 컬럼 설정에서 같은 컬럼 색을 바꾸면 그 사용자 화면만 바뀐다.
    fireEvent.click(await screen.findByRole('button', { name: '컬럼 설정', hidden: true }));
    fireEvent.click(screen.getByRole('button', { name: '요청 색상' }));
    fireEvent.click(screen.getByRole('button', { name: '색상 #3b82f6' }));
    await waitFor(() => expect(requestColumnColor()).toBe('#3b82f6'));
    switchUser('u2');
    await waitFor(() => expect(requestColumnColor()).toBe('#ef4444'));
    switchUser('u1');
    await waitFor(() => expect(requestColumnColor()).toBe('#3b82f6'));
  });

  it('treats the menu permission as the outer gate for writing and room settings', async () => {
    renderWorkspace({ read: true, create: false, update: false, delete: false, excel: false });
    await openRoom();
    expect(screen.queryByRole('button', { name: '새 글' })).toBeNull();
    expect(screen.queryByRole('button', { name: '카드 이동' })).toBeNull();
    expect(screen.queryByRole('button', { name: '방 설정' })).toBeNull();
  });

  it('explains when the user belongs to no room', async () => {
    renderWorkspace();
    await openRoom();
    switchUser('u5');
    expect(await screen.findByText('참여 중인 협업방이 없습니다.')).toBeTruthy();
    // 방이 없어도 우측 패널에서 새 방을 만들 수 있다.
    expect(screen.getByRole('button', { name: '방 만들기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '새 글' })).toBeNull();
  });

  it('warns and shows no rooms when the menu read permission is missing', async () => {
    renderWorkspace({ ...fullPermissions, read: false });
    expect(await screen.findByText('조회 권한이 없어 협업공간을 볼 수 없습니다.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '영업팀 협업' })).toBeNull();
  });

  it('opens room settings for an admin and saves a renamed room', async () => {
    renderWorkspace();
    await openRoom();
    fireEvent.click(screen.getByRole('button', { name: '방 설정' }));
    fireEvent.change(await screen.findByLabelText('방 이름'), { target: { value: '영업 2팀 협업' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    // 설정 창이 닫히는 동안 뒤 화면이 aria-hidden일 수 있어 hidden을 포함해 조회한다.
    expect(await screen.findByRole('button', { name: '영업 2팀 협업', hidden: true }, { timeout: 5000 })).toBeTruthy();
  });
});
