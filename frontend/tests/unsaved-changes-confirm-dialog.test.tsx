import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { UnsavedChangesConfirmDialog } from '../src/shared/components/UnsavedChangesConfirmDialog';

describe('UnsavedChangesConfirmDialog', () => {
  it('uses the common dialog shell and keeps its title and action order', () => {
    const onCancel = vi.fn();

    render(
      <UnsavedChangesConfirmDialog
        open
        title="Unsaved prompt"
        subtitle="Review the change before continuing."
        description="Discard current changes?"
        dialogTitleId="test-title"
        onCancel={onCancel}
        onContinue={vi.fn()}
        actions={[
          {
            label: '계속',
            onClick: vi.fn(),
            variant: 'contained',
            autoFocus: false,
          },
          { label: '취소', onClick: onCancel },
        ]}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Unsaved prompt' });
    expect(dialog).toHaveAttribute('aria-labelledby', 'test-title');
    expect(dialog).toHaveTextContent('Review the change before continuing.');
    const body = dialog.querySelector('.MuiDialogContent-root');
    expect(body).toHaveTextContent('Discard current changes?');
    expect(dialog.querySelector('.MuiDialogTitle-root')).not.toHaveTextContent(
      'Discard current changes?',
    );
    expect(
      within(dialog).getByRole('button', { name: '닫기' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByRole('button').map(
        (button) => button.getAttribute('aria-label') ?? button.textContent,
      ),
    ).toEqual(['닫기', '계속', '취소']);
    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
