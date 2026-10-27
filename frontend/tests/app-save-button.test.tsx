import { useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppSaveButton } from '../src/shared/components/AppSaveButton';
import { CommonDialog } from '../src/shared/components/CommonDialog';

describe('AppSaveButton', () => {
  it('replaces the idle icon with a small spinner and restores the original content', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <AppSaveButton startIcon={<span data-testid="save-icon" />} onClick={onClick} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    rerender(<AppSaveButton saving savingLabel="저장 중..." onClick={onClick}
      startIcon={<span data-testid="save-icon" />} />);
    const button = screen.getByRole('button', { name: '저장 중...', exact: true });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(within(button).getByRole('progressbar', { name: '저장 중' }))
      .toHaveStyle({ width: '16px', height: '16px' });
    expect(screen.queryByTestId('save-icon')).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<AppSaveButton startIcon={<span data-testid="save-icon" />} disabled />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('save-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  });

  it('keeps existing button text and an explicit accessible name during saving', () => {
    render(<AppSaveButton saving aria-label="문서 임시저장" progressLabel="문서 저장 중"
      type="submit" variant="outlined">임시저장</AppSaveButton>);
    const button = screen.getByRole('button', { name: '문서 임시저장', exact: true });
    expect(button).toHaveTextContent('임시저장');
    expect(button).toHaveAttribute('type', 'submit');
    expect(within(button).getByRole('progressbar', { name: '문서 저장 중' })).toBeVisible();
  });

  it.each(['resolve', 'reject'] as const)('unlocks a modal button when a save promise %ss', async (outcome) => {
    let resolve!: () => void;
    let reject!: () => void;
    const request = new Promise<void>((success, failure) => {
      resolve = success;
      reject = failure;
    });
    const save = vi.fn(() => request);
    function Dialog() {
      const [saving, setSaving] = useState(false);
      return <CommonDialog open title="합성 저장" onClose={() => {}}
        actions={<AppSaveButton saving={saving} savingLabel="저장 중..." onClick={async () => {
          setSaving(true);
          try { await save(); } catch { /* The owning dialog handles save errors. */ }
          finally { setSaving(false); }
        }} />}>내용</CommonDialog>;
    }
    render(<Dialog />);
    const dialog = screen.getByRole('dialog', { name: '합성 저장' });
    fireEvent.click(within(dialog).getByRole('button', { name: '저장', exact: true }));
    fireEvent.click(within(dialog).getByRole('button', { name: '저장 중...', exact: true }));
    expect(save).toHaveBeenCalledTimes(1);
    expect(within(dialog).getByRole('progressbar')).toBeVisible();
    await act(async () => { if (outcome === 'resolve') resolve(); else reject(); });
    expect(within(dialog).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '저장', exact: true })).toBeEnabled();
  });
});
