import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const screenshotDir = path.resolve(
  '../docs/result/20260901/menu-page-actions-grid-controls/screenshots',
);
const viewports = [375, 768, 1280];

const envelope = (result) => ({
  resultCode: '200',
  resultMessage: 'OK',
  result,
});

const menuRows = [
  {
    menuId: 4,
    moduleId: 2,
    moduleNm: '환경설정',
    parentMenuId: null,
    parentMenuNm: null,
    menuCode: 'ST_SYSTEM',
    menuNm: '시스템 관리',
    menuUrl: '/settings/system',
    iconNm: 'Settings',
    sortOrder: 1,
    useAt: 'Y',
    hasChildren: true,
    permissionCodes: [],
  },
  {
    menuId: 10,
    moduleId: 2,
    moduleNm: '환경설정',
    parentMenuId: 4,
    parentMenuNm: '시스템 관리',
    menuCode: 'ST_ROLES',
    menuNm: '권한관리',
    menuUrl: '/settings/system/roles',
    iconNm: null,
    sortOrder: 1,
    useAt: 'Y',
    hasChildren: false,
    permissionCodes: ['READ'],
  },
  {
    menuId: 11,
    moduleId: 2,
    moduleNm: '환경설정',
    parentMenuId: 4,
    parentMenuNm: '시스템 관리',
    menuCode: 'ST_MENUS',
    menuNm: '메뉴관리',
    menuUrl: '/settings/system/menus',
    iconNm: null,
    sortOrder: 2,
    useAt: 'Y',
    hasChildren: false,
    permissionCodes: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'EXCEL'],
  },
  {
    menuId: 12,
    moduleId: 2,
    moduleNm: '환경설정',
    parentMenuId: 4,
    parentMenuNm: '시스템 관리',
    menuCode: 'ST_F1_GRID_TEST',
    menuNm: 'F1 Grid 테스트',
    menuUrl: '/settings/system/f1-grid-test',
    iconNm: null,
    sortOrder: 3,
    useAt: 'Y',
    hasChildren: false,
    permissionCodes: ['READ'],
  },
];

await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.addInitScript(() => {
  window.localStorage.setItem(
    's-erp-auth',
    JSON.stringify({
      tenantCode: 'A001',
      userId: 'admin',
      accessToken: 'capture-token',
      refreshToken: 'capture-refresh-token',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }),
  );
});

await page.route('**/api/v1/menus/my', async (route) => {
  await route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({
      resultCode: '500',
      resultMessage: 'Use static menu fallback for capture',
      result: null,
    }),
  });
});

await page.route('**/api/v1/system/modules', async (route) => {
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(
      envelope({
        resultList: [{ moduleId: 2, moduleNm: '환경설정', useAt: 'Y' }],
      }),
    ),
  });
});

await page.route('**/api/v1/system/permissions', async (route) => {
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(
      envelope({
        resultList: [
          {
            permissionId: 1,
            permissionCode: 'READ',
            permissionName: '조회',
            sortOrder: 10,
          },
          {
            permissionId: 2,
            permissionCode: 'CREATE',
            permissionName: '등록',
            sortOrder: 20,
          },
          {
            permissionId: 3,
            permissionCode: 'UPDATE',
            permissionName: '수정',
            sortOrder: 30,
          },
          {
            permissionId: 4,
            permissionCode: 'DELETE',
            permissionName: '삭제',
            sortOrder: 40,
          },
          {
            permissionId: 5,
            permissionCode: 'EXCEL',
            permissionName: '엑셀',
            sortOrder: 50,
          },
        ],
      }),
    ),
  });
});

await page.route('**/api/v1/system/menus?moduleId=2', async (route) => {
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(envelope({ resultList: menuRows })),
  });
});

await page.goto(`${baseUrl}/dashboard/settings/menus`, {
  waitUntil: 'networkidle',
});
await page.getByRole('toolbar', { name: '메뉴 업무 액션' }).waitFor();
await page.getByRole('toolbar', { name: '메뉴 그리드 제어' }).waitFor();

const measurements = [];
for (const width of viewports) {
  await page.setViewportSize({ width, height: 820 });
  await page.waitForTimeout(300);

  const metrics = await page.evaluate(() => {
    const serviceActions = document.querySelector(
      '[aria-label="메뉴 업무 액션"]',
    );
    const gridControls = document.querySelector(
      '[aria-label="메뉴 그리드 제어"]',
    );
    return {
      viewportWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      serviceActionVisible: Boolean(serviceActions),
      gridControlVisible: Boolean(gridControls),
      serviceActionBottom: serviceActions?.getBoundingClientRect().bottom ?? 0,
      gridControlTop: gridControls?.getBoundingClientRect().top ?? 0,
    };
  });

  if (!metrics.serviceActionVisible || !metrics.gridControlVisible) {
    throw new Error(
      `Toolbar missing at ${width}px: ${JSON.stringify(metrics)}`,
    );
  }

  if (
    metrics.documentScrollWidth > metrics.viewportWidth ||
    metrics.bodyScrollWidth > metrics.viewportWidth
  ) {
    throw new Error(
      `Document overflow at ${width}px: ${JSON.stringify(metrics)}`,
    );
  }

  measurements.push({ width, ...metrics });
  await page.screenshot({
    path: path.join(screenshotDir, `menus-actions-${width}px.png`),
    fullPage: false,
  });
}

console.log(JSON.stringify(measurements, null, 2));
await browser.close();
