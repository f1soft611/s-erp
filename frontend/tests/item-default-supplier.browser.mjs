import assert from 'node:assert/strict';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 합성 데이터로 단가등록(품목 기준)의 기본 거래처·발주구분과 구매요청확정의 자동 채움을 375/768/1280px에서 확인한다. 실제 DB를 쓰지 않는다.
const origin = 'http://127.0.0.1:4173';
const output = new URL('../../docs/result/20261120/item-default-supplier/screenshots/', import.meta.url);
const permissions = { read: true, create: true, update: true, delete: true, excel: true };
const menus = [
  { menuId: 10, parentMenuId: null, name: '기준정보', path: '/co', children: [{
    menuId: 11, parentMenuId: 10, name: '마스터', path: '/co/master', children: [
      { menuId: 12, parentMenuId: 11, name: '단가등록', path: '/co/master/item-partner-prices', permissions },
    ],
  }] },
  { menuId: 100, parentMenuId: null, name: '구매자재', path: '/materials', children: [{
    menuId: 101, parentMenuId: 100, name: '구매관리', path: '/materials/request', children: [
      { menuId: 104, parentMenuId: 101, name: '구매요청확정', path: '/materials/request/request-confirm', permissions },
    ],
  }] },
];

const side = (priceId, price, extra = {}) => ({
  priceId, unitPrice: price, taxType: 'TAXABLE', vatIncludedAt: 'N', foreignUnitPrice: null, currency: null,
  moq: null, startDt: '2026-11-01', endDt: null, priceStatus: 'current', ...extra,
});
const overviewRows = [
  { rowId: 'item-1', parentId: null, materialId: 1, materialCode: 'A001', materialName: '원재료 A', materialSpec: '규격1', materialUnit: 'KG',
    specialCount: 2, defaultSupplierId: 301, defaultSupplierCode: 'C1', defaultSupplierName: '거래처 하나', purchase: side(10, 1000), sales: null },
  { rowId: 'cust-1-301', parentId: 'item-1', materialId: 1, materialCode: 'A001', materialName: '원재료 A', customerId: 301,
    customerCode: 'C1', customerName: '거래처 하나', purchase: side(11, 900, { orderType: 'RAW_MATERIAL', orderTypeName: '원자재', defaultSupplier: true }), sales: null },
  { rowId: 'cust-1-302', parentId: 'item-1', materialId: 1, materialCode: 'A001', materialName: '원재료 A', customerId: 302,
    customerCode: 'C2', customerName: '거래처 둘', purchase: side(12, 950), sales: null },
  { rowId: 'item-2', parentId: null, materialId: 2, materialCode: 'A002', materialName: '부재료 B', materialSpec: '', materialUnit: 'EA',
    specialCount: 0, purchase: null, sales: null },
];
const requestDetail = (detailId, code, name, filled) => ({
  purchaseRequestId: 5, requestNo: 'MR-20261120-0005', requestDt: '2026-11-20', requesterName: '테스트 사용자', requestDeptName: null,
  purchaseRequestDetailId: detailId, lineNo: detailId - 50, materialId: detailId, materialCode: code, materialName: name, materialSpec: null,
  unit: 'KG', requestQty: 10, requestDeliveryDt: '2026-11-27', useType: 'PRODUCTION', useTypeName: '생산', requestRemark: null,
  confirmQty: null, confirmDeliveryDt: null, warehouseId: null, warehouseName: null,
  orderType: filled ? 'RAW_MATERIAL' : null, orderTypeName: filled ? '원자재' : null,
  supplierId: filled ? 301 : null, supplierCode: filled ? 'C1' : null, supplierName: filled ? '거래처 하나' : null,
  unitPrice: filled ? 900 : null, currencyCode: filled ? 'KRW' : null, taxType: filled ? 'TAXABLE' : null, vatIncludedAt: filled ? 'N' : null,
  amount: 0, confirmRemark: null, orderCloseAt: null,
});

