import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.COMMON_DIALOGS_BASE_URL ?? 'http://127.0.0.1:4173';
const screenshotDir = path.resolve(
  import.meta.dirname,
  '../../docs/result/20261111/frontend-common-dialogs/screenshots',
);
const viewports = [375, 768, 1280];
const variants = [
  { type: 'document-type', title: '문서 유형 변경' },
  { type: 'confirm', title: '문서 삭제' },
  { type: 'form', title: '문서 수정' },
  { type: 'selection', title: '참조자 선택' },
  { type: 'image', title: '이미지 보기' },
];

await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  for (const { type, title } of variants) {
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${baseUrl}/tests/common-dialog-preview.html?type=${type}`);
      const dialog = page.getByRole('dialog', { name: title });
      await dialog.waitFor();
      const bounds = await dialog.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      });
      assert.ok(bounds.left >= 0, `${type} dialog overflows left at ${width}px`);
      assert.ok(bounds.right <= width + 1, `${type} dialog overflows right at ${width}px`);
      const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(documentWidth <= width + 1, `${type} page overflows at ${width}px`);
      await page.screenshot({
        path: path.join(screenshotDir, `${type}-${width}.png`),
        animations: 'disabled',
      });
    }

    if (type === 'confirm') {
      await page.getByRole('button', { name: '취소' }).click();
      await page.getByRole('status').getByText('취소됨').waitFor();
    } else if (type === 'document-type') {
      await page.getByRole('button', { name: '취소' }).click();
      await page.getByRole('status').getByText('닫힘').waitFor();
    } else if (type === 'image') {
      await page.getByRole('button', { name: '이미지 뷰어 닫기' }).click();
      await page.getByRole('status').getByText('닫힘').waitFor();
    } else {
      await page.getByRole('button', { name: '취소' }).click();
      await page.getByRole('dialog', { name: title }).waitFor({ state: 'detached' });
    }
  }

  assert.deepEqual(pageErrors, []);
  console.log('Common dialogs passed at 375px, 768px, and 1280px.');
} finally {
  await browser.close();
}
