import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const output = fileURLToPath(new URL('../../docs/result/20261124/module-page-spacing/screenshots/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const kind of ['process', 'document', 'module', 'menu']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => localStorage.setItem('s-erp-auth', JSON.stringify({
      tenantCode: 'SYNTHETIC', userId: 'test', accessToken: 'synthetic-token',
      refreshToken: '', expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })));
    await page.route('**/__module-spacing-test', (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}*,*::before,*::after{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
    }));
    await page.route('**/api/**', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ resultCode: 200, result: { today: '2026-11-24', resultList: [], totalRowCount: 0 } }),
    }));
    await page.goto('http://127.0.0.1:4173/__module-spacing-test');
    await page.evaluate(async (screenKind) => {
      const { default: RefreshRuntime } = await import('/@react-refresh');
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const { ProcessManagementPage } = await import('/src/pages/pr/process/ProcessManagementPage.tsx');
      const { DocumentStatusPage } = await import('/src/pages/groupware/documents/status/DocumentStatusPage.tsx');
      const { ModuleManagementPanel } = await import('/src/pages/settings/system/modules/components/ModuleManagementPanel.tsx');
      const { MenuManagementPanel } = await import('/src/pages/settings/system/menus/components/MenuManagementPanel.tsx');
      const { createMemoryRouter, RouterProvider } = await import('/node_modules/.vite/deps/react-router-dom.js');
      const props = {
        selectedModule: { id: screenKind === 'process' ? 'pr' : 'groupware', name: '업무', tree: [], menus: [] },
        currentMenuName: '업무', content: { title: '업무', description: '', cards: [], items: [] },
        breadcrumbItems: ['업무'], selectedMenuPermissions: { read: true, create: true, update: true },
      };
      const Component = {
        process: ProcessManagementPage, document: DocumentStatusPage,
        module: ModuleManagementPanel, menu: MenuManagementPanel,
      }[screenKind];
      if (screenKind === 'module') props.modules = [];
      if (screenKind === 'menu') {
        props.menus = [];
        props.permissions = [];
      }
      const router = createMemoryRouter([{ path: '/', element: React.createElement(Component, props) }]);
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(RouterProvider, { router }));
    }, kind);
    if (kind === 'document') await page.getByRole('status').waitFor();
    else await page.getByRole('grid', { name: {
      process: '공정관리', module: 'F1-GRID 모듈 관리', menu: 'F1-TREE 메뉴 관리',
    }[kind] }).waitFor();
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      if (kind === 'document') {
        if (width !== 375) await page.getByRole('button', { name: '조회', exact: true }).click();
        const status = page.getByRole('status');
        await status.waitFor();
        const content = page.getByTestId('document-status-content');
        assert.deepEqual(await status.locator('..').evaluate((node) => {
          const s = getComputedStyle(node);
          return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
        }), ['16px', '16px', '16px', '16px']);
        await page.screenshot({ path: `${output}${kind}-message-${width}.png` });
        await status.getByRole('button', { name: 'Close' }).click();
        assert.deepEqual(await content.evaluate((node) => {
          const s = getComputedStyle(node);
          return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
        }), ['16px', '16px', '16px', '16px']);
      } else if (kind === 'process') {
        const content = page.locator('#root > div > div').last();
        assert.deepEqual(await content.evaluate((node) => {
          const s = getComputedStyle(node);
          return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
        }), ['16px', '16px', '16px', '16px']);
      } else {
        const grid = page.getByRole('grid', { name: kind === 'module' ? 'F1-GRID 모듈 관리' : 'F1-TREE 메뉴 관리' });
        const metrics = await grid.evaluate((node) => {
          const card = node.closest('.MuiCard-root');
          const content = node.closest('.MuiCardContent-root');
          return {
            padding: getComputedStyle(content).padding,
            topGap: node.getBoundingClientRect().top - card.getBoundingClientRect().top,
            outerPadding: getComputedStyle(card.parentElement).padding,
          };
        });
        assert.equal(metrics.padding, '0px');
        assert.equal(metrics.topGap, 0);
        assert.equal(metrics.outerPadding, '16px');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.screenshot({ path: `${output}${kind}-${width}.png` });
    }
    await page.close();
  }
  console.log('Module spacing browser checks passed.');
} finally {
  await browser.close();
}
