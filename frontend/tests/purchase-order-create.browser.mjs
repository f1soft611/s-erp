import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 합성 데이터로 발주등록 화면을 375/768/1280px에서 확인한다. 실제 DB를 쓰지 않는다.
const origin = 'http://127.0.0.1:4173';
const output = new URL('../../docs/result/20261113/purchase-order-create/screenshots/', import.meta.url);
const permissions = { read: true, update: true };
const menus = [{
  menuId: 100, parentMenuId: null, name: '구매자재', path: '/materials',
  children: [{
    menuId: 101, parentMenuId: 100, name: '구매관리', path: '/materials/request',
    children: [
      { menuId: 105, parentMenuId: 101, name: '발주등록', path: '/materials/order/order-create', permissions },
    ],
  }],
}];

const candidate = (detailId, supplierId, code, name, qty) => ({
  purchaseRequestDetailId: detailId, requestNo: `MR-20261112-000${detailId}`, confirmNo: 'MC-20261112-0001', confirmDt: '2026-11-12',
  supplierId, supplierCode: `S${supplierId}`, supplierName: supplierId === 4 ? '테스트 구매처' : '다른 구매처',
  materialId: detailId, materialCode: code, materialName: name, materialSpec: '규격 A', unit: 'KG', materialTypeCode: 'RAW',
  inspectAt: detailId === 52 ? 'Y' : 'N', confirmQty: qty, orderedQty: detailId === 52 ? 2 : 0, remainQty: detailId === 52 ? qty - 2 : qty,
  requestDeliveryDt: '2026-11-19', confirmDeliveryDt: '2026-11-20', warehouseId: 1, warehouseName: '자재창고', unitPrice: 1200,
  currencyCode: 'KRW', orderType: 'RAW_MATERIAL', orderTypeName: '원자재', useType: 'PRODUCTION', useTypeName: '생산',
  remark: null, stockQty: null,
});
const candidates = [
  candidate(51, 4, '000012', '원재료 품목', 20),
  candidate(52, 4, '000008', '부재료 품목', 5),
  candidate(61, 5, '000009', '소모품 품목', 3),
];
const groups = [[9, 'PURCHASE_ORDER_TYPE', '발주구분'], [10, 'PURCHASE_USE_TYPE', '사용용도'], [11, 'PURCHASE_TAX_TYPE', '부가세구분']];
const items = {
  9: [['RAW_MATERIAL', '원자재'], ['SUB_MATERIAL', '부자재']],
  10: [['PRODUCTION', '생산'], ['CS', 'C/S']],
  11: [['TAXABLE', '과세'], ['ZERO_RATED', '영세'], ['EXEMPT', '면세']],
};

function apiResult(path) {
  if (path === '/api/v1/menus/my') return { user: { userId: '1', name: '테스트 사용자', roles: [], roleName: 'USER' }, menus };
  if (path === '/api/v1/system/modules') {
    return { resultList: [{ moduleId: 5, moduleCode: 'MATERIALS', moduleNm: '구매자재', moduleUrl: '/materials', iconNm: 'ShoppingCart', useAt: 'Y' }] };
  }
  if (path === '/api/v1/menus/favorites') return { item: { folders: [], favorites: [] } };
  if (path.endsWith('/summary')) return { unreadCount: 0 };
  if (path === '/api/v1/co/master/warehouses') return { resultList: [{ warehouseId: 1, warehouseCode: '001', warehouseName: '자재창고', deleteLockAt: 'N', disuseAt: 'N', stockQtyDispAt: 'Y', stockIoAt: 'Y', safetyStockAlertAt: 'N', stockDefaultAt: 'N' }] };
  if (path === '/api/v1/co/master/common-code/groups') {
    return { resultList: groups.map(([id, groupCode, groupNm], index) => ({ commonCodeGroupId: id, groupCode, groupNm, sortOrder: 100 + index, useAt: 'Y' })) };
  }
  const itemMatch = path.match(/^\/api\/v1\/co\/master\/common-code\/groups\/(\d+)\/items$/);
  if (itemMatch) {
    return { resultList: (items[Number(itemMatch[1])] ?? []).map(([itemCode, itemNm], index) => ({
      commonCodeItemId: index + 1, groupId: Number(itemMatch[1]), itemCode, itemNm, sortOrder: (index + 1) * 10, useAt: 'Y' })) };
  }
  if (path === '/api/v1/materials/purchase-orders/candidates') return { resultList: candidates };
  return { resultList: [] };
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280, 1920]) {
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

    await page.goto(`${origin}/materials/order/order-create`);
    await page.getByRole('region', { name: '발주 등록 내용' }).waitFor();
    await shot('empty');

    await page.getByRole('button', { name: '확정 불러오기' }).click();
    const picker = page.getByRole('dialog', { name: '확정 품목 선택' });
    await picker.getByText('MC-20261112-0001').first().waitFor();
    await picker.getByLabel('51 행 선택').click();
    await picker.getByText('구매처: 테스트 구매처').waitFor();
    await picker.getByLabel('61 행 선택').click();
    await picker.getByText(/구매처 1곳만 담을 수 있습니다/).waitFor();
    await picker.getByLabel('52 행 선택').click();
    await shot('picker-supplier-lock');
    await picker.getByRole('button', { name: /선택 불러오기/ }).click();

    const grid = page.getByRole('grid', { name: '발주 상세 목록' });
    await grid.getByText('원재료 품목').first().waitFor();
    assert.equal(await page.getByLabel('합계액').inputValue(), '30,360');
    await shot('loaded');

    await page.getByRole('combobox', { name: /부가세구분/ }).click();
    await page.getByRole('option', { name: '면세' }).click();
    await page.getByText('부가세 없음(미포함 고정)').waitFor();
    assert.equal(await page.getByLabel('합계액').inputValue(), '27,600');
    await shot('exempt');

    assert.deepEqual(pageErrors, []);
    await context.close();
    console.log(`checked ${width}px`);
  }
} finally {
  await browser.close();
}
