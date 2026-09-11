import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { NotificationProvider } from '../src/shared/context/NotificationContext';

describe('CommonCode management page', () => {
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
    expect(screen.getByText('공통코드 그룹 트리')).toBeInTheDocument();
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

    const groupCell = await screen.findByRole('gridcell', { name: '첨부문서업무' });
    fireEvent.doubleClick(groupCell);
    const groupInput = await screen.findByDisplayValue('첨부문서업무');
    fireEvent.change(groupInput, { target: { value: '첨부문서업무 수정' } });
    fireEvent.keyDown(groupInput, { key: 'Enter', code: 'Enter' });

    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(
      await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toHaveTextContent('변경사항을 버리고 공통코드 목록을 다시 불러오시겠습니까?');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '취소' })).toBeVisible();
    });
  });
});
