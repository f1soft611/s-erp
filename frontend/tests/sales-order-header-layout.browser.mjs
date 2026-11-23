import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const output = fileURLToPath(new URL('../../docs/result/20261123/sales-order-header-layout/screenshots/', import.meta.url));
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route('**/__order-layout-test', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}*,*::before,*::after{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
  }));
  await page.route('**/api/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ resultCode: 200, result: { today: '2026-11-23', items: [], resultList: [] } }),
  }));
  await page.goto('http://127.0.0.1:4173/__order-layout-test');
  await page.evaluate(async () => {
    const { default: RefreshRuntime } = await import('/@react-refresh');
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const React = (await import('/node_modules/.vite/deps/react.js')).default;
    const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const { SalesOrderCreatePage } = await import('/src/pages/sales/order/create/SalesOrderCreatePage.tsx');
    const routerUrl = performance.getEntriesByType('resource').map((entry) => entry.name)
      .find((url) => url.includes('/node_modules/.vite/deps/react-router-dom.js?v='));
    if (!routerUrl) throw new Error('Vite React Router module not found');
    const { createMemoryRouter, RouterProvider } = await import(routerUrl);
    const props = {
      selectedModule: { id: 'sales', name: '영업관리', tree: [], menus: [] },
      currentMenuName: '수주등록',
      content: { title: '수주등록', description: '', cards: [], items: [] },
      breadcrumbItems: ['영업관리', '수주등록'],
      selectedMenuPermissions: { read: true, create: true, update: true, delete: true, excel: false },
    };
    const router = createMemoryRouter([{ path: '/', element: React.createElement(SalesOrderCreatePage, props) }]);
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(RouterProvider, { router }));
  });
  const fields = ['수주번호', '수주일자', '납기일자', '수주상태', '거래처', '납품처', '매출처', '견적번호', '배송방법', '비고'];
  await page.getByLabel('수주번호').waitFor();
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const boxes = [];
    for (const label of fields) {
      const field = label === '배송방법'
        ? page.getByRole('combobox', { name: label })
        : page.getByLabel(label, { exact: false }).first();
      const box = await field.locator('xpath=ancestor-or-self::*[contains(concat(" ", normalize-space(@class), " "), " MuiInputBase-root ")][1]').boundingBox();
      assert.ok(box, `${label} missing at ${width}`);
      boxes.push(box);
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1, `${label} exceeds viewport ${width}`);
    }
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i], b = boxes[j];
        const overlap = a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1
          && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;
        assert.ok(!overlap, `${fields[i]} and ${fields[j]} overlap at ${width}`);
      }
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `page overflow at ${width}`);
    for (const index of [4, 5, 6]) assert.ok(Math.abs(boxes[index].width - boxes[0].width) < 1, `${fields[index]} width at ${width}`);
    if (width === 1280) {
      for (const index of [1, 2, 3]) assert.ok(Math.abs(boxes[index].y - boxes[0].y) < 1);
      for (const index of [5, 6]) assert.ok(Math.abs(boxes[index].y - boxes[4].y) < 1);
      assert.ok(Math.abs(boxes[8].y - boxes[7].y) < 1);
      assert.ok(boxes[0].y < boxes[4].y && boxes[4].y < boxes[7].y && boxes[7].y < boxes[9].y);
    }
    await page.getByText('수주 기본정보', { exact: true }).locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]')
      .screenshot({ path: path.join(output, `header-${width}.png`) });
    console.log(`${width}px: field bounds, widths and overflow verified`);
  }
} finally {
  await browser.close();
}
