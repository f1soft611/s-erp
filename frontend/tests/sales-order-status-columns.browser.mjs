import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { installSalesDeliveryBrowserMocks } from './fixtures/sales-delivery.browser-fixtures.mjs';

const output = path.resolve(import.meta.dirname, '../../docs/result/20261117/sales-order-status-columns/screenshots');
const permissions = { read: true, create: true, update: true, delete: true, excel: true };
const rows = [1, 2].map((index) => ({
  salesOrderId: 300 + index, salesOrderDetailId: 450 + index,
  orderNo: `SO-TEST-${index}`, orderDt: '2026-11-12',
  customerCode: 'C10', customerName: '검증 거래처', status: '수주등록',
  lineNo: 1, materialCode: `M2${index}`, materialName: `검증 품목 ${index}`, unit: 'EA',
  orderQty: index * 2, unitPrice: 100, supplyAmt: index * 200,
  vatAmt: index * 20, totalAmt: index * 220, shippedQty: 0, lineStatus: '대기',
}));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await installSalesDeliveryBrowserMocks(page);
  await page.route('**/api/v1/menus/my', (route) => route.fulfill({ json: {
    resultCode: 200, result: { user: { userId: 'fixture', name: '검증', roles: [] },
      menus: [{ menuId: 900, name: '영업관리', path: '/sales', children: [
        { menuId: 911, name: '수주현황', path: '/sales/order/status', permissions },
      ] }] },
  } }));
  await page.route('**/api/v1/common/system-date', (route) =>
    route.fulfill({ json: { resultCode: 200, result: { today: '2026-11-12' } } }));
  await page.route('**/api/v1/sales/order-status**', (route) =>
    route.fulfill({ json: { resultCode: 200, result: { resultList: rows, resultCnt: rows.length } } }));
  await page.goto('http://127.0.0.1:4173/sales/order/status');
  const grid = page.getByRole('grid', { name: '수주현황 목록' });
  await grid.getByText('SO-TEST-1').waitFor();
  assert.equal(await grid.getByText('수주상태', { exact: true }).count(), 0);
  const headers = await grid.getByRole('columnheader').allInnerTexts();
  const names = headers.map((text) => text.trim());
  const quoteIndex = names.findIndex((text) => text.includes('견적번호'));
  assert.ok(names[quoteIndex + 1].includes('업무상태'), names.join('|'));
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(output, `sales-order-status-columns-${width}.png`) });
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
