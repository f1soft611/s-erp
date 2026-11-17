import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4173';
const output = new URL('../../docs/result/20261117/quotation-common-code/screenshots/', import.meta.url);
const codes = {
  INCOTERMS: [{ itemCode: 'FOB', itemNm: 'FOB 인도조건' }],
  PAYMENT_TERM: [{ itemCode: 'NET30', itemNm: '30일 결제' }],
  CURRENCY: [{ itemCode: 'KRW', itemNm: '원화' }],
  ITEM_UNIT: [{ itemCode: 'G', itemNm: '그램' }, { itemCode: 'KG', itemNm: '킬로그램' }],
};
const groupCodes = Object.keys(codes);
const quotation = {
  quotationId: 21, quotationNo: 'QT-TEST', quotationDt: '2026-11-17', submitDt: null,
  customerId: 10, customerCode: 'C10', customerName: '검증 거래처', writer: true,
  incoterms: null, paymentTerm: null, currencyCode: null,
  supplyAmt: 200, vatAmt: 20, totalAmt: 220,
  details: [{ quotationDetailId: 31, lineNo: 1, materialId: 20, materialCode: 'M20',
    materialName: '검증 품목', materialSpec: '규격', unit: 'G',
    quotationQty: 2, unitPrice: 100, lineAmt: 200 }],
};

