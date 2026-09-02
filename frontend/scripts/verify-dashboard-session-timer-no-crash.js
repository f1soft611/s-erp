import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => {
    errors.push(err.message);
    console.log('PAGE ERROR:', err.message);
  });

  console.log('Navigating to login page...');
  await page.goto('http://127.0.0.1:4174/login', { waitUntil: 'networkidle' });

  await page.getByPlaceholder('예: A001').fill('T1358606250');
  await page.getByPlaceholder('사용자 ID를 입력하세요').fill('admin');
  await page.getByPlaceholder('비밀번호를 입력하세요').fill('f1soft@611');
  await page.getByRole('button', { name: '로그인' }).click();

  await page.waitForURL('**/dashboard/**', { timeout: 10000 });
  console.log('Logged in, current URL:', page.url());

  const settingsBtn = page.getByRole('button', { name: /환경설정/i });
  await settingsBtn.click();
  await page.waitForTimeout(300);

  const f1GridMenu = page.getByText('F1 Grid 테스트');
  await f1GridMenu.click();
  await page.waitForTimeout(500);
  console.log('Navigated to F1 Grid test page:', page.url());

  console.log('Waiting 100 seconds while observing session countdown label...');
  for (let i = 0; i < 10; i += 1) {
    await page.waitForTimeout(10000);
    const label = await page
      .getByText(/로그인 유지 시간/)
      .first()
      .textContent()
      .catch(() => null);
    console.log(
      `[t=${(i + 1) * 10}s] label=`,
      label,
      'errors so far:',
      errors.length,
    );
  }

  const bodyText = await page.locator('body').innerText();
  console.log('Body still has content length:', bodyText.length);

  await browser.close();

  if (errors.length > 0) {
    console.error(`FAILED: ${errors.length} pageerror(s) detected`);
    process.exit(1);
  }
  console.log('PASSED: no pageerror detected after 100s');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
