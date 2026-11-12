import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { installSalesDeliveryBrowserMocks } from './fixtures/sales-delivery.browser-fixtures.mjs';

const output = path.resolve(import.meta.dirname, '../../docs/result/20261112/f1-grid-summary-lines/screenshots');
const permissions = { read: true, create: true, update: true, delete: true, excel: true };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await installSalesDeliveryBrowserMocks(page);
  await page.route('**/api/v1/menus/my', (route) => route.fulfill({ json: {
    resultCode: 200, result: {
      user: { userId: 'fixture', name: '검증', roles: [] },
      menus: [{ menuId: 900, name: '영업관리', path: '/sales', children: [
        { menuId: 911, name: '수주등록', path: '/sales/order/create', permissions },
      ] }],
    },
  } }));
  await page.goto('http://127.0.0.1:4173/sales/order/create');
  await page.getByRole('button', { name: '상세 행 추가' }).click();
  const grid = page.getByRole('grid', { name: '수주 상세 목록' });
  const row = grid.locator('[data-f1-grid-row-id]').first();
  for (const [index, value] of [[3, '2'], [4, '100']]) {
    await row.getByRole('gridcell').nth(index).dblclick();
    const editor = page.getByRole('spinbutton');
    await editor.fill(value);
    await editor.press('Enter');
  }
  const summary = grid.getByTestId('f1-grid-summary-bottom');
  assert.equal(await summary.getByLabel('라인합계 집계').innerText(), '220.00');
  const quantityHeader = grid.getByRole('columnheader', { name: '주문수량', exact: true });
  const initialWidth = (await quantityHeader.boundingBox()).width;
  const handle = grid.getByRole('separator', { name: '주문수량 컬럼 너비 조절' });
  await handle.scrollIntoViewIfNeeded();
  const handleBox = await handle.boundingBox();
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + 35, handleBox.y + handleBox.height / 2);
  await page.mouse.up();
  assert.ok((await quantityHeader.boundingBox()).width > initialWidth + 30, 'Column resize failed');
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await summary.scrollIntoViewIfNeeded();
    const body = grid.getByTestId('f1-grid-body-scroll');
    for (const end of [false, true]) {
      await body.evaluate((element, scrollToEnd) => {
        element.scrollLeft = scrollToEnd ? element.scrollWidth : 0;
      }, end);
      await page.waitForTimeout(100);
      const alignment = await grid.evaluate((element) => {
        const bodyScroll = element.querySelector('[data-testid="f1-grid-body-scroll"]');
        const summaryRow = element.querySelector('[data-testid="f1-grid-summary-bottom"]');
        const dataRow = element.querySelector('[data-f1-grid-row-id]');
        const cells = [...summaryRow.querySelectorAll('[role="gridcell"]')];
        const bodyCells = [...dataRow.querySelectorAll('[role="gridcell"]')];
        const comparisons = cells.map((cell, index) => {
          const label = cell.getAttribute('aria-label').replace(' 집계', '');
          const header = [...element.querySelectorAll('[role="columnheader"]')]
            .find((item) => item.getAttribute('aria-label') === label);
          const bodyCell = bodyCells[index];
          const summaryRect = cell.getBoundingClientRect();
          const bodyRect = bodyCell.getBoundingClientRect();
          const headerRect = header.getBoundingClientRect();
          const summaryStyle = getComputedStyle(cell);
          const bodyStyle = getComputedStyle(bodyCell);
          const headerStyle = getComputedStyle(header);
          return {
            label,
            bodyDelta: Math.abs(summaryRect.left - bodyRect.left),
            headerDelta: Math.abs(summaryRect.left - headerRect.left),
            widthDelta: Math.abs(summaryRect.width - bodyRect.width),
            border: summaryStyle.borderLeftWidth,
            bodyBorder: bodyStyle.borderLeftWidth,
            headerBorder: headerStyle.borderLeftWidth,
            padding: summaryStyle.paddingRight,
            bodyPadding: bodyStyle.paddingRight,
          };
        });
        const actionButton = dataRow.querySelector('[aria-label$="행 정보 수정"]');
        const summaryAction = actionButton ? summaryRow.lastElementChild : null;
        const bodyAction = actionButton?.closest('[role="gridcell"]');
        const action = bodyAction && summaryAction ? {
          delta: Math.abs(bodyAction.getBoundingClientRect().left - summaryAction.getBoundingClientRect().left),
          border: getComputedStyle(summaryAction).borderLeftWidth,
          bodyBorder: getComputedStyle(bodyAction).borderLeftWidth,
        } : null;
        return { comparisons, action, scrolled: bodyScroll.scrollLeft,
          overflow: document.documentElement.scrollWidth - innerWidth };
      });
      for (const cell of alignment.comparisons) {
        assert.ok(cell.bodyDelta < 0.5 && cell.headerDelta < 0.5 && cell.widthDelta < 0.5,
          `Cell position mismatch at ${width}: ${JSON.stringify(cell)}`);
        assert.equal(cell.border, cell.bodyBorder, `Border mismatch at ${width}: ${JSON.stringify(cell)}`);
        assert.equal(cell.border, cell.headerBorder, `Header border mismatch at ${width}: ${JSON.stringify(cell)}`);
        assert.equal(cell.padding, cell.bodyPadding, `Padding mismatch at ${width}: ${JSON.stringify(cell)}`);
      }
      if (width < 768) {
        assert.ok(alignment.action && alignment.action.delta < 0.5,
          `Action column mismatch at ${width}: ${JSON.stringify(alignment.action)}`);
        assert.equal(alignment.action.border, alignment.action.bodyBorder);
      }
      if (end) assert.ok(alignment.scrolled > 0, `Grid did not scroll at ${width}`);
      assert.ok(alignment.overflow <= 1, `Page overflow at ${width}`);
    }
    await page.screenshot({ path: path.join(output, `sales-order-summary-${width}.png`) });
  }
  assert.deepEqual(errors, []);
  console.log('Summary alignment and responsive screenshots verified at 375, 768, 1280.');
} finally {
  await browser.close();
}
