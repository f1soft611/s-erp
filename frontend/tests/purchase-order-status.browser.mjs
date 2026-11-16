import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 합성 데이터로 발주현황(목록, 상세 패널, 수정 다이얼로그)을 375/768/1280px에서 확인한다. 실제 DB를 쓰지 않는다.
const origin = 'http://127.0.0.1:4173';
const output = new URL('../../docs/result/20261113/purchase-order-status/screenshots/', import.meta.url);
const menus = [{
  menuId: 100, parentMenuId: null, name: '구매자재', path: '/materials',
  children: [{
    menuId: 101, parentMenuId: 100, name: '구매관리', path: '/materials/request',
    children: [
      { menuId: 105, parentMenuId: 101, name: '발주등록', path: '/materials/order/order-create', permissions: { read: true, update: true } },
      { menuId: 106, parentMenuId: 101, name: '발주현황', path: '/materials/order/order-status', permissions: { read: true, excel: true } },
    ],
  }],
}];

const line = (detailId, lineNo, code, name, qty, price) => ({
  purchaseOrderDetailId: detailId, lineNo, purchaseRequestDetailId: detailId + 4, requestNo: 'MR-20261112-0001', confirmNo: 'MC-20261112-0001',
  materialId: detailId + 100, materialCode: code, materialName: name, materialSpec: '규격 A', unit: 'KG', orderQty: qty, unitPrice: price,
  deliveryDt: '2026-11-24', warehouseId: 1, warehouseName: '자재창고', orderType: 'RAW_MATERIAL', orderTypeName: '원자재',
  useType: 'PRODUCTION', useTypeName: '생산', inspectAt: 'N', supplyAmt: qty * price, vatAmt: qty * price / 10, totalAmt: qty * price * 1.1,
  receiptCloseAt: 'N', remark: null, confirmQty: qty, remainQty: qty, confirmSupplierId: 4, confirmUnitPrice: price,
  confirmDeliveryDt: '2026-11-24', confirmWarehouseId: 1,
});
const details = [line(11, 1, '000012', '원재료 품목', 10, 1200), line(12, 2, '000008', '부재료 품목', 4, 850.5)];
const order = {
  purchaseOrderId: 700, orderNo: 'PO-20261113-0001', orderDt: '2026-11-13', supplierId: 4, supplierCode: 'S4', supplierName: '테스트 구매처',
  ordererName: '구매 담당', currencyCode: 'KRW', sourceType: 'CONFIRM', taxType: 'TAXABLE', vatIncludedAt: 'N',
  supplyAmt: 15402, vatAmt: 1540.2, totalAmt: 16942.2, printAt: 'N', remark: '11월 2주차 자재', useAt: 'Y', details,
};
const statusRows = details.map((detail) => ({
  purchaseOrderId: 700, purchaseOrderDetailId: detail.purchaseOrderDetailId, orderNo: order.orderNo, orderDt: order.orderDt,
  supplierName: order.supplierName, ordererName: order.ordererName, status: 'ACTIVE', sourceType: 'CONFIRM', taxType: 'TAXABLE',
  taxTypeName: '과세', vatIncludedAt: 'N', headerSupplyAmt: 15402, headerVatAmt: 1540.2, headerTotalAmt: 16942.2, headerRemark: null,
  lineNo: detail.lineNo, confirmNo: detail.confirmNo, requestNo: detail.requestNo, materialCode: detail.materialCode,
  materialName: detail.materialName, materialSpec: detail.materialSpec, unit: 'KG', orderQty: detail.orderQty, unitPrice: detail.unitPrice,
  deliveryDt: detail.deliveryDt, warehouseName: '자재창고', inspectAt: 'N', supplyAmt: detail.supplyAmt, vatAmt: detail.vatAmt,
  totalAmt: detail.totalAmt, orderTypeName: '원자재', useTypeName: '생산', remark: null,
}));
const groups = [[11, 'PURCHASE_TAX_TYPE', '부가세구분']];
const items = { 11: [['TAXABLE', '과세'], ['ZERO_RATED', '영세'], ['EXEMPT', '면세']] };

