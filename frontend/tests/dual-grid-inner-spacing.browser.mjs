import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const output = fileURLToPath(new URL('../../docs/result/20261124/dual-grid-inner-spacing/screenshots/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const kind of ['common-code', 'destination']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => localStorage.setItem('s-erp-auth', JSON.stringify({
      tenantCode: 'SYNTHETIC', userId: 'test', accessToken: 'synthetic-token',
      refreshToken: '', expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })));
    await page.route('**/__dual-grid-spacing-test', (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}*,*::before,*::after{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
    }));
    await page.route('**/api/**', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ resultCode: 200, result: { resultList: [], totalRowCount: 0 } }),
    }));
    await page.goto('http://127.0.0.1:4173/__dual-grid-spacing-test');
    await page.evaluate(async (screenKind) => {
      const { default: RefreshRuntime } = await import('/@react-refresh');
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const { createMemoryRouter, RouterProvider } = await import('/node_modules/.vite/deps/react-router-dom.js');
      const { NotificationProvider } = await import('/src/shared/context/NotificationContext.tsx');
      const { CommonCodeManagementPage } = await import('/src/pages/co/master/common-code/CommonCodeManagementPage.tsx');
      const { SalesDestinationPage } = await import('/src/pages/sales/master/destination/SalesDestinationPage.tsx');
      const props = {
        selectedModule: { id: screenKind === 'common-code' ? 'co' : 'sales', name: '업무', tree: [], menus: [] },
        currentMenuName: '관리', content: { title: '관리', description: '', cards: [], items: [] },
        breadcrumbItems: ['업무'], selectedMenuPermissions: { read: true, create: true, update: true },
      };
      const Component = screenKind === 'common-code' ? CommonCodeManagementPage : SalesDestinationPage;
      const element = React.createElement(NotificationProvider, null, React.createElement(Component, props));
      const router = createMemoryRouter([{ path: '/', element }]);
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(RouterProvider, { router }));
    }, kind);
    const panels = kind === 'common-code'
      ? [['공통코드 그룹 트리', '공통코드 그룹 관리'], ['공통코드 상세코드', '공통코드 상세 관리']]
      : [['거래처 목록', '거래처 관리'], ['납품처 목록', '납품처 관리']];
    for (const [gridName] of panels) await page.getByRole('grid', { name: gridName }).waitFor();
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [gridName, title] of panels) {
        const grid = page.getByRole('grid', { name: gridName });
        const dimensions = await grid.evaluate((node, headingText) => {
          const content = node.closest('.MuiCardContent-root');
          const heading = Array.from(content.querySelectorAll('.MuiTypography-root'))
            .find((element) => element.textContent === headingText).parentElement;
          const contentStyle = getComputedStyle(content);
          const contentRect = content.getBoundingClientRect();
          const gridRect = node.getBoundingClientRect();
          const headingRect = heading.getBoundingClientRect();
          return {
            padding: [contentStyle.paddingLeft, contentStyle.paddingRight, contentStyle.paddingBottom],
            leftDifference: Math.abs(headingRect.left - gridRect.left),
            rightDifference: Math.abs(headingRect.right - gridRect.right),
            bottomGap: contentRect.bottom - gridRect.bottom,
            height: gridRect.height,
          };
        }, title);
        assert.deepEqual(dimensions.padding, ['16px', '16px', '16px']);
        assert.ok(dimensions.leftDifference < 1 && dimensions.rightDifference < 1, JSON.stringify(dimensions));
        assert.ok(Math.abs(dimensions.bottomGap - 16) < 1 && dimensions.height > 0, JSON.stringify(dimensions));
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.screenshot({ path: `${output}${kind}-${width}.png`, fullPage: true });
    }
    await page.close();
  }
  console.log('Dual-grid inner spacing browser checks passed.');
} finally {
  await browser.close();
}
