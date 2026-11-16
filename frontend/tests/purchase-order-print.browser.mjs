import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 합성 데이터로 발주서 출력(미리보기, A4 인쇄 PDF)을 375/768/1280px에서 확인한다. 실제 DB를 쓰지 않는다.
const origin = 'http://127.0.0.1:4173';
const output = new URL('../../docs/result/20261113/purchase-order-print/screenshots/', import.meta.url);
const menus = [{
  menuId: 100, parentMenuId: null, name: '구매자재', path: '/materials',
  children: [{
    menuId: 101, parentMenuId: 100, name: '발주관리', path: '/materials/order',
    children: [
      { menuId: 105, parentMenuId: 101, name: '발주등록', path: '/materials/order/order-create', permissions: { read: true, update: true } },
      { menuId: 106, parentMenuId: 101, name: '발주현황', path: '/materials/order/order-status', permissions: { read: true, excel: true } },
    ],
  }],
}];

const lines = [
  ['3-40-31', '스테릴가르다 생크림', 'kg', 40, 6000, '2026-11-13'],
  ['3-32', '라프티스노우', 'kg', 5, 5900, '2026-11-14'],
  ['3-21', '딸기퓨레 [프랑스]', 'kg', 5, 17500, '2026-11-15'],
];
const detailsFor = (count) => Array.from({ length: count }, (_, index) => {
  const [code, name, unit, qty, price, delivery] = lines[index % lines.length];
  const supply = qty * price;
  return { lineNo: index + 1, materialCode: code, materialName: name, materialSpec: unit, unit, orderQty: qty, unitPrice: price,
    deliveryDt: delivery, supplyAmt: supply, vatAmt: supply / 10, totalAmt: supply * 1.1, remark: null };
});

let manyRows = false;
const order = {
  purchaseOrderId: 700, orderNo: 'PO-20261112-0001', orderDt: '2026-11-12', supplierId: 4, supplierCode: 'S4', supplierName: '(주) 제원인터내쇼날',
  ordererName: '김안나', currencyCode: 'KRW', sourceType: 'CONFIRM', taxType: 'TAXABLE', vatIncludedAt: 'Y',
  supplyAmt: 357000, vatAmt: 35700, totalAmt: 392700, printAt: 'N', remark: '오전 납품 요청', useAt: 'Y',
  details: detailsFor(3).map((row) => ({ purchaseOrderDetailId: row.lineNo + 10, lineNo: row.lineNo, purchaseRequestDetailId: row.lineNo + 40,
    requestNo: 'MR-1', confirmNo: 'MC-1', materialId: row.lineNo, materialCode: row.materialCode, materialName: row.materialName,
    materialSpec: row.materialSpec, unit: row.unit, orderQty: row.orderQty, unitPrice: row.unitPrice, deliveryDt: row.deliveryDt,
    warehouseId: 1, warehouseName: '자재창고', orderType: 'RAW_MATERIAL', orderTypeName: '원자재', useType: 'PRODUCTION',
    useTypeName: '생산', inspectAt: 'N', supplyAmt: row.supplyAmt, vatAmt: row.vatAmt, totalAmt: row.totalAmt, receiptCloseAt: 'N',
    remark: null, confirmQty: row.orderQty, remainQty: row.orderQty, confirmSupplierId: 4, confirmUnitPrice: row.unitPrice,
    confirmDeliveryDt: row.deliveryDt, confirmWarehouseId: 1 })),
};
const printData = () => ({
  purchaseOrderId: 700, orderNo: order.orderNo, orderDt: order.orderDt, currencyCode: 'KRW', taxType: 'TAXABLE', vatIncludedAt: 'Y',
  supplyAmt: manyRows ? 3570000 : 357000, vatAmt: manyRows ? 357000 : 35700, totalAmt: manyRows ? 3927000 : 392700,
  remark: '오전 납품 요청', printAt: 'N',
  companyName: '(주)정안', companyBusinessNo: '471-86-01812', companyPresidentName: '김정은', companyPostCode: '18271',
  companyAddress: '경기도 화성시 효행구 봉담읍 분천길 19-11 1층', companyTelephoneNo: '031-8067-7182', companyFacsimileNo: null,
  companyStampImage: null, companyLogoImage: null,
  vendorName: '(주) 제원인터내쇼날', vendorBusinessNo: null, vendorPresidentName: null, vendorPostCode: null, vendorAddress: null,
  vendorTelephoneNo: '010-7794-7915', vendorFacsimileNo: null, vendorCharge: '박담당',
  ordererName: '김안나', ordererMobileNo: '031-8067-7182', details: detailsFor(manyRows ? 30 : 3),
});
const statusRows = order.details.map((detail) => ({
  purchaseOrderId: 700, purchaseOrderDetailId: detail.purchaseOrderDetailId, orderNo: order.orderNo, orderDt: order.orderDt,
  supplierName: order.supplierName, ordererName: order.ordererName, status: 'ACTIVE', sourceType: 'CONFIRM', taxType: 'TAXABLE',
  taxTypeName: '과세', vatIncludedAt: 'Y', headerSupplyAmt: 357000, headerVatAmt: 35700, headerTotalAmt: 392700, headerRemark: null,
  lineNo: detail.lineNo, confirmNo: 'MC-1', requestNo: 'MR-1', materialCode: detail.materialCode, materialName: detail.materialName,
  materialSpec: detail.materialSpec, unit: detail.unit, orderQty: detail.orderQty, unitPrice: detail.unitPrice, deliveryDt: detail.deliveryDt,
  warehouseName: '자재창고', inspectAt: 'N', receiptCloseAt: 'N', printAt: 'N', supplyAmt: detail.supplyAmt, vatAmt: detail.vatAmt,
  totalAmt: detail.totalAmt, orderTypeName: '원자재', useTypeName: '생산', remark: null,
}));

