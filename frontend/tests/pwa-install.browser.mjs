import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:4173';
const screenshotDirectory = path.resolve(
  process.cwd(),
  '..',
  'docs/result/20261110/pwa-mobile-install/screenshots',
);
await mkdir(screenshotDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  async function mockDashboardApi(page) {
    await page.route('http://localhost:8080/**', async (route) => {
      const { pathname } = new URL(route.request().url());
      const result = pathname.endsWith('/menus/my')
        ? { deliveryPlanMode: 'AUTO', user: { userId: 'browser-test', roles: [] }, menus: [] }
        : pathname.endsWith('/system/modules')
          ? { resultList: [] }
          : pathname.toLowerCase().includes('favorite')
            ? { item: { folders: [], favorites: [] } }
            : {};
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ resultCode: '200', result }),
      });
    });
  }

  async function authenticateOnMain(page) {
    await page.evaluate(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'browser-test',
        userId: 'browser-test',
        accessToken: 'browser-test-token',
        refreshToken: 'browser-test-refresh-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }));
    });
    await page.goto(`${baseUrl}/groupware/overview`, { waitUntil: 'domcontentloaded' });
    assert.ok(page.url().endsWith('/groupware/overview'), 'test session must reach the main route');
  }

  const page = await browser.newPage({ viewport: { width: 375, height: 844 } });
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('업체코드').waitFor();

  const manifest = await page.evaluate(async () => {
    const response = await fetch('/manifest.webmanifest');
    if (!response.ok) throw new Error('PWA manifest request failed');
    return response.json();
  });
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512']);

  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => {
      localStorage.removeItem('iplusmes:pwa-install-dismissed');
      localStorage.removeItem('iplusmes:pwa-install-completed');
      localStorage.removeItem('s-erp-auth');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByLabel('업체코드').waitFor();
    const installButton = page.getByRole('button', { name: '앱 설치' });
    const loginEventPrevented = await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });

    assert.equal(loginEventPrevented, true);
    assert.equal(await installButton.count(), 0, 'install reminder must stay hidden on login');
    await mockDashboardApi(page);
    await authenticateOnMain(page);
    const mainEventPrevented = await page.evaluate(() => {
      window.__pwaPromptCalls = 0;
      const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: async () => { window.__pwaPromptCalls += 1; },
        userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
      });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });

    assert.equal(mainEventPrevented, true);
    await installButton.waitFor({ state: 'visible' });
    const reminder = page.getByRole('alert')
      .filter({ hasText: '홈 화면에 추가해 iPlusMES를 더 빠르게 실행하세요.' });
    await page.waitForFunction(() => {
      const alert = Array.from(document.querySelectorAll('[role="alert"]'))
        .find((element) => element.textContent?.includes('홈 화면에 추가해 iPlusMES를 더 빠르게 실행하세요.'));
      return alert && Number.parseFloat(getComputedStyle(alert).opacity) >= 0.99;
    });
    const bounds = await reminder.boundingBox();
    assert.ok(bounds, `install reminder has no bounds at ${width}px`);
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `install reminder exceeds ${width}px`);
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 844, `install reminder exceeds viewport height at ${width}px`);
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `page overflows horizontally at ${width}px`,
    );
    await page.screenshot({
      path: path.join(screenshotDirectory, `pwa-install-${width}px.png`),
      fullPage: true,
    });

    await installButton.click();
    await page.waitForFunction(() => window.__pwaPromptCalls === 1);
    await reminder.waitFor({ state: 'hidden' });
  }

  const iosContext = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 375, height: 844 },
  });
  try {
    const iosPage = await iosContext.newPage();
    await iosPage.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
    await iosPage.getByLabel('업체코드').waitFor();
    assert.equal(
      await iosPage.getByText(/공유 메뉴에서 홈 화면에 추가/).count(),
      0,
      'iOS install guidance must stay hidden on login',
    );
    await mockDashboardApi(iosPage);
    await authenticateOnMain(iosPage);
    await iosPage.getByText(/공유 메뉴에서 홈 화면에 추가/).waitFor({ state: 'visible' });
    await iosPage.waitForFunction(() => {
      const alert = Array.from(document.querySelectorAll('[role="alert"]'))
        .find((element) => element.textContent?.includes('공유 메뉴에서 홈 화면에 추가'));
      return alert && Number.parseFloat(getComputedStyle(alert).opacity) >= 0.99;
    });
    await iosPage.screenshot({
      path: path.join(screenshotDirectory, 'pwa-install-ios-manual.png'),
      fullPage: true,
    });
  } finally {
    await iosContext.close();
  }

  console.log('PWA install browser checks passed at 375px, 768px, 1280px and iOS guidance.');
} finally {
  await browser.close();
}
