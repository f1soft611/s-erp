import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4175';
const screenshotDir = path.resolve(
  '../docs/result/20260909/menu-tree-filter-sort-context-menu/screenshots',
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
    contentType: 'application/json',
    body: JSON.stringify(
      envelope({
        user: { userId: 'admin', roles: ['ADMIN'] },
        menus: [
          {
            menuId: 2,
            parentMenuId: null,
            name: '환경설정',
            path: '/settings',
            children: [
              {
                menuId: 4,
                parentMenuId: 2,
                name: '시스템 관리',
                path: '/settings/system',
                children: [
                  {
                    menuId: 11,
                    parentMenuId: 4,
                    name: '메뉴관리',
                    path: '/settings/system/menus',
                    permissions: {
                      read: true,
                      create: true,
                      update: true,
                      delete: true,
                      excel: true,
                    },
                  },
                ],
              },
            ],
          },
        ],
      }),
    ),
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
await page.route('**/api/v1/system/roles', async (route) => {
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(
      envelope({
        resultList: [
          { roleId: 1, roleNm: '관리자', roleCode: 'ADMIN', useAt: 'Y' },
        ],
      }),
    ),
  });
});
await page.route('**/api/v1/system/permissions', async (route) => {
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(envelope({ resultList: [] })),
  });
});
await page.route('**/api/v1/system/menus?moduleId=2**', async (route) => {
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(envelope({ resultList: menuRows })),
  });
});

await page.goto(`${baseUrl}/settings/system/menus`, {
  waitUntil: 'networkidle',
});
await page.getByLabel('모듈 선택').click();
await page.getByRole('option', { name: '환경설정' }).click();
await page.getByLabel('권한 선택').click();
await page.getByRole('option', { name: '관리자' }).click();
const grid = page.getByRole('grid', { name: 'F1-TREE 메뉴 관리' });
await grid.waitFor();

async function openColumnMenu() {
  await page.getByRole('button', { name: '메뉴명 컬럼 메뉴' }).click();
}

await openColumnMenu();
await page.getByRole('menuitem', { name: '내림차순 정렬' }).click();
await grid.click({ button: 'right', position: { x: 300, y: 130 } });
await page.getByRole('menuitem', { name: '정렬 해제' }).waitFor();
await page.screenshot({
  path: path.join(screenshotDir, 'sort-clear.png'),
  fullPage: false,
});
await page.getByRole('menuitem', { name: '정렬 해제' }).click();

await openColumnMenu();
await page.getByRole('menuitem', { name: '필터' }).click();
await page.getByLabelText('메뉴명 필터 값').fill('권한');
await page.getByRole('button', { name: '적용' }).click();
await grid.click({ button: 'right', position: { x: 300, y: 130 } });
await page.getByRole('menuitem', { name: '필터 해제' }).waitFor();
await page.screenshot({
  path: path.join(screenshotDir, 'filter-clear.png'),
  fullPage: false,
});
await page.getByRole('menuitem', { name: '필터 해제' }).click();
await page.getByRole('gridcell', { name: '메뉴관리' }).waitFor();

console.log('Menu tree filter and sort context-menu capture passed.');
await browser.close();
