import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const output = new URL('../../docs/result/20261117/quotation-status-consistency/screenshots/', import.meta.url);
const quotation = {
  quotationId: 21, quotationNo: 'QT-TEST', quotationDt: '2026-11-17', submitDt: '2026-11-18',
  customerId: 10, customerCode: 'C10', customerName: '검증 거래처', writer: true,
  createdBy: 'test', createdByName: '검증 작성자', createdAt: '2026-11-17 10:00',
  incoterms: 'FOB', paymentTerm: 'NET30', currencyCode: 'KRW',
  supplyAmt: 200, vatAmt: 20, totalAmt: 220,
  details: [{ quotationDetailId: 31, lineNo: 1, materialId: 20, materialCode: 'M20',
    materialName: '검증 품목', materialSpec: '규격', unit: 'KG',
    quotationQty: 2, unitPrice: 100, lineAmt: 200 }],
};
const row = { ...quotation, ...quotation.details[0] };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    const requests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('s-erp-auth', JSON.stringify({
      tenantCode: 'SYNTHETIC', userId: 'test', accessToken: 'synthetic-token',
      refreshToken: '', expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })));
    await page.route('**/__quotation-status-test', (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}*,*::before,*::after{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
    }));
    await page.route('**/api/**', (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      let result = { resultList: [] };
      if (url.pathname === '/api/v1/common/system-date') result = { today: '2026-11-17' };
      if (url.pathname === '/api/v1/sales/quotation-status') {
        requests.push(url);
        result = { resultList: [row], resultCnt: 1 };
      }
      if (url.pathname === '/api/v1/sales/quotations/21') result = { item: quotation };
      const groups = ['INCOTERMS', 'PAYMENT_TERM', 'CURRENCY', 'ITEM_UNIT'];
      if (url.pathname.endsWith('/common-code/groups')) result = {
        resultList: groups.map((groupCode, index) => ({ commonCodeGroupId: index + 1, groupCode, useAt: 'Y' })),
      };
      const match = url.pathname.match(/common-code\/groups\/(\d+)\/items$/);
      if (match) {
        const code = ['FOB', 'NET30', 'KRW', 'KG'][Number(match[1]) - 1];
        result = { resultList: [{ itemCode: code, itemNm: code, sortOrder: 1, useAt: 'Y' }] };
      }
      return route.fulfill({ status: 200, headers, contentType: 'application/json',
        body: JSON.stringify({ resultCode: 200, result }) });
    });
    await page.goto('http://127.0.0.1:4173/__quotation-status-test');
    await page.evaluate(async () => {
      const { default: RefreshRuntime } = await import('/@react-refresh');
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const { QuotationStatusPage } = await import('/src/pages/sales/quotation/status/QuotationStatusPage.tsx');
      const { createAppTheme } = await import('/src/theme/theme.ts');
      const resources = performance.getEntriesByType('resource').map((entry) => entry.name);
      const routerUrl = resources.find((url) => url.includes('/node_modules/.vite/deps/react-router-dom.js?v='));
      const muiUrl = resources.find((url) => url.includes('/node_modules/.vite/deps/@mui_material.js?v='));
      if (!routerUrl || !muiUrl) throw new Error('Vite framework modules missing');
      const { createMemoryRouter, RouterProvider } = await import(routerUrl);
      const { ThemeProvider } = await import(muiUrl);
      const permissions = { read: true, create: true, update: true, delete: true };
      const element = React.createElement(QuotationStatusPage, {
        selectedModule: { id: 'sales', name: '영업관리', menus: [], tree: [{
          id: 'create', name: '견적서작성', pageKey: 'quotation-create', permissions,
        }] },
        currentMenuName: '견적현황', content: { title: '견적현황', description: '', cards: [], items: [] },
        breadcrumbItems: ['영업관리', '견적관리', '견적현황'], selectedMenuPermissions: permissions,
      });
      const router = createMemoryRouter([{ path: '/', element }]);
      ReactDOM.createRoot(document.getElementById('root')).render(
        React.createElement(ThemeProvider, { theme: createAppTheme() },
          React.createElement(RouterProvider, { router })),
      );
    });
    const keyword = page.getByRole('textbox', { name: '견적현황 빠른 검색' });
    await keyword.waitFor();
    await page.getByRole('button', { name: 'QT-TEST 상세 보기' }).waitFor();
    await keyword.fill(' M20 ');
    const searched = page.waitForResponse((response) =>
      new URL(response.url()).searchParams.get('keyword') === 'M20');
    await keyword.press('Enter');
    await searched;
    await page.getByRole('button', { name: '조회', exact: true }).waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('button')]
      .some((button) => button.textContent.trim() === '조회' && !button.disabled));
    const last = requests.at(-1);
    assert.equal(last.searchParams.get('quotationDtFrom'), '2026-10-17');
    assert.equal(last.searchParams.get('quotationDtTo'), '2026-11-17');
    assert.equal(last.searchParams.get('keyword'), 'M20');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({ path: fileURLToPath(new URL(`status-search-${width}.png`, output)),
      fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'QT-TEST 상세 보기' }).click();
    const more = page.getByRole('button', { name: '견적 더보기' });
    assert.equal(await more.locator('svg').count(), 1);
    await more.click();
    await page.getByRole('menuitem', { name: '자세히보기' }).waitFor();
    await page.screenshot({ path: fileURLToPath(new URL(`status-more-${width}.png`, output)),
      fullPage: true, animations: 'disabled' });
    await page.getByRole('menuitem', { name: '자세히보기' }).click();
    const dialog = page.getByRole('dialog', { name: '견적 상세보기', exact: true });
    await dialog.waitFor();
    for (const label of ['견적작성일', '견적제출일']) {
      const input = dialog.getByRole('textbox', { name: label, exact: true });
      await input.waitFor();
      assert.equal(await input.isDisabled(), true);
      const color = await input.evaluate((element) => {
        const root = element.closest('.MuiInputBase-root');
        return { disabled: root.classList.contains('Mui-disabled'), color: getComputedStyle(root).backgroundColor };
      });
      assert.equal(color.disabled, true);
      const referenceColor = await dialog.getByRole('textbox', { name: '참조', exact: true })
        .evaluate((element) => getComputedStyle(element.closest('.MuiInputBase-root')).backgroundColor);
      assert.equal(color.color, referenceColor);
      assert.notEqual(color.color, 'rgba(0, 0, 0, 0)');
      assert.equal(await dialog.getByRole('button', { name: `${label} 달력 열기` }).isDisabled(), true);
    }
    await page.screenshot({ path: fileURLToPath(new URL(`status-view-${width}.png`, output)), fullPage: true });
    await dialog.getByRole('button', { name: '닫기', exact: true }).last().click();
    await more.click();
    await page.getByRole('menuitem', { name: '수정', exact: true }).click();
    const edit = page.getByRole('dialog', { name: '견적 수정', exact: true });
    const editableDate = edit.getByRole('textbox', { name: '견적작성일', exact: true });
    await editableDate.waitFor();
    await page.waitForFunction(() => {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      return dialogs.some((node) => [...node.querySelectorAll('input')]
        .some((input) => input.getAttribute('aria-label') === '견적작성일' && !input.disabled));
    });
    assert.equal(await editableDate.isEnabled(), true);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: keyword request, MoreVert, view date background/disabled, edit dates enabled`);
    await page.close();
  }
} finally {
  await browser.close();
}
