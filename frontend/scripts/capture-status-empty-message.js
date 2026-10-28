import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:4173';
const output = path.resolve(import.meta.dirname, '..', '..', 'docs', 'result',
  '20261028', 'status-empty-message', 'screenshots');
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};
const permissions = { read: true, create: false, update: false, delete: false, excel: true };
const menus = [
  { menuId: 1, name: '그룹웨어', path: '/groupware', icon: 'Groups', children: [
    { menuId: 2, name: '문서관리', path: '/groupware/doc', children: [
      { menuId: 3, name: '문서현황', path: '/groupware/doc/read', permissions },
    ] },
  ] },
  { menuId: 4, name: '영업관리', path: '/sales', icon: 'ShoppingCart', children: [
    { menuId: 5, name: '수주관리', path: '/sales/order', children: [
      { menuId: 6, name: '수주현황', path: '/sales/order/status', permissions },
    ] },
  ] },
];
const pages = [
  { slug: 'document', route: '/groupware/doc/read', api: '/api/v1/groupware/approvals/documents/search',
    grid: '문서현황', search: '문서현황 빠른 검색', from: 'submittedAtFrom', to: 'submittedAtTo' },
  { slug: 'sales-order', route: '/sales/order/status', api: '/api/v1/sales/order-status',
    grid: '수주현황 목록', search: '수주현황 빠른 검색', from: 'orderDtFrom', to: 'orderDtTo' },
];

await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const metrics = [];
try {
  for (const target of pages) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(() => {
      localStorage.setItem('erp-theme', 'light');
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'VISUAL_FIXTURE', userId: 'fixture', accessToken: 'fixture-not-a-real-token',
        refreshToken: '', expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }));
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => errors.push(error.message));
    const requests = [];
    let release;
    let gate = Promise.resolve();
    await page.route('**/api/**', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      const url = new URL(route.request().url());
      let result = { resultList: [], resultCnt: 0, totalRowCount: 0 };
      if (url.pathname === '/api/v1/menus/my') {
        result = { user: { userId: 'fixture', name: '화면 검증', roles: ['USER'], roleName: 'USER' }, menus };
      } else if (url.pathname === '/api/v1/common/system-date') {
        result = { today: '2026-10-28' };
      } else if (url.pathname === target.api) {
        requests.push(url);
        await gate;
        if (url.searchParams.get('keyword') === 'fixture-error') {
          await route.fulfill({ status: 503, headers: cors,
            json: { resultCode: '503', resultMessage: 'Fixture list unavailable' } });
          return;
        }
      }
      await route.fulfill({ headers: cors,
        json: { resultCode: '200', resultMessage: 'Fixture only', result } });
    });
    await page.goto(`${baseUrl}${target.route}`);
    const message = page.getByRole('status').filter({ hasText: '조회 결과가 없습니다.' });
    await message.waitFor();
    assert.equal(await message.count(), 1);
    assert.equal(await message.getAttribute('class').then((value) => value.includes('MuiAlert-colorInfo')), true);
    assert.equal(await page.getByRole('alert').count(), 0);

    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByRole('grid', { name: target.grid }).waitFor();
      const bounds = await message.boundingBox();
      const gridBounds = await page.getByRole('grid', { name: target.grid }).boundingBox();
      assert.ok(bounds && gridBounds && bounds.y + bounds.height <= gridBounds.y + 1,
        `${target.slug}: message must be above the grid at ${width}px`);
      const buttonBounds = await message.getByRole('button', { name: '검색 조건 초기화' }).boundingBox();
      assert.ok(buttonBounds && buttonBounds.x >= bounds.x
        && buttonBounds.x + buttonBounds.width <= bounds.x + bounds.width + 1,
      `${target.slug}: reset action must remain inside message`);
      const textBounds = await message.locator('.MuiAlert-message').boundingBox();
      assert.ok(textBounds && (textBounds.y + textBounds.height <= buttonBounds.y + 1
        || textBounds.x + textBounds.width <= buttonBounds.x + 1),
      `${target.slug}: text and action must not overlap`);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(scrollWidth <= width + 1, `${target.slug}: page overflow at ${width}px`);
      await page.screenshot({ path: path.join(output, `${target.slug}-${width}.png`) });
      metrics.push({ page: target.slug, width, scrollWidth, messageAboveGrid: true });
    }

    gate = new Promise((resolve) => { release = resolve; });
    const previousCount = requests.length;
    await message.getByRole('button', { name: '검색 조건 초기화' }).click();
    await page.waitForFunction(() => !Array.from(document.querySelectorAll('[role="status"]'))
      .some((element) => element.textContent.includes('조회 결과가 없습니다.')));
    assert.equal(requests.length, previousCount + 1);
    assert.equal(requests.at(-1).searchParams.get(target.from), '2026-09-28');
    assert.equal(requests.at(-1).searchParams.get(target.to), '2026-10-28');
    release();
    await message.waitFor();

    await page.getByRole('textbox', { name: target.search }).fill('fixture-error');
    await page.getByRole('button', { name: '조회', exact: true }).click();
    const error = page.getByRole('alert');
    await error.waitFor();
    assert.equal(await message.count(), 0);
    await error.getByRole('button').click();
    assert.equal(await message.count(), 0);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ fixtureOnly: true, metrics, runtimeErrors: errors.length,
    resetRestoresRequiredDates: true, hiddenDuringReloadAndAfterErrors: true }, null, 2));
} finally {
  await browser.close();
}
