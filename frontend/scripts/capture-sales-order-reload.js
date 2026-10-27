import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:4173';
const screenshotDir = path.resolve(
  import.meta.dirname,
  '../../docs/result/20261027/sales-order-reload-edit/screenshots',
);
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};
const permissions = { read: true, create: true, update: true, delete: true, excel: true };
const loadedOrder = {
  salesOrderId: 300, orderNo: 'SO-20261027-0001', orderDt: '2026-10-27',
  customerId: 10, customerCode: 'C-10', customerName: '거래처 10',
  quotNo: 'Q-LOADED', deliveryDt: '2026-11-05', deliveryPlace: '본사 창고',
  deliveryMethod: '택배', status: '수주등록', totalAmt: 220, remark: '화면 검증용 픽스처',
  details: [{
    salesOrderDetailId: 450, lineNo: 1, materialId: 20, materialCode: 'M-20',
    materialName: '품목 20', orderQty: 2, unitPrice: 100, supplyAmt: 200, vatAmt: 20,
    totalAmt: 220, deliveryDt: null, shippedQty: 0, lineStatus: '대기',
  }],
};
const requests = [];
const errors = [];
const metrics = [];

async function capture(page, name) {
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: path.join(screenshotDir, `${name}-${width}.png`) });
    const metric = await page.evaluate(() => ({
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    }));
    assert.ok(metric.scrollWidth <= width + 1, `Page overflow at ${width}px (${name})`);
    metrics.push({ name, ...metric });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => dialog.accept());
  await page.addInitScript(() => {
    localStorage.setItem('s-erp-auth', JSON.stringify({
      tenantCode: 'VISUAL_FIXTURE', userId: 'fixture',
      accessToken: 'fixture-not-a-real-token', refreshToken: '',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    }));
  });
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const url = new URL(request.url());
    let result;
    if (url.pathname === '/api/v1/menus/my') {
      result = {
        user: { userId: 'fixture', name: '화면 검증', roles: ['TENANT_ADMIN'], roleName: 'TENANT_ADMIN' },
        menus: [{ menuId: 1, name: '영업관리', path: '/sales', icon: 'Storefront', children: [
          { menuId: 2, parentMenuId: 1, name: '수주관리', path: '/sales/order', children: [
            { menuId: 3, parentMenuId: 2, name: '수주등록', path: '/sales/order/create', permissions },
          ] },
        ] }],
      };
    } else if (url.pathname === '/api/v1/system/modules') {
      result = { resultList: [{
        moduleId: 1, moduleCode: 'SALES', moduleNm: '영업관리', iconNm: 'Storefront',
        moduleUrl: '/sales', sortOrder: 1, useAt: 'Y',
      }] };
    } else if (url.pathname === '/api/v1/co/master/customers') {
      result = { resultList: [{ customerId: 10, customerCode: 'C-10', customerName: '거래처 10', useAt: 'Y' }] };
    } else if (url.pathname === '/api/v1/co/master/materials') {
      result = { resultList: [{ materialId: 20, materialCode: 'M-20', materialName: '품목 20',
        safeInvoice: 0, expiryedStatus: 'NONE' }] };
    } else if (url.pathname === '/api/v1/sales/orders') {
      requests.push(`POST ${url.pathname}`);
      result = { item: { salesOrderId: 300, orderNo: loadedOrder.orderNo, orderDt: '2026-10-27', customerId: 10, totalAmt: 220 } };
    } else if (url.pathname === '/api/v1/sales/orders/300') {
      requests.push(`${request.method()} ${url.pathname}`);
      result = { item: loadedOrder };
    } else {
      result = { resultList: [] };
    }
    await route.fulfill({ headers: cors, json: { resultCode: '200', resultMessage: 'Fixture only', result } });
  });

  await page.goto(`${baseUrl}/sales/order/create`);
  await page.getByRole('region', { name: '수주 입력 내용' }).waitFor();
  await page.getByRole('button', { name: '신규', exact: true }).waitFor();

  await page.getByRole('button', { name: '거래처 선택' }).click();
  await page.getByRole('button', { name: '검색', exact: true }).click();
  await page.getByRole('button', { name: 'C-10 거래처 10 선택' }).click();

  await page.getByRole('button', { name: '상세 행 추가', exact: true }).click();
  const grid = page.getByRole('grid', { name: '수주 상세 목록' });
  const row = grid.getByRole('row', { name: /order-line-.*행 선택/ }).first();
  await row.getByRole('gridcell').nth(1).dblclick();
  await row.getByRole('button', { name: '코드 선택' }).click();
  await page.getByRole('button', { name: '검색', exact: true }).click();
  await page.getByRole('button', { name: 'M-20 품목 20 선택' }).click();
  for (const [index, value] of [[3, '2'], [4, '100']]) {
    await row.getByRole('gridcell').nth(index).dblclick();
    const editor = page.getByRole('spinbutton');
    await editor.fill(value);
    await editor.press('Enter');
  }

  await page.getByRole('button', { name: '저장', exact: true }).click();
  await page.getByText(/수주가 저장되었습니다/).waitFor();
  assert.equal(await page.getByLabel('수주번호').inputValue(), loadedOrder.orderNo);
  assert.equal(await page.getByLabel('견적번호').inputValue(), 'Q-LOADED');
  await grid.getByRole('row', { name: /order-line-450.*행 선택/ }).waitFor();
  assert.ok(await page.getByRole('button', { name: '저장', exact: true }).isDisabled());
  assert.ok(await page.getByRole('button', { name: '삭제', exact: true }).isEnabled());
  await capture(page, 'sales-order-reloaded');

  await page.getByLabel('견적번호').fill('Q-EDIT');
  assert.ok(await page.getByRole('button', { name: '저장', exact: true }).isEnabled());
  await page.screenshot({ path: path.join(screenshotDir, 'sales-order-editing-1280.png') });

  await page.getByRole('button', { name: '신규', exact: true }).click();
  assert.equal(await page.getByLabel('수주번호').inputValue(), '저장 시 자동 채번');
  assert.equal(await page.getByLabel('견적번호').inputValue(), '');
  assert.equal(await grid.getByRole('row', { name: /order-line-.*행 선택/ }).count(), 0);
  assert.ok(await page.getByRole('button', { name: '삭제', exact: true }).isDisabled());
  await capture(page, 'sales-order-new-reset');

  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ fixtureOnly: true, requests, viewportMetrics: metrics,
    runtimeErrors: errors.length, screenshots: 7 }, null, 2));
} finally {
  await browser.close();
}
