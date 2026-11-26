const SPLASH_ID = 'boot-splash';
const FADE_MS = 250;
const VISIBLE_OPACITY = 0.05;

/**
 * index.html의 정적 스플래시를 제거한다.
 * 아직 눈에 보이지 않으면(표시 지연 300ms 이내) 즉시 제거하고,
 * 보이는 중이면 페이드아웃 후 제거한다.
 */
export function dismissBootSplash() {
  const splash = document.getElementById(SPLASH_ID);
  if (!splash || splash.classList.contains('is-leaving')) return;

  const opacity = Number.parseFloat(window.getComputedStyle(splash).opacity);
  if (!(opacity >= VISIBLE_OPACITY)) {
    splash.remove();
    return;
  }

  splash.classList.add('is-leaving');
  window.setTimeout(() => splash.remove(), FADE_MS);
}

/** 준비 신호가 오지 않아도 스플래시가 화면을 계속 덮지 않도록 강제 해제한다. */
export function scheduleBootSplashFailsafe(delayMs: number) {
  return window.setTimeout(dismissBootSplash, delayMs);
}
