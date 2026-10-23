import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:4173';
const screenshotDir = path.resolve(import.meta.dirname, '../../docs/result/20261022/material-management/screenshots');
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};
const permissions = { read: true, create: true, update: true, delete: false, excel: true };
const options = [
  { groupCode: 'MATERIAL_TYPE', itemCode: 'FOOD', itemName: '식품' },
  { groupCode: 'STORE_METHOD', itemCode: 'COLD', itemName: '냉장' },
  { groupCode: 'EXPIRY_STATUS', itemCode: 'DAY', itemName: '일' },
];
let materials = [{
  materialId: 1, tenantId: 1, materialCode: '000001', materialName: '검증용 품목',
  materialModelName: 'MODEL-A', materialSpec: '100g', materialTypeCode: 'RAW',
  matCataType: 'A', unit: 'EA', materialKind: 'FOOD', safeInvoice: 0,
  storeMethod: 'COLD', expiryedStatus: 'DAY', expiryedCount: 30, materialWeight: null,
}];
const saves = [];
const searches = [];
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
        menus: [{ menuId: 1, name: '기준정보', path: '/co', icon: 'Settings', children: [
          { menuId: 2, parentMenuId: 1, name: '기준정보관리', path: '/co/master', children: [
            { menuId: 3, parentMenuId: 2, name: '품목관리', path: '/co/master/materials', permissions },
          ] },
        ] }],
      };
    } else if (url.pathname === '/api/v1/system/modules') {
      result = { resultList: [{
        moduleId: 1, moduleCode: 'CO', moduleNm: '기준정보', iconNm: 'Settings',
        moduleUrl: '/co', sortOrder: 1, useAt: 'Y',
      }] };
    } else if (url.pathname === '/api/v1/groupware/boards/notice/login-popups') {
      result = { resultList: [] };
    } else if (url.pathname === '/api/v1/co/master/materials/options') {
      result = { resultList: options };
    } else if (url.pathname === '/api/v1/co/master/materials/save-batch') {
      const body = request.postDataJSON();
      saves.push(body);
      const created = body.materials.insertedRows.map((row, index) => ({
        ...row, materialId: materials.length + index + 1, tenantId: 1,
        materialCode: row.materialCode || String(materials.length + index + 1).padStart(6, '0'),
      }));
      const updated = body.materials.updatedRows.map((row) => ({ ...row, materialId: Number(row.materialId), tenantId: 1 }));
      materials = materials.map((row) => updated.find((item) => item.materialId === row.materialId) ?? row).concat(created);
      result = { item: { materials: [...created, ...updated] } };
    } else if (url.pathname === '/api/v1/co/master/materials') {
      searches.push(url.searchParams.toString());
      result = { resultList: materials };
    } else {
      await route.fulfill({ status: 404, headers: cors, json: { resultCode: '404', resultMessage: 'Unconfigured visual fixture endpoint' } });
      return;
    }
    await route.fulfill({ headers: cors, json: { resultCode: '200', resultMessage: 'Fixture only', result } });
  });
  await page.goto(`${baseUrl}/co/master/materials`);
  await page.getByText('검증용 품목', { exact: true }).waitFor();
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: path.join(screenshotDir, `${width}px-list.png`) });
    const metric = await page.evaluate(() => ({
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    }));
    assert.ok(metric.scrollWidth <= width + 1, `Page overflow at ${width}px`);
    metrics.push(metric);
  }
  await page.getByRole('textbox', { name: '품목 검색', exact: true }).fill('검증');
  await page.getByRole('button', { name: '상세 검색 열기' }).click();
  await page.getByRole('textbox', { name: '품목규격', exact: true }).fill('100');
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('materialSpec=100') && response.ok()),
    page.getByRole('dialog', { name: '상세 검색' }).getByRole('button', { name: '조회', exact: true }).click(),
  ]);
  await page.getByRole('dialog', { name: '상세 검색' }).waitFor({ state: 'hidden' });
  assert.ok(searches.some((value) => value.includes('keyword=') && value.includes('materialSpec=100')));
  await page.getByRole('button', { name: '품목 추가', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '품목 등록' });
  await dialog.waitFor();
  await dialog.getByRole('textbox', { name: '품목명', exact: true }).fill('신규 검증용 품목');
  await dialog.getByRole('textbox', { name: '품목계정코드', exact: true }).fill('RAW');
  await dialog.getByRole('spinbutton', { name: '중량', exact: true }).fill('5');
  await dialog.getByRole('spinbutton', { name: '안전재고', exact: true }).fill('0');
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: path.join(screenshotDir, `${width}px-form.png`) });
    const box = await dialog.boundingBox();
    assert.ok(box && box.x >= 0 && box.width <= width + 1, `Dialog overflow at ${width}px`);
  }
  await dialog.getByRole('button', { name: '적용', exact: true }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await page.getByText('품목을 저장했습니다.', { exact: true }).waitFor();
  assert.equal(saves.length, 1);
  const saved = saves[0].materials.insertedRows[0];
  assert.equal(saved.materialCode, '');
  assert.equal(saved.materialWeight, 5);
  assert.equal(saved.safeInvoice, 0);
  assert.equal(saved.expiryedCount, null);
  assert.equal(saved.expiryedStatus, 'NONE');
  assert.equal(saves[0].materials.deletedRows.length, 0);
  await page.getByRole('button', { name: '1 행 정보 수정', exact: true }).click();
  const editDialog = page.getByRole('dialog', { name: '품목 수정' });
  await editDialog.getByRole('textbox', { name: '품목명', exact: true }).fill('수정 검증용 품목');
  await editDialog.getByRole('spinbutton', { name: '안전재고', exact: true }).fill('');
  await editDialog.getByRole('button', { name: '적용', exact: true }).click();
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/materials/save-batch') && response.ok()),
    page.getByRole('button', { name: '저장', exact: true }).click(),
  ]);
  await page.getByText('수정 검증용 품목', { exact: true }).waitFor();
  assert.equal(saves.length, 2);
  assert.equal(saves[1].materials.updatedRows[0].materialId, '1');
  assert.equal(saves[1].materials.updatedRows[0].safeInvoice, null);
  await page.screenshot({ path: path.join(screenshotDir, '1280px-saved.png') });
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ fixtureOnly: true, viewportMetrics: metrics, batchRequests: saves.length,
    integerAndNullPayloadVerified: true, runtimeErrors: errors.length, screenshots: 7 }, null, 2));
} finally {
  await browser.close();
}
