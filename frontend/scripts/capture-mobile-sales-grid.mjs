import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { installSalesDeliveryBrowserMocks } from '../tests/fixtures/sales-delivery.browser-fixtures.mjs';

const screenshotDir = path.resolve(import.meta.dirname, '../../docs/result/20261110/mobile-sales-grid/screenshots');
const fieldScreenshotDir = path.resolve(import.meta.dirname, '../../docs/result/20261110/order-number-field/screenshots');
const permissions = { read: true, create: true, update: true, delete: true, excel: true };
const salesMenus = [
  { menuId: 911, name: '수주등록', path: '/sales/order/create', permissions },
  { menuId: 912, name: '출하계획등록', path: '/sales/delivery/delivery-plan-create', permissions },
  { menuId: 913, name: '출하등록', path: '/sales/delivery/delivery-create', permissions },
];
const metrics = [];
const errors = [];
const source = {
  salesOrderId: 7, salesOrderDetailId: 70, orderNo: 'SO-TEST-7', orderDt: '2026-11-10',
  customerId: 10, customerCode: 'C10', customerName: '검증 거래처', deliveryPlace: '검증 창고',
  deliveryMethod: '택배', lineNo: 1, materialId: 20, materialCode: 'M20', materialName: '검증 품목',
  unit: 'EA', orderQty: 10, shippedQty: 0, unitPrice: 100, planDt: '2026-11-10',
};
await fs.mkdir(screenshotDir, { recursive: true });
await fs.mkdir(fieldScreenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => errors.push(error.message));
  const { requests } = await installSalesDeliveryBrowserMocks(page);
  await page.addInitScript(() => localStorage.setItem('page-header-description-collapsed', 'true'));
  await page.route('**/api/v1/co/master/materials**', (route) => route.fulfill({ json: {
    resultCode: 200, result: { resultList: [{
      materialId: 20, materialCode: 'M20', materialName: '검증 품목', unit: 'EA',
      expiryedStatus: 'NONE', safeInvoice: 0,
    }] },
  } }));
  const orders = new Map();
  await page.route('**/api/v1/sales/orders**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
    if (request.method() === 'POST' || request.method() === 'PUT') {
      const payload = request.postDataJSON();
      const item = {
        ...payload, salesOrderId: 300, orderNo: 'SO-MOBILE-300', status: '수주등록',
        customerCode: 'C10', customerName: '검증 거래처',
        details: payload.details.map((detail, index) => ({
          ...detail, salesOrderDetailId: 450 + index, lineNo: index + 1,
          materialCode: 'M20', materialName: '검증 품목', shippedQty: 0, lineStatus: '대기',
          supplyAmt: detail.orderQty * detail.unitPrice,
          totalAmt: detail.orderQty * detail.unitPrice + detail.vatAmt,
        })),
      };
      orders.set(300, item);
      requests.push({ path: url.pathname, method: request.method(), body: payload });
    }
    return route.fulfill({ json: { resultCode: 200, result: { item: orders.get(300) } } });
  });
  await page.route('**/api/v1/sales/delivery-plans**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/source-orders')) {
      return route.fulfill({ json: { resultCode: 200, result: { items: [source] } } });
    }
    const payload = request.postDataJSON();
    requests.push({ path: url.pathname, method: request.method(), body: payload });
    return route.fulfill({ json: { resultCode: 200, result: { item: {
      salesDeliveryPlanId: 9, planNo: 'DP-MOBILE-9', ...source,
      details: payload.details.map((detail, index) => ({
        ...source, ...detail, salesDeliveryPlanDetailId: 90 + index,
      })),
    } } } });
  });
  await page.route('**/api/v1/menus/my', (route) => route.fulfill({ json: {
    resultCode: 200,
    result: {
      user: { userId: 'mobile-fixture', name: '화면 검증', roles: [] },
      deliveryPlanMode: 'MANUAL',
      menus: [
        { menuId: 900, name: '영업관리', path: '/sales', children: [
          ...salesMenus,
          { menuId: 914, name: '거래명세서현황', path: '/sales/delivery/statement-status', permissions },
          { menuId: 915, name: '거래명세서등록', path: '/sales/delivery/statement-create', permissions },
        ] },
        { menuId: 920, name: '기준정보', path: '/co', children: [
          { menuId: 921, name: '거래처관리', path: '/co/master/customers', permissions },
        ] },
        { menuId: 930, name: '그룹웨어', path: '/groupware', children: [
          { menuId: 931, name: '종합현황', path: '/groupware/overview', permissions },
        ] },
        { menuId: 940, name: '환경설정', path: '/settings', children: [
          { menuId: 941, name: '권한관리', path: '/settings/roles', permissions },
        ] },
        { menuId: 950, name: '생산관리', path: '/production', children: [
          { menuId: 951, name: '생산현황', path: '/production/status', permissions },
        ] },
      ],
    },
  } }));

  await page.setViewportSize({ width: 487, height: 812 });
  await page.goto('http://127.0.0.1:4173/sales/delivery/statement-status');
  const queryButton = page.getByRole('button', { name: '조회', exact: true });
  await queryButton.waitFor();
  const queryBox = await queryButton.boundingBox();
  const breadcrumbBox = await page.getByRole('button', { name: '페이지 설명 열기', exact: true }).boundingBox();
  assert.ok(queryBox.y < breadcrumbBox.y + breadcrumbBox.height, 'Header action wraps despite available mobile width');
  await page.screenshot({ path: path.join(screenshotDir, 'header-actions-487.png') });

  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 812 });
    for (const [title, route] of [
      ['출하계획', salesMenus[1].path], ['거래명세서', '/sales/delivery/statement-create'],
    ]) {
      await page.goto(`http://127.0.0.1:4173${route}`);
      const detail = page.getByRole('grid', { name: `${title} 상세 목록` });
      await detail.waitFor();
      const inset = await detail.evaluate((element) => {
        const grid = element.getBoundingClientRect();
        const panel = element.parentElement.parentElement.getBoundingClientRect();
        return { left: grid.left - panel.left - 1, right: panel.right - grid.right - 1,
          bottom: panel.bottom - grid.bottom - 1 };
      });
      assert.ok(Object.values(inset).every((gap) => Math.abs(gap - 8) < 1),
        `${title} grid inset mismatch at ${width}: ${JSON.stringify(inset)}`);
      if (title === '거래명세서') {
        await page.getByRole('region', { name: '거래명세서 입력 내용' })
          .evaluate((element) => { element.scrollTop = element.scrollHeight; });
        await page.screenshot({ path: path.join(screenshotDir, `statement-${width}.png`) });
      }
    }
    for (const [index, title] of ['수주', '출하계획', '출하'].entries()) {
      await page.goto(`http://127.0.0.1:4173${salesMenus[index].path}`);
      const region = page.getByRole('region', { name: `${title} 입력 내용` });
      await region.waitFor();
      const grid = page.getByRole('grid', { name: `${title} 상세 목록` });
      await grid.waitFor();
      if (title === '수주') {
        const fields = [];
        for (const label of ['수주번호', '견적번호', '수주상태']) {
          fields.push(await page.getByLabel(label, { exact: true }).evaluate((input) => {
            const style = getComputedStyle(input);
            return {
              fontSize: style.fontSize, fontFamily: style.fontFamily,
              height: input.closest('.MuiInputBase-root').getBoundingClientRect().height,
            };
          }));
        }
        assert.ok(fields.every((field) => field.fontSize === fields[1].fontSize &&
          field.fontFamily === fields[1].fontFamily && Math.abs(field.height - fields[1].height) < 1),
        `Order field size mismatch at ${width}: ${JSON.stringify(fields)}`);
        assert.equal(await page.getByLabel('수주번호', { exact: true }).getAttribute('readonly'), '');
        await page.getByLabel('수주번호', { exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(fieldScreenshotDir, `order-fields-${width}.png`), animations: 'disabled' });
      }
      const mobile = width < 768;
      const modules = page.getByRole('navigation', { name: '모듈 선택' });
      const moduleBox = await modules.boundingBox();
      const regionBox = await region.boundingBox();
      assert.ok(mobile ? moduleBox.width === width && moduleBox.y < regionBox.y : moduleBox.width === 92,
        `Incorrect module placement at ${width}`);
      if (mobile) {
        const overflow = await modules.locator(':scope > div').first().evaluate((element) => {
          element.scrollLeft = element.scrollWidth;
          return element.scrollWidth > element.clientWidth && element.scrollLeft > 0;
        });
        assert.ok(overflow, 'Mobile modules must scroll inside the bar');
      }
      if (title === '출하계획') {
        await page.getByRole('button', { name: '수주 선택', exact: true }).click();
        await page.getByRole('button', { name: '검색', exact: true }).click();
        await page.getByRole('button', { name: source.orderNo, exact: true }).click();
        if (mobile) {
          await grid.getByRole('button', { name: /행 정보 수정/ }).click();
          const form = page.getByRole('dialog', { name: '정보 수정' });
          await form.getByLabel('계획수량', { exact: true }).fill('8');
          await form.getByRole('button', { name: '적용', exact: true }).click();
        } else {
          await editCell(5, '8');
        }
        await grid.getByRole('button', { name: '분할', exact: true }).first().click();
        if (mobile) {
          const form = page.getByRole('dialog', { name: '정보 수정' });
          await form.getByLabel('계획수량', { exact: true }).fill('2');
          await form.getByLabel('계획일', { exact: true }).fill('2026-11-11');
          await page.screenshot({ path: path.join(screenshotDir, 'plan-split-form-375.png'), animations: 'disabled', caret: 'hide' });
          await form.getByRole('button', { name: '적용', exact: true }).click();
        } else {
          const editor = grid.locator('input:not([type="checkbox"])').first();
          await editor.fill('2');
          await editor.press('Enter');
        }
        await page.getByRole('button', { name: '저장', exact: true }).click();
        await page.getByText(/출하계획이 등록되었습니다/).waitFor();
        const saved = requests.filter((request) => request.path === '/api/v1/sales/delivery-plans').at(-1);
        assert.deepEqual(saved.body.details.map((detail) => detail.plannedQty), [8, 2]);
      } else {
        await page.getByRole('button', { name: '거래처 선택', exact: true }).click();
        await page.getByRole('button', { name: '검색', exact: true }).click();
        await page.getByRole('button', { name: 'C10 검증 거래처 선택', exact: true }).click();
        if (mobile) {
          await page.getByRole('button', { name: '상세 행 추가', exact: true }).click();
          await page.getByRole('dialog', { name: '신규 등록' }).getByRole('button', { name: '취소', exact: true }).click();
          assert.equal(await grid.getByRole('button', { name: /행 정보 수정/ }).count(), 0, 'Cancelled draft was inserted');
        }
        await page.getByRole('button', { name: '상세 행 추가', exact: true }).click();
        if (mobile) {
          const form = page.getByRole('dialog', { name: '신규 등록' });
          await form.getByRole('button', { name: '적용', exact: true }).click();
          assert.ok(await form.locator('.Mui-error').count() > 0, 'Missing required field feedback');
          await form.getByRole('button', { name: '품목코드 선택', exact: true }).click();
        } else {
          await grid.getByRole('gridcell').nth(1).dblclick();
          await grid.getByRole('button', { name: '코드 선택', exact: true }).click();
        }
        await page.getByRole('button', { name: '검색', exact: true }).click();
        await page.getByRole('button', { name: 'M20 검증 품목 선택', exact: true }).click();
        if (mobile) {
          const form = page.getByRole('dialog', { name: '신규 등록' });
          await form.getByLabel(title === '수주' ? '주문수량' : '출하수량', { exact: false }).fill('2');
          await form.getByLabel('단가', { exact: false }).fill('100');
          await page.screenshot({ path: path.join(screenshotDir, `${title === '수주' ? 'order' : 'delivery'}-row-form-375.png`), animations: 'disabled', caret: 'hide' });
          await form.getByRole('button', { name: '적용', exact: true }).click();
          await grid.getByRole('button', { name: /행 정보 수정/ }).click();
          const edit = page.getByRole('dialog', { name: '정보 수정' });
          await edit.getByLabel(title === '수주' ? '주문수량' : '출하수량').fill('3');
          await edit.getByRole('button', { name: '적용', exact: true }).click();
        } else {
          await editCell(title === '수주' ? 3 : 4, '3');
          await editCell(title === '수주' ? 4 : 5, '100');
        }
        await page.getByRole('button', { name: '저장', exact: true }).click();
        await page.getByText(title === '수주' ? /수주가 저장되었습니다/ : /출하가 저장되었습니다/).waitFor();
        const saved = requests.filter((request) => request.method === 'POST' &&
          request.path === (title === '수주' ? '/api/v1/sales/orders' : '/api/v1/sales/deliveries')).at(-1);
        assert.equal(saved.body.details[0][title === '수주' ? 'orderQty' : 'deliveryQty'], 3);
        assert.ok((await page.getByLabel(`${title} 금액 합계`).textContent()).includes('330.00'));
      }

      async function editCell(column, value) {
        await grid.getByRole('gridcell').nth(column).dblclick();
        const editor = grid.locator('input:not([type="checkbox"])').first();
        await editor.fill(value);
        await editor.press('Enter');
      }
      const layout = await grid.evaluate((element) => {
        const panel = element.parentElement.parentElement;
        const summary = panel.querySelector('[aria-label$="금액 합계"]');
        return {
          viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
          gridBottom: element.getBoundingClientRect().bottom,
          panelBottom: panel.getBoundingClientRect().bottom,
          summaryBottom: summary?.getBoundingClientRect().bottom,
        };
      });
      assert.ok(layout.documentWidth <= width, `Page overflow: ${JSON.stringify(layout)}`);
      assert.ok(layout.gridBottom <= layout.panelBottom, `${title} grid clipped at ${width}: ${JSON.stringify(layout)}`);
      if (layout.summaryBottom) {
        assert.ok(layout.summaryBottom <= layout.panelBottom, `${title} summary clipped at ${width}: ${JSON.stringify(layout)}`);
        const summary = page.getByLabel(`${title} 금액 합계`);
        await summary.scrollIntoViewIfNeeded();
        const box = await summary.boundingBox();
        assert.ok(box.y + box.height <= 812, `${title} summary unreachable at ${width}`);
      }
      const scroll = grid.getByTestId('f1-grid-body-scroll');
      const scrolling = await scroll.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
        return { width: element.clientWidth, scrollWidth: element.scrollWidth, scrollLeft: element.scrollLeft };
      });
      assert.ok(scrolling.scrollWidth > scrolling.width && scrolling.scrollLeft > 0, `${title} horizontal scroll inaccessible at ${width}`);
      metrics.push({ title, viewportWidth: width, ...layout, bodyClientWidth: scrolling.width,
        bodyScrollWidth: scrolling.scrollWidth, bodyScrollLeft: scrolling.scrollLeft });
      await page.screenshot({ path: path.join(screenshotDir, `${title === '수주' ? 'order' : title === '출하' ? 'delivery' : 'plan'}-${width}.png`) });
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('navigation', { name: '모듈 선택' }).getByRole('button', { name: '기준정보', exact: true }).click();
  await page.waitForURL('**/co/master/customers');
  await page.getByRole('navigation', { name: '모듈 선택' }).getByRole('button', { name: '영업관리', exact: true }).click();
  await page.waitForURL('**/sales/order/create');
  await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  await page.getByRole('tree').waitFor();
  await page.screenshot({ path: path.join(screenshotDir, 'module-menu-375.png') });
  await page.getByRole('button', { name: '메뉴 닫기', exact: true }).click();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ fixtureOnly: true, metrics, runtimeErrors: errors }, null, 2));
} finally {
  await browser.close();
}
