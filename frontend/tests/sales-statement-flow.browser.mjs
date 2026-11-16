import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const screenshotDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  process.env.SALES_STATEMENT_FLOW_SCREENSHOT_DIRECTORY
    || '../../docs/result/20261116/sales-source-layout/screenshots',
);
await mkdir(screenshotDirectory, { recursive: true });

const source = {
  salesDeliveryId: 1, deliveryNo: 'SD-TEST-1', deliveryDt: '2026-11-16',
  deliveryType: 'DIRECT', customerName: '검증 거래처', totalAmt: 220,
};
const detail = {
  salesStatementDetailId: 2, lineNo: 1, materialCode: 'M-TEST', materialName: '검증 품목',
  materialSpec: 'TEST', unit: 'EA', deliveryQty: 2, unitPrice: 100, supplyAmt: 200, vatAmt: 20, totalAmt: 220,
};
let item = {
  ...source, salesStatementId: 3, statementNo: 'TS-TEST-1', statementDt: '2026-11-16',
  orderNo: null, supplierName: '검증 공급자', customerCode: 'C-TEST', remark: '',
  createdByName: '검증 작성자', details: [detail],
};
const requests = [];
const unexpectedRequests = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.setDefaultTimeout(15000);

async function mount(kind) {
  await page.evaluate(async (pageKind) => {
    const { default: RefreshRuntime } = await import('/@react-refresh');
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const React = (await import('/node_modules/.vite/deps/react.js')).default;
    const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const { SalesStatementCreatePage } = await import('/src/pages/sales/shipment/statement/create/SalesStatementCreatePage.tsx');
    const { SalesStatementStatusPage } = await import('/src/pages/sales/shipment/statement/status/SalesStatementStatusPage.tsx');
    const routerUrl = performance.getEntriesByType('resource')
      .map((entry) => entry.name)
      .find((url) => url.includes('/node_modules/.vite/deps/react-router-dom.js?v='));
    if (!routerUrl) throw new Error('Could not resolve the Vite-loaded React Router module.');
    const { createMemoryRouter, RouterProvider } = await import(routerUrl);
    const permissions = { read: true, create: true, update: true, delete: true, excel: false };
    const props = {
      selectedModule: { id: 'sales', tree: [{ pageKey: 'statement-create', permissions }] },
      currentMenuName: '거래명세서', content: { title: '거래명세서', description: '', cards: [], items: [] },
      breadcrumbItems: ['영업관리', '출하관리', '거래명세서'],
      selectedMenuPermissions: permissions,
    };
    window.__statementRoot?.unmount();
    window.__statementRoot = ReactDOM.createRoot(document.getElementById('root'));
    const component = pageKind === 'create' ? SalesStatementCreatePage : SalesStatementStatusPage;
    const router = createMemoryRouter([{ path: '/', element: React.createElement(component, props) }]);
    window.__statementRoot.render(React.createElement(RouterProvider, { router }));
  }, kind);
}

async function screenshot(name, width) {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
    `Unexpected page-level horizontal overflow at ${width}px.`,
  );
  await page.screenshot({ path: path.join(screenshotDirectory, `statement-${name}-${width}px.png`), fullPage: true });
}

