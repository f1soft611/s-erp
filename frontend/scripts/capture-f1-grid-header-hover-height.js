import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.F1_GRID_DOCS_BASE_URL || 'http://127.0.0.1:4175';
const OUT_DIR = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'result',
  '20261001',
  'f1-grid-header-hover-height',
  'screenshots',
);

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });
    await page.goto(`${BASE_URL}/f1-grid-docs`);
    await page.getByRole('button', { name: 'Column Layout' }).click();

    const header = page.locator('[role="columnheader"][aria-label="품목명"]');
    await header.scrollIntoViewIfNeeded();
    const initial = await header.boundingBox();
    const resizeHandle = await page
      .getByRole('separator', { name: '품목명 컬럼 너비 조절' })
      .boundingBox();

    await page.mouse.move(resizeHandle.x + 3, resizeHandle.y + 8);
    await page.mouse.down();
    await page.mouse.move(initial.x + 54, resizeHandle.y + 8, {
      steps: 12,
    });
    await page.mouse.up();

    await header.evaluate((element) => {
      const label = element.querySelector('.f1-grid-header-content > span');
      label.textContent = '등록주기 확인';
    });
    await header.hover();
    await page.waitForTimeout(250);

    const hoverState = await header.evaluate((element) => {
      const label = element.querySelector('.f1-grid-header-content > span');
      const style = getComputedStyle(label);
      return {
        width: element.getBoundingClientRect().width,
        rowHeight: element.parentElement.getBoundingClientRect().height,
        labelWidth: label.clientWidth,
        labelScrollWidth: label.scrollWidth,
        whiteSpace: style.whiteSpace,
        overflow: style.overflow,
        textOverflow: style.textOverflow,
      };
    });

    await header.getByRole('button').click();
    const menuVisible = await page.getByRole('menu').isVisible();
    const menuState = await header.evaluate((element) => ({
      rowHeight: element.parentElement.getBoundingClientRect().height,
      menuOpacity: getComputedStyle(element.querySelector('button')).opacity,
    }));

    assert.ok(hoverState.labelScrollWidth > hoverState.labelWidth);
    assert.equal(hoverState.whiteSpace, 'nowrap');
    assert.equal(hoverState.overflow, 'hidden');
    assert.equal(hoverState.textOverflow, 'ellipsis');
    assert.equal(menuState.rowHeight, hoverState.rowHeight);
    assert.equal(menuVisible, true);

    await page.screenshot({
      path: path.join(OUT_DIR, 'narrow-header-hover.png'),
      fullPage: true,
    });

    console.log(
      JSON.stringify({ ...hoverState, ...menuState, menuVisible }, null, 2),
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
