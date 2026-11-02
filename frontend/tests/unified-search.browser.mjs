import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const screenshotDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../docs/result/20261102/unified-search-page/screenshots',
);
await mkdir(screenshotDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.error(error.message);
    });
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'TEST', userId: 'test', accessToken: 'test-token', refreshToken: '',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }));
    });
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      let result = { resultList: [], item: null, hasNext: false, nextBeforeNotificationId: null };
      if (url.pathname === '/api/v1/search') {
        const type = url.searchParams.get('type');
        const keyword = url.searchParams.get('keyword');
        const offset = Number(url.searchParams.get('offset'));
        const limit = Number(url.searchParams.get('limit'));
        const types = type === 'ALL' ? ['MENU', 'DOCUMENT', 'NOTICE'] : [type];
        result = { item: { groups: types.map((category) => ({
          type: category, offset, limit, totalCount: category === 'NOTICE' ? 23 : 1,
          items: Array.from({ length: category === 'NOTICE' ? Math.min(limit, 23 - offset) : 1 }, (_, index) => {
            const id = offset + index + 1;
            return {
              id, type: category,
              title: `${keyword} ${category === 'NOTICE' ? '공지' : category === 'MENU' ? '메뉴' : '문서'} ${id}`,
              description: category === 'MENU' ? '그룹웨어 > 문서관리 > 결재문서'
                : '검색 검증 안내 · 긴 설명에서도 화면 너비를 넘지 않는 결과',
              path: category === 'NOTICE' ? `/groupware/community/notice?dashboardPostId=${id}`
                : category === 'DOCUMENT' ? `/groupware/doc/write?approvalId=${id}` : '/groupware/overview',
            };
          }),
        })) } };
      } else if (url.pathname === '/api/v1/menus/my') {
        result = {
          user: { userId: 'test', name: '테스트', roles: [] },
          menus: [{
            menuId: 1, name: '그룹웨어', path: '/groupware', icon: 'Apps', children: [
              { menuId: 2, name: '종합현황', path: '/groupware/overview', children: [], permissions: { read: true } },
              { menuId: 3, name: '공지사항', path: '/groupware/community/notice', children: [], permissions: { read: true } },
            ],
          }],
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
        body: JSON.stringify({ resultCode: '200', resultMessage: 'OK', result }),
      });
    });

    await page.goto('http://127.0.0.1:4173/groupware/community/notice');
    const headerField = page.getByLabel('통합검색 검색어', { exact: true });
    await headerField.fill('결재');
    await headerField.press('Enter');
    await page.getByRole('tab', { name: '전체 25', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/search');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.getByRole('heading', { name: '통합검색', exact: true }).count(), 1);
    assert.equal(await page.locator('mark').count() > 0, true);

    const assertLayout = async () => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const results = page.getByRole('region', { name: '통합검색', exact: true });
      assert.equal(await results.evaluate((element) => element.scrollWidth <= element.clientWidth), true);
      const header = await headerField.boundingBox();
      assert.ok(header && header.x >= 0 && header.x + header.width <= width && header.y < 230);
      const fields = [headerField, page.getByLabel('결과 검색어', { exact: true })];
      for (const field of fields) {
        assert.equal(await field.isVisible(), true);
      }
    };
    await assertLayout();
    await page.screenshot({ path: path.join(screenshotDirectory, `unified-search-page-${width}px.png`), fullPage: true });

    await page.getByRole('button', { name: '공지 더보기', exact: true }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.getByText('2페이지', { exact: true }).waitFor();
    await page.getByRole('button', { name: /결재 공지 11/ }).first().waitFor();
    assert.equal(new URL(page.url()).searchParams.get('page'), '2');
    assert.equal(await page.getByRole('tab', { name: '전체 25', exact: true }).count(), 1);
    await assertLayout();
    await page.screenshot({ path: path.join(screenshotDirectory, `unified-search-notice-${width}px.png`), fullPage: true });

    await page.reload();
    await page.getByText('2페이지', { exact: true }).waitFor();
    assert.equal(await headerField.inputValue(), '결재');
    await page.goBack();
    await page.getByText('1페이지', { exact: true }).waitFor();
    await page.goBack();
    await page.getByRole('button', { name: '공지 더보기', exact: true }).waitFor();
    await headerField.fill('새 검색');
    await headerField.press('Enter');
    await page.getByRole('button', { name: /새 검색 메뉴 1/ }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('type'), 'ALL');
    assert.equal(new URL(page.url()).searchParams.get('page'), '1');
    const history = await page.evaluate(() => JSON.parse(sessionStorage.getItem('s-erp:recent-menu-history') ?? '[]'));
    assert.equal(history.some((entry) => entry.path === '/search'), false);
    await page.getByRole('button', { name: /새 검색 공지 1 / }).first().click();
    await page.waitForURL('**/groupware/community/notice?dashboardPostId=1');
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log('Full-app unified search page checks passed at 375px, 768px and 1280px.');
