import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const screenshotDir = path.resolve(
  'docs/result/20260923/profile-department-level-page-session/screenshots',
);

await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
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
        user: {
          userId: 'admin',
          name: '소크라710',
          email: 'admin@f1soft.com',
          departmentName: '플랫폼개발팀',
          levelId: 123,
          levelCode: '001',
          levelName: '사원',
          groupName: '플랫폼관리자',
          roleName: 'PLATFORM_ADMIN',
          roles: ['PLATFORM_ADMIN'],
        },
        menus: [
          {
            menuId: 1,
            name: '그룹웨어',
            path: '/groupware',
            icon: 'Groups',
            children: [
              {
                menuId: 2,
                name: '커뮤니티',
                path: '/groupware/community',
                children: [
                  {
                    menuId: 3,
                    name: '공지사항',
                    path: '/groupware/community/notice',
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

await page.goto(`${baseUrl}/groupware/community/notice`, {
  waitUntil: 'networkidle',
});
const profileTrigger = page.locator('button[aria-label="프로필 메뉴 열기"]');
for (const width of [375, 768, 1280]) {
  await page.setViewportSize({ width, height: 800 });
  await profileTrigger.click();
  await page.screenshot({
    path: path.join(screenshotDir, `profile-popover-${width}.png`),
    fullPage: false,
  });
  await page.keyboard.press('Escape');

  const recentItem = page.getByRole('button', { name: /공지사항/i }).last();
  await recentItem.waitFor();
  await page.screenshot({
    path: path.join(screenshotDir, `recent-menu-${width}.png`),
    fullPage: false,
  });
}

console.log(
  JSON.stringify(
    {
      profileNameVisible: await page.getByText('소크라710').count(),
      recentNoticeVisible: await page.getByText('공지사항').count(),
    },
    null,
    2,
  ),
);
await browser.close();
