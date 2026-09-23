import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePageSessionState } from '../src/shared/hooks/usePageSessionState';

function SessionStateProbe() {
  const { state, resetState } = usePageSessionState(
    's-erp:recent-menu-history',
    [{ menuId: 'home' }],
  );

  return (
    <>
      <output data-testid="state">{JSON.stringify(state)}</output>
      <button type="button" onClick={resetState}>
        reset
      </button>
    </>
  );
}

describe('page session state', () => {
  it('clears the persisted recent-menu state when reset', () => {
    window.sessionStorage.setItem(
      's-erp:recent-menu-history',
      JSON.stringify([{ menuId: 'documents' }]),
    );

    render(<SessionStateProbe />);
    expect(screen.getByTestId('state')).toHaveTextContent('documents');

    act(() => {
      screen.getByRole('button', { name: 'reset' }).click();
    });

    expect(screen.getByTestId('state')).toHaveTextContent('home');
    expect(
      window.sessionStorage.getItem('s-erp:recent-menu-history'),
    ).toBeNull();
  });
});
