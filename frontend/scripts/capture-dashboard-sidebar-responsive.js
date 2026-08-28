import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4174';
const screenshotDir = path.resolve(
  'docs/result/20260828/dashboard-sidebar-responsive/screenshots',
);
const viewports = [375, 768, 1280];

await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await page.getByLabel(/업체코드/i).fill('A001');
await page.getByLabel(/사용자 ID/i).fill('admin');
await page.getByLabel(/비밀번호/i).fill('1234');
await page.getByRole('button', { name: /로그인/i }).click();
await page.waitForURL('**/dashboard/**');

const measurements = [];
for (const width of viewports) {
  await page.setViewportSize({ width, height: 800 });
  await page.waitForTimeout(300);

  if (width === 375) {
    await page.getByRole('button', { name: '메뉴 열기' }).click();
    await page.waitForTimeout(200);
  }

  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    moduleRailVisible: Boolean(
      document.querySelector('[aria-label="그룹웨어"]'),
    ),
    menuPanelVisible: Boolean(document.querySelector('[role="tree"]')),
    menuPanelWidth:
      document.querySelector('[role="dialog"]')?.getBoundingClientRect()
        .width ??
      document
        .querySelector('[role="tree"]')
        ?.parentElement?.getBoundingClientRect().width ??
      0,
  }));

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
    path: path.join(screenshotDir, `${width}px-menu-panel.png`),
    fullPage: false,
  });

  if (width === 375) {
    await page.getByRole('button', { name: '메뉴 닫기' }).click();
  }
}

console.log(JSON.stringify(measurements, null, 2));
await browser.close();
