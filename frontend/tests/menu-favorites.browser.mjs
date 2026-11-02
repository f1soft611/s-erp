import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const screenshotDirectory = path.resolve(
  scriptDirectory,
  '../../docs/result/20261102/menu-favorites/screenshots',
);
await mkdir(screenshotDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const width of [375, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(10000);
    await page.addInitScript(() => {
      localStorage.setItem(
        's-erp-auth',
        JSON.stringify({
          tenantCode: 'TEST',
          userId: 'test',
          accessToken: 'test-token',
          refreshToken: '',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }),
      );
    });
    await page.route('**/api/v1/menus/favorites', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              item: {
                folders: [],
                favorites: [{ favoriteId: 17, menuId: 210, folderId: null }],
              },
            },
          }),
        });
        return;
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ result: { item: { folders: [], favorites: [] } } }),
      });
    });
    await page.route('**/__menu-favorites-test', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="root"></div></body></html>',
      }),
    );
    await page.goto('http://127.0.0.1:4173/__menu-favorites-test');
    await page.evaluate(async () => {
      const { default: RefreshRuntime } = await import('/@react-refresh');
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const { DashboardMenuTree } = await import(
        '/src/pages/dashboard/components/DashboardMenuTree.tsx'
      );
      const root = ReactDOM.createRoot(document.getElementById('root'));
      const props = {
        selectedModule: {
          id: 'groupware',
          name: '그룹웨어',
          icon: null,
          tree: [{
            id: 'notice',
            menuId: 210,
            name: '공지사항',
            path: '/groupware/notice',
            permissions: { read: true, create: false, update: false, delete: false },
          }],
          menus: [],
        },
        expandedItemIds: [],
        selectedMenuId: 'notice',
        favorites: { folders: [], favorites: [] },
        onFavoritesRefresh: async () => {},
        onMenuSelect: () => {
          window.__menuSelected = true;
        },
      };
      root.render(React.createElement(DashboardMenuTree, props));
    });

    const createFavoriteResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/menus/favorites') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: '즐겨찾기 추가: 공지사항' }).click();
    await createFavoriteResponse;
    assert.equal(new URL(page.url()).pathname, '/__menu-favorites-test');
    assert.equal(await page.evaluate(() => Boolean(window.__menuSelected)), false);

    await page.getByRole('dialog', { name: '즐겨찾기 편집' }).waitFor();
    assert.equal(await page.getByLabel('이름').inputValue(), '공지사항');
    assert.equal(await page.getByLabel('URL').inputValue(), '/groupware/notice');
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `Horizontal overflow at ${width}px`,
    );
    await page.screenshot({
      path: path.join(screenshotDirectory, `menu-favorites-${width}px.png`),
      fullPage: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`Menu favorite browser checks passed at 375px, 768px, and 1280px.`);
