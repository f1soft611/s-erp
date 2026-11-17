import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 합성 데이터로 가입고등록(발주 불러오기, 구매처 고정, 저장)과 가입고현황(목록, 상세 패널, 수정 다이얼로그)을
// 375/768/1280px에서 확인한다. 실제 DB를 쓰지 않는다.
const origin = 'http://127.0.0.1:4173';
const createOutput = new URL('../../docs/result/20261116/material-arrival-create/screenshots/', import.meta.url);
const statusOutput = new URL('../../docs/result/20261116/material-arrival-status/screenshots/', import.meta.url);
const menus = [{
  menuId: 100, parentMenuId: null, name: '구매자재', path: '/materials',
  children: [{
    menuId: 101, parentMenuId: 100, name: '입고관리', path: '/materials/receipt',
    children: [
      { menuId: 105, parentMenuId: 101, name: '가입고등록', path: '/materials/arrival/arrival-create', permissions: { read: true, update: true } },
      { menuId: 106, parentMenuId: 101, name: '가입고현황', path: '/materials/arrival/arrival-status', permissions: { read: true, excel: true } },
    ],
  }],
}];

const candidate = (detailId, supplierId, name, qty, price) => ({
  purchaseOrderDetailId: detailId, orderNo: 'PO-20261113-0001', orderDt: '2026-11-13', taxType: 'TAXABLE', vatIncludedAt: 'N',
  supplierId, supplierCode: `S${supplierId}`, supplierName: `테스트 구매처${supplierId}`, materialId: detailId + 100,
  materialCode: `M${detailId}`, materialName: name, materialSpec: '규격 A', unit: 'KG', materialTypeCode: 'RAW', inspectAt: 'N',
  orderQty: qty, arrivedQty: 0, remainQty: qty, deliveryDt: '2026-11-24', warehouseId: 1, warehouseName: '자재창고',
  unitPrice: price, currencyCode: 'KRW', orderTypeName: '원자재', useTypeName: '생산', remark: null,
});
const candidates = [
  candidate(51, 4, '원재료 품목', 10, 1200),
  candidate(52, 4, '부재료 품목', 4, 850),
  candidate(61, 5, '다른 구매처 품목', 3, 500),
];

const detail = (id, lineNo, orderDetailId, name, qty, price) => ({
  materialArrivalDetailId: id, lineNo, purchaseOrderDetailId: orderDetailId, orderNo: 'PO-20261113-0001',
  materialId: orderDetailId + 100, materialCode: `M${orderDetailId}`, materialName: name, materialSpec: '규격 A', unit: 'KG',
  orderQty: 10, remainQty: 8, orderUnitPrice: price, orderWarehouseId: 1, arrivalQty: qty, unitPrice: price,
  supplyAmt: qty * price, vatAmt: qty * price / 10, totalAmt: qty * price * 1.1, warehouseId: 1, warehouseName: '자재창고',
  manufactureDt: '2026-11-10', expireDt: '2027-11-09', lotNo: null, inspectAt: 'N', remark: null,
});
const details = [detail(21, 1, 51, '원재료 품목', 5, 1200), detail(22, 2, 52, '부재료 품목', 2, 850)];
const arrival = {
  materialArrivalId: 800, arrivalNo: 'MP-20261116-0001', arrivalDt: '2026-11-16', supplierId: 4, supplierCode: 'S4',
  supplierName: '테스트 구매처4', receiverName: '구매 담당', currencyCode: 'KRW', taxType: 'TAXABLE', vatIncludedAt: 'N',
  supplyAmt: 7700, vatAmt: 770, totalAmt: 8470, remark: '11월 3주차 자재', useAt: 'Y', details,
};
const statusRows = details.map((item) => ({
  materialArrivalId: 800, materialArrivalDetailId: item.materialArrivalDetailId, arrivalNo: arrival.arrivalNo,
  arrivalDt: arrival.arrivalDt, supplierName: arrival.supplierName, receiverName: arrival.receiverName, status: 'ACTIVE',
  taxType: 'TAXABLE', taxTypeName: '과세', vatIncludedAt: 'N', headerSupplyAmt: 7700, headerVatAmt: 770, headerTotalAmt: 8470,
  headerRemark: arrival.remark, lineNo: item.lineNo, orderNo: item.orderNo, materialCode: item.materialCode,
  materialName: item.materialName, materialSpec: item.materialSpec, unit: 'KG', orderQty: item.orderQty,
  arrivalQty: item.arrivalQty, unitPrice: item.unitPrice, supplyAmt: item.supplyAmt, vatAmt: item.vatAmt,
  totalAmt: item.totalAmt, warehouseName: '자재창고', manufactureDt: item.manufactureDt, expireDt: item.expireDt,
  lotNo: null, inspectAt: 'N', remark: null,
}));
const groups = [[11, 'PURCHASE_TAX_TYPE', '부가세구분']];
const items = { 11: [['TAXABLE', '과세'], ['ZERO_RATED', '영세'], ['EXEMPT', '면세']] };

