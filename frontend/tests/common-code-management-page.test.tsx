import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { RoleManagementPanel } from '../src/pages/settings/system/roles/components/RoleManagementPanel';
import { Splitter } from '../src/shared/components/Splitter';
import { NotificationProvider } from '../src/shared/context/NotificationContext';

describe('CommonCode management page', () => {
  it('renders a draggable horizontal splitter handle with the correct accessibility metadata', () => {
    render(
      <Splitter
        direction="horizontal"
        initialSize={320}
        minSize={200}
        maxSize={420}
        ariaLabel="공통코드 트리와 상세영역 분리기"
      >
        <div style={{ width: '100%', height: '100%' }}>left</div>
        <div style={{ width: '100%', height: '100%' }}>right</div>
      </Splitter>,
    );

    const separator = screen.getByRole('separator', {
      name: '공통코드 트리와 상세영역 분리기',
    });

    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
    expect(separator).toHaveAttribute('tabindex', '0');
  });

  it('switches to a stacked mobile layout and hides the separator on narrow widths', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 375,
    });

    const { container } = render(
      <Splitter
        direction="horizontal"
        mobileBreakpoint={768}
        mobileMode="stacked"
        initialSize={320}
        minSize={180}
        ariaLabel="공통코드 트리와 상세영역 분리기"
      >
        <div style={{ width: '100%', height: '100%' }}>left</div>
        <div style={{ width: '100%', height: '100%' }}>right</div>
      </Splitter>,
    );

    const stackedRoot = container.firstElementChild as HTMLElement;

    expect(
      screen.queryByRole('separator', {
        name: '공통코드 트리와 상세영역 분리기',
      }),
    ).not.toBeInTheDocument();
    expect(stackedRoot).toHaveStyle({ overflowY: 'auto' });
    expect(stackedRoot).toHaveStyle({ height: 'auto' });
  });

  it('supports flex-based left and right widths on the split layout', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1200,
    });

    render(
      <Splitter
        direction="horizontal"
        leftFlex={3}
        rightFlex={2}
        ariaLabel="공통코드 트리와 상세영역 분리기"
      >
        <div style={{ width: '100%', height: '100%' }}>left</div>
        <div style={{ width: '100%', height: '100%' }}>right</div>
      </Splitter>,
    );

    const separator = screen.getByRole('separator', {
      name: '공통코드 트리와 상세영역 분리기',
    });
    const panes = separator.parentElement?.children as HTMLCollection;

    expect(separator).toHaveStyle({ display: 'flex' });
    expect(panes[0]).toHaveStyle({ flex: '3 1 0%' });
    expect(panes[2]).toHaveStyle({ flex: '2 1 0%' });
  });

  it('stacks the role management panels vertically on mobile screens', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 375,
    });

    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <RoleManagementPanel
          roles={[
            {
              id: 'role-1',
              group: 'SYS',
              name: '시스템 관리자',
              description: '시스템 관리',
              menuCount: 1,
              active: true,
              permissions: {
                read: true,
                create: true,
                update: true,
                delete: true,
              },
            },
          ]}
          canExportExcel
        />
      </ThemeProvider>,
    );

    const stackedRoot = (container.firstElementChild as HTMLElement)
      .firstElementChild as HTMLElement;

    expect(
      screen.queryByRole('separator', {
        name: '권한 관리 영역 분리기',
      }),
    ).not.toBeInTheDocument();
    expect(stackedRoot).toHaveStyle({ overflowY: 'auto' });
  });

  it('renders the actual common code management page instead of the coming soon placeholder', () => {
    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    expect(screen.getByText('공통코드 관리')).toBeInTheDocument();
    expect(
      screen.queryByText('요청하신 페이지는 현재 준비 중입니다'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('공통코드 그룹 관리')).toBeInTheDocument();
  });

  it('hides the add/delete row actions from the common code context menu while keeping export and reset actions', async () => {
    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    const grid = await screen.findByRole('grid', { name: '공통코드 상세코드' });
    const body = grid.lastElementChild as HTMLElement;
    fireEvent.contextMenu(body);

    await waitFor(() => {
      expect(
        screen.queryByRole('menuitem', { name: '행 추가' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: '행 삭제' }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: '엑셀 내보내기' }),
      ).toBeVisible();
      expect(
        screen.getByRole('menuitem', { name: '설정을 기본값으로 복원' }),
      ).toBeVisible();
    });
  });

  it('prompts before reloading a dirty common code page', async () => {
    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    const groupCell = await screen.findByRole('gridcell', {
      name: '첨부문서업무',
    });
    fireEvent.doubleClick(groupCell);
    const groupInput = await screen.findByDisplayValue('첨부문서업무');
    fireEvent.change(groupInput, { target: { value: '첨부문서업무 수정' } });
    fireEvent.keyDown(groupInput, { key: 'Enter', code: 'Enter' });

    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(
      await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toHaveTextContent(
      '변경사항을 버리고 공통코드 목록을 다시 불러오시겠습니까?',
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '취소' })).toBeVisible();
    });
  });
});
