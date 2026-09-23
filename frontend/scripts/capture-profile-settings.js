import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const screenshotDir = path.resolve(
  '../docs/result/20260923/profile-settings/screenshots',
);
await fs.mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
});
const page = await context.newPage();
const response = (result) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ resultCode: '200', resultMessage: 'OK', result }),
});

await page.route('**/api/v1/menus/my', async (route) => {
  await route.fulfill(
    response({
      user: {
        userId: 'admin',
        name: '소크라710',
        email: 'admin@f1soft.com',
        departmentName: '플랫폼개발팀',
        levelName: '사원',
        profileImage: null,
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
              name: '종합현황',
              path: '/groupware/overview',
              permissions: { read: true },
            },
          ],
        },
      ],
    }),
  );
});
await page.route('**/api/v1/system/modules', async (route) => {
  await route.fulfill(
    response({
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
    }),
  );
});
await page.route('**/api/v1/users/me/profile', async (route) => {
  await route.fulfill(
    response({
      userId: 'admin',
      name: '소크라710',
      email: 'admin@f1soft.com',
      departmentName: '플랫폼개발팀',
      levelName: '사원',
      profileImage: null,
      stampImage: null,
    }),
  );
});
await page.route('**/auth/login-jwt', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      resultCode: '200',
      resultMessage: '로그인 성공',
      jToken: 'capture-token',
      refreshToken: 'capture-refresh-token',
    }),
  });
});

await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await page.getByLabel(/업체코드/i).fill('A001');
await page.getByLabel(/사용자 ID/i).fill('admin');
await page.getByLabel(/비밀번호/i).fill('1234');
await page.getByRole('button', { name: /로그인/i }).click();
await page.getByRole('button', { name: '프로필 메뉴 열기' }).waitFor();
for (const width of [375, 768, 1280]) {
  await page.setViewportSize({ width, height: 800 });
  await page.getByRole('button', { name: '프로필 메뉴 열기' }).click();
  await page.getByText('내 정보 관리', { exact: true }).click();
  await page.getByRole('heading', { name: '내 정보 관리' }).waitFor();
  await page.screenshot({
    path: path.join(screenshotDir, `profile-settings-${width}.png`),
    fullPage: false,
  });
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '프로필 메뉴 열기' }).waitFor();
  await page.getByRole('button', { name: '프로필 메뉴 열기' }).click();
  await page.getByText('보안 설정', { exact: true }).click();
  await page.getByRole('heading', { name: '보안 설정' }).waitFor();
  await page.screenshot({
    path: path.join(screenshotDir, `security-settings-${width}.png`),
    fullPage: false,
  });
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '프로필 메뉴 열기' }).waitFor();
}

console.log(
  JSON.stringify(
    { profilePageReached: true, securityPageReached: true, screenshotCount: 6 },
    null,
    2,
  ),
);
await browser.close();