try {
  await page.addInitScript(() => {
    localStorage.setItem('s-erp-auth', JSON.stringify({
      tenantCode: 'SYNTHETIC', userId: 'statement-browser-test', accessToken: 'synthetic-token',
      refreshToken: '', expiresAt: new Date(Date.now() + 3600000).toISOString(),
    }));
  });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const headers = {
      'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*',
    };
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const body = request.postDataJSON();
    requests.push({ path: url.pathname, method, body });
    const reply = (result) => route.fulfill({
      headers, contentType: 'application/json', body: JSON.stringify({ resultCode: 200, result }),
    });
    const base = '/api/v1/sales/statements';
    if (url.pathname === `${base}/source-deliveries`) return reply({ items: [source] });
    if (url.pathname === '/api/v1/sales/deliveries/1') return reply({ item: {
      ...source, customerId: 5, customerCode: 'C-TEST', salesOrderId: null, orderNo: null,
      deliveryPlace: '', deliveryMethod: '', remark: '',
      details: [{ ...detail, salesDeliveryDetailId: 2, materialId: 4, salesOrderDetailId: null, salesDeliveryPlanDetailId: null }],
    } });
    if (url.pathname === base && method === 'POST' || url.pathname === `${base}/3` && method === 'PUT') {
      item = { ...item, ...body };
      return reply({ item });
    }
    if (url.pathname === `${base}/3`) return reply({ item });
    if (url.pathname === `${base}/status`) return reply({ items: [{
      ...detail, salesStatementId: 3, statementNo: item.statementNo, statementDt: item.statementDt,
      deliveryNo: source.deliveryNo, customerCode: 'C-TEST', customerName: source.customerName, lineTotalAmt: 220,
    }] });
    unexpectedRequests.push(`${method} ${url.pathname}`);
    return route.abort();
  });
  await page.route('**/__statement-source-layout-test', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}*,*::before,*::after{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
  }));
  await page.goto('http://127.0.0.1:4173/__statement-source-layout-test');

  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await mount('create');
    await page.getByRole('button', { name: '출하 선택' }).click();
    const picker = page.getByRole('dialog', { name: '출하 선택', exact: true });
    await picker.getByRole('button', { name: '검색', exact: true }).click();
    await picker.getByRole('button', { name: source.deliveryNo }).click();
    await page.waitForFunction((value) =>
      Array.from(document.querySelectorAll('input')).some((input) => input.value === value), source.deliveryNo);
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.waitForFunction((value) =>
      Array.from(document.querySelectorAll('input')).some((input) => input.value === value), item.statementNo);
    await screenshot('create', width);

    await mount('status');
    await page.getByRole('button', { name: `${item.statementNo} 상세 보기` }).click();
    const panel = page.getByRole('region', { name: '거래명세서 상세', exact: true });
    await panel.getByRole('table', { name: '거래명세서 품목 목록' }).waitFor();
    await screenshot('detail', width);
    await panel.getByRole('button', { name: '거래명세서 더보기' }).click();
    await page.getByRole('menuitem', { name: '수정', exact: true }).click();
    const editor = page.getByRole('dialog', { name: '거래명세서 수정', exact: true });
    await editor.getByLabel('명세번호', { exact: true }).waitFor();
    await page.waitForFunction((value) =>
      Array.from(document.querySelectorAll('input')).some((input) => input.value === value), item.statementNo);
    const remark = `Synthetic edit ${width}`;
    await editor.getByLabel('비고', { exact: true }).fill(remark);
    await editor.getByRole('button', { name: '저장', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
    await panel.getByText(`비고: ${remark}`, { exact: true }).waitFor();
    await panel.getByRole('button', { name: '거래명세서 더보기' }).click();
    await page.getByRole('menuitem', { name: '출력', exact: true }).click();
    const preview = page.getByRole('dialog', { name: '거래명세표 미리보기' });
    await preview.waitFor();
    assert.equal(await preview.locator('.statement-print-copy').count(), 2);
    await screenshot('print', width);
    await preview.getByTestId('common-dialog-actions').getByRole('button', { name: '닫기', exact: true }).click();
  }
  assert.equal(requests.filter((request) => request.method === 'POST').length, 3);
  assert.equal(requests.filter((request) => request.method === 'PUT').length, 3);
  assert.deepEqual(unexpectedRequests, [], 'All API calls must use known synthetic responses.');
  assert.deepEqual(errors, [], 'Rendering should not produce uncaught page errors.');
  console.log('Statement create/status/edit/print checks passed at 375px, 768px, and 1280px.');
} finally {
  await browser.close();
}
