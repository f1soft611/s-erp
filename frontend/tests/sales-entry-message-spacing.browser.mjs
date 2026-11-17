import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { deliveryBrowserItem, deliveryPlanItem, deliveryPlanSourceRows } from './fixtures/sales-delivery.browser-fixtures.mjs';

const output = fileURLToPath(new URL('../../docs/result/20261117/sales-entry-message-spacing/screenshots/', import.meta.url));
await mkdir(output, { recursive: true });
const order = {
  salesOrderId: 300, orderNo: 'SO-TEST', orderDt: '2026-11-17', customerId: 10,
  customerCode: 'C10', customerName: '검증 거래처', quotNo: null, deliveryDt: null,
  deliveryPlace: null, deliveryMethod: null, status: '수주등록', totalAmt: 220, remark: null,
  details: [{ salesOrderDetailId: 450, lineNo: 1, materialId: 20, materialCode: 'M20',
    materialName: '검증 품목', orderQty: 2, unitPrice: 100, supplyAmt: 200, vatAmt: 20,
    totalAmt: 220, deliveryDt: null, shippedQty: 0, lineStatus: '대기' }],
};
const quotation = {
  quotationId: 21, quotationNo: 'QT-TEST', quotationDt: '2026-11-17', submitDt: null,
  customerId: 10, customerCode: 'C10', customerName: '검증 거래처', customerReference: null,
  incoterms: null, paymentTerm: null, validTerm: null, currencyCode: null, remark: null,
  supplyAmt: 200, vatAmt: 20, totalAmt: 220, writer: true,
  details: [{ quotationDetailId: 31, lineNo: 1, materialId: 20, materialCode: 'M20',
    materialName: '검증 품목', materialSpec: null, unit: 'EA', quotationQty: 2, unitPrice: 100, lineAmt: 200, remark: null }],
};
const statement = {
  salesStatementId: 3, statementNo: 'TS-TEST', statementDt: '2026-11-17',
  salesDeliveryId: 1, deliveryNo: 'SD-TEST', deliveryDt: '2026-11-17', deliveryType: 'DIRECT',
  customerName: '검증 거래처', totalAmt: 220, remark: '',
  details: [{ salesStatementDetailId: 2, lineNo: 1, materialCode: 'M20', materialName: '검증 품목',
    materialSpec: null, unit: 'EA', deliveryQty: 2, unitPrice: 100, supplyAmt: 200, vatAmt: 20, totalAmt: 220 }],
};
const plan = { ...deliveryPlanItem, details: [deliveryPlanItem.details[0]] };
const source = { ...deliveryPlanSourceRows[0], remainingPlanQty: 0 };
const configurations = {
  order: { region: '수주 입력 내용', title: '수주 기본정보', ready: 'SO-TEST' },
  quotation: { region: '견적 입력 내용', title: '견적 기본정보', ready: 'QT-TEST' },
  delivery: { region: '출하 입력 내용', title: '출하 기본정보', ready: deliveryBrowserItem.deliveryNo },
  plan: { region: '출하계획 입력 내용', title: '출하계획 기본정보', ready: plan.planNo },
  statement: { region: '거래명세서 입력 내용', title: '거래명세서 기본정보', ready: 'TS-TEST' },
  orderValidation: { region: '수주 입력 내용', title: '수주 기본정보' },
};