let savedPayload = null;
function apiResult(path, request) {
  if (path === '/api/v1/menus/my') return { user: { userId: '1', name: '테스트 사용자', roles: [], roleName: 'ADMIN' }, menus };
  if (path === '/api/v1/system/modules') {
    return { resultList: [
      { moduleId: 1, moduleCode: 'CO', moduleNm: '기준정보', moduleUrl: '/co', iconNm: 'Settings', useAt: 'Y' },
      { moduleId: 5, moduleCode: 'MATERIALS', moduleNm: '구매자재', moduleUrl: '/materials', iconNm: 'ShoppingCart', useAt: 'Y' },
    ] };
  }
  if (path === '/api/v1/common/system-date') return { today: '2026-11-20' };
  if (path === '/api/v1/menus/favorites') return { item: { folders: [], favorites: [] } };
  if (path.endsWith('/summary')) return { unreadCount: 0 };
  if (path === '/api/v1/co/master/warehouses') return { resultList: [{ warehouseId: 1, warehouseCode: '001', warehouseName: '자재창고', disuseAt: 'N' }] };
  if (path === '/api/v1/co/master/common-code/groups') {
    return { resultList: [
      { commonCodeGroupId: 9, groupCode: 'PURCHASE_ORDER_TYPE', groupNm: '발주구분', sortOrder: 100, useAt: 'Y' },
      { commonCodeGroupId: 8, groupCode: 'PURCHASE_TAX_TYPE', groupNm: '부가세구분', sortOrder: 90, useAt: 'Y' },
    ] };
  }
  if (path === '/api/v1/co/master/common-code/groups/9/items') {
    return { resultList: [['RAW_MATERIAL', '원자재'], ['SUB_MATERIAL', '부자재']].map(([itemCode, itemNm], index) => ({
      commonCodeItemId: index + 1, groupId: 9, itemCode, itemNm, sortOrder: (index + 1) * 10, useAt: 'Y' })) };
  }
  if (path === '/api/v1/co/master/common-code/groups/8/items') {
    return { resultList: [{ commonCodeItemId: 20, groupId: 8, itemCode: 'TAXABLE', itemNm: '과세', sortOrder: 10, useAt: 'Y' }] };
  }
  if (path === '/api/v1/co/master/item-partner-prices/customer-overview') {
    return { resultList: [{ customerId: 301, customerCode: 'C1', customerName: '거래처 하나', businessNo: '1234567890', priceCount: 1 }] };
  }
  if (path === '/api/v1/co/master/item-partner-prices') {
    return { resultList: [{ priceId: 11, tenantId: 1, materialId: 1, materialCode: 'A001', materialName: '원재료 A', materialSpec: '규격1',
      materialUnit: 'KG', customerId: 301, customerCode: 'C1', customerName: '거래처 하나', tradeType: '매입', unitPrice: 900,
      taxType: 'TAXABLE', vatIncludedAt: 'N', foreignUnitPrice: null, currency: '', orderType: 'RAW_MATERIAL', orderTypeName: '원자재',
      defaultSupplier: true, priceStatus: 'current', startDt: '2026-11-01', endDt: null, moq: null, useAt: 'Y' }] };
  }
  if (path === '/api/v1/co/master/item-partner-prices/overview') return { resultList: overviewRows };
  if (path === '/api/v1/co/master/item-partner-prices/save-batch') {
    savedPayload = JSON.parse(request.postData() ?? '{}');
    return { item: { prices: [], rowIdMappings: {}, clearedDefaultMaterialIds: [] } };
  }
  if (path === '/api/v1/materials/purchase-request-confirms/candidates') {
    return { resultList: [[51, '000012', '원재료 품목'], [52, '000008', '부재료 품목']].map(([detailId, code, name]) => ({
      purchaseRequestId: 5, purchaseRequestDetailId: detailId, requestNo: 'MR-20261120-0005', requestDt: '2026-11-20',
      requesterName: '테스트 사용자', requestStatus: 'REQUESTED', lineNo: detailId - 50, materialCode: code, materialName: name,
      materialSpec: '규격 A', unit: 'KG', requestQty: 10, requestDeliveryDt: '2026-11-27', useTypeName: '생산', requestRemark: null })) };
  }
  if (path === '/api/v1/materials/purchase-request-confirms/request-details') {
    return { resultList: [requestDetail(51, '000012', '원재료 품목', true), requestDetail(52, '000008', '부재료 품목', false)] };
  }
  return { resultList: [] };
}

