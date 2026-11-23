import assert from 'node:assert/strict';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 합성 데이터로 단가등록 개편(품목 기준 좌우 그리드·계정분류 멀티선택·공통단가 폐지)을 375/768/1280px에서 확인한다. 실제 DB를 쓰지 않는다.
// 4173 개발 서버가 떠 있어야 한다(없으면 실행하지 않는다).
const origin = 'http://127.0.0.1:4173';
const output = new URL('../../docs/result/20261123/item-price-redesign/screenshots/', import.meta.url);
const permissions = { read: true, create: true, update: true, delete: true, excel: true };
const menus = [
  { menuId: 10, parentMenuId: null, name: '기준정보', path: '/co', children: [{
    menuId: 11, parentMenuId: 10, name: '마스터', path: '/co/master', children: [
      { menuId: 12, parentMenuId: 11, name: '매입단가등록', path: '/co/master/item-purchase-prices', permissions },
      { menuId: 13, parentMenuId: 11, name: '매출단가등록', path: '/co/master/item-sales-prices', permissions },
    ],
  }] },
];

const items = {
  매입: [
    { materialId: 1, materialCode: 'A001', materialName: '원재료 A', materialSpec: '규격1', materialUnit: 'KG', materialTypeCode: 'RAW',
      customerCount: 2, defaultSupplierId: 301, defaultSupplierCode: 'C1', defaultSupplierName: '거래처 하나' },
    { materialId: 2, materialCode: 'A002', materialName: '부재료 B', materialSpec: '', materialUnit: 'EA', materialTypeCode: 'SUB',
      customerCount: 0, defaultSupplierId: null, defaultSupplierName: '' },
  ],
  매출: [
    { materialId: 7, materialCode: 'P001', materialName: '제품 P', materialSpec: '대', materialUnit: 'EA', materialTypeCode: 'PRODUCT',
      customerCount: 1, defaultSupplierId: null, defaultSupplierName: '' },
  ],
};
const priceRow = (priceId, materialId, code, name, customerId, customerCode, customerName, tradeType, price, extra = {}) => ({
  priceId, tenantId: 1, materialId, materialCode: code, materialName: name, materialSpec: '규격1', materialUnit: 'KG',
  customerId, customerCode, customerName, tradeType, unitPrice: price, taxType: 'TAXABLE', vatIncludedAt: 'N',
  foreignUnitPrice: null, currency: '', orderType: '', orderTypeName: '', defaultSupplier: false, priceStatus: 'current',
  startDt: '2026-11-01', endDt: null, moq: null, useAt: 'Y', ...extra,
});

