import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { F1GridTestPage } from '../src/pages/settings/system/f1-grid-test/F1GridTestPage';
import {
  moduleItems,
  pageContentMap,
} from '../src/pages/dashboard/services/dashboardData';

describe('F1 Grid test page', () => {
  it('registers the F1 Grid test menu and renders its sample grid', () => {
    expect(
      moduleItems.find((module) => module.id === 'settings')?.menus,
    ).toContainEqual(
      expect.objectContaining({
        name: 'F1 Grid 테스트',
        pageKey: 'f1-grid-test',
      }),
    );

    render(
      <F1GridTestPage
        selectedModule={moduleItems.find((module) => module.id === 'settings')!}
        currentMenuName="F1 Grid 테스트"
        content={pageContentMap['f1-grid-test']}
      />,
    );

    expect(
      screen.getByRole('grid', { name: 'F1-GRID 기능 테스트' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '검증 실행' })).toBeVisible();
  });

  it('updates item code and item name through the code picker dialog', async () => {
    render(
      <F1GridTestPage
        selectedModule={moduleItems.find((module) => module.id === 'settings')!}
        currentMenuName="F1 Grid 테스트"
        content={pageContentMap['f1-grid-test']}
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'ITEM-001' }));
    fireEvent.click(screen.getByRole('button', { name: '코드 선택' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'ITEM-002 테스트 품목 선택' }),
    );

    await waitFor(() => {
      expect(screen.getByRole('gridcell', { name: 'ITEM-002' })).toBeVisible();
      expect(
        screen.getByRole('gridcell', { name: '테스트 품목' }),
      ).toBeVisible();
    });
  });

  it('renders a long wrap-text sample with row height controls', () => {
    render(
      <F1GridTestPage
        selectedModule={moduleItems.find((module) => module.id === 'settings')!}
        currentMenuName="F1 Grid 테스트"
        content={pageContentMap['f1-grid-test']}
      />,
    );

    expect(
      screen.getByText(/행 높이를 조절하면 여러 줄로 확인할 수 있는/),
    ).toBeVisible();
    const rowHeightHandle = screen.getByRole('button', {
      name: /행 높이 조절/,
    });
    const itemName = screen.getByText(
      /행 높이를 조절하면 여러 줄로 확인할 수 있는/,
    );

    expect(rowHeightHandle).toHaveAttribute('aria-valuenow', '40');
    expect(itemName).toHaveStyle({ whiteSpace: 'nowrap' });

    fireEvent.keyDown(rowHeightHandle, { key: 'ArrowDown' });

    expect(rowHeightHandle).toHaveAttribute('aria-valuenow', '44');
    expect(itemName).toHaveStyle({ whiteSpace: 'normal' });
  });
});
