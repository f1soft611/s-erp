import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const screenshotDir = path.resolve(
    __dirname,
    '../../docs/result/20260902/f1-grid-editor-row2-border-fix/screenshots',
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to login page...');
  await page.goto('http://127.0.0.1:4174/login', { waitUntil: 'networkidle' });

  await page.getByPlaceholder('예: A001').fill('T1358606250');
  await page.getByPlaceholder('사용자 ID를 입력하세요').fill('admin');
  await page.getByPlaceholder('비밀번호를 입력하세요').fill('f1soft@611');
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/dashboard/**', { timeout: 10000 });

  const settingsBtn = page.getByRole('button', { name: /환경설정/i });
  await settingsBtn.click();
  await page.waitForTimeout(300);

  // 메뉴관리 페이지 이동
  await page.getByText('메뉴관리', { exact: true }).click();
  await page.waitForTimeout(500);
  await page
    .locator('div[role="grid"]')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.join(screenshotDir, '01_menu_management_full.png'),
    fullPage: false,
  });

  const gridCells = page.locator('div[role="gridcell"]');
  const cellCount = await gridCells.count();
  console.log('gridcell count:', cellCount);

  // 두 번째 데이터 행(대략 row index 1)의 편집 가능한 셀 찾기: 이름 텍스트 셀들을 순회
  const rows = page.locator('div[role="row"]');
  const rowCount = await rows.count();
  console.log('row count:', rowCount);

  // 편집 가능한 텍스트 셀 후보들 중 두 번째, 세 번째 셀을 더블클릭해서 비교
  const editableCandidates = page.locator(
    'div[role="gridcell"][tabindex="0"], div[role="gridcell"]',
  );

  for (let i = 0; i < Math.min(cellCount, 40); i += 1) {
    const cell = gridCells.nth(i);
    const text = await cell.innerText().catch(() => '');
    if (text && text.trim().length > 0 && !text.includes('\n')) {
      // 첫 번째 및 두 번째로 발견되는 텍스트 셀들을 각각 편집모드로 진입시켜 캡처
    }
  }

  // 행별로 첫 번째 컬럼(보통 이름/코드) 셀을 찾아 0,1,2번째 행 편집 캡처
  for (let rowIdx = 0; rowIdx < 3; rowIdx += 1) {
    const row = rows.nth(rowIdx + 1); // 0번은 헤더일 가능성 있어 +1
    const cell = row.locator('div[role="gridcell"]').first();
    if ((await cell.count()) === 0) continue;
    await cell.scrollIntoViewIfNeeded();
    await cell.dblclick();
    await page.waitForTimeout(300);
    const box = await cell.boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(screenshotDir, `02_row${rowIdx}_editor_zoom.png`),
        clip: {
          x: Math.max(0, box.x - 30),
          y: Math.max(0, box.y - 30),
          width: box.width + 60,
          height: box.height + 60,
        },
      });
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }

  await page.screenshot({
    path: path.join(screenshotDir, '03_menu_management_after.png'),
    fullPage: false,
  });

  await browser.close();
  console.log('Done');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
