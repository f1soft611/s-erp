import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:4173';
const skeletonMode = process.argv.includes('--skeleton');
const focusMode = process.argv.includes('--focus');
const output = path.resolve(import.meta.dirname, '..', '..', 'docs', 'result', '20261028',
  focusMode ? 'dashboard-focus-panels' : skeletonMode ? 'dashboard-skeleton' : 'erp-dashboard', 'screenshots');
const cors = {
  'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};
const permissions = { read: true, create: true, update: true, delete: true, excel: true };
const overview = {
  asOfDate: '2026-10-28', fetchedAt: '2026-10-28T10:00:00+09:00',
  canReadApprovals: true, canReadNotices: true, canReadSales: true,
  approvalPath: '/groupware/doc/write', approvalStatus: 'ready', noticeStatus: 'ready',
  approval: {
    actionRequiredCount: 7, draftCount: 3, revisionRequestedCount: 2,
    notices: [
      { electronicApprovalId: 11, title: '11월 운영 계획 검토 요청', noticeType: 'ACTION_REQUIRED' },
      { electronicApprovalId: 12, title: '신규 프로젝트 자재 구매 기안', noticeType: 'ACTION_REQUIRED' },
      { electronicApprovalId: 13, title: '출장 경비 정산 내역 보완', noticeType: 'REVISION_REQUESTED' },
    ],
  },
  notices: [
    { postId: 21, title: '2026년 하반기 업무 운영 안내', isPinned: 'Y', createdAt: '2026-10-28T08:30:00' },
    { postId: 22, title: '월말 마감 일정 및 부서별 제출 자료 안내', isPinned: 'N', createdAt: '2026-10-27T09:00:00' },
    { postId: 23, title: '사내 시스템 정기 점검 안내', isPinned: 'N', createdAt: '2026-10-26T14:00:00' },
  ],
};
function sales(month) {
  const [year, value] = month.split('-').map(Number);
  const trend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, value - 6 + index, 1));
    return {
      month: date.toISOString().slice(0, 7), orderCount: 18 + index * 3,
      supplyAmount: [68200000, 89500000, 76300000, 108700000, 97200000, 128450000][index],
    };
  });
  return {
    month, from: `${month}-01`, to: `${month}-${new Date(Date.UTC(year, value, 0)).getUTCDate()}`,
    asOfDate: overview.asOfDate, fetchedAt: overview.fetchedAt,
    orderCount: 33, supplyAmount: 128450000, totalAmount: 141295000,
    trend, upcomingCount: 8,
    upcoming: [
      { salesOrderId: 31, orderNo: 'SO-20261027-0001', customerName: '검증용 거래처 A', deliveryDt: '2026-10-28' },
      { salesOrderId: 32, orderNo: 'SO-20261026-0003', customerName: '검증용 거래처 B', deliveryDt: '2026-10-29' },
      { salesOrderId: 33, orderNo: 'SO-20261024-0002', customerName: '검증용 거래처 C', deliveryDt: '2026-10-30' },
    ],
  };
}
const menuResult = {
  user: { userId: 'fixture', name: '화면 검증', roles: ['USER'], roleName: 'USER' },
  menus: [
    { menuId: 1, name: '그룹웨어', path: '/groupware', icon: 'Groups', children: [
      { menuId: 2, name: '종합현황', path: '/groupware/overview', permissions },
      { menuId: 3, name: '문서관리', path: '/groupware/doc', children: [
        { menuId: 4, name: '문서작성', path: '/groupware/doc/write', permissions },
        { menuId: 5, name: '문서현황', path: '/groupware/doc/read', permissions },
      ] },
      { menuId: 6, name: '커뮤니티', path: '/groupware/community', children: [
        { menuId: 7, name: '공지사항', path: '/groupware/community/notice', permissions },
      ] },
    ] },
    { menuId: 8, name: '영업관리', path: '/sales', icon: 'ShoppingCart', children: [
      { menuId: 9, name: '수주관리', path: '/sales/order', children: [
        { menuId: 10, name: '수주현황', path: '/sales/order/status', permissions },
      ] },
    ] },
  ],
};

