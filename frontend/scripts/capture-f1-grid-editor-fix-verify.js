import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const screenshotDir = path.resolve(
    __dirname,
    '../../docs/result/20260902/f1-grid-editor-padding-border-fix/screenshots',
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
  console.log('Logged in, current URL:', page.url());

  const settingsBtn = page.getByRole('button', { name: /환경설정/i });
  await settingsBtn.click();
  await page.waitForTimeout(300);

  const f1GridMenu = page.getByText('F1 Grid 테스트');
  await f1GridMenu.click();
  await page.waitForTimeout(500);

  console.log('F1 Grid test page URL:', page.url());
  await page
    .locator('div[role="grid"]')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.join(screenshotDir, '01_full_page.png'),
    fullPage: false,
  });

  // 그리드를 오른쪽으로 스크롤해서 등록일자/작업시각 컬럼 노출
  const gridScroller = page.locator('div[role="grid"]').first();
  await gridScroller.evaluate((el) => {
    const scrollable = el.closest('[style*="overflow"]') || el.parentElement;
    scrollable?.scrollBy({ left: 1000 });
  });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(screenshotDir, '01b_scrolled_right.png'),
    fullPage: false,
  });

  // 날짜(등록일자) 컬럼 편집 모드
  const dateCellCandidate = page
    .locator('div[role="gridcell"]', {
      hasText: /^\d{4}-\d{2}-\d{2}$/,
    })
    .first();
  if ((await dateCellCandidate.count()) > 0) {
    await dateCellCandidate.scrollIntoViewIfNeeded();
    await dateCellCandidate.dblclick();
    await page.waitForTimeout(300);
    const box = await dateCellCandidate.boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(screenshotDir, '02_date_editor_zoom.png'),
        clip: {
          x: Math.max(0, box.x - 30),
          y: Math.max(0, box.y - 30),
          width: box.width + 60,
          height: box.height + 60,
        },
      });
    }
    await page.keyboard.press('Escape');
  } else {
    console.log('No date cell found for editor screenshot');
  }

  // 시간(작업시각) 컬럼 편집 모드
  const timeCellCandidate = page
    .locator('div[role="gridcell"]', {
      hasText: /^\d{2}:\d{2}$/,
    })
    .first();
  if ((await timeCellCandidate.count()) > 0) {
    await timeCellCandidate.scrollIntoViewIfNeeded();
    await timeCellCandidate.dblclick();
    await page.waitForTimeout(300);
    const box = await timeCellCandidate.boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(screenshotDir, '02b_time_editor_zoom.png'),
        clip: {
          x: Math.max(0, box.x - 30),
          y: Math.max(0, box.y - 30),
          width: box.width + 60,
          height: box.height + 60,
        },
      });
    }
    await page.keyboard.press('Escape');
  } else {
    console.log('No time cell found for editor screenshot');
  }

  // 텍스트 타입 컬럼 편집 모드 진입 (여백/테두리 확인)
  const textCell = page.locator('div[role="gridcell"]').first();
  await textCell.dblclick();
  await page.waitForTimeout(300);
  const textBox = await textCell.boundingBox();
  if (textBox) {
    await page.screenshot({
      path: path.join(screenshotDir, '03_text_editor_zoom.png'),
      clip: {
        x: Math.max(0, textBox.x - 20),
        y: Math.max(0, textBox.y - 20),
        width: textBox.width + 40,
        height: textBox.height + 40,
      },
    });
  }
  await page.keyboard.press('Escape');

  await browser.close();
  console.log('Done');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
