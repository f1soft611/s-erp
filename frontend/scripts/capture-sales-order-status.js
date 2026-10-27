import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:4173';
const screenshotDir = path.resolve(
  import.meta.dirname,
  '../../docs/result/20261027/sales-order-status/screenshots',
);
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};
const permissions = { read: true, create: true, update: true, delete: true, excel: true };
const statusRows = [1, 2, 3].map((index) => ({
  salesOrderId: 300 + index, salesOrderDetailId: 450 + index,
  orderNo: `SO-20261027-000${index}`, orderDt: '2026-10-27',
  customerCode: 'C-10', customerName: '거래처 10', quotNo: `Q-${index}`,
  status: '수주등록', headerDeliveryDt: '2026-11-05', deliveryPlace: '본사 창고',
  deliveryMethod: '택배', remark: '화면 검증용 픽스처', lineNo: 1,
  materialCode: `M-2${index}`, materialName: `품목 2${index}`, unit: 'EA',
  orderQty: 2 * index, unitPrice: 100, supplyAmt: 200 * index, vatAmt: 20 * index,
  totalAmt: 220 * index, deliveryDt: '2026-11-05', shippedQty: 0, lineStatus: '대기',
}));
const statusRequests = [];
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
            { menuId: 4, parentMenuId: 2, name: '수주현황', path: '/sales/order/status', permissions },
          ] },
        ] }],
      };
    } else if (url.pathname === '/api/v1/system/modules') {
      result = { resultList: [{
        moduleId: 1, moduleCode: 'SALES', moduleNm: '영업관리', iconNm: 'Storefront',
        moduleUrl: '/sales', sortOrder: 1, useAt: 'Y',
      }] };
    } else if (url.pathname === '/api/v1/common/system-date') {
      result = { today: '2026-10-27' };
    } else if (url.pathname === '/api/v1/sales/order-status') {
      statusRequests.push(url.search);
      result = { resultList: statusRows, resultCnt: statusRows.length };
    } else if (url.pathname === '/api/v1/co/master/customers') {
      result = { resultList: [{ customerId: 10, customerCode: 'C-10', customerName: '거래처 10', useAt: 'Y' }] };
    } else if (url.pathname === '/api/v1/co/master/materials') {
      result = { resultList: [{ materialId: 20, materialCode: 'M-20', materialName: '품목 20',
        safeInvoice: 0, expiryedStatus: 'NONE' }] };
    } else {
      result = { resultList: [] };
    }
    await route.fulfill({ headers: cors, json: { resultCode: '200', resultMessage: 'Fixture only', result } });
  });

  // 수주등록: 그리드 헤더 버튼 + 우클릭 행 복사
  await page.goto(`${baseUrl}/sales/order/create`);
  await page.getByRole('region', { name: '수주 입력 내용' }).waitFor();
  const toolbar = page.getByTestId('sales-order-detail-toolbar');
  assert.deepEqual(
    await toolbar.getByRole('button').allInnerTexts(),
    ['상세 행 추가', '품목 선택'],
  );
  assert.equal(await page.getByRole('button', { name: '선택 행 삭제' }).count(), 0);
  await toolbar.getByRole('button', { name: '상세 행 추가' }).click();
  const grid = page.getByRole('grid', { name: '수주 상세 목록' });
  const row = grid.getByRole('row', { name: /order-line-.*행 선택/ }).first();
  await row.getByRole('gridcell').nth(1).dblclick();
  await row.getByRole('button', { name: '코드 선택' }).click();
  await page.getByRole('button', { name: '검색', exact: true }).click();
  await page.getByRole('button', { name: 'M-20 품목 20 선택' }).click();
  await row.getByRole('gridcell').nth(2).click({ button: 'right' });
  await page.getByRole('menuitem', { name: /행 복사/ }).waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotDir, 'sales-order-create-context-menu-1280.png') });
  await page.getByRole('menuitem', { name: /행 복사/ }).click();
  assert.equal(await grid.getByRole('row', { name: /order-line-.*행 선택/ }).count(), 2);
  await capture(page, 'sales-order-create-duplicated');

  // 수주현황: 결합 그리드 + 상세검색
  await page.goto(`${baseUrl}/sales/order/status`);
  const statusGrid = page.getByRole('grid', { name: '수주현황 목록' });
  await statusGrid.getByText('SO-20261027-0001').waitFor();
  assert.match(statusRequests.at(-1), /orderDtFrom=2026-09-27/);
  assert.match(statusRequests.at(-1), /orderDtTo=2026-10-27/);
  await capture(page, 'sales-order-status-list');

  await page.getByRole('button', { name: '상세 검색 열기' }).click();
  const detail = page.getByRole('dialog', { name: '상세 검색' });
  await detail.getByRole('textbox', { name: '거래처' }).fill('거래처 10');
  await capture(page, 'sales-order-status-detail-search');
  await detail.getByRole('button', { name: '조회' }).click();
  await page.waitForFunction(() => true);
  assert.match(decodeURIComponent(statusRequests.at(-1).replace(/\+/g, ' ')), /customerKeyword=거래처 10/);

  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ fixtureOnly: true, statusRequests, viewportMetrics: metrics,
    runtimeErrors: errors.length }, null, 2));
} finally {
  await browser.close();
}
