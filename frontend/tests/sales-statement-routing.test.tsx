import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { pageContentMap } from '../src/pages/dashboard/services/dashboardData';
import type { ModuleItem } from '../src/pages/dashboard/types/dashboard';
import { preloadDashboardPages } from '../src/pages/dashboard/components/dashboardPages';

// 대시보드 업무 화면은 지연 로딩된다. 기존 동기 렌더링 단언을 유지하도록 화면 모듈을 미리 불러온다.
beforeAll(() => preloadDashboardPages(), 60_000);

it('provides revenue closing page metadata', () => {
  expect(pageContentMap['revenue-closing']).toMatchObject({
    title: '매출마감관리',
    description: '출하일 기준 매출대상과 거래처별 매출마감 현황을 조회합니다.',
  });
});

it('routes the statement registration menu to the shipment-based form', async () => {
  const module = { id: 'sales', name: '영업관리', tree: [] } as unknown as ModuleItem;
  const page = <DashboardContent selectedModule={module} currentMenuName="거래명세서등록"
    currentPageKey="statement-create" breadcrumbItems={['영업관리', '거래명세서등록']}
    content={{ title: '거래명세서등록', description: '', cards: [], items: [] }}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }} />;
  render(<RouterProvider router={createMemoryRouter([{ path: '/', element: page }])} />);
  expect(await screen.findByRole('button', { name: '출하 선택' })).toBeInTheDocument();
});

it('routes the revenue closing menu to its sales page', async () => {
  const module = { id: 'sales', name: '영업관리', tree: [] } as unknown as ModuleItem;
  const page = <DashboardContent selectedModule={module} currentMenuName="매출마감관리"
    currentPageKey="revenue-closing" breadcrumbItems={['영업관리', '매출관리', '매출마감관리']}
    content={{ title: '매출마감관리', description: '출하일 기준 매출마감 대상을 확인합니다.', cards: [], items: [] }}
    selectedMenuPermissions={{ read: true, create: false, update: false, delete: false, excel: true }} />;
  render(<RouterProvider router={createMemoryRouter([{ path: '/', element: page }])} />);
  expect(await screen.findByRole('grid', { name: '매출대상 상세 목록' })).toBeInTheDocument();
});
