const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  await page.goto('http://127.0.0.1:4176/dashboard', {
    waitUntil: 'networkidle',
  });
  await page.locator('button:has-text("그룹웨어")').waitFor();
  await page.screenshot({
    path: 'D:/f1soft/dev/react/S-ERP/docs/result/erp-login-dashboard/screenshots/sidebar.png',
    clip: { x: 0, y: 0, width: 360, height: 980 },
  });
  await browser.close();
})();