await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const metrics = [];
const requests = [];
try {
  for (const mode of ['light', 'dark']) {
    let salesFailure = false;
    let hiddenSales = false;
    let overviewGate = Promise.resolve();
    let salesGate = Promise.resolve();
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await context.addInitScript((theme) => {
      localStorage.setItem('erp-theme', theme);
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'VISUAL_FIXTURE', userId: 'fixture', accessToken: 'fixture-not-a-real-token',
        refreshToken: '', expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }));
    }, mode);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.setDefaultTimeout(15000);
    await page.route('**/api/**', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      const url = new URL(route.request().url());
      let result = { resultList: [], resultCnt: 0 };
      if (url.pathname === '/api/v1/menus/my') result = menuResult;
      else if (url.pathname === '/api/v1/system/modules') result = { resultList: [] };
      else if (url.pathname === '/api/v1/common/system-date') result = { today: '2026-10-28' };
      else if (url.pathname === '/api/v1/dashboard/overview') {
        await overviewGate;
        result = { item: { ...overview, canReadSales: !hiddenSales } };
      }
      else if (url.pathname === '/api/v1/dashboard/sales') {
        await salesGate;
        requests.push({ mode, month: url.searchParams.get('month') });
        if (salesFailure) {
          await route.fulfill({ status: 503, headers: cors, json: { resultCode: '503', resultMessage: 'Fixture unavailable' } });
          return;
        }
        result = { item: sales(url.searchParams.get('month') || '2026-10') };
      } else if (url.pathname === '/api/v1/sales/order-status') {
        requests.push({ drilldown: url.search });
      } else if (url.pathname === '/api/v1/groupware/boards/notice/posts/21') {
        result = { item: {
          postId: 21, title: overview.notices[0].title, contentsHtml: '<p>화면 검증 전용 공지 본문입니다.</p>',
          contentsText: '화면 검증 전용 공지 본문입니다.', isPinned: 'Y', writerName: '검증용 작성자',
          createdAt: '2026-10-28T08:30:00', viewCount: 0, comments: [], attachments: [],
        } };
      }
      await route.fulfill({ headers: cors, json: { resultCode: '200', resultMessage: 'Fixture only', result } });
    });
    if (skeletonMode) {
      for (const width of [375, 768, 1280]) {
        let releaseOverview;
        let releaseSales;
        overviewGate = new Promise((resolve) => { releaseOverview = resolve; });
        salesGate = new Promise((resolve) => { releaseSales = resolve; });
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`${baseUrl}/groupware/overview`);
        const personal = page.getByRole('status', { name: '종합현황 불러오는 중' });
        await personal.waitFor();
        const personalCards = await personal.getByTestId('metric-skeleton').evaluateAll((cards) =>
          cards.map((card) => ({
            width: card.getBoundingClientRect().width, height: card.getBoundingClientRect().height,
            x: card.getBoundingClientRect().x - card.parentElement.getBoundingClientRect().x,
            y: card.getBoundingClientRect().y - card.parentElement.getBoundingClientRect().y,
          })));
        assert.ok(await personal.locator('.MuiSkeleton-root > span').evaluateAll((children) =>
          children.length > 0 && children.every((child) => getComputedStyle(child).visibility === 'hidden')),
        'Skeleton measurement text must not be visible');
        await page.screenshot({ path: path.join(output, `${mode}-${width}-personal-loading.png`) });
        await personal.getByTestId('work-skeleton').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `${mode}-${width}-lists-loading.png`) });
        releaseOverview();
        const salesLoading = page.getByRole('status', { name: '수주 현황 불러오는 중' });
        await salesLoading.waitFor();
        const salesCards = await salesLoading.getByTestId('metric-skeleton').evaluateAll((cards) =>
          cards.map((card) => ({
            width: card.getBoundingClientRect().width, height: card.getBoundingClientRect().height,
            x: card.getBoundingClientRect().x - card.parentElement.getBoundingClientRect().x,
            y: card.getBoundingClientRect().y - card.parentElement.getBoundingClientRect().y,
          })));
        const livePersonal = await page.getByRole('region', { name: '내 업무' }).getByRole('button').evaluateAll((cards) =>
          cards.map((card) => ({
            width: card.getBoundingClientRect().width, height: card.getBoundingClientRect().height,
            x: card.getBoundingClientRect().x - card.parentElement.getBoundingClientRect().x,
            y: card.getBoundingClientRect().y - card.parentElement.getBoundingClientRect().y,
          })));
        await page.getByRole('region', { name: '영업 현황' }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `${mode}-${width}-sales-loading.png`) });
        await salesLoading.getByTestId('trend-skeleton').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `${mode}-${width}-chart-loading.png`) });
        const overflow = await page.getByTestId('overview-scroll').evaluate((element) => element.scrollWidth > element.clientWidth);
        assert.equal(overflow, false, `Skeleton overflow ${mode}/${width}`);
        assert.equal(await salesLoading.getByRole('button').count(), 0);
        releaseSales();
        await page.getByRole('button', { name: /선택 월 수주 33건/ }).waitFor();
        const liveSales = await page.getByRole('button', { name: /^(선택 월 수주|수주 공급가액|수주 총액) / }).evaluateAll((cards) =>
          cards.map((card) => ({
            width: card.getBoundingClientRect().width, height: card.getBoundingClientRect().height,
            x: card.getBoundingClientRect().x - card.parentElement.getBoundingClientRect().x,
            y: card.getBoundingClientRect().y - card.parentElement.getBoundingClientRect().y,
          })));
        for (const [section, loading, loaded] of [['personal', personalCards, livePersonal], ['sales', salesCards, liveSales]]) {
          assert.equal(loading.length, 3);
          assert.equal(loaded.length, 3);
          loading.forEach((card, index) => {
            assert.ok(Math.abs(card.width - loaded[index].width) < 1, `Card width mismatch ${mode}/${width}`);
            assert.ok(Math.abs(card.height - loaded[index].height) < 2,
              `Card height mismatch ${section}/${index}/${mode}/${width}: ${card.height} vs ${loaded[index].height}`);
            assert.ok(Math.abs(card.x - loaded[index].x) < 1 && Math.abs(card.y - loaded[index].y) < 2,
              `Card position mismatch ${section}/${index}/${mode}/${width}`);
          });
        }
        await page.getByRole('region', { name: '수주 흐름' }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `${mode}-${width}-chart-loaded.png`) });
        metrics.push({ mode, width, personalCards, salesCards, horizontalOverflow: overflow });
      }
      await context.close();
      continue;
    }
    await page.goto(`${baseUrl}/groupware/overview`);
    await page.getByRole('button', { name: /선택 월 수주 33건/ }).waitFor();
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      const scroll = page.getByTestId('overview-scroll');
      await scroll.evaluate((element) => { element.scrollTop = 0; });
      await page.screenshot({ path: path.join(output, `${mode}-${width}-overview.png`) });
      await page.getByRole('region', { name: '수주 흐름' }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `${mode}-${width}-sales.png`) });
      const metric = await page.evaluate(() => {
        const element = document.querySelector('[data-testid="overview-scroll"]');
        return {
          width: innerWidth, pageWidth: document.documentElement.scrollWidth,
          contentWidth: element.clientWidth, contentScrollWidth: element.scrollWidth,
          canScrollVertically: element.scrollHeight > element.clientHeight,
          colorScheme: document.documentElement.style.colorScheme,
        };
      });
      assert.ok(metric.pageWidth <= width + 1, `Page overflow ${mode}/${width}`);
      assert.ok(metric.contentScrollWidth <= metric.contentWidth + 1, `Dashboard overflow ${mode}/${width}`);
      assert.equal(metric.colorScheme, mode);
      metrics.push({ mode, ...metric });
    }

    await page.getByLabel('수주 조회 월').fill('2026-09');
    await page.getByRole('button', { name: /선택 월 수주 33건/ }).waitFor();
    await page.getByRole('button', { name: /선택 월 수주 33건/ }).click();
    await page.waitForURL('**/sales/order/status?dashboardMonth=2026-09');
    await page.getByRole('grid', { name: '수주현황 목록' }).waitFor();
    assert.ok(requests.some((r) => r.drilldown?.includes('orderDtFrom=2026-09-01')
      && r.drilldown.includes('orderDtTo=2026-09-30')));

    await page.goto(`${baseUrl}/groupware/overview`);
    await page.getByRole('button', { name: /선택 월 수주 33건/ }).waitFor();
    await page.getByRole('button', { name: /2026년 하반기 업무 운영 안내/ }).click();
    await page.getByRole('region', { name: '게시글 상세' }).waitFor();
    await page.getByRole('region', { name: '게시글 상세' }).getByText('화면 검증 전용 공지 본문입니다.', { exact: true }).waitFor();

    salesFailure = true;
    await page.goto(`${baseUrl}/groupware/overview`);
    await page.getByText('수주 현황을 불러오지 못했습니다.').waitFor();
    assert.equal(await page.getByRole('button', { name: /선택 월 수주/ }).count(), 0);
    assert.equal(await page.getByRole('button', { name: /2026년 하반기 업무 운영 안내/ }).count(), 1);
    salesFailure = false;
    await page.getByRole('button', { name: '수주 현황 다시 조회' }).click();
    await page.getByRole('button', { name: /선택 월 수주 33건/ }).waitFor();

    hiddenSales = true;
    const requestCount = requests.filter((r) => r.mode === mode).length;
    await page.getByRole('button', { name: '종합현황 새로고침' }).click();
    await page.getByRole('button', { name: /2026년 하반기 업무 운영 안내/ }).waitFor();
    assert.equal(await page.getByRole('region', { name: '영업 현황' }).count(), 0);
    assert.equal(requests.filter((r) => r.mode === mode).length, requestCount);
    await context.close();
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ fixtureOnly: true, viewportMetrics: metrics, runtimeErrors: errors.length,
    checks: skeletonMode ? ['personal-loading-layout', 'sales-loading-layout', 'matching-card-dimensions', 'noninteractive-placeholders']
      : ['month-drilldown', 'notice-detail-by-id', 'partial-failure-retry', 'permission-hidden-sales'] }, null, 2));
} finally {
  await browser.close();
}