async function mount(page, mode, legacy = false) {
  await page.route('**/__quotation-code-test', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}*,*::before,*::after{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
  }));
  await page.addInitScript(() => localStorage.setItem('s-erp-auth', JSON.stringify({
    tenantCode: 'SYNTHETIC', userId: 'test', accessToken: 'synthetic-token',
    refreshToken: '', expiresAt: new Date(Date.now() + 3600000).toISOString(),
  })));
  const state = { payload: null };
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let result = { resultList: [] };
    if (path === '/api/v1/common/system-date') result = { today: '2026-11-17' };
    if (path === '/api/v1/co/master/common-code/groups') result = {
      resultList: groupCodes.map((groupCode, index) => ({
        commonCodeGroupId: index + 1, groupCode, useAt: 'Y',
      })),
    };
    const groupMatch = path.match(/common-code\/groups\/(\d+)\/items$/);
    if (groupMatch) result = {
      resultList: [
        ...codes[groupCodes[Number(groupMatch[1]) - 1]].map((item, index) => ({
          ...item, sortOrder: index, useAt: 'Y',
        })),
        { itemCode: 'OFF', itemNm: '비활성 코드', sortOrder: 0, useAt: 'N' },
      ],
    };
    if (path === '/api/v1/sales/quotations/21') {
      if (request.method() === 'PUT') state.payload = request.postDataJSON();
      result = { item: {
        ...quotation,
        ...(legacy ? { incoterms: '과거 인도조건', paymentTerm: '월말', currencyCode: 'OLD' } : {}),
        ...(state.payload ?? {}),
        details: state.payload?.details.map((detail) => ({
          ...detail, quotationDetailId: 31, lineNo: 1, lineAmt: 200,
        })) ?? quotation.details,
      } };
    }
    return route.fulfill({ status: 200, headers, contentType: 'application/json',
      body: JSON.stringify({ resultCode: 200, result }) });
  });
  await page.goto(`${origin}/__quotation-code-test`);
  await page.evaluate(async (screenMode) => {
    const { default: RefreshRuntime } = await import('/@react-refresh');
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const React = (await import('/node_modules/.vite/deps/react.js')).default;
    const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const { QuotationCreatePage } = await import('/src/pages/sales/quotation/create/QuotationCreatePage.tsx');
    const routerUrl = performance.getEntriesByType('resource').map((entry) => entry.name)
      .find((url) => url.includes('/node_modules/.vite/deps/react-router-dom.js?v='));
    if (!routerUrl) throw new Error('React Router module not found');
    const { createMemoryRouter, RouterProvider } = await import(routerUrl);
    const element = React.createElement(QuotationCreatePage, {
      selectedModule: { id: 'sales', name: '영업관리', tree: [], menus: [] },
      currentMenuName: '견적서작성', content: { title: '견적서작성', description: '', cards: [], items: [] },
      breadcrumbItems: ['영업관리', '견적관리', '견적서작성'],
      selectedMenuPermissions: { read: true, create: true, update: true, delete: true },
      mode: screenMode, ...(screenMode === 'create' ? {} : { quotationId: 21 }),
    });
    const router = createMemoryRouter([{ path: '/', element }]);
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(RouterProvider, { router }));
  }, mode);
  await page.getByRole('region', { name: '견적 입력 내용' }).waitFor();
  await page.waitForFunction((screenMode) => {
    const select = document.querySelector('[role="combobox"]');
    return select && (screenMode === 'view' || select.getAttribute('aria-disabled') !== 'true');
  }, mode);
  if (mode !== 'create') {
    await page.getByRole('textbox', { name: '견적번호', exact: true })
      .filter({ visible: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('input')?.value === 'QT-TEST');
  }
  return state;
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const state = await mount(page, 'edit');
    for (const [label, option] of [
      ['Incoterms', 'FOB 인도조건'], ['결제조건', '30일 결제'], ['화폐단위', '원화'],
    ]) {
      await page.getByRole('combobox', { name: label, exact: true }).click();
      assert.equal(await page.getByRole('option', { name: '비활성 코드' }).count(), 0);
      await page.getByRole('option', { name: option, exact: true }).click();
    }
    const grid = page.getByRole('grid', { name: '견적 상세 목록' });
    if (width === 1280) {
      const unitCell = grid.getByRole('gridcell').filter({ hasText: /^그램$/ });
      await unitCell.dblclick();
      await grid.getByRole('combobox').click();
      await page.getByRole('option', { name: '킬로그램', exact: true }).click();
      await grid.getByRole('gridcell').filter({ hasText: /^킬로그램$/ }).waitFor();
    }
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth, document: document.documentElement.scrollWidth,
    }));
    assert.ok(dimensions.document <= dimensions.viewport, `page overflow at ${width}px`);
    await page.screenshot({ path: fileURLToPath(new URL(`quotation-codes-${width}.png`, output)),
      fullPage: true, animations: 'disabled' });
    const saved = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/sales/quotations/21') && response.request().method() === 'PUT');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await saved;
    assert.equal(state.payload.incoterms, 'FOB');
    assert.equal(state.payload.paymentTerm, 'NET30');
    assert.equal(state.payload.currencyCode, 'KRW');
    assert.equal(state.payload.details[0].materialId, 20);
    assert.equal(state.payload.details[0].unit, width === 1280 ? 'KG' : 'G');
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS ${width}px: API selects, label/code payload, unit and material link`);
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await mount(page, 'edit', true);
  await page.getByRole('combobox', { name: 'Incoterms', exact: true }).click();
  assert.equal(await page.getByRole('option', { name: '과거 인도조건' }).getAttribute('aria-disabled'), 'true');
  await page.keyboard.press('Escape');
  await page.screenshot({ path: fileURLToPath(new URL('quotation-codes-legacy.png', output)), fullPage: true });
  await page.close();
  console.log('PASS legacy: stored unregistered values preserved, not offered as new options');

  const createPage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await mount(createPage, 'create');
  for (const label of ['Incoterms', '결제조건', '화폐단위']) {
    assert.notEqual(await createPage.getByRole('combobox', { name: label, exact: true })
      .getAttribute('aria-disabled'), 'true');
  }
  await createPage.getByRole('button', { name: '상세 행 추가' }).click();
  const createGrid = createPage.getByRole('grid', { name: '견적 상세 목록' });
  await createGrid.getByRole('gridcell').nth(4).dblclick();
  await createGrid.getByRole('combobox').click();
  await createPage.getByRole('option', { name: '킬로그램', exact: true }).click();
  await createGrid.getByRole('gridcell').filter({ hasText: /^킬로그램$/ }).waitFor();
  await createPage.screenshot({
    path: fileURLToPath(new URL('quotation-codes-create.png', output)), fullPage: true,
  });
  await createPage.close();
  console.log('PASS create: new manual row can select a common-code unit');

  const viewPage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await mount(viewPage, 'view', true);
  for (const label of ['Incoterms', '결제조건', '화폐단위']) {
    assert.equal(await viewPage.getByRole('combobox', { name: label, exact: true })
      .getAttribute('aria-disabled'), 'true');
  }
  const viewGrid = viewPage.getByRole('grid', { name: '견적 상세 목록' });
  await viewGrid.getByRole('gridcell').filter({ hasText: /^그램$/ }).dblclick();
  assert.equal(await viewGrid.getByRole('combobox').count(), 0);
  await viewPage.screenshot({
    path: fileURLToPath(new URL('quotation-codes-view.png', output)), fullPage: true,
  });
  await viewPage.close();
  console.log('PASS view: header selects and unit cells remain read-only');
} finally {
  await browser.close();
}