let savedPayload = null;
const overviewUrls = [];
const priceUrls = [];
function apiResult(url, request) {
  const path = url.pathname;
  if (path === '/api/v1/menus/my') return { user: { userId: '1', name: '테스트 사용자', roles: [], roleName: 'ADMIN' }, menus };
  if (path === '/api/v1/system/modules') {
    return { resultList: [{ moduleId: 1, moduleCode: 'CO', moduleNm: '기준정보', moduleUrl: '/co', iconNm: 'Settings', useAt: 'Y' }] };
  }
  if (path === '/api/v1/common/system-date') return { today: '2026-11-23' };
  if (path === '/api/v1/menus/favorites') return { item: { folders: [], favorites: [] } };
  if (path.endsWith('/summary')) return { unreadCount: 0 };
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
  if (path === '/api/v1/co/master/item-partner-prices/overview') {
    overviewUrls.push(url.search);
    return { resultList: items[url.searchParams.get('tradeType')] ?? [] };
  }
  if (path === '/api/v1/co/master/item-partner-prices/customer-overview') {
    return { resultList: [{ customerId: 301, customerCode: 'C1', customerName: '거래처 하나', businessNo: '1234567890', priceCount: 1 }] };
  }
  if (path === '/api/v1/co/master/item-partner-prices') {
    priceUrls.push(url.search);
    if (url.searchParams.get('materialId') === '7') {
      return { resultList: [priceRow(21, 7, 'P001', '제품 P', 401, 'S1', '수주처 하나', '매출', 5000)] };
    }
    return { resultList: [
      priceRow(11, 1, 'A001', '원재료 A', 301, 'C1', '거래처 하나', '매입', 900, { defaultSupplier: true, orderType: 'RAW_MATERIAL', orderTypeName: '원자재' }),
      priceRow(12, 1, 'A001', '원재료 A', 302, 'C2', '거래처 둘', '매입', 950),
    ] };
  }
  if (path === '/api/v1/co/master/item-partner-prices/save-batch') {
    savedPayload = JSON.parse(request.postData() ?? '{}');
    return { item: { prices: [], rowIdMappings: {}, clearedDefaultMaterialIds: [] } };
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
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ resultCode: '200', resultMessage: '성공', result: apiResult(url, route.request()) }) });
    });
    const shot = (name) => page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, output)), animations: 'disabled' });

    // 1) 매입단가등록 품목 기준: 계정분류 기본값(원재료·부재료·소모품)으로 조회하고 좌우 그리드가 보인다.
    overviewUrls.length = 0;
    await page.goto(`${origin}/co/master/item-purchase-prices`);
    await page.getByRole('grid', { name: '품목 목록' }).getByText('원재료 A').first().waitFor();
    assert.ok(overviewUrls[0].includes('itemTypes=RAW%2CSUB%2CSUPPLY'), `purchase default item types: ${overviewUrls[0]}`);
    await page.getByRole('button', { name: '상세 검색 열기' }).click();
    await page.getByText('품목 계정분류: 원재료, 부재료, 소모품').first().waitFor();
    await page.getByRole('combobox', { name: '품목 계정분류' }).click();
    await page.getByRole('option', { name: '제품', exact: true }).waitFor();
    assert.equal(await page.getByRole('option').count(), 6, 'multi select lists all six accounts');
    await shot('price-search-multi-open');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '상세 검색 닫기' }).click();

    const list = page.getByRole('grid', { name: '품목 목록' });
    // 품목코드·품목·규격·단위가 나란히 있다.
    if (width >= 1280) {
      const headers = await list.getByRole('columnheader').allTextContents();
      const at = headers.findIndex((text) => text.includes('품목코드'));
      assert.deepEqual(headers.slice(at, at + 4).map((text) => text.replace(/[*\s]/g, '')), ['품목코드', '품목', '규격', '단위']);
    }
    await list.getByText('원재료 A').first().click();
    await page.getByText(/A001 · 원재료 A 단가/).waitFor();
    // 매입 단가 그리드: "기본" 체크 열이 No 바로 다음(맨 앞)에 있고 최소주문수량 열은 없다.
    const priceHeaders = (await page.getByRole('grid', { name: '품목·거래처별 단가 목록' }).getByRole('columnheader').allTextContents())
      .map((text) => text.replace(/[*\s]/g, ''));
    assert.deepEqual(priceHeaders.slice(0, 2), ['No', '기본'], `purchase price grid headers: ${priceHeaders.join(',')}`);
    assert.ok(!priceHeaders.some((text) => text.includes('최소주문수량')), 'no minimum order quantity column');
    await page.getByText('거래처 둘').first().waitFor();
    assert.ok(priceUrls.some((query) => query.includes('materialId=1') && !query.includes('customerId')), 'item prices are fetched by materialId');
    await shot('price-overview');

    if (width >= 1280) {
      // 신규 행 폼: 선택한 품목이 비활성으로 보이고 거래처를 고르며 기본 거래처 체크박스가 있다.
      await page.getByRole('button', { name: '단가 추가' }).click();
      const created = page.getByRole('dialog', { name: '단가 등록' });
      await created.getByText('품목 선택').first().waitFor();
      const itemInput = created.locator('input[value="A001 · 원재료 A"]');
      await itemInput.waitFor();
      assert.ok(await itemInput.evaluate((input) => input.disabled || input.readOnly), 'selected item is shown read-only');
      await created.getByLabel('기본 거래처').waitFor();
      assert.equal(await created.getByText('최소주문수량').count(), 0, 'minimum order quantity is not on the form');
      await shot('price-create-form');
      await created.getByRole('button', { name: '취소' }).click();

      // 기본 거래처는 한 행만 체크된다: 둘째 행을 체크하면 첫째 행 체크가 해제되고 저장 요청에 반영된다.
      const priceGrid = await page.getByRole('grid', { name: '품목·거래처별 단가 목록' }).boundingBox();
      await page.mouse.move(priceGrid.x + priceGrid.width / 2, priceGrid.y + 120);
      // 기본 거래처 열이 보일 때까지 조금씩 오른쪽으로 민다(열 가상화로 화면 밖 열은 그리지 않는다).
      for (let i = 0; i < 30 && (await page.getByLabel('기본 11').count()) === 0; i += 1) {
        await page.mouse.wheel(150, 0);
        await page.waitForTimeout(120);
      }
      const first = page.getByLabel('기본 11');
      const second = page.getByLabel('기본 12');
      assert.ok(await first.isChecked(), 'current default supplier is checked');
      await second.click();
      await page.waitForTimeout(300);
      assert.ok(await second.isChecked(), 'new default supplier is checked');
      assert.ok(!(await first.isChecked()), 'previous default supplier is unchecked');
      await page.getByRole('button', { name: '저장', exact: true }).click();
      await page.waitForTimeout(800);
      assert.ok(savedPayload, 'save-batch was called');
      const flags = savedPayload.prices.updatedRows.map((row) => [row.priceId, row.defaultSupplier]).sort();
      assert.deepEqual(flags, [['11', false], ['12', true]]);
      assert.ok(savedPayload.prices.updatedRows.every((row) => row.materialId === 1 && row.customerId), 'item and customer are sent on every row');
    }

    // 2) 매출단가등록: 계정분류 기본값이 제품·반제품·상품이고 매입 전용 열(기본 거래처)이 없다.
    overviewUrls.length = 0;
    await page.goto(`${origin}/co/master/item-sales-prices`);
    await page.getByRole('grid', { name: '품목 목록' }).getByText('제품 P').first().waitFor();
    assert.ok(overviewUrls[0].includes('itemTypes=PRODUCT%2CSEMI%2CGOODS'), `sales default item types: ${overviewUrls[0]}`);
    assert.equal(await page.getByText('기본 거래처').count(), 0, 'sales screen has no default supplier column');
    await page.getByRole('grid', { name: '품목 목록' }).getByText('제품 P').first().click();
    await page.getByText(/P001 · 제품 P 단가/).waitFor();
    const salesHeaders = await page.getByRole('grid', { name: '품목·거래처별 단가 목록' }).getByRole('columnheader').allTextContents();
    assert.ok(!salesHeaders.some((text) => text.replace(/\s/g, '') === '기본'), 'sales price grid has no default column');
    await shot('sales-price-overview');

    if (width >= 1280) {
      // 3) 거래처 기준 탭도 계정분류 조건을 가진다.
      await page.goto(`${origin}/co/master/item-purchase-prices`);
      await page.getByRole('tab', { name: '거래처 기준' }).click();
      await page.getByRole('grid', { name: '거래처 목록' }).getByText('거래처 하나').first().click();
      await page.getByText(/C1 · 거래처 하나 단가/).waitFor();
      await page.getByRole('button', { name: '상세 검색 열기' }).click();
      await page.getByRole('combobox', { name: '품목 계정분류' }).waitFor();
      await shot('customer-tab');
    }
    assert.deepEqual(pageErrors, []);
    await context.close();
    console.log(`checked ${width}px`);
  }
} finally {
  await browser.close();
}