const browser = await chromium.launch({ headless: true });
const results = {};
try {
  for (const [kind, config] of Object.entries(configurations)) {
    console.log(`Checking ${kind}`);
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('s-erp-auth', JSON.stringify({
      tenantCode: 'SYNTHETIC', userId: 'test', accessToken: 'synthetic-token',
      refreshToken: '', expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })));
    await page.route('**/__sales-message-test', (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}*,*::before,*::after{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
    }));
    let rejectUpdate = false;
    await page.route('**/api/**', (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (request.method() === 'PUT' && rejectUpdate) return route.fulfill({
        status: 500, headers, contentType: 'application/json',
        body: JSON.stringify({ resultCode: 500, resultMessage: '검증 오류 메시지' }),
      });
      let result = { items: [], resultList: [] };
      if (url.pathname === '/api/v1/common/system-date') result = { today: '2026-11-17' };
      else if (url.pathname === '/api/v1/sales/orders/300') result = { item: order };
      else if (url.pathname === '/api/v1/sales/quotations/21') result = { item: quotation };
      else if (url.pathname === '/api/v1/sales/deliveries/1') result = { item: deliveryBrowserItem };
      else if (url.pathname === '/api/v1/sales/statements/3') result = { item: statement };
      else if (url.pathname === '/api/v1/sales/delivery-plans/source-orders') result = { items: [source] };
      else if (url.pathname === '/api/v1/sales/delivery-plans/by-order/7'
        || url.pathname === '/api/v1/sales/delivery-plans/9') result = { item: plan };
      return route.fulfill({ status: 200, headers, contentType: 'application/json',
        body: JSON.stringify({ resultCode: 200, result }) });
    });
    await page.goto('http://127.0.0.1:4173/__sales-message-test');
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
      const routerUrl = performance.getEntriesByType('resource').map((entry) => entry.name)
        .find((url) => url.includes('/node_modules/.vite/deps/react-router-dom.js?v='));
      if (!routerUrl) throw new Error('Vite React Router module not found');
      const { createMemoryRouter, RouterProvider } = await import(routerUrl);
      const props = { selectedModule: { id: 'sales', name: '영업관리', tree: [], menus: [] },
        currentMenuName: '영업 등록', content: { title: '영업 등록', description: '', cards: [], items: [] },
        breadcrumbItems: ['영업관리', '영업 등록'],
        selectedMenuPermissions: { read: true, create: true, update: true, delete: true, excel: false } };
      const components = {
        order: React.createElement(SalesOrderCreatePage, { ...props, mode: 'edit', salesOrderId: 300 }),
        quotation: React.createElement(QuotationCreatePage, { ...props, mode: 'edit', quotationId: 21 }),
        delivery: React.createElement(SalesDeliveryCreatePage, { ...props, salesDeliveryId: 1 }),
        plan: React.createElement(SalesDeliveryPlanCreatePage, { ...props, deliveryPlanMode: 'AUTO' }),
        statement: React.createElement(SalesStatementCreatePage, { ...props, statementId: 3 }),
        orderValidation: React.createElement(SalesOrderCreatePage, { ...props }),
      };
      const router = createMemoryRouter([{ path: '/', element: components[screenKind] }]);
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(RouterProvider, { router }));
    }, kind);
    if (kind === 'plan') {
      await page.getByRole('button', { name: '수주 선택' }).click();
      const picker = page.getByRole('dialog', { name: '계획대상 수주 품목 선택' });
      await picker.getByRole('button', { name: '검색', exact: true }).click();
      await picker.getByRole('button', { name: 'SO-TEST-7' }).click();
    }
    if (config.ready) try {
      await page.waitForFunction((value) => [...document.querySelectorAll('input')].some((input) => input.value === value), config.ready);
    } catch (error) {
      console.error(await page.locator('body').innerText(), errors);
      throw error;
    }
    const save = page.getByRole('button', { name: kind === 'plan' ? '수정 저장' : '저장', exact: true });
    const change = async (value) => {
      if (kind === 'plan') {
        const grid = page.getByRole('grid', { name: '출하계획 상세 목록' });
        const cell = grid.getByRole('row').filter({ hasText: 'M20' }).first().getByRole('gridcell').nth(5);
        await cell.dblclick();
        await cell.locator('input').fill(value);
        await cell.locator('input').press('Enter');
      } else {
        await page.getByRole('textbox', { name: '비고', exact: true }).fill(value);
      }
    };
    const measure = async (severity) => {
      try {
        await page.locator(`.MuiAlert-${severity}`).first().waitFor();
      } catch (error) {
        console.error(kind, severity, await page.locator('body').innerText(), await page.locator('[role="alert"]').evaluateAll((items) => items.map((item) => item.className)), errors);
        throw error;
      }
      results[kind] ??= {};
      results[kind][severity] = {};
      for (const width of [375, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        const values = await page.evaluate(({ regionName, title, alertSeverity }) => {
          const region = document.querySelector(`[aria-label="${regionName}"]`);
          const alert = region.querySelector(`.MuiAlert-${alertSeverity}`);
          const heading = [...region.querySelectorAll('p,h1,h2,h3,h4,h5,h6,span,div')]
            .find((element) => element.textContent?.trim() === title);
          const paper = heading?.closest('.MuiPaper-root');
          if (!alert || !paper) throw new Error('Message or form was not found');
          const bounds = (element) => element.getBoundingClientRect();
          const r = bounds(region), a = bounds(alert), p = bounds(paper);
          return { left: a.left - r.left, right: r.right - a.right,
            top: a.top - r.top, bottom: p.top - a.bottom, overflow: document.documentElement.scrollWidth > window.innerWidth };
        }, { regionName: config.region, title: config.title, alertSeverity: severity });
        results[kind][severity][width] = values;
        await page.screenshot({ path: path.join(output, `${kind}-${severity}-${width}.png`) });
      }
      await page.setViewportSize({ width: 1280, height: 900 });
    };
    if (kind === 'orderValidation') {
      await save.click();
      await page.getByText('품목 상세를 1건 이상 입력해 주세요.').waitFor();
      await measure('colorError');
      assert.deepEqual(errors, [], `${kind} browser errors`);
      await page.close();
      continue;
    }
    await change(kind === 'plan' ? '9' : '성공 검증');
    await save.click();
    await measure('colorSuccess');
    rejectUpdate = true;
    await change(kind === 'plan' ? '11' : '오류 검증');
    await save.click();
    await measure('colorError');
    assert.deepEqual(errors, [], `${kind} browser errors`);
    await page.close();
  }
  for (const kind of Object.keys(configurations).filter((value) => value !== 'orderValidation')) {
    for (const severity of ['colorSuccess', 'colorError']) {
      for (const width of [375, 768, 1280]) {
        const reference = severity === 'colorError'
          ? results.orderValidation.colorError[width] : results.order.colorSuccess[width];
        const actual = results[kind][severity][width];
        for (const side of ['left', 'right', 'top', 'bottom']) {
          assert.ok(Math.abs(actual[side] - reference[side]) <= 1,
            `${kind} ${severity} ${width}px ${side}: ${JSON.stringify({ reference, actual })}`);
        }
        assert.equal(actual.overflow, false, `${kind} ${width}px overflow`);
      }
    }
  }
  console.log('All sales entry message margins match the order screen at 375, 768, and 1280px.');
} finally {
  await browser.close();
}
