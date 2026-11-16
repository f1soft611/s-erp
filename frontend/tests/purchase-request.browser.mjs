import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 합성 데이터로 구매요청등록·현황 화면을 375/768/1280px에서 확인한다. 실제 DB를 쓰지 않는다.
const origin = 'http://127.0.0.1:4173';
const createOutput = new URL('../../docs/result/20261112/purchase-request-create/screenshots/', import.meta.url);
const statusOutput = new URL('../../docs/result/20261112/purchase-request-status/screenshots/', import.meta.url);

const permissions = { read: true, create: true, update: true, delete: true, excel: true };
const menus = [{
  menuId: 100,
  parentMenuId: null,
  name: '구매자재',
  path: '/materials',
  children: [{
    menuId: 101,
    parentMenuId: 100,
    name: '구매관리',
    path: '/materials/request',
    children: [
      { menuId: 102, parentMenuId: 101, name: '구매요청등록', path: '/materials/request/request-create', permissions },
      { menuId: 103, parentMenuId: 101, name: '구매요청현황', path: '/materials/request/request-status', permissions },
    ],
  }],
}];
const details = [
  ['3001587', '에스디_OPP 테이프 (블랙)', '', 'BOX', 1, 'PRODUCTION', '생산'],
  ['3001574', '에스디_OPP 테이프 (블루)', '50mm', 'BOX', 1, 'PRODUCTION', '생산'],
  ['3000514', '에스디_장갑 탑/S', '탑/S', 'ea', 100, 'SPARE', 'Spare'],
].map(([materialCode, materialName, materialSpec, unit, requestQty, useType, useTypeName], index) => ({
  purchaseRequestDetailId: 400 + index,
  lineNo: index + 1,
  materialId: 101 + index,
  materialCode,
  materialName,
  materialSpec,
  unit,
  requestQty,
  requestDeliveryDt: '2026-11-20',
  useType,
  useTypeName,
  requestRemark: null,
  confirmQty: null,
}));
const request = {
  purchaseRequestId: 300,
  requestNo: 'MR-20261112-0001',
  requestDt: '2026-11-12',
  requesterName: '테스트 사용자',
  requestDeptName: '생산지원팀',
  status: 'REQUESTED',
  remark: '라인 소모품 보충',
  createdByName: '테스트 사용자',
  createdAt: '2026-11-12 08:38',
  updatedByName: null,
  updatedAt: null,
  details,
};
const statusRows = details.map((detail) => ({
  purchaseRequestId: 300,
  requestNo: request.requestNo,
  requestDt: request.requestDt,
  requesterName: request.requesterName,
  requestDeptName: request.requestDeptName,
  status: 'REQUESTED',
  remark: request.remark,
  ...detail,
}));

function apiResult(path) {
  if (path === '/api/v1/menus/my') {
    return { user: { userId: '1', name: '테스트 사용자', roles: [], roleName: 'USER' }, menus };
  }
  if (path === '/api/v1/system/modules') {
    return { resultList: [{ moduleId: 5, moduleCode: 'MATERIALS', moduleNm: '구매자재', moduleUrl: '/materials', iconNm: 'ShoppingCart', useAt: 'Y' }] };
  }
  if (path === '/api/v1/users/me/profile') return { employeeId: '1', name: '테스트 사용자', departmentName: '생산지원팀' };
  if (path === '/api/v1/menus/favorites') return { item: { folders: [], favorites: [] } };
  if (path.endsWith('/summary')) return { unreadCount: 0 };
  if (path === '/api/v1/common/system-date') return { today: '2026-11-12' };
  if (path === '/api/v1/co/master/common-code/groups') {
    return { resultList: [{ commonCodeGroupId: 9, groupCode: 'PURCHASE_USE_TYPE', groupNm: '사용용도', sortOrder: 110, useAt: 'Y' }] };
  }
  if (path === '/api/v1/co/master/common-code/groups/9/items') {
    return {
      resultList: [['PRODUCTION', '생산'], ['DEVELOPMENT', '개발'], ['SPARE', 'Spare']].map(([itemCode, itemNm], index) => ({
        commonCodeItemId: index + 1, groupId: 9, itemCode, itemNm, sortOrder: (index + 1) * 10, useAt: 'Y',
      })),
    };
  }
  if (path === '/api/v1/materials/purchase-requests/300') return { item: request };
  if (path === '/api/v1/materials/purchase-request-status') return { resultList: statusRows, resultCnt: statusRows.length };
  return { resultList: [] };
}

await mkdir(createOutput, { recursive: true });
await mkdir(statusOutput, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
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
        body: JSON.stringify({ resultCode: '200', resultMessage: '성공', result: apiResult(path) }),
      });
    });

    await page.goto(`${origin}/materials/request/request-create`);
    const form = page.getByRole('region', { name: '구매요청 입력 내용' });
    await form.waitFor();
    assert.equal(await form.getByLabel('구매요청번호').inputValue(), '저장 시 자동 채번');
    await page.waitForFunction(() => {
      const input = document.querySelector('input[readonly][value="테스트 사용자"]');
      return Boolean(input);
    });
    assert.equal(await form.getByLabel('상태').inputValue(), '요청');
    await page.getByRole('button', { name: '상세 행 추가' }).click();
    await page.screenshot({ path: fileURLToPath(new URL(`create-${width}.png`, createOutput)), animations: 'disabled' });

    await page.goto(`${origin}/materials/request/request-status`);
    const grid = page.getByRole('grid', { name: '구매요청현황 목록' });
    await grid.getByRole('button', { name: 'MR-20261112-0001 상세 보기' }).first().waitFor();
    await page.screenshot({ path: fileURLToPath(new URL(`status-${width}.png`, statusOutput)), animations: 'disabled' });

    await grid.getByRole('button', { name: 'MR-20261112-0001 상세 보기' }).first().click();
    await page.getByText('구매요청번호: MR-20261112-0001').waitFor();
    await page.screenshot({ path: fileURLToPath(new URL(`detail-${width}.png`, statusOutput)), animations: 'disabled' });

    await page.getByRole('button', { name: '구매요청 더보기' }).click();
    await page.getByRole('menuitem', { name: '수정' }).click();
    const dialog = page.getByRole('dialog', { name: '구매요청 수정' });
    await dialog.waitFor();
    await dialog.getByRole('grid', { name: '구매요청 상세 목록' }).getByText('3001587').waitFor();
    assert.equal(await dialog.getByLabel('구매요청번호').inputValue(), 'MR-20261112-0001');
    await page.screenshot({ path: fileURLToPath(new URL(`edit-dialog-${width}.png`, statusOutput)), animations: 'disabled' });

    assert.deepEqual(pageErrors, []);
    await context.close();
    console.log(`checked ${width}px`);
  }
} finally {
  await browser.close();
}
