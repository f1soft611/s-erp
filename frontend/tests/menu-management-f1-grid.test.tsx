import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MenuManagementPanel } from '../src/pages/settings/system/menus/components/MenuManagementPanel';
import { menuRows } from '../src/pages/settings/system/menus/data/menuManagement.data';

describe('MenuManagementPanel F1-GRID integration', () => {
  it('renders the existing menu rows through F1-GRID with row commands', () => {
    render(<MenuManagementPanel menus={menuRows} />);

    expect(
      screen.getByRole('grid', { name: 'F1-GRID 메뉴 관리' }),
    ).toBeVisible();
    expect(screen.getByRole('gridcell', { name: 'DASH' })).toBeVisible();
    expect(
      screen.getAllByRole('gridcell', { name: '작성중' }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '새 메뉴' })).toBeVisible();
    expect(screen.getByRole('button', { name: '삭제' })).toBeVisible();
    expect(screen.getByRole('button', { name: '복제' })).toBeVisible();
    expect(
      screen.getAllByRole('gridcell', { name: '시스템 관리' }),
    ).toHaveLength(2);
  });
});