function apiResult(path) {
  if (path === '/api/v1/menus/my') return { user: { userId: '1', name: '테스트 사용자', roles: [], roleName: 'USER' }, menus };
  if (path === '/api/v1/system/modules') {
    return { resultList: [{ moduleId: 5, moduleCode: 'MATERIALS', moduleNm: '구매자재', moduleUrl: '/materials', iconNm: 'ShoppingCart', useAt: 'Y' }] };
  }
  if (path === '/api/v1/menus/favorites') return { item: { folders: [], favorites: [] } };
  if (path === '/api/v1/common/system-date') return { today: '2026-11-13' };
  if (path.endsWith('/summary')) return { unreadCount: 0 };
  if (path === '/api/v1/co/master/warehouses') {
    return { resultList: [{ warehouseId: 1, warehouseCode: '001', warehouseName: '자재창고', deleteLockAt: 'N', disuseAt: 'N',
      stockQtyDispAt: 'Y', stockIoAt: 'Y', safetyStockAlertAt: 'N', stockDefaultAt: 'N' }] };
  }
  if (path === '/api/v1/co/master/common-code/groups') {
    return { resultList: groups.map(([id, groupCode, groupNm], index) => ({ commonCodeGroupId: id, groupCode, groupNm, sortOrder: 100 + index, useAt: 'Y' })) };
  }
  const itemMatch = path.match(/^\/api\/v1\/co\/master\/common-code\/groups\/(\d+)\/items$/);
  if (itemMatch) {
    return { resultList: (items[Number(itemMatch[1])] ?? []).map(([itemCode, itemNm], index) => ({
      commonCodeItemId: index + 1, groupId: Number(itemMatch[1]), itemCode, itemNm, sortOrder: (index + 1) * 10, useAt: 'Y' })) };
  }
  if (path === '/api/v1/materials/purchase-order-status') return { resultList: statusRows, resultCnt: statusRows.length };
  if (path === '/api/v1/materials/purchase-orders/700') return { item: order };
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

    await page.goto(`${origin}/materials/order/order-status`);
    const grid = page.getByRole('grid', { name: '발주현황 목록' });
    await grid.getByText('PO-20261113-0001').first().waitFor();
    await shot('list');

    // 병합 셀 위의 링크는 Playwright 클릭 가능성 검사에 걸리므로 사용자와 같은 좌표 클릭으로 연다.
    const linkBox = await grid.getByRole('button', { name: 'PO-20261113-0001 상세 보기' }).first().boundingBox();
    await page.mouse.click(linkBox.x + linkBox.width / 2, linkBox.y + linkBox.height / 2);
    await page.getByText('발주번호: PO-20261113-0001').waitFor();
    assert.match(await page.getByLabel('발주 요약').innerText(), /15,402/);
    await shot('detail-panel');

    await page.getByRole('button', { name: '발주 더보기' }).click();
    await page.getByRole('menuitem', { name: '수정' }).click();
    const dialog = page.getByRole('dialog', { name: '발주 수정' });
    await dialog.getByRole('grid', { name: '발주 상세 목록' }).getByText('품목').first().waitFor().catch(() => undefined);
    await dialog.getByLabel('발주번호').waitFor();
    assert.equal(await dialog.getByLabel('발주번호').inputValue(), 'PO-20261113-0001');
    await shot('edit-dialog');

    // 입고대기마감: 마감 체크박스만 편집 가능하고 다른 값은 읽기 전용이다.
    await dialog.getByTestId('common-dialog-actions').getByRole('button', { name: '닫기' }).click();
    await page.getByRole('button', { name: '발주 더보기' }).click();
    await page.getByRole('menuitem', { name: '입고대기마감' }).click();
    const closeDialog = page.getByRole('dialog', { name: '입고대기마감' });
    // 375px에서는 고정 컬럼이 폭을 차지해 마감 컬럼이 스크롤 밖에 있으므로 체크 동작 검증은 768px 이상에서 한다.
    if (width < 768) {
      await shot('receipt-close-dialog');
      await closeDialog.getByTestId('common-dialog-actions').getByRole('button', { name: '닫기' }).click();
      assert.deepEqual(pageErrors, []);
      await context.close();
      console.log(`checked ${width}px`);
      continue;
    }
    await closeDialog.getByLabel('입고대기마감 order-12').waitFor();
    assert.equal(await closeDialog.getByLabel('입고대기마감 order-11').isEnabled(), true);
    assert.equal(await closeDialog.getByLabel(/^발주일/).isDisabled(), true);
    assert.equal(await closeDialog.getByRole('button', { name: '저장' }).isDisabled(), true);
    assert.equal(await closeDialog.getByRole('button', { name: '발주 취소' }).count(), 0);
    await closeDialog.getByLabel('입고대기마감 order-12').check();
    assert.equal(await closeDialog.getByRole('button', { name: '저장' }).isEnabled(), true);
    await shot('receipt-close-dialog');
    await closeDialog.getByLabel('입고대기마감 order-12').uncheck();
    await closeDialog.getByTestId('common-dialog-actions').getByRole('button', { name: '닫기' }).click();
    await page.getByRole('button', { name: '발주 더보기' }).click();
    await page.getByRole('menuitem', { name: '수정' }).click();
    await dialog.getByLabel('발주번호').waitFor();

    await dialog.getByLabel('order-12 행 선택').click();
    await dialog.getByRole('button', { name: '선택 행 빼기' }).click();
    await dialog.getByRole('button', { name: '저장' }).isEnabled();
    assert.equal(await dialog.getByLabel('공급가액').inputValue(), '12,000');
    await shot('edit-row-removed');

    assert.deepEqual(pageErrors, []);
    await context.close();
    console.log(`checked ${width}px`);
  }
} finally {
  await browser.close();
}
