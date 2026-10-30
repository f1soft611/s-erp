import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';

for (const width of [375, 768, 1280]) {
  test(`isolates price master picker sessions at ${width}px`, async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    try {
      await page.route('**/__price-picker-test', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>*,*::before,*::after{box-sizing:border-box}</style></head><body style="margin:0"><div id="root"></div></body></html>',
        }),
      );
      await page.route('**/salesOrderMaster.service.ts*', (route) =>
        route.fulfill({
          contentType: 'application/javascript',
          body: `
            export const searchOrderMaterials = async () => [
              { id: 101, code: 'M-TEST', name: '검증 품목' },
            ];
            export const searchOrderCustomers = async () => [
              { id: 202, code: 'C-TEST', name: '검증 거래처' },
            ];
          `,
        }),
      );
      await page.goto('http://127.0.0.1:4173/__price-picker-test');
      await page.evaluate(async () => {
        const { default: RefreshRuntime } = await import('/@react-refresh');
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;
        const React = (await import('/node_modules/.vite/deps/react.js')).default;
        const ReactDOM = (
          await import('/node_modules/.vite/deps/react-dom_client.js')
        ).default;
        const { ItemPartnerPriceGrid } = await import(
          '/src/pages/co/master/item-partner-prices/components/ItemPartnerPriceGrid.tsx'
        );
        const { NotificationProvider } = await import(
          '/src/shared/context/NotificationContext.tsx'
        );
        window.gridRef = React.createRef();
        ReactDOM.createRoot(document.getElementById('root')).render(
          React.createElement(
            NotificationProvider,
            null,
            React.createElement(
              'div',
              { style: { width: '100%', height: 500 } },
              React.createElement(ItemPartnerPriceGrid, {
                rows: [],
                canCreate: true,
                canUpdate: true,
                canExportExcel: false,
                loading: false,
                gridKey: 0,
                gridRef: window.gridRef,
                onChangesChange: () => {},
              }),
            ),
          ),
        );
      });
      await page.getByRole('grid').waitFor();
      await page.evaluate(() => window.gridRef.current.addRow());
      const form = page.getByRole('dialog', { name: '단가 등록', exact: true });
      await form.getByRole('button', { name: '품목 선택 선택', exact: true }).click();
      const material = page.getByRole('dialog', { name: '품목 선택', exact: true });
      await material.getByRole('textbox', { name: '품목 검색' }).fill('품목 검색어');
      await material.getByRole('button', { name: '검색', exact: true }).click();
      await material.getByRole('button', { name: 'M-TEST 검증 품목 선택' }).click();
      await material.waitFor({ state: 'hidden' });

      await form.getByRole('button', { name: '거래처 선택 선택', exact: true }).click();
      const customer = page.getByRole('dialog', { name: '거래처 선택', exact: true });
      assert.equal(await customer.getByRole('textbox', { name: '거래처 검색' }).inputValue(), '');
      assert.equal(await customer.getByText('검증 품목', { exact: true }).count(), 0);
      await customer.getByText('검색어를 입력한 뒤 검색해 주세요.').waitFor();
      await customer.getByRole('textbox', { name: '거래처 검색' }).fill('거래처 검색어');
      await customer.getByRole('button', { name: '검색', exact: true }).click();
      const customerOption = customer.getByRole('button', { name: 'C-TEST 검증 거래처 선택' });
      await customerOption.waitFor();
      assert.equal(await customer.getByText('검증 품목', { exact: true }).count(), 0);
      const screenshotDir = process.env.PRICE_PICKER_SCREENSHOT_DIR;
      if (screenshotDir) {
        await mkdir(screenshotDir, { recursive: true });
        await page.screenshot({
          path: path.join(screenshotDir, `customer-picker-${width}.png`),
          fullPage: true,
        });
      }
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        true,
      );
      const dialogBox = await customer.boundingBox();
      assert.ok(dialogBox && dialogBox.x >= 0 && dialogBox.x + dialogBox.width <= width + 1);
      await customerOption.click();
      await customer.waitFor({ state: 'hidden' });
      const selectedValues = await form.locator('input').evaluateAll(
        (inputs) => inputs.map((input) => input.value),
      );
      assert.ok(selectedValues.includes('M-TEST · 검증 품목'));
      assert.ok(selectedValues.includes('C-TEST · 검증 거래처'));
      if (screenshotDir) {
        await page.screenshot({
          path: path.join(screenshotDir, `selected-masters-${width}.png`),
          fullPage: true,
        });
      }

      await form.getByRole('button', { name: '품목 선택 선택', exact: true }).click();
      const reopenedMaterial = page.getByRole('dialog', { name: '품목 선택', exact: true });
      assert.equal(await reopenedMaterial.getByRole('textbox', { name: '품목 검색' }).inputValue(), '');
      assert.equal(await reopenedMaterial.getByText('검증 거래처', { exact: true }).count(), 0);
      await reopenedMaterial.getByText('검색어를 입력한 뒤 검색해 주세요.').waitFor();
      assert.deepEqual(pageErrors, []);
    } finally {
      await browser.close();
    }
  });
}
