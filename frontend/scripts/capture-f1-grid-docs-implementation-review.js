// F1-Grid 문서 포털 구현 정합성 검토(2026-09-03) 반응형 캡처 스크립트.
// 사용법: `node scripts/capture-f1-grid-docs-implementation-review.js` (frontend 디렉터리에서 `npm run dev` 서버가 4173/4174 포트에서 실행 중이어야 함)
const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = process.env.F1_GRID_DOCS_BASE_URL || 'http://127.0.0.1:4173';
const OUT_DIR = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'result',
  '20260903',
  'f1grid-docs-implementation-review',
  'screenshots',
);

async function clickNavButton(page, label) {
  await page.evaluate((text) => {
    const buttons = Array.from(document.querySelectorAll('nav button'));
    const target = buttons.find((b) => b.textContent?.trim() === text);
    if (target) target.click();
  }, label);
  await page.waitForTimeout(300);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const width of [1280, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE_URL}/f1-grid-docs`);
    await page.waitForSelector('h1.f1-doc-title');

    await page.screenshot({
      path: path.join(OUT_DIR, `overview-${width}.png`),
    });

    await clickNavButton(page, 'Cell Editing');
    await page.screenshot({ path: path.join(OUT_DIR, `editing-${width}.png`) });

    await clickNavButton(page, 'Tree Grid');
    await page.screenshot({
      path: path.join(OUT_DIR, `tree-grid-${width}.png`),
    });

    await clickNavButton(page, 'API Reference');
    await page.screenshot({
      path: path.join(OUT_DIR, `api-reference-${width}.png`),
    });
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
