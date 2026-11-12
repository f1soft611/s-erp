import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSalesDeliveryBrowserMocks } from './fixtures/sales-delivery.browser-fixtures.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const screenshotDirectory = path.resolve(
  scriptDirectory,
  '../../docs/result/20261112/sales-delivery-item-flow/screenshots',
);
const sourcePrefix = process.env.SALES_DELIVERY_ITEM_FLOW_SOURCE_PREFIX || '/src';
await mkdir(screenshotDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageErrors = [];
page.setDefaultTimeout(15000);
page.on('pageerror', (error) => pageErrors.push(error.message));

async function mount(kind) {
  await page.evaluate(async ({ pageKind, sourceRoot }) => {
    const { default: RefreshRuntime } = await import('/@react-refresh');
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const React = (await import('/node_modules/.vite/deps/react.js')).default;
    const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const { NotificationProvider } = await import(`${sourceRoot}/shared/context/NotificationContext.tsx`);
    const { SalesDeliveryPlanCreatePage } = await import(`${sourceRoot}/pages/sales/delivery-plan/create/SalesDeliveryPlanCreatePage.tsx`);
    const { SalesDeliveryPlanStatusPage } = await import(`${sourceRoot}/pages/sales/delivery-plan/status/SalesDeliveryPlanStatusPage.tsx`);
    const { SalesDeliveryCreatePage } = await import(`${sourceRoot}/pages/sales/delivery/create/SalesDeliveryCreatePage.tsx`);
    const routerUrl = performance.getEntriesByType('resource')
      .map((entry) => entry.name)
      .find((url) => url.includes('/node_modules/.vite/deps/react-router-dom.js?v='));
    if (!routerUrl) throw new Error('Could not resolve the Vite-loaded React Router module.');
    const { createMemoryRouter, RouterProvider } = await import(routerUrl);
    const props = {
      selectedModule: { id: 'sales', tree: [] },
      currentMenuName: '출하 품목 기준 검증',
      content: { title: '출하 품목 기준 검증', description: '합성 브라우저 검증', cards: [], items: [] },
      breadcrumbItems: ['영업관리', '출하 품목 기준 검증'],
      selectedMenuPermissions: { read: true, create: true, update: true, delete: true, excel: false },
    };
    const components = {
      plan: React.createElement(SalesDeliveryPlanCreatePage, { ...props, deliveryPlanMode: 'MANUAL' }),
      status: React.createElement(SalesDeliveryPlanStatusPage, props),
      delivery: React.createElement(SalesDeliveryCreatePage, props),
    };
    window.__salesDeliveryRoot?.unmount();
    window.__salesDeliveryRoot = ReactDOM.createRoot(document.getElementById('root'));
    const router = createMemoryRouter([{ path: '/', element: components[pageKind] }]);
    window.__salesDeliveryRoot.render(
      React.createElement(NotificationProvider, null, React.createElement(RouterProvider, { router })),
    );
  }, { pageKind: kind, sourceRoot: sourcePrefix });
}

try {
  await page.route('**/__sales-delivery-item-flow-test', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}*,*::before,*::after{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
  }));
  const { requests } = await installSalesDeliveryBrowserMocks(page);
  await page.goto('http://127.0.0.1:4173/__sales-delivery-item-flow-test');

  await mount('plan');
  await page.getByRole('button', { name: '수주 선택' }).click();
  const planPicker = page.getByRole('dialog', { name: '계획대상 수주 품목 선택' });
  await planPicker.getByRole('button', { name: '검색', exact: true }).click();
  const planSourceGrid = planPicker.getByRole('grid', { name: '계획대상 수주 품목 목록' });
  const firstPlanRow = planSourceGrid.getByRole('row').filter({ hasText: 'M20' });
  const otherOrderRow = planSourceGrid.getByRole('row').filter({ hasText: 'M30' });
  await firstPlanRow.getByRole('checkbox').click();
  await otherOrderRow.getByRole('checkbox').click();
  await planPicker.getByRole('button', { name: '선택', exact: true }).click();
  const planSave = page.waitForRequest((request) =>
    new URL(request.url()).pathname === '/api/v1/sales/delivery-plans' && request.method() === 'POST',
  );
  await page.getByRole('button', { name: '저장', exact: true }).click();
  const planRequest = (await planSave).postDataJSON();
  assert.deepEqual(
    planRequest.details.map((detail) => detail.salesOrderDetailId),
    [70, 80],
    'Only explicitly checked order-detail rows should be saved in the plan.',
  );

  await mount('status');
  const statusGrid = page.getByRole('grid', { name: '출하계획 현황 목록' });
  await statusGrid.getByText('M20', { exact: true }).waitFor();
  assert.equal(await statusGrid.getByText('M30', { exact: true }).count(), 1);
  assert.equal(await statusGrid.getByRole('row').count(), 3, 'One plan should show two item-detail rows.');

  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await mount('delivery');
    await page.getByRole('region', { name: '출하 입력 내용' }).waitFor();
    await page.getByRole('combobox', { name: '출하구분' }).click();
    await page.getByRole('option', { name: '수주출하' }).click();
    await page.getByRole('button', { name: '수주 선택' }).click();
    const deliveryPicker = page.getByRole('dialog', { name: '수주 선택' });
    await deliveryPicker.getByRole('button', { name: '검색', exact: true }).click();
    const sourceGrid = deliveryPicker.getByRole('grid', { name: '출하 대상 수주 목록' });
    const selectedRow = sourceGrid.getByRole('row').filter({ hasText: 'M20' });
    await selectedRow.getByRole('checkbox').click();
    const selectButton = deliveryPicker.getByRole('button', { name: '선택', exact: true });
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const button = Array.from(dialog?.querySelectorAll('button') ?? [])
        .find((item) => item.textContent?.trim() === '선택');
      return Boolean(button && !button.disabled);
    });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `Unexpected page-level horizontal overflow at ${width}px.`,
    );
    const dialogBox = await deliveryPicker.boundingBox();
    assert.ok(dialogBox && dialogBox.x >= 0 && dialogBox.x + dialogBox.width <= width + 1);
    await page.screenshot({
      path: path.join(screenshotDirectory, `delivery-picker-${width}px.png`),
      fullPage: true,
    });
    await selectButton.click();
    const deliveryGrid = page.getByRole('grid', { name: '출하 상세 목록' });
    await deliveryGrid.getByText('M20', { exact: true }).waitFor();
    assert.equal(await deliveryGrid.getByText('M21', { exact: true }).count(), 0);
    assert.equal(await deliveryGrid.getByText('M30', { exact: true }).count(), 0);
    if (width === 375) {
      const deliverySave = page.waitForRequest((request) =>
        new URL(request.url()).pathname === '/api/v1/sales/deliveries' && request.method() === 'POST',
      );
      await page.getByRole('button', { name: '저장', exact: true }).click();
      const deliveryRequest = (await deliverySave).postDataJSON();
      assert.deepEqual(
        deliveryRequest.details.map((detail) => detail.salesDeliveryPlanDetailId),
        [700],
        'The delivery payload must not expand the checked plan detail to sibling rows.',
      );
    }
  }

  assert.deepEqual(pageErrors, [], 'Browser rendering should not produce uncaught page errors.');
  assert.ok(requests.some((request) => request.path === '/api/v1/sales/delivery-plans/status'));
  console.log('Sales delivery item-level browser checks passed at 375px, 768px, and 1280px.');
} finally {
  await browser.close();
}
