import { useEffect, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { Alert, Button, IconButton, Snackbar, Stack } from '@mui/material';

const DISMISSED_KEY = 'iplusmes:pwa-install-dismissed';
const COMPLETED_KEY = 'iplusmes:pwa-install-completed';
const DISMISS_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

type InstallOutcome = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
}

type PromptState = 'hidden' | 'install' | 'ios' | 'error';

interface PwaInstallPromptProps {
  enabled?: boolean;
}

function isStandalone(): boolean {
  const displayMode = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayMode || iosStandalone;
}

function isIosBrowser(): boolean {
  const userAgent = navigator.userAgent;
  const isIosDevice = /iPhone|iPad|iPod/i.test(userAgent);
  const isIpadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIosDevice || isIpadDesktopMode;
}

function hasRecentDismissal(): boolean {
  const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY));
  const elapsed = Date.now() - dismissedAt;
  return Number.isFinite(dismissedAt)
    && dismissedAt > 0
    && elapsed >= 0
    && elapsed < DISMISS_INTERVAL_MS;
}

function isSuppressed(): boolean {
  return isStandalone()
    || hasRecentDismissal()
    || localStorage.getItem(COMPLETED_KEY) === 'true';
}

function initialPromptState(): PromptState {
  if (isSuppressed()) return 'hidden';
  return isIosBrowser() ? 'ios' : 'hidden';
}

export function PwaInstallPrompt({ enabled = true }: PwaInstallPromptProps) {
  const [promptState, setPromptState] = useState<PromptState>(initialPromptState);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      if (isSuppressed()) return;
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setPromptState('install');
    }

    function handleAppInstalled() {
      localStorage.setItem(COMPLETED_KEY, 'true');
      setInstallEvent(null);
      setPromptState('hidden');
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  function dismissPrompt() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setInstallEvent(null);
    setPromptState('hidden');
  }

  async function installApp() {
    if (!installEvent) return;
    const currentEvent = installEvent;
    setInstallEvent(null);
    try {
      await currentEvent.prompt();
      const { outcome } = await currentEvent.userChoice;
      if (outcome === 'dismissed') {
        localStorage.setItem(DISMISSED_KEY, String(Date.now()));
      }
      setPromptState('hidden');
    } catch {
      setPromptState('error');
    }
  }

  const open = enabled && promptState !== 'hidden';
  const message = promptState === 'ios'
    ? '공유 메뉴에서 홈 화면에 추가를 선택해 설치할 수 있습니다.'
    : promptState === 'error'
      ? '설치 창을 열지 못했습니다. 브라우저 메뉴에서 설치해 주세요.'
      : '홈 화면에 추가해 iPlusMES를 더 빠르게 실행하세요.';

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        bottom: 'calc(16px + env(safe-area-inset-bottom)) !important',
        width: 'calc(100% - 32px)',
        maxWidth: 560,
      }}
    >
      <Alert
        severity="info"
        variant="filled"
        action={(
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            {promptState === 'install' && (
              <Button color="inherit" size="small" onClick={() => void installApp()}>
                앱 설치
              </Button>
            )}
            <IconButton
              aria-label="설치 안내 닫기"
              color="inherit"
              size="small"
              onClick={dismissPrompt}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
        sx={{ width: '100%', alignItems: 'center' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
