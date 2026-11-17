import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const output = new URL('../../docs/result/20261117/multiline-readonly-color/screenshots/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const theme of ['light', 'dark']) {
    for (const width of [375, 768, 1280]) {
      for (const mode of ['create', 'view']) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.addInitScript(() => localStorage.setItem('s-erp-auth', JSON.stringify({
          tenantCode: 'SYNTHETIC', userId: 'test', accessToken: 'synthetic-token',
          refreshToken: '', expiresAt: new Date(Date.now() + 3600000).toISOString(),
        })));
        await page.route('**/__quotation-remark-test', (route) => route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}*,*::before,*::after{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
        }));
        await page.route('**/api/**', (route) => {
          const request = route.request();
          const path = new URL(request.url()).pathname;
          const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
          if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          let result = { resultList: [] };
          if (path === '/api/v1/common/system-date') result = { today: '2026-11-17' };
          if (path === '/api/v1/sales/quotations/21') result = { item: {
            quotationId: 21, quotationNo: 'QT-TEST', quotationDt: '2026-11-17',
            submitDt: '2026-11-18', customerId: 10, customerName: '검증 거래처',
            customerCode: 'C10', writer: true, remark: '저장된 비고',
            supplyAmt: 0, vatAmt: 0, totalAmt: 0, details: [],
          } };
          if (path.endsWith('/common-code/groups')) result = {
            resultList: ['INCOTERMS', 'PAYMENT_TERM', 'CURRENCY', 'ITEM_UNIT'].map((groupCode, index) => ({
              commonCodeGroupId: index + 1, groupCode, useAt: 'Y',
            })),
          };
          if (/common-code\/groups\/\d+\/items$/.test(path)) {
            result = { resultList: [{ itemCode: 'CODE', itemNm: '선택값', useAt: 'Y', sortOrder: 1 }] };
          }
          return route.fulfill({ status: 200, headers, contentType: 'application/json',
            body: JSON.stringify({ resultCode: 200, result }) });
        });
        await page.goto('http://127.0.0.1:4173/__quotation-remark-test');
        await page.evaluate(async ({ themeMode, pageMode }) => {
          const { default: RefreshRuntime } = await import('/@react-refresh');
          RefreshRuntime.injectIntoGlobalHook(window);
          window.$RefreshReg$ = () => {};
          window.$RefreshSig$ = () => (type) => type;
          window.__vite_plugin_react_preamble_installed__ = true;
          const React = (await import('/node_modules/.vite/deps/react.js')).default;
          const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
          const { QuotationCreatePage } = await import('/src/pages/sales/quotation/create/QuotationCreatePage.tsx');
          const { createAppTheme } = await import('/src/theme/theme.ts');
          const resources = performance.getEntriesByType('resource').map((entry) => entry.name);
          const routerUrl = resources.find((url) => url.includes('/node_modules/.vite/deps/react-router-dom.js?v='));
          const muiUrl = resources.find((url) => url.includes('/node_modules/.vite/deps/@mui_material.js?v='));
          if (!routerUrl || !muiUrl) throw new Error('Framework modules not found');
          const { createMemoryRouter, RouterProvider } = await import(routerUrl);
          const { ThemeProvider, CssBaseline } = await import(muiUrl);
          const element = React.createElement(QuotationCreatePage, {
            selectedModule: { id: 'sales', name: '영업관리', tree: [], menus: [] },
            currentMenuName: '견적서작성', content: { title: '견적서작성', description: '', cards: [], items: [] },
            breadcrumbItems: ['영업관리', '견적서작성'],
            selectedMenuPermissions: { read: true, create: true, update: true },
            mode: pageMode, ...(pageMode === 'view' ? { quotationId: 21 } : {}),
          });
          const router = createMemoryRouter([{ path: '/', element }]);
          const appTheme = createAppTheme(themeMode);
          window.__remarkDisabledColor = appTheme.palette.action.disabledBackground;
          ReactDOM.createRoot(document.getElementById('root')).render(
            React.createElement(ThemeProvider, { theme: appTheme },
              React.createElement(CssBaseline), React.createElement(RouterProvider, { router })),
          );
        }, { themeMode: theme, pageMode: mode });
        const remark = page.getByRole('textbox', { name: '비고', exact: true });
        await remark.waitFor();
        if (mode === 'create') {
          await page.waitForFunction(() => {
            const textarea = document.querySelector('textarea:not([aria-hidden="true"])');
            return textarea && !textarea.disabled;
          });
          await remark.fill('견적 비고 입력 확인');
          assert.equal(await remark.inputValue(), '견적 비고 입력 확인');
        } else {
          await page.waitForFunction(() => document.querySelector('input')?.value === 'QT-TEST');
          assert.equal(await remark.isDisabled(), true);
        }
        const colors = await remark.evaluate((element) => ({
          actual: getComputedStyle(element.closest('.MuiInputBase-root')).backgroundColor,
          disabled: window.__remarkDisabledColor,
          shadow: element.parentElement.querySelectorAll('textarea[readonly][aria-hidden="true"]').length,
        }));
        const reference = await page.getByRole('textbox', { name: '참조', exact: true })
          .evaluate((element) => getComputedStyle(element.closest('.MuiInputBase-root')).backgroundColor);
        assert.equal(colors.shadow, 1);
        assert.equal(colors.actual, reference);
        if (mode === 'create') assert.notEqual(colors.actual, colors.disabled);
        else assert.equal(colors.actual, colors.disabled);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
        await page.screenshot({ path: fileURLToPath(new URL(`remark-${theme}-${mode}-${width}.png`, output)),
          fullPage: true, animations: 'disabled' });
        assert.deepEqual(errors, []);
        console.log(`PASS ${theme} ${mode} ${width}px: remark background and editing state`);
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
