import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaInstallPrompt } from '../src/shared/components/PwaInstallPrompt';

const DISMISSED_KEY = 'iplusmes:pwa-install-dismissed';
const DISMISS_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('waits for the authenticated main screen before showing a captured install prompt', async () => {
    const { rerender } = render(<PwaInstallPrompt enabled={false} />);
    dispatchInstallPrompt();

    expect(screen.queryByRole('button', { name: '앱 설치' })).not.toBeInTheDocument();

    rerender(<PwaInstallPrompt enabled />);

    expect(await screen.findByRole('button', { name: '앱 설치' })).toBeInTheDocument();
  });

  it('does not automatically retry when the native prompt is dismissed', async () => {
    const now = 1_800_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    render(<PwaInstallPrompt />);
    const installEvent = dispatchInstallPrompt('dismissed');
    fireEvent.click(await screen.findByRole('button', { name: '앱 설치' }));

    await waitFor(() => expect(installEvent.prompt).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: '앱 설치' })).not.toBeInTheDocument();
    expect(localStorage.getItem(DISMISSED_KEY)).toBe(String(now));
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

  it('suppresses the reminder across mounts for seven days after closing it', async () => {
    const now = 1_800_000_000_000;
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(now);
    const { unmount } = render(<PwaInstallPrompt />);
    dispatchInstallPrompt();
    fireEvent.click(await screen.findByRole('button', { name: '설치 안내 닫기' }));

    await waitFor(() => expect(localStorage.getItem(DISMISSED_KEY)).toBe(String(now)));
    unmount();
    dateNow.mockReturnValue(now + DISMISS_INTERVAL_MS - 1);
    render(<PwaInstallPrompt />);
    dispatchInstallPrompt();

    expect(screen.queryByRole('button', { name: '앱 설치' })).not.toBeInTheDocument();
  });

  it('shows the reminder again after seven days', async () => {
    const now = 1_800_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    localStorage.setItem(DISMISSED_KEY, String(now - DISMISS_INTERVAL_MS));
    render(<PwaInstallPrompt />);
    dispatchInstallPrompt();

    expect(await screen.findByRole('button', { name: '앱 설치' })).toBeInTheDocument();
  });

  it('does not treat a legacy permanent dismissal value as a valid timestamp', async () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    render(<PwaInstallPrompt />);
    dispatchInstallPrompt();

    expect(await screen.findByRole('button', { name: '앱 설치' })).toBeInTheDocument();
  });
});
