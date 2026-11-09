import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import type { ModuleItem } from '../src/pages/dashboard/types/dashboard';

it('routes the statement registration menu to the shipment-based form', async () => {
  const module = { id: 'sales', name: '영업관리', tree: [] } as unknown as ModuleItem;
  const page = <DashboardContent selectedModule={module} currentMenuName="거래명세서등록"
    currentPageKey="statement-create" breadcrumbItems={['영업관리', '거래명세서등록']}
    content={{ title: '거래명세서등록', description: '', cards: [], items: [] }}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }} />;
  render(<RouterProvider router={createMemoryRouter([{ path: '/', element: page }])} />);
  expect(await screen.findByRole('button', { name: '출하 선택' })).toBeInTheDocument();
});
