import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SalesOrderCreatePage } from '../src/pages/sales/order/create/SalesOrderCreatePage';

it('keeps order form content scrollable within the dashboard viewport', () => {
  render(
    <SalesOrderCreatePage
      selectedModule={{
        id: 'sales',
        name: '영업관리',
        icon: null,
        tree: [],
        menus: [],
      }}
      currentMenuName="수주등록"
      breadcrumbItems={['영업관리', '수주관리', '수주등록']}
      content={{
        title: '수주등록',
        description: '수주 정보를 입력합니다.',
        cards: [],
        items: [],
      }}
    />,
  );

  const content = screen.getByRole('region', { name: '수주 입력 내용' });
  expect(getComputedStyle(content).overflowY).toBe('auto');
});