await rm(output, { recursive: true, force: true });
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
    let requestDetailsUrl = '';
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/request-details')) requestDetailsUrl = url.search;
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ resultCode: '200', resultMessage: '성공', result: apiResult(url.pathname, route.request()) }) });
    });
    const shot = (name) => page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, output)), animations: 'disabled' });

    // 1) 단가등록 품목 기준
    await page.goto(`${origin}/co/master/item-partner-prices`);
    const tree = page.getByRole('treegrid', { name: '품목 기준 단가' }).or(page.getByRole('grid', { name: '품목 기준 단가' }));
    await tree.first().waitFor();
    await page.getByText('A001 · 원재료 A').first().waitFor();
    await page.getByRole('button', { name: /A001 · 원재료 A 펼치기/ }).click();
    await page.getByText('거래처 둘').first().waitFor();
    if (width >= 1280) {
      // 거래처(자식) 행의 수정 폼: 거래처 정보가 비활성으로 보이고 오른쪽에 기본 거래처 체크박스가 있다.
      await page.getByRole('button', { name: 'cust-1-301 행 정보 수정' }).click();
      const form = page.getByRole('dialog', { name: '품목 단가 입력' });
      await form.getByText('거래처 선택').first().waitFor();
      assert.ok(await form.getByLabel('기본 거래처').isChecked(), 'default supplier is checked in the edit form');
      assert.ok(await form.getByLabel('기본 거래처').isEnabled(), 'checkbox is enabled when a purchase price exists');
      await page.screenshot({ path: fileURLToPath(new URL(`price-edit-form-${width}.png`, output)), animations: 'disabled' });
      await form.getByRole('button', { name: '취소' }).click();
      // 신규 특별단가 행의 폼: 같은 배치로 거래처 선택 오른쪽에 기본 거래처 체크박스가 보이고, 매입 단가를 입력하면 활성화된다.
      await page.getByText('A001 · 원재료 A').first().click();
      await page.getByRole('button', { name: '특별단가 추가' }).click();
      const created = page.getByRole('dialog', { name: '품목 단가 입력' });
      const defaultBox = created.getByLabel('기본 거래처');
      await defaultBox.waitFor();
      await defaultBox.click({ force: true });
      assert.ok(!(await defaultBox.isChecked()), 'checkbox cannot be checked until a purchase price is entered');
      await created.getByLabel(/매입 원화단가/).fill('500');
      await page.waitForTimeout(300);
      await defaultBox.click();
      assert.ok(await defaultBox.isChecked(), 'checkbox can be checked after a purchase price is entered');
      await page.screenshot({ path: fileURLToPath(new URL(`price-create-form-${width}.png`, output)), animations: 'disabled' });
      await created.getByRole('button', { name: '취소' }).click();
    }
    if (width >= 1280) {
      assert.ok(await page.getByText('매입 기본 거래처').first().isVisible(), 'parent default supplier column header');
      // 단가 열이 가로로 넓어 기본 거래처 열이 보이도록 그리드를 오른쪽으로 민다.
      await page.mouse.move(800, 400);
      for (let i = 0; i < 6; i += 1) await page.mouse.wheel(900, 0);
      await page.waitForTimeout(400);
      const first = page.getByLabel('기본 거래처 cust-1-301');
      const second = page.getByLabel('기본 거래처 cust-1-302');
      assert.ok(await first.isChecked(), 'current default supplier is checked');
      await second.click();
      await page.waitForTimeout(300);
      assert.ok(await second.isChecked(), 'new default supplier is checked');
      assert.ok(!(await first.isChecked()), 'previous default supplier is unchecked in the grid');
    }
    await shot('price-overview');
    if (width >= 1280) {
      await page.getByRole('button', { name: '저장', exact: true }).click();
      await page.waitForFunction(() => true);
      await page.waitForTimeout(800);
      assert.ok(savedPayload, 'save-batch was called');
      const rows = savedPayload.prices.updatedRows;
      assert.deepEqual(rows.map((row) => [row.priceId, row.defaultSupplier]).sort(), [['11', false], ['12', true]]);
      assert.equal(savedPayload.prices.insertedRows.length, 0);
      assert.equal(rows.find((row) => row.priceId === '12').unitPrice, 950);
    }

    // 2) 확정 화면: 요청 불러오기 시 기본 거래처·단가·발주구분 자동 채움
    await page.goto(`${origin}/materials/request/request-confirm`);
    await page.getByRole('region', { name: '구매요청 확정 내용' }).waitFor();
    await page.getByRole('button', { name: '요청 불러오기' }).click();
    const picker = page.getByRole('dialog', { name: '구매요청 선택' });
    await picker.getByText('MR-20261120-0005').first().waitFor();
    await picker.getByLabel('51 행 선택').click();
    await picker.getByLabel('52 행 선택').click();
    await picker.getByRole('button', { name: /선택 불러오기/ }).click();
    const grid = page.getByRole('grid', { name: '구매요청 확정 상세 목록' });
    await grid.getByText('MR-20261120-0005').first().waitFor();
    await shot('confirm-prefilled');
    // 확정수량 10 × 기본 거래처 단가 900 = 합계금액 9,000(구매처 없는 행은 0원)
    assert.equal(await page.getByLabel('합계금액').inputValue(), '9,000');
    assert.ok(!requestDetailsUrl.includes('baseDt'), 'baseDt is omitted so the server date is used');

    if (width >= 1280) {
      // 거래처 기준 탭의 행 폼도 같은 배치: 거래처 정보(비활성)와 오른쪽 기본 거래처 체크박스
      await page.goto(`${origin}/co/master/item-partner-prices`);
      await page.getByRole('tab', { name: '거래처 기준' }).click();
      await page.getByRole('grid', { name: '거래처 목록' }).getByText('거래처 하나').first().click();
      await page.getByRole('button', { name: '11 행 정보 수정' }).click();
      const flat = page.getByRole('dialog', { name: '단가 수정' });
      await flat.getByText('거래처 선택').first().waitFor();
      assert.ok(await flat.getByLabel('기본 거래처').isChecked(), 'default supplier is checked in the customer tab form');
      await page.screenshot({ path: fileURLToPath(new URL(`customer-tab-edit-form-${width}.png`, output)), animations: 'disabled' });
    }
    assert.deepEqual(pageErrors, []);
    await context.close();
    console.log(`checked ${width}px`);
  }
} finally {
  await browser.close();
}
