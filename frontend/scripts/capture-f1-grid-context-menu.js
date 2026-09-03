import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const screenshotDir = path.resolve(
  '../docs/result/20260903/f1grid-context-menu/screenshots',
);

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
await page.getByRole('toolbar', { name: '메뉴 그리드 제어' }).waitFor();
await page.getByRole('gridcell', { name: '메뉴관리' }).first().waitFor();

// 트리 행 위에서 우클릭: "루트 추가" / "행 추가" 등이 표시되는지 확인
await page
  .getByRole('gridcell', { name: '메뉴관리' })
  .first()
  .click({ button: 'right' });
await page.getByRole('menuitem', { name: '루트 추가' }).waitFor();
await page.getByRole('menuitem', { name: '행 추가' }).waitFor();
await page.getByRole('menuitem', { name: '행 삭제' }).waitFor();
await page.getByRole('menuitem', { name: '설정을 기본값으로 복원' }).waitFor();
const hasExcelItem = await page
  .getByRole('menuitem', { name: '엑셀 내보내기' })
  .count();
console.log('excel menu item visible:', hasExcelItem > 0);
await page.screenshot({
  path: path.join(screenshotDir, 'f1grid-context-menu-tree-row.png'),
  fullPage: false,
});

await page.keyboard.press('Escape');
await page.getByRole('menu').waitFor({ state: 'hidden' });

console.log('screenshot captured');
await browser.close();
