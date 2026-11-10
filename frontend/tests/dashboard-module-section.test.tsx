import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DashboardModuleSection } from '../src/pages/dashboard/components/DashboardModuleSection';
import { DashboardSidebar } from '../src/pages/dashboard/components/DashboardSidebar';

function CurrentPath() {
  return <output aria-label="Current path">{useLocation().pathname}</output>;
}

describe('Dashboard brand navigation', () => {
  it('keeps the mobile module bar accessible while the temporary menu opens and closes', () => {
    const module = {
      id: 'sales', name: '영업관리', icon: null,
      tree: [{ id: 'create', name: '수주등록' }],
      menus: [{ id: 'create', name: '수주등록', pageKey: 'create' }],
    };
    const onModuleChange = vi.fn();
    const props = {
      moduleItems: [module], selectedModuleId: 'sales', selectedModule: module,
      expandedItemIds: [], selectedMenuId: 'create', onModuleChange,
      onMenuSelect: vi.fn(), isMenuPanelCollapsed: true, isMobile: true,
      onToggleMenu: vi.fn(), onCloseMobileMenu: vi.fn(),
    };
    const { rerender } = render(<MemoryRouter><DashboardSidebar {...props} isMobileMenuOpen={false} /></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: '모듈 선택' })).toBeVisible();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    rerender(<MemoryRouter><DashboardSidebar {...props} isMobileMenuOpen /></MemoryRouter>);
    const tree = screen.getByRole('tree');
    expect(tree).toBeVisible();
    rerender(<MemoryRouter><DashboardSidebar {...props} isMobileMenuOpen={false} /></MemoryRouter>);
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '영업관리' }));
    expect(onModuleChange).toHaveBeenCalledWith('sales');
  });

  it('uses a horizontally scrollable compact module bar on mobile', () => {
    const onModuleChange = vi.fn();
    render(<MemoryRouter><DashboardModuleSection isMobile
      moduleItems={[{ id: 'sales', name: '영업관리', icon: null, tree: [], menus: [] }]}
      selectedModuleId="sales" onModuleChange={onModuleChange} /></MemoryRouter>);
    const bar = screen.getByRole('navigation', { name: '모듈 선택' });
    expect(getComputedStyle(bar).width).not.toBe('92px');
    expect(getComputedStyle(screen.getByRole('button', { name: '영업관리' }).parentElement!).overflowX).toBe('auto');
    expect(screen.queryByRole('link', { name: 'iPlusMES' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '영업관리' }));
    expect(onModuleChange).toHaveBeenCalledWith('sales');
  });

  it.each([
    '/settings/roles',
    '/groupware/documents',
    '/groupware/overview',
  ])('opens the overview from %s', (initialPath) => {
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <DashboardModuleSection
          moduleItems={[]}
          selectedModuleId=""
          onModuleChange={() => undefined}
        />
        <CurrentPath />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'iPlusMES' }));

    expect(screen.getByLabelText('Current path')).toHaveTextContent(
      '/groupware/overview',
    );
  });
});
