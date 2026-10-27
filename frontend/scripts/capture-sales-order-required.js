import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:4173';
const screenshotDir = path.resolve(
  import.meta.dirname,
  '../../docs/result/20261027/sales-order-save-ux/screenshots',
);
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};
const permissions = { read: true, create: true, update: true, delete: true, excel: true };
const saves = [];
const errors = [];
const metrics = [];

await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (error) => errors.push(error.message));
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
    } else if (url.pathname === '/api/v1/groupware/boards/notice/login-popups') {
      result = { resultList: [] };
    } else if (url.pathname === '/api/v1/sales/orders') {
      saves.push(request.postDataJSON());
      result = { item: {} };
    } else {
      result = { resultList: [] };
    }
    await route.fulfill({ headers: cors, json: { resultCode: '200', resultMessage: 'Fixture only', result } });
  });

  await page.goto(`${baseUrl}/sales/order/create`);
  await page.getByRole('region', { name: '수주 입력 내용' }).waitFor();
  await page.getByRole('button', { name: '상세 행 추가', exact: true }).click();
  const grid = page.getByRole('grid', { name: '수주 상세 목록' });
  for (const label of ['품목코드 필수', '주문수량 필수', '단가 필수']) {
    await grid.getByLabel(label, { exact: true }).waitFor();
  }
  assert.equal(await page.getByRole('textbox', { name: /수주일자/ }).getAttribute('required'), '');
  assert.equal(await page.getByRole('textbox', { name: /거래처/ }).getAttribute('required'), '');
  await page.screenshot({ path: path.join(screenshotDir, 'sales-order-required-1280.png') });

  await page.getByRole('button', { name: '저장', exact: true }).click();
  await grid.locator('[data-grid-error="품목코드은(는) 필수입니다."]').waitFor();
  await grid.locator('[data-grid-error="주문수량은 0보다 커야 합니다."]').waitFor();
  assert.equal(await page.getByRole('textbox', { name: /거래처/ }).getAttribute('aria-invalid'), 'true');
  assert.equal(saves.length, 0);

  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: path.join(screenshotDir, `sales-order-validation-${width}.png`) });
    const metric = await page.evaluate(() => ({
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    }));
    assert.ok(metric.scrollWidth <= width + 1, `Page overflow at ${width}px`);
    metrics.push(metric);
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ fixtureOnly: true, viewportMetrics: metrics, saveRequests: saves.length,
    runtimeErrors: errors.length, screenshots: 4 }, null, 2));
} finally {
  await browser.close();
}
