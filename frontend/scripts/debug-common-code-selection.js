import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4175';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem(
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

const page = await context.newPage();
await page.route('**/api/v1/menus/my', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      resultCode: '200',
      resultMessage: 'OK',
      result: {
        user: { userId: 'admin', name: '관리자', roles: ['ADMIN'] },
        menus: [
          {
            menuId: 10,
            name: '기준정보',
            path: '/co',
            icon: 'Settings',
            children: [
              {
                menuId: 11,
                name: '공통코드 관리',
                path: '/co/master/common-code',
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
          {
            menuId: 20,
            name: '그룹웨어',
            path: '/groupware',
            icon: 'Groups',
            children: [
              {
                menuId: 21,
                name: '문서관리',
                path: '/groupware/documents',
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
    }),
  });
});
await page.route('**/api/v1/system/modules', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      resultCode: '200',
      resultMessage: 'OK',
      result: {
        resultList: [
          {
            moduleId: 1,
            moduleCode: 'co',
            moduleNm: '기준정보',
            moduleUrl: '/co',
            iconNm: 'Settings',
            useAt: 'Y',
          },
          {
            moduleId: 2,
            moduleCode: 'groupware',
            moduleNm: '그룹웨어',
            moduleUrl: '/groupware',
            iconNm: 'Groups',
            useAt: 'Y',
          },
        ],
      },
    }),
  });
});
await page.route('**/api/v1/co/master/common-code/groups', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      resultCode: '200',
      resultMessage: 'OK',
      result: {
        resultList: [
          {
            commonCodeGroupId: 101,
            groupCode: 'LEVEL',
            groupNm: '직급',
            groupDc: '',
            parentGroupId: null,
            sortOrder: 1,
            useAt: 'Y',
          },
          {
            commonCodeGroupId: 102,
            groupCode: 'STATUS',
            groupNm: '상태',
            groupDc: '',
            parentGroupId: null,
            sortOrder: 2,
            useAt: 'Y',
          },
        ],
      },
    }),
  });
});
await page.route(
  '**/api/v1/co/master/common-code/groups/*/items',
  async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        resultCode: '200',
        resultMessage: 'OK',
        result: {
          resultList: [
            {
              commonCodeItemId: 1001,
              groupId: 101,
              itemCode: '001',
              itemNm: '사원',
              itemDc: '',
              parentItemId: null,
              sortOrder: 1,
              useAt: 'Y',
            },
          ],
        },
      }),
    });
  },
);

async function snapshot(label) {
  return {
    label,
    url: page.url(),
    session: await page.evaluate(() =>
      sessionStorage.getItem('s-erp:page:common-code-management'),
    ),
    rows: await page.locator('[role="row"]').evaluateAll((rows) =>
      rows.map((row) => ({
        text: row.textContent?.trim(),
        selected: row.getAttribute('aria-selected'),
      })),
    ),
  };
}

await page.goto(`${baseUrl}/co/master/common-code`, {
  waitUntil: 'networkidle',
});
await page.getByText('공통코드 그룹 관리').waitFor();
await page
  .locator('[role="row"]')
  .filter({ hasText: '직급' })
  .first()
  .click({ button: 'right' });
await page.waitForTimeout(200);
console.log(
  'context-menu',
  (await page.locator('body').innerText()).slice(-1000),
);
await page.keyboard.press('Escape');
console.log(JSON.stringify(await snapshot('initial'), null, 2));

const targetRow = page
  .locator('[role="row"]')
  .filter({ hasText: '상태' })
  .first();
await targetRow.click();
await page.waitForTimeout(200);
console.log(JSON.stringify(await snapshot('after-select'), null, 2));

await page.goto(`${baseUrl}/groupware/documents`, { waitUntil: 'networkidle' });
await page.getByText('문서관리').first().waitFor();
console.log(JSON.stringify(await snapshot('after-away'), null, 2));
await page.goto(`${baseUrl}/co/master/common-code`, {
  waitUntil: 'networkidle',
});
await page.getByText('공통코드 그룹 관리').waitFor();
await page.waitForTimeout(500);
console.log(JSON.stringify(await snapshot('after-return'), null, 2));

await page.screenshot({
  path: 'docs/result/20260923/profile-department-level-page-session/common-code-selection-debug.png',
  fullPage: false,
});
await browser.close();
