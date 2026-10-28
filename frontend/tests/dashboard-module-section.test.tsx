import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DashboardModuleSection } from '../src/pages/dashboard/components/DashboardModuleSection';

function CurrentPath() {
  return <output aria-label="Current path">{useLocation().pathname}</output>;
}

describe('Dashboard brand navigation', () => {
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

    fireEvent.click(screen.getByRole('link', { name: 'S-ERP' }));

    expect(screen.getByLabelText('Current path')).toHaveTextContent(
      '/groupware/overview',
    );
  });
});
