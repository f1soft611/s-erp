import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { deliveryPlanItem, deliveryPlanSourceRows, installSalesDeliveryBrowserMocks } from './fixtures/sales-delivery.browser-fixtures.mjs';

const output = fileURLToPath(new URL('../../docs/result/20261117/delivery-plan-split/screenshots/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1280, 768, 375]) {
    const page = await browser.newPage({ viewport: { width: Math.max(width, 768), height: 900 } });
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/__plan-split-test', (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}*,*::before,*::after{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
    }));
    await installSalesDeliveryBrowserMocks(page);
    const source = { ...deliveryPlanSourceRows[0], remainingPlanQty: 0 };
    const initial = { ...deliveryPlanItem, details: [deliveryPlanItem.details[0]] };
    const saved = { ...initial, details: [
      { ...initial.details[0], plannedQty: 5, deliveredQty: 2 },
      { ...initial.details[0], salesDeliveryPlanDetailId: 91, planDt: null, plannedQty: 5, deliveredQty: 0 },
    ] };
    await page.route('**/api/v1/sales/delivery-plans/**', (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const result = url.pathname.endsWith('/source-orders') ? { items: [source] }
        : url.pathname.endsWith('/by-order/7') ? { item: initial }
          : { item: saved };
      return route.fulfill({
        status: 200, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' },
        body: JSON.stringify({ resultCode: 200, result }),
      });
    });
    await page.goto('http://127.0.0.1:4173/__plan-split-test');
    await page.evaluate(async () => {
      const { default: RefreshRuntime } = await import('/@react-refresh');
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const { SalesDeliveryPlanCreatePage } = await import('/src/pages/sales/shipment/deliveryplan/create/SalesDeliveryPlanCreatePage.tsx');
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(SalesDeliveryPlanCreatePage, {
        selectedModule: { id: 'sales', tree: [] }, currentMenuName: '출하계획등록',
        content: { title: '출하계획등록', description: '', cards: [], items: [] },
        breadcrumbItems: ['영업관리', '출하계획등록'],
        selectedMenuPermissions: { read: true, create: true, update: true, delete: false, excel: false },
        deliveryPlanMode: 'AUTO',
      }));
    });
    await page.getByRole('button', { name: '수주 선택' }).click();
    const picker = page.getByRole('dialog', { name: '계획대상 수주 품목 선택' });
    await picker.getByRole('button', { name: '검색', exact: true }).click();
    await picker.getByRole('button', { name: 'SO-TEST-7' }).click();
    await page.getByRole('button', { name: '수정 저장' }).waitFor();
    const grid = page.getByRole('grid', { name: '출하계획 상세 목록' });
    await grid.getByText('M20', { exact: true }).waitFor();
    await page.setViewportSize({ width, height: 900 });
    if (width < 768) await page.setViewportSize({ width: 768, height: 900 });
    const itemRows = () => grid.getByRole('row').filter({ has: page.getByRole('button', { name: '분할', exact: true }) });
    const cell = (row) => itemRows().nth(row).getByRole('gridcell').nth(5);
    const edit = async (row, value) => {
      const target = cell(row);
      await target.dblclick();
      const input = target.locator('input');
      await input.fill(value);
      await input.press('Enter');
    };
    await edit(0, '11');
    await page.getByRole('button', { name: '수정 저장' }).click();
    const alert = page.getByRole('alert');
    await alert.getByText('계획수량 합계가 수주수량을 초과했습니다.').waitFor();
    await page.setViewportSize({ width, height: 900 });
    const spacing = await page.evaluate(() => {
      const region = document.querySelector('[aria-label="출하계획 입력 내용"]');
      const alert = region.querySelector('[role="alert"]');
      const paper = region.querySelector(':scope > .MuiPaper-root:not(.MuiAlert-root)');
      const box = (element) => element.getBoundingClientRect();
      return { top: box(alert).top - box(region).top, bottom: box(paper).top - box(alert).bottom,
        alertLeft: box(alert).left, alertRight: box(alert).right,
        paperLeft: box(paper).left, paperRight: box(paper).right,
        overflow: document.documentElement.scrollWidth > window.innerWidth };
    });
    assert.ok(Math.abs(spacing.top - 8) <= 1 && Math.abs(spacing.bottom - 16) <= 1, JSON.stringify(spacing));
    assert.ok(Math.abs(spacing.alertLeft - spacing.paperLeft) <= 1, JSON.stringify(spacing));
    assert.ok(Math.abs(spacing.paperRight - spacing.alertRight) <= 1, JSON.stringify(spacing));
    assert.equal(spacing.overflow, false);
    await page.screenshot({ path: path.join(output, `plan-error-${width}.png`), fullPage: true });
    if (width < 768) await page.setViewportSize({ width: 768, height: 900 });
    await edit(0, '5');
    await grid.getByRole('button', { name: '분할', exact: true }).click();
    await edit(1, '5');
    const save = page.waitForRequest((request) =>
      new URL(request.url()).pathname === '/api/v1/sales/delivery-plans/9' && request.method() === 'PUT');
    await page.getByRole('button', { name: '수정 저장' }).click();
    assert.deepEqual((await save).postDataJSON().details.map((row) => row.plannedQty), [5, 5]);
    await page.getByText(/출하계획이 수정되었습니다/).waitFor();
    const rows = itemRows();
    assert.equal(await rows.nth(0).getByRole('button', { name: '분할', exact: true }).isDisabled(), true);
    assert.equal(await rows.nth(1).getByRole('button', { name: '분할', exact: true }).isEnabled(), true);
    await edit(1, '6');
    await page.getByRole('button', { name: '수정 저장' }).click();
    assert.equal(await page.getByText(/출하계획이 수정되었습니다/).count(), 0);
    await page.getByText('계획수량 합계가 수주수량을 초과했습니다.').waitFor();
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`plan split and message spacing: ${width}px`);
  }
} finally {
  await browser.close();
}
