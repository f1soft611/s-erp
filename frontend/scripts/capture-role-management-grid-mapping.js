import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const screenshotDir = path.resolve(
  '../docs/result/20260904/role-management-grid-mapping-improvements/screenshots',
);
const viewports = [375, 768, 1280];

const envelope = (result) => ({
  resultCode: '200',
  resultMessage: 'OK',
  result,
});

await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });

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

await page.route('**/api/v1/menus/my', (route) =>
  route.fulfill({ status: 500 }),
);
await page.route('**/api/v1/system/roles', (route) =>
  route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(
      envelope({
        resultList: [
          {
            roleId: 7,
            roleCode: 'OPERATOR',
            roleNm: '운영자',
            roleDc: '운영 역할',
            useAt: 'Y',
          },
          {
            roleId: 8,
            roleCode: 'REVIEWER',
            roleNm: '검토자',
            roleDc: '검토 역할',
            useAt: 'Y',
          },
        ],
      }),
    ),
  }),
);
await page.route('**/api/v1/system/roles/*/users', (route) =>
  route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(
      envelope({
        assignedUsers: [],
        unassignedUsers: [
          { loginId: 12, userNm: '미할당 사용자', departmentNm: '운영팀' },
        ],
      }),
    ),
  }),
);

await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: '환경설정' }).click();
await page.getByText('권한관리', { exact: true }).click();
await page.getByLabel('F1-GRID 권한 관리').waitFor();
await page.getByLabel('F1-GRID 사용자 매핑').waitFor();

const measurements = [];
for (const width of viewports) {
  await page.setViewportSize({ width, height: 820 });
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    roleToolbar: Boolean(
      document.querySelector('[aria-label="권한 그리드 제어"]'),
    ),
    roleGrid: Boolean(
      document.querySelector('[aria-label="F1-GRID 권한 관리"]'),
    ),
    userGrid: Boolean(
      document.querySelector('[aria-label="F1-GRID 사용자 매핑"]'),
    ),
  }));
  if (!metrics.roleToolbar || !metrics.roleGrid || !metrics.userGrid) {
    throw new Error(
      `Missing role management content: ${JSON.stringify(metrics)}`,
    );
  }
  if (metrics.documentScrollWidth > metrics.viewportWidth) {
    throw new Error(`Document overflow: ${JSON.stringify(metrics)}`);
  }
  measurements.push(metrics);
  await page.screenshot({
    path: path.join(screenshotDir, `role-management-${width}px.png`),
    fullPage: false,
  });
}

console.log(JSON.stringify(measurements, null, 2));
await browser.close();
