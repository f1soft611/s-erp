import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 합성 데이터로 구매요청확정(품목 단위 확정) 화면을 375/768/1280px에서 확인한다. 실제 DB를 쓰지 않는다.
const origin = 'http://127.0.0.1:4173';
const output = new URL('../../docs/result/20261112/purchase-request-confirm-item/screenshots/', import.meta.url);
const permissions = { read: true, update: true };
const menus = [{
  menuId: 100, parentMenuId: null, name: '구매자재', path: '/materials',
  children: [{
    menuId: 101, parentMenuId: 100, name: '구매관리', path: '/materials/request',
    children: [
      { menuId: 104, parentMenuId: 101, name: '구매요청확정', path: '/materials/request/request-confirm', permissions },
    ],
  }],
}];

const detail = (requestId, detailId, lineNo, code, name, qty, confirmed, currency = 'KRW') => ({
  purchaseRequestId: requestId, requestNo: `MR-20261112-000${requestId}`, requestDt: '2026-11-12',
  requesterName: '테스트 사용자', requestDeptName: '생산지원팀',
  purchaseRequestDetailId: detailId, lineNo, materialId: detailId, materialCode: code, materialName: name, materialSpec: null,
  unit: 'KG', requestQty: qty, requestDeliveryDt: '2026-11-19', useType: 'PRODUCTION', useTypeName: '생산', requestRemark: null,
  confirmQty: confirmed ? qty : null, confirmDeliveryDt: confirmed ? '2026-11-19' : null,
  warehouseId: confirmed ? 1 : null, warehouseName: confirmed ? '자재창고' : null,
  orderType: confirmed ? 'RAW_MATERIAL' : null, orderTypeName: confirmed ? '원자재' : null,
  supplierId: confirmed ? 4 : null, supplierCode: confirmed ? '213231' : null, supplierName: confirmed ? '테스트' : null,
  unitPrice: confirmed ? 1200 : null, currencyCode: confirmed ? currency : null, amount: confirmed ? qty * 1200 : 0,
  confirmRemark: null, orderCloseAt: confirmed ? 'N' : null,
});
const draftDetails = [
  detail(5, 51, 1, '000012', '원재료 품목', 20, false),
  detail(5, 52, 2, '000008', '부재료 품목', 5, false),
  detail(6, 61, 1, '000009', '소모품 품목', 3, false),
];
const confirmItem = {
  purchaseConfirmId: 9, confirmNo: 'MC-20261112-0001', confirmDt: '2026-11-12', confirmerName: '구매 담당',
  currencyCode: 'KRW', totalAmt: 33600, remark: '11월 2주차 자재', useAt: 'Y', updatedByName: null, updatedAt: null,
  details: [
    detail(5, 51, 1, '000012', '원재료 품목', 20, true),
    detail(5, 52, 2, '000008', '부재료 품목', 5, true),
    detail(6, 61, 1, '000009', '소모품 품목', 3, true),
  ],
};

