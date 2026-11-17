import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4173';
const output = new URL('../../docs/result/20261117/quotation-entry-layout/screenshots/', import.meta.url);
const permissions = { read: true, create: true, update: true, delete: true, excel: false };
const menus = [{
  menuId: 1,
  parentMenuId: null,
  name: '영업관리',
  path: '/sales',
  children: [{
    menuId: 2,
    parentMenuId: 1,
    name: '견적관리',
    path: '/sales/quotation',
    children: [{
      menuId: 3,
      parentMenuId: 2,
      name: '견적서작성',
      path: '/sales/quotation-create',
      permissions,
    }],
  }],
}];

function apiResult(path) {
  if (path === '/api/v1/menus/my') {
    return { user: { userId: '1', name: '테스트 사용자', roles: [], roleName: 'USER' }, menus };
  }
  if (path === '/api/v1/system/modules') {
    return { resultList: [{
      moduleId: 5, moduleCode: 'SALES', moduleNm: '영업관리', moduleUrl: '/sales',
      iconNm: 'ShoppingCart', useAt: 'Y',
    }] };
  }
  if (path === '/api/v1/menus/favorites') return { item: { folders: [], favorites: [] } };
  if (path === '/api/v1/common/system-date') return { today: '2026-11-17' };
  if (path === '/api/v1/co/master/materials') {
    return { resultList: [{
      materialId: 20, materialCode: 'M-20', materialName: '테스트 품목',
      materialSpec: '규격 A', unit: 'EA',
    }] };
  }
  if (path === '/api/v1/co/master/customers') {
    return { resultList: [{
      customerId: 10, customerCode: 'C-10', customerName: '테스트 거래처',
    }] };
  }
  return { resultList: [] };
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'test',
        userId: '1',
        accessToken: 'browser-test-only',
        refreshToken: 'browser-test-only',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }));
    });
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          resultCode: '200', resultMessage: '성공', result: apiResult(path),
        }),
      });
    });

    await page.goto(`${origin}/sales/quotation-create`);
    await page.getByRole('region', { name: '견적 입력 내용' }).waitFor();
    await page.getByRole('textbox', { name: '견적작성일' }).waitFor();
    await page.getByRole('button', { name: '견적작성일 달력 열기' }).click();
    await page.locator('.MuiDateCalendar-root').waitFor();
    await page.keyboard.press('Escape');

    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.ok(dimensions.document <= dimensions.viewport, `page overflow at ${width}px`);
    await page.screenshot({
      path: fileURLToPath(new URL(`quotation-create-${width}.png`, output)),
      animations: 'disabled',
      fullPage: true,
    });

    const quotationDate = page.getByRole('textbox', { name: '견적작성일' });
    await quotationDate.fill('1118');
    await quotationDate.blur();
    assert.equal(await quotationDate.inputValue(), '2026-11-18');

    if (width === 1280) {
      const labels = ['견적번호', '견적작성일', '거래처', '견적제출일'];
      const boxes = await Promise.all(labels.map(async (label) => {
        const locator = page.getByRole('textbox', { name: label });
        const box = await locator.boundingBox();
        assert.ok(box, `${label} field is visible`);
        return box;
      }));
      assert.ok(boxes.every((box) => Math.abs(box.y - boxes[0].y) < 8), 'first-row fields align');

      await page.getByRole('button', { name: '상세 행 추가' }).click();
      const detailGrid = page.getByRole('grid', { name: '견적 상세 목록' });
      await detailGrid.waitFor();
      await detailGrid.getByRole('gridcell').nth(1).dblclick();
      await detailGrid.getByRole('button', { name: '코드 선택' }).click();
      await page.getByRole('dialog', { name: '품목 선택' }).waitFor();
      await page.getByRole('dialog', { name: '품목 선택' }).getByRole('button', { name: /닫기/ }).click();

      const rowCheckbox = detailGrid.getByRole('checkbox').first();
      await rowCheckbox.check();
      await page.getByRole('button', { name: '품목 선택' }).click();
      await page.getByRole('dialog', { name: '품목 선택' }).waitFor();
      await page.getByRole('dialog', { name: '품목 선택' }).getByRole('button', { name: /닫기/ }).click();
    }

    assert.deepEqual(pageErrors, []);
    await context.close();
    console.log(`checked ${width}px`);
  }
} finally {
  await browser.close();
}
