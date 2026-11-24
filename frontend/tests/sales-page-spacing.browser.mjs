import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const output = fileURLToPath(new URL('../../docs/result/20261124/sales-page-spacing/screenshots/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const kind of ['create', 'quotation', 'delivery', 'plan', 'statement',
    'order-status', 'quotation-status', 'status', 'plan-status', 'statement-status', 'destination', 'revenue']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => localStorage.setItem('s-erp-auth', JSON.stringify({
      tenantCode: 'SYNTHETIC', userId: 'test', accessToken: 'synthetic-token',
      refreshToken: '', expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })));
    await page.route('**/__sales-spacing-test', (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}*,*::before,*::after{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
    }));
    await page.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      const result = { today: '2026-11-24', resultList: [], items: [], details: [], customerSummaries: [] };
      if (path === '/api/v1/co/master/common-code/groups') {
        result.resultList = [{ commonCodeGroupId: 1, groupCode: 'SALES_ORDER_STATUS', useAt: 'Y' }];
      } else if (path === '/api/v1/co/master/common-code/groups/1/items') {
        result.resultList = [{ commonCodeItemId: 1, itemCode: '수주등록', itemNm: '수주등록', useAt: 'Y' }];
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ resultCode: 200, result }) });
    });
    await page.goto('http://127.0.0.1:4173/__sales-spacing-test');
    await page.evaluate(async (screenKind) => {
      const { default: RefreshRuntime } = await import('/@react-refresh');
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const { SalesOrderCreatePage } = await import('/src/pages/sales/order/create/SalesOrderCreatePage.tsx');
      const { QuotationCreatePage } = await import('/src/pages/sales/quotation/create/QuotationCreatePage.tsx');
      const { SalesDeliveryCreatePage } = await import('/src/pages/sales/shipment/delivery/create/SalesDeliveryCreatePage.tsx');
      const { SalesDeliveryPlanCreatePage } = await import('/src/pages/sales/shipment/deliveryplan/create/SalesDeliveryPlanCreatePage.tsx');
      const { SalesStatementCreatePage } = await import('/src/pages/sales/shipment/statement/create/SalesStatementCreatePage.tsx');
      const { SalesDeliveryStatusPage } = await import('/src/pages/sales/shipment/delivery/status/SalesDeliveryStatusPage.tsx');
      const { SalesOrderStatusPage } = await import('/src/pages/sales/order/status/SalesOrderStatusPage.tsx');
      const { QuotationStatusPage } = await import('/src/pages/sales/quotation/status/QuotationStatusPage.tsx');
      const { SalesDeliveryPlanStatusPage } = await import('/src/pages/sales/shipment/deliveryplan/status/SalesDeliveryPlanStatusPage.tsx');
      const { SalesStatementStatusPage } = await import('/src/pages/sales/shipment/statement/status/SalesStatementStatusPage.tsx');
      const { SalesDestinationPage } = await import('/src/pages/sales/master/destination/SalesDestinationPage.tsx');
      const { RevenueClosingPage } = await import('/src/pages/sales/revenue/closing/RevenueClosingPage.tsx');
      const routerUrl = performance.getEntriesByType('resource').map((entry) => entry.name)
        .find((url) => url.includes('/node_modules/.vite/deps/react-router-dom.js?v='));
      const { createMemoryRouter, RouterProvider } = await import(routerUrl);
      const props = {
        selectedModule: { id: 'sales', name: '영업관리', tree: [], menus: [] },
        currentMenuName: '영업관리', content: { title: '영업관리', description: '', cards: [], items: [] },
        breadcrumbItems: ['영업관리'], selectedMenuPermissions: { read: true, create: true, update: true },
      };
      const components = {
        create: SalesOrderCreatePage, quotation: QuotationCreatePage,
        delivery: SalesDeliveryCreatePage, plan: SalesDeliveryPlanCreatePage,
        statement: SalesStatementCreatePage, status: SalesDeliveryStatusPage, destination: SalesDestinationPage,
        'order-status': SalesOrderStatusPage, 'quotation-status': QuotationStatusPage,
        'plan-status': SalesDeliveryPlanStatusPage, 'statement-status': SalesStatementStatusPage,
        revenue: RevenueClosingPage,
      };
      const router = createMemoryRouter([{ path: '/', element: React.createElement(components[screenKind], props) }]);
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(RouterProvider, { router }));
    }, kind);
    const isStatus = kind === 'status' || kind.endsWith('-status');
    if (isStatus) await page.getByRole('status').waitFor();
    const labels = { create: '수주', quotation: '견적', delivery: '출하', plan: '출하계획', statement: '거래명세서' };
    if (labels[kind]) await page.getByRole('region', { name: `${labels[kind]} 입력 내용` }).waitFor();
    if (kind === 'destination') await page.getByRole('grid', { name: '거래처 목록' }).waitFor();
    if (kind === 'revenue') await page.getByRole('region', { name: '매출대상 상세' }).waitFor();
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      if (isStatus) {
        const content = page.getByTestId('sales-status-content');
        const status = page.getByRole('status');
        if (width !== 375 && kind !== 'plan-status') await page.getByRole('button', { name: '조회', exact: true }).click();
        if (width === 375 || kind !== 'plan-status') {
          await status.waitFor();
          const gap = await status.evaluate((node) => getComputedStyle(node.parentElement).paddingBottom);
          assert.equal(gap, '16px');
          await page.screenshot({ path: `${output}${kind}-visible-${width}.png` });
          await status.getByRole('button', { name: 'Close' }).click();
        }
        assert.deepEqual(await content.evaluate((node) => {
          const s = getComputedStyle(node);
          return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
        }), ['16px', '16px', '16px', '16px']);
      } else if (labels[kind]) {
        const label = labels[kind];
        assert.deepEqual(await page.getByRole('region', { name: `${label} 입력 내용` }).evaluate((node) => {
          const s = getComputedStyle(node);
          return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
        }), ['16px', '16px', '16px', '16px']);
        assert.deepEqual(await page.getByRole('grid', { name: `${label} 상세 목록` }).evaluate((node) => {
          const s = getComputedStyle(node.parentElement);
          return [s.paddingLeft, s.paddingRight];
        }), ['16px', '16px']);
      } else if (kind === 'destination') {
        for (const name of ['거래처 목록', '납품처 목록']) {
          assert.equal(await page.getByRole('grid', { name }).evaluate((node) =>
            getComputedStyle(node.closest('.MuiCard-root')).borderTopWidth), '1px');
        }
      } else {
        assert.deepEqual(await page.getByRole('region', { name: '매출대상 상세' }).evaluate((node) => {
          const s = getComputedStyle(node.parentElement);
          return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
        }), ['16px', '16px', '16px', '16px']);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.screenshot({ path: `${output}${kind}-${width}.png` });
      if (labels[kind]) {
        const label = labels[kind];
        await page.getByRole('grid', { name: `${label} 상세 목록` }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${output}${kind}-grid-${width}.png` });
      }
    }
    await page.close();
  }
  console.log('Sales spacing browser checks passed.');
} finally {
  await browser.close();
}