function apiResult(path) {
  if (path === '/api/v1/menus/my') return { user: { userId: '1', name: '테스트 사용자', roles: [], roleName: 'USER' }, menus };
  if (path === '/api/v1/system/modules') {
    return { resultList: [{ moduleId: 5, moduleCode: 'MATERIALS', moduleNm: '구매자재', moduleUrl: '/materials', iconNm: 'ShoppingCart', useAt: 'Y' }] };
  }
  if (path === '/api/v1/menus/favorites') return { item: { folders: [], favorites: [] } };
  if (path.endsWith('/summary')) return { unreadCount: 0 };
  if (path === '/api/v1/co/master/warehouses') return { resultList: [{ warehouseId: 1, warehouseCode: '001', warehouseName: '자재창고', disuseAt: 'N' }] };
  if (path === '/api/v1/co/master/common-code/groups') return { resultList: [{ commonCodeGroupId: 9, groupCode: 'PURCHASE_ORDER_TYPE', groupNm: '발주구분', sortOrder: 100, useAt: 'Y' }] };
  if (path === '/api/v1/co/master/common-code/groups/9/items') {
    return { resultList: [['RAW_MATERIAL', '원자재'], ['SUB_MATERIAL', '부자재'], ['CONSUMABLE', '소모품']].map(([itemCode, itemNm], index) => ({
      commonCodeItemId: index + 1, groupId: 9, itemCode, itemNm, sortOrder: (index + 1) * 10, useAt: 'Y' })) };
  }
  if (path === '/api/v1/materials/purchase-request-confirms/candidates') {
    return { resultList: [[5, 51, 1, '000012', '원재료 품목'], [5, 52, 2, '000008', '부재료 품목'], [5, 53, 3, '000013', '원재료 품목 2'],
      [6, 61, 1, '000009', '소모품 품목'], [7, 71, 1, '000014', '부재료 품목 2']].map(([requestId, detailId, lineNo, code, name]) => ({
      purchaseRequestId: requestId, purchaseRequestDetailId: detailId, requestNo: `MR-20261112-000${requestId}`, requestDt: '2026-11-12',
      requesterName: '테스트 사용자', requestStatus: requestId === 7 ? 'PARTIALLY_CONFIRMED' : 'REQUESTED', lineNo, materialCode: code,
      materialName: name, materialSpec: '규격 A', unit: 'KG', requestQty: 10, requestDeliveryDt: '2026-11-19', useTypeName: '생산',
      requestRemark: null })) };
  }
  if (path === '/api/v1/materials/purchase-request-confirms/request-details') return { resultList: draftDetails };
  if (path === '/api/v1/materials/purchase-request-confirms') {
    return { resultList: [{ purchaseConfirmId: 9, confirmNo: 'MC-20261112-0001', confirmDt: '2026-11-12', confirmerName: '구매 담당',
      currencyCode: 'KRW', totalAmt: 33600, requestCount: 2, remark: '11월 2주차 자재', useAt: 'Y' }] };
  }
  if (path === '/api/v1/materials/purchase-request-confirms/9') return { item: confirmItem };
  return { resultList: [] };
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({ tenantCode: 'test', userId: '1', accessToken: 'browser-test-only',
        refreshToken: 'browser-test-only', expiresAt: new Date(Date.now() + 3600000).toISOString() }));
    });
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ resultCode: '200', resultMessage: '성공', result: apiResult(path) }) });
    });
    const shot = (name) => page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, output)), animations: 'disabled' });

    await page.goto(`${origin}/materials/request/request-confirm`);
    await page.getByRole('region', { name: '구매요청 확정 내용' }).waitFor();
    await page.getByRole('button', { name: '요청 불러오기' }).click();
    const picker = page.getByRole('dialog', { name: '구매요청 선택' });
    await picker.getByText('MR-20261112-0005').first().waitFor();
    await picker.getByLabel('51 행 선택').click();
    await picker.getByLabel('52 행 선택').click();
    await picker.getByLabel('61 행 선택').click();
    await shot('request-picker');
    await picker.getByRole('button', { name: /선택 불러오기/ }).click();
    const grid = page.getByRole('grid', { name: '구매요청 확정 상세 목록' });
    await grid.getByText('MR-20261112-0006').first().waitFor();
    assert.equal(await page.getByLabel('요청 건수 / 품목 수').inputValue(), '2 / 3');
    await page.getByRole('button', { name: '확정', exact: true }).click();
    await page.getByText('입고창고를 선택해 주세요.').waitFor();
    await shot('draft');

    await page.getByRole('button', { name: '확정 불러오기' }).click();
    const leave = page.getByRole('dialog', { name: '확인' });
    await leave.getByRole('button', { name: '확인' }).click();
    const confirmPicker = page.getByRole('dialog', { name: '구매요청확정 선택' });
    await confirmPicker.getByRole('button', { name: 'MC-20261112-0001 선택' }).waitFor();
    await shot('confirm-picker');
    await confirmPicker.getByRole('button', { name: 'MC-20261112-0001 선택' }).click();
    await page.getByRole('button', { name: '확정 취소' }).waitFor();
    assert.equal(await page.getByLabel('확정번호').inputValue(), 'MC-20261112-0001');
    await shot('confirmed');

    assert.deepEqual(pageErrors, []);
    await context.close();
    console.log(`checked ${width}px`);
  }
} finally {
  await browser.close();
}
