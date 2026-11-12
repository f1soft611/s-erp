import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { chromium } from 'playwright';
import { installSalesDeliveryBrowserMocks } from './fixtures/sales-delivery.browser-fixtures.mjs';

const output = path.resolve(import.meta.dirname, '../../docs/result/20261112/f1-grid-excel-rownumber/screenshots');
const permissions = { read: true, create: true, update: true, delete: true, excel: true };
const rows = [1, 2, 3].map((index) => ({
  salesOrderId: 300 + index, salesOrderDetailId: 450 + index,
  orderNo: `SO-TEST-${index}`, orderDt: '2026-11-12',
  customerCode: 'C10', customerName: '검증 거래처', status: '수주등록',
  lineNo: 1, materialCode: `M2${index}`, materialName: `검증 품목 ${index}`, unit: 'EA',
  orderQty: index * 2, unitPrice: 100, supplyAmt: index * 200,
  vatAmt: index * 20, totalAmt: index * 220, shippedQty: 0, lineStatus: '대기',
}));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await installSalesDeliveryBrowserMocks(page);
  await page.route('**/api/v1/menus/my', (route) => route.fulfill({ json: {
    resultCode: 200, result: { user: { userId: 'fixture', name: '검증', roles: [] },
      menus: [{ menuId: 900, name: '영업관리', path: '/sales', children: [
        { menuId: 911, name: '수주현황', path: '/sales/order/status', permissions },
      ] }] },
  } }));
  await page.route('**/api/v1/common/system-date', (route) =>
    route.fulfill({ json: { resultCode: 200, result: { today: '2026-11-12' } } }));
  await page.route('**/api/v1/sales/order-status**', (route) =>
    route.fulfill({ json: { resultCode: 200, result: { resultList: rows, resultCnt: rows.length } } }));
  await page.goto('http://127.0.0.1:4173/sales/order/status');
  const grid = page.getByRole('grid', { name: '수주현황 목록' });
  await grid.getByText('SO-TEST-1').waitFor();
  const body = grid.getByTestId('f1-grid-body-scroll');
  const summary = grid.getByTestId('f1-grid-summary-bottom');
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await body.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    await page.waitForTimeout(100);
    await summary.scrollIntoViewIfNeeded();
    assert.equal(await summary.getByLabel('합계 집계').innerText(), '1,320.00');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(output, `sales-order-status-summary-${width}.png`) });
  }
  await grid.getByRole('button', { name: '수주번호 컬럼 메뉴' }).click();
  await page.getByRole('menuitem', { name: '내림차순 정렬' }).click();
  const firstRow = grid.locator('[data-f1-grid-row-id="453"]');
  await firstRow.getByRole('gridcell', { name: '1', exact: true }).waitFor();
  await body.click({ button: 'right', position: { x: 200, y: 10 } });
  const sortedDownloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: '엑셀 내보내기' }).click();
  const sortedWorkbook = new ExcelJS.Workbook();
  await sortedWorkbook.xlsx.load(await readFile(await (await sortedDownloadPromise).path()));
  const sortedSheet = sortedWorkbook.getWorksheet('Sheet1');
  const sortedHeaders = sortedSheet.getRow(1).values;
  for (const [index, orderNo] of ['SO-TEST-3', 'SO-TEST-2', 'SO-TEST-1'].entries()) {
    assert.equal(sortedSheet.getRow(index + 2).getCell(sortedHeaders.indexOf('No')).value, index + 1);
    assert.equal(sortedSheet.getRow(index + 2).getCell(sortedHeaders.indexOf('수주번호')).value, orderNo);
  }
  await body.evaluate((element) => { element.scrollLeft = 1000; });
  const materialMenu = grid.getByRole('button', { name: '품목코드 컬럼 메뉴' });
  await materialMenu.click();
  await page.getByRole('menuitem', { name: '필터' }).click();
  await page.getByLabel('품목코드 필터 값').fill('M21');
  await page.getByRole('button', { name: '적용', exact: true }).click();
  await body.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  await page.waitForTimeout(100);
  assert.equal(await summary.getByLabel('합계 집계').innerText(), '220.00');
  await body.click({ button: 'right', position: { x: 200, y: 10 } });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: '엑셀 내보내기' }).click();
  const download = await downloadPromise;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await readFile(await download.path()));
  const sheet = workbook.getWorksheet('Sheet1');
  const headers = sheet.getRow(1).values;
  assert.equal(sheet.rowCount, 3);
  assert.equal(await grid.getByRole('gridcell', { name: '1', exact: true }).count(), 1);
  const rowNumber = sheet.getRow(2).getCell(headers.indexOf('No'));
  assert.equal(rowNumber.value, 1);
  assert.equal(rowNumber.numFmt, '0');
  assert.equal(sheet.getRow(3).getCell(headers.indexOf('No')).value, null);
  for (const [name, value] of [['주문수량', 2], ['공급가', 200], ['부가세', 20], ['합계', 220]]) {
    const cell = sheet.getRow(3).getCell(headers.indexOf(name));
    assert.equal(cell.value, value, `${name} Excel summary`);
    assert.equal(cell.numFmt, '#,##0.00');
  }
  assert.equal(sheet.getRow(3).getCell(headers.indexOf('단가')).value, null);
  assert.deepEqual(errors, []);
  console.log('Status summaries and filtered Excel download verified at 375, 768, 1280.');
} finally {
  await browser.close();
}
