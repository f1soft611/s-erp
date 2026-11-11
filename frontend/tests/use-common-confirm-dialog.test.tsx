import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { useCommonConfirmDialog } from '../src/shared/hooks/useCommonConfirmDialog';

function ConfirmHarness({ onResult }: { onResult: (value: boolean) => void }) {
  const { confirm, dialog } = useCommonConfirmDialog();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void confirm({
            description: '계속하시겠습니까?',
            subtitle: '이 작업은 되돌릴 수 없습니다.',
          }).then(onResult);
        }}
      >
        요청
      </button>
      {dialog}
    </>
  );
}

describe('useCommonConfirmDialog', () => {
  it('resolves true when the confirmation action is selected', async () => {
    const onResult = vi.fn();
    render(<ConfirmHarness onResult={onResult} />);

    fireEvent.click(screen.getByRole('button', { name: '요청' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('이 작업은 되돌릴 수 없습니다.');
    expect(dialog.querySelector('.MuiDialogContent-root')).toHaveTextContent(
      '계속하시겠습니까?',
    );
    expect(dialog.querySelector('.MuiDialogTitle-root')).not.toHaveTextContent(
      '계속하시겠습니까?',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it('resolves false when the confirmation is canceled or closed', async () => {
    const onResult = vi.fn();
    render(<ConfirmHarness onResult={onResult} />);
    const request = screen.getByRole('button', { name: '요청' });

    fireEvent.click(request);
    fireEvent.click(await screen.findByRole('button', { name: '취소' }));
    await waitFor(() => expect(onResult).toHaveBeenNthCalledWith(1, false));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));

    fireEvent.click(request);
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(onResult).toHaveBeenNthCalledWith(2, false));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  });

  it('resolves an earlier request as false when another request replaces it', async () => {
    const onResult = vi.fn();
    render(<ConfirmHarness onResult={onResult} />);
    const request = screen.getByRole('button', { name: '요청' });

    fireEvent.click(request);
    fireEvent.click(request);

    await waitFor(() => expect(onResult).toHaveBeenNthCalledWith(1, false));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() => expect(onResult).toHaveBeenNthCalledWith(2, false));
  });

  it('resolves a pending request as false when the caller unmounts', async () => {
    const onResult = vi.fn();
    const { unmount } = render(<ConfirmHarness onResult={onResult} />);

    fireEvent.click(screen.getByRole('button', { name: '요청' }));
    await screen.findByRole('dialog');
    unmount();

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });
});
