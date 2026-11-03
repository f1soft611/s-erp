import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const outputDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../docs/result/20261103/search-result-notice-highlighting/screenshots',
);
const baseUrl = 'http://127.0.0.1:4173';
const permissions = { read: true, create: false, update: false, delete: false, excel: true };
const menus = [
  { menuId: 1, name: '그룹웨어', path: '/groupware', icon: 'Apps', children: [
    { menuId: 2, name: '종합현황', path: '/groupware/overview', children: [], permissions },
    { menuId: 7, name: '공지사항', path: '/groupware/community/notice', children: [], permissions },
    { menuId: 8, name: '문서관리', path: '/groupware/doc', children: [
      { menuId: 3, name: '문서현황', path: '/groupware/doc/read', permissions },
    ] },
  ] },
  { menuId: 4, name: '영업관리', path: '/sales', icon: 'ShoppingCart', children: [
    { menuId: 5, name: '수주관리', path: '/sales/order', children: [
      { menuId: 6, name: '수주현황', path: '/sales/order/status', permissions },
    ] },
  ] },
];
const statusPages = [
  {
    slug: 'document-status',
    route: '/groupware/doc/read',
    api: '/api/v1/groupware/approvals/documents/search',
    grid: '문서현황',
    search: '문서현황 빠른 검색',
  },
  {
    slug: 'sales-order-status',
    route: '/sales/order/status',
    api: '/api/v1/sales/order-status',
    grid: '수주현황 목록',
    search: '수주현황 빠른 검색',
  },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => {
      localStorage.setItem('erp-theme', 'light');
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'VISUAL_FIXTURE',
        userId: 'fixture',
        accessToken: 'fixture-not-a-real-token',
        refreshToken: '',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }));
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      let result = { resultList: [], totalRowCount: 0 };
      if (url.pathname === '/api/v1/menus/my') {
        result = {
          user: { userId: 'fixture', name: '화면 검증', roles: ['USER'], roleName: 'USER' },
          menus,
        };
      } else if (url.pathname === '/api/v1/common/system-date') {
        result = { today: '2026-10-28' };
      } else if (statusPages.some((target) => url.pathname === target.api)) {
        result = { resultList: [], resultCnt: 0, totalRowCount: 0 };
      } else if (url.pathname === '/api/v1/search') {
        const keyword = url.searchParams.get('keyword') ?? '';
        const type = url.searchParams.get('type');
        const types = type === 'ALL' ? ['MENU', 'DOCUMENT', 'NOTICE'] : [type];
        result = {
          item: {
            groups: types.map((category) => ({
              type: category,
              offset: Number(url.searchParams.get('offset') ?? 0),
              limit: 10,
              totalCount: 1,
              items: [{
                id: 1,
                type: category,
                title: `${keyword} ${category} fixture`,
                description: `${keyword} 설명의 일치어 강조를 확인합니다.`,
                path: '/groupware/overview',
              }],
            })),
          },
        };
      } else if (url.pathname === '/api/v1/system/modules') {
        result = { resultList: [] };
      } else if (url.pathname.includes('favorites')) {
        result = { item: { folders: [], favorites: [] } };
      } else if (url.pathname.endsWith('/summary')) {
        result = { unreadCount: 0 };
      } else if (url.pathname.includes('/popups')) {
        result = { resultList: [] };
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ resultCode: '200', resultMessage: 'Fixture only', result }),
      });
    });

    for (const target of statusPages) {
      await page.goto(`${baseUrl}${target.route}`);
      const notice = page.getByRole('status').filter({
        hasText: '조회 결과가 없습니다. 조회 기간을 넓히거나 검색 조건을 변경해 주세요.',
      });
      await notice.waitFor();
      assert.equal(await notice.count(), 1);
      const grid = page.getByRole('grid', { name: target.grid });
      await grid.waitFor();
      const noticeBounds = await notice.boundingBox();
      const gridBounds = await grid.boundingBox();
      assert.ok(noticeBounds && gridBounds);
      assert.ok(Math.abs(gridBounds.y - noticeBounds.y - noticeBounds.height - 8) <= 1,
        `${target.slug}: notice-to-grid spacing should be 8px at ${width}px`);
      assert.ok(await notice.getByRole('button', { name: 'Close' }).isVisible());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({
        path: path.join(outputDirectory, `${target.slug}-${width}px.png`),
        fullPage: true,
      });

      await notice.getByRole('button', { name: 'Close' }).click();
      assert.equal(await notice.count(), 0);
      const reload = page.waitForResponse((response) =>
        new URL(response.url()).pathname === target.api);
      await page.getByRole('button', { name: '조회', exact: true }).first().click();
      await reload;
      await notice.waitFor();
    }

    await page.goto(`${baseUrl}/groupware/community/notice`);
    const headerSearch = page.getByLabel('통합검색 검색어', { exact: true });
    await headerSearch.fill('결재');
    await headerSearch.press('Enter');
    await page.getByRole('heading', { name: '통합검색', exact: true }).waitFor();
    const results = page.getByRole('tabpanel');
    await results.locator('mark').first().waitFor();
    assert.ok(await results.locator('mark').count() >= 2,
      'title and description should both highlight the matching search term');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({
      path: path.join(outputDirectory, `unified-search-highlight-${width}px.png`),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally {
  await browser.close();
}
console.log('Responsive search result notices and unified-search highlighting passed at 375px, 768px and 1280px.');