function apiResult(path, method) {
  if (path === '/api/v1/menus/my') return { user: { userId: '1', name: '테스트 사용자', roles: [], roleName: 'USER' }, menus };
  if (path === '/api/v1/system/modules') {
    return { resultList: [{ moduleId: 5, moduleCode: 'MATERIALS', moduleNm: '구매자재', moduleUrl: '/materials', iconNm: 'ShoppingCart', useAt: 'Y' }] };
  }
  if (path === '/api/v1/menus/favorites') return { item: { folders: [], favorites: [] } };
  if (path === '/api/v1/common/system-date') return { today: '2026-11-16' };
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
  if (path === '/api/v1/materials/material-arrivals/candidates') return { resultList: candidates };
  if (path === '/api/v1/materials/material-arrivals' && method === 'POST') {
    return { item: { materialArrivalId: 801, arrivalNo: 'MP-20261116-0002' }, message: '가입고가 등록되었습니다.' };
  }
  if (path === '/api/v1/materials/material-arrival-status') return { resultList: statusRows, resultCnt: statusRows.length };
  if (path === '/api/v1/materials/material-arrivals/800') return { item: arrival };
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
    const posts = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({ tenantCode: 'test', userId: '1', accessToken: 'browser-test-only',
        refreshToken: 'browser-test-only', expiresAt: new Date(Date.now() + 3600000).toISOString() }));
    });
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === 'POST') posts.push({ path, body: request.postDataJSON() });
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ resultCode: '200', resultMessage: '성공', result: apiResult(path, request.method()) }) });
    });
    const shot = (output, name) => page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, output)), animations: 'disabled' });

    // ---- 가입고등록 ----
    await page.goto(`${origin}/materials/arrival/arrival-create`);
    await page.getByText('가입고 기본정보').waitFor();
    await shot(createOutput, 'create-empty');

    await page.getByRole('button', { name: '발주 불러오기' }).click();
    const picker = page.getByRole('dialog', { name: '발주 품목 선택' });
    const pickerGrid = picker.getByRole('grid', { name: '가입고 대상 발주 품목 목록' });
    // 좁은 화면에서는 품목명 컬럼이 가로 가상화로 화면 밖에 있으므로 항상 그려지는 행 선택 체크박스를 기다린다.
    await pickerGrid.getByLabel('51 행 선택').waitFor();
    await shot(createOutput, 'order-picker');
    await pickerGrid.getByLabel('51 행 선택').click();
    await picker.getByText('구매처: 테스트 구매처4').waitFor();
    await pickerGrid.getByLabel('61 행 선택').click();
    await picker.getByText(/구매처 1곳만 담을 수 있습니다/).waitFor();
    assert.equal(await picker.getByRole('button', { name: '선택 불러오기 (1)' }).isEnabled(), true);
    await shot(createOutput, 'order-picker-supplier-lock');
    await pickerGrid.getByLabel('52 행 선택').click();
    await picker.getByRole('button', { name: '선택 불러오기 (2)' }).click();
    await picker.waitFor({ state: 'hidden' });

    const body = page.getByRole('region', { name: '가입고 등록 내용' });
    // 10×1,200 + 4×850 = 15,400, 세액 10% = 1,540, 합계 16,940
    await page.waitForFunction(() => [...document.querySelectorAll('input')].some((input) => input.value === '15,400'));
    assert.equal(await body.getByLabel('구매처', { exact: true }).inputValue(), '테스트 구매처4 (S4)');
    assert.equal(await body.getByLabel('공급가액').inputValue(), '15,400');
    assert.equal(await body.getByLabel('부가세액').inputValue(), '1,540');
    assert.equal(await body.getByLabel('합계액').inputValue(), '16,940');
    await shot(createOutput, 'create-loaded');

    // 1280px에서만(좁은 화면은 수량 컬럼이 가로 가상화로 화면 밖): 발주 잔량(10)을 넘기면 저장 전에 확인창이 뜨고,
    // 취소면 저장하지 않으며 확인이면 그대로 저장한다.
    const overRemaining = width === 1280;
    if (overRemaining) {
      const detailGrid = body.getByRole('grid', { name: '가입고 상세 목록' });
      const headers = await detailGrid.getByRole('columnheader').allInnerTexts();
      const qtyIndex = headers.findIndex((text) => text.includes('가입고수량'));
      // 헤더 첫 칸은 행 선택 열이라 본문 셀 순서와 한 칸 어긋난다.
      assert.ok(qtyIndex > 0, 'qty column visible');
      await detailGrid.getByRole('row').nth(1).getByRole('gridcell').nth(qtyIndex - 1).dblclick();
      await page.keyboard.press('Control+A');
      await page.keyboard.type('12');
      await page.keyboard.press('Enter');
    }
    await page.getByRole('button', { name: '저장' }).click();
    if (overRemaining) {
      const overConfirm = page.getByRole('dialog', { name: '확인' });
      await overConfirm.getByText('발주 잔량을 초과한 품목이 1건 있습니다. 그대로 등록하시겠습니까?').waitFor();
      await shot(createOutput, 'over-remaining-confirm');
      await overConfirm.getByRole('button', { name: '취소' }).click();
      await overConfirm.waitFor({ state: 'hidden' });
      assert.equal(posts.length, 0);
      await page.getByRole('button', { name: '저장' }).click();
      await overConfirm.getByRole('button', { name: '확인' }).click();
    }
    await page.getByText(/가입고번호: MP-20261116-0002/).waitFor();
    assert.equal(posts.length, 1);
    assert.equal(posts[0].path, '/api/v1/materials/material-arrivals');
    assert.deepEqual(posts[0].body.details.map((line) => [line.purchaseOrderDetailId, line.arrivalQty, line.unitPrice]),
      [[51, overRemaining ? 12 : 10, 1200], [52, 4, 850]]);
    await shot(createOutput, 'create-saved');

    // ---- 가입고현황 ----
    await page.goto(`${origin}/materials/arrival/arrival-status`);
    const grid = page.getByRole('grid', { name: '가입고현황 목록' });
    await grid.getByText('MP-20261116-0001').first().waitFor();
    await shot(statusOutput, 'list');

    // 병합 셀 위의 링크는 Playwright 클릭 가능성 검사에 걸리므로 사용자와 같은 좌표 클릭으로 연다.
    const linkBox = await grid.getByRole('button', { name: 'MP-20261116-0001 상세 보기' }).first().boundingBox();
    await page.mouse.click(linkBox.x + linkBox.width / 2, linkBox.y + linkBox.height / 2);
    await page.getByText('가입고번호: MP-20261116-0001').waitFor();
    assert.match(await page.getByLabel('가입고 요약').innerText(), /8,470/);
    await shot(statusOutput, 'detail-panel');

    await page.getByRole('button', { name: '가입고 더보기' }).click();
    await page.getByRole('menuitem', { name: '수정' }).click();
    const dialog = page.getByRole('dialog', { name: '가입고 수정' });
    await dialog.getByLabel('가입고번호').waitFor();
    assert.equal(await dialog.getByLabel('가입고번호').inputValue(), 'MP-20261116-0001');
    assert.equal(await dialog.getByRole('button', { name: '가입고 취소' }).count(), 1);
    await shot(statusOutput, 'edit-dialog');

    await dialog.getByLabel('arrival-22 행 선택').click();
    await dialog.getByRole('button', { name: '선택 행 빼기' }).click();
    await dialog.getByRole('button', { name: '저장' }).isEnabled();
    assert.equal(await dialog.getByLabel('공급가액').inputValue(), '6,000');
    await shot(statusOutput, 'edit-row-removed');

    assert.deepEqual(pageErrors, []);
    await context.close();
    console.log(`checked ${width}px`);
  }
} finally {
  await browser.close();
}