function apiResult(path) {
  if (path === '/api/v1/menus/my') return { user: { userId: '1', name: '테스트 사용자', roles: [], roleName: 'USER' }, menus };
  if (path === '/api/v1/system/modules') {
    return { resultList: [{ moduleId: 5, moduleCode: 'MATERIALS', moduleNm: '구매자재', moduleUrl: '/materials', iconNm: 'ShoppingCart', useAt: 'Y' }] };
  }
  if (path === '/api/v1/menus/favorites') return { item: { folders: [], favorites: [] } };
  if (path.endsWith('/summary')) return { unreadCount: 0 };
  if (path === '/api/v1/common/system-date') return { today: '2026-11-13' };
  if (path === '/api/v1/materials/purchase-order-status') return { resultList: statusRows, resultCnt: statusRows.length };
  if (path === '/api/v1/materials/purchase-orders/700') return { item: order };
  if (path === '/api/v1/materials/purchase-orders/700/print') return { item: printData() };
  if (path === '/api/v1/materials/purchase-orders/700/print-mark') return { item: order };
  return { resultList: [] };
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({ tenantCode: 'test', userId: '1', accessToken: 'browser-test-only',
        refreshToken: 'browser-test-only', expiresAt: new Date(Date.now() + 3600000).toISOString() }));
      // 헤드리스 브라우저에서 인쇄 대화상자가 열리지 않도록 호출만 기록한다.
      window.__printCalls = 0;
      window.print = () => { window.__printCalls += 1; };
    });
    const postedPaths = [];
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (route.request().method() === 'POST') postedPaths.push(url.pathname);
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ resultCode: '200', resultMessage: '성공', result: apiResult(url.pathname) }) });
    });
    const shot = (name) => page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, output)), animations: 'disabled' });

    for (const rowsMode of [false, true]) {
      manyRows = rowsMode;
      await page.goto(`${origin}/materials/order/order-status`);
      const grid = page.getByRole('grid', { name: '발주현황 목록' });
      await grid.getByText('PO-20261112-0001').first().waitFor();
      const linkBox = await grid.getByRole('button', { name: 'PO-20261112-0001 상세 보기' }).first().boundingBox();
      await page.mouse.click(linkBox.x + linkBox.width / 2, linkBox.y + linkBox.height / 2);
      await page.getByText('발주번호: PO-20261112-0001').waitFor();
      await page.getByRole('button', { name: '발주 더보기' }).click();
      await page.getByRole('menuitem', { name: '출력' }).click();
      const preview = page.getByRole('dialog', { name: '발주서 미리보기' });
      await preview.getByText('금 액 :', { exact: false }).first().waitFor();
      const previewText = await preview.innerText();
      assert.match(previewText, rowsMode ? /금 액 : 삼백구십이만칠천원 정/ : /금 액 : 삼십구만이천칠백원 정/);
      assert.match(previewText, /VAT포함/);
      assert.match(previewText, /2026\/11\/13/);
      assert.match(previewText, /2026\/11\/15/);
      assert.equal(await preview.locator('.order-print-page').count(), rowsMode ? 2 : 1);
      await shot(rowsMode ? 'print-preview-two-pages' : 'print-preview');

      if (width === 1280) {
        // 인쇄 CSS: 전용 숨김 영역만 A4로 나오는지 PDF로 확인한다(한 페이지 / 두 페이지).
        await page.emulateMedia({ media: 'print' });
        await page.pdf({ path: fileURLToPath(new URL(rowsMode ? 'print-a4-two-pages.pdf' : 'print-a4.pdf', output)),
          format: 'A4', printBackground: true });
        await page.emulateMedia({ media: 'screen' });
      }

      // 인쇄 버튼: 인쇄 대화상자를 열고 출력을 기록한다.
      postedPaths.length = 0;
      await preview.getByRole('button', { name: '인쇄' }).click();
      await page.waitForFunction(() => window.__printCalls > 0);
      await page.waitForFunction(() => true);
      await expectPosted(page, postedPaths);
      await preview.getByTestId('common-dialog-actions').getByRole('button', { name: '닫기' }).click();
      await preview.waitFor({ state: 'hidden' });
    }

    assert.deepEqual(pageErrors, []);
    await context.close();
    console.log(`checked ${width}px`);
  }
} finally {
  await browser.close();
}

async function expectPosted(page, postedPaths) {
  for (let attempt = 0; attempt < 20 && !postedPaths.includes('/api/v1/materials/purchase-orders/700/print-mark'); attempt += 1) {
    await page.waitForTimeout(100);
  }
  assert.ok(postedPaths.includes('/api/v1/materials/purchase-orders/700/print-mark'), '인쇄 시 출력 기록 API를 호출해야 한다');
}
