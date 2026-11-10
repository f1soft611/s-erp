import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaInstallPrompt } from '../src/shared/components/PwaInstallPrompt';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function dispatchInstallPrompt(
  outcome: 'accepted' | 'dismissed' = 'accepted',
) {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  }) as InstallPromptEvent;
  act(() => window.dispatchEvent(event));
  return event;
}

describe('PwaInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0',
    });
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: false,
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );
  });

  it('calls the native install prompt only after the user selects install', async () => {
    render(<PwaInstallPrompt />);
    const installEvent = dispatchInstallPrompt();
    const installButton = await screen.findByRole('button', { name: '앱 설치' });

    expect(installEvent.prompt).not.toHaveBeenCalled();
    fireEvent.click(installButton);

    await waitFor(() => expect(installEvent.prompt).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('button', { name: '앱 설치' })).not.toBeInTheDocument());
  });

  it('does not automatically retry when the native prompt is dismissed', async () => {
    render(<PwaInstallPrompt />);
    const installEvent = dispatchInstallPrompt('dismissed');
    fireEvent.click(await screen.findByRole('button', { name: '앱 설치' }));

    await waitFor(() => expect(installEvent.prompt).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: '앱 설치' })).not.toBeInTheDocument();
    expect(localStorage.getItem('iplusmes:pwa-install-dismissed')).toBeNull();
  });

  it('shows a browser-menu fallback when opening the native prompt fails', async () => {
    render(<PwaInstallPrompt />);
    const installEvent = dispatchInstallPrompt();
    vi.mocked(installEvent.prompt).mockRejectedValue(new Error('prompt unavailable'));
    fireEvent.click(await screen.findByRole('button', { name: '앱 설치' }));

    expect(await screen.findByText(/설치 창을 열지 못했습니다/)).toBeInTheDocument();
  });

  it('shows manual Add to Home Screen guidance on iOS', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    });
    render(<PwaInstallPrompt />);

    expect(await screen.findByText(/공유 메뉴에서 홈 화면에 추가/)).toBeInTheDocument();
  });

  it('does not show the reminder in standalone mode', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );
    render(<PwaInstallPrompt />);
    dispatchInstallPrompt();

    expect(screen.queryByRole('button', { name: '앱 설치' })).not.toBeInTheDocument();
  });

  it('hides the reminder after the appinstalled event', async () => {
    render(<PwaInstallPrompt />);
    dispatchInstallPrompt();
    expect(await screen.findByRole('button', { name: '앱 설치' })).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event('appinstalled')));

    await waitFor(() => expect(screen.queryByRole('button', { name: '앱 설치' })).not.toBeInTheDocument());
    expect(localStorage.getItem('iplusmes:pwa-install-completed')).toBe('true');
  });

  it('persists dismissal across mounts', async () => {
    const { unmount } = render(<PwaInstallPrompt />);
    dispatchInstallPrompt();
    fireEvent.click(await screen.findByRole('button', { name: '설치 안내 닫기' }));

    await waitFor(() => expect(localStorage.getItem('iplusmes:pwa-install-dismissed')).toBe('true'));
    unmount();
    render(<PwaInstallPrompt />);
    dispatchInstallPrompt();

    expect(screen.queryByRole('button', { name: '앱 설치' })).not.toBeInTheDocument();
  });
});
