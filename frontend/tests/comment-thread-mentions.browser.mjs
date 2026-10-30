import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';

for (const width of [375, 768, 1280]) {
  test(`comment composer offers mention choices at ${width}px`, async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(8000);
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    try {
      await page.route('**/__comment-mentions-test', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div></body></html>',
        }),
      );
      await page.goto('http://127.0.0.1:4173/__comment-mentions-test');
      await page.evaluate(async () => {
        const { default: RefreshRuntime } = await import('/@react-refresh');
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;
        const React = (await import('/node_modules/.vite/deps/react.js')).default;
        const ReactDOM = (
          await import('/node_modules/.vite/deps/react-dom_client.js')
        ).default;
        const { CommentThread } = await import(
          '/src/shared/components/feed/CommentThread.tsx'
        );
        window.submittedComment = null;
        ReactDOM.createRoot(document.getElementById('root')).render(
          React.createElement(CommentThread, {
            enableMentions: true,
            mentionOptions: [
              { userId: 42, name: '홍길동' },
              { userId: 7, name: '관리자', departmentName: '경영지원' },
            ],
            onSubmitComment: (...args) => {
              window.submittedComment = args;
            },
          }),
        );
      });

      const editor = page.getByRole('textbox', { name: '댓글 입력' });
      await editor.click();
      await page.keyboard.type('@');

      const mentionOption = page.getByRole('option', { name: '홍길동', exact: true });
      await mentionOption.waitFor();
      const menuBox = await page.getByRole('listbox', { name: '멘션 대상' }).boundingBox();
      assert.ok(menuBox && menuBox.x >= 0 && menuBox.x + menuBox.width <= width + 1);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        true,
      );
      const screenshotDir = process.env.COMMENT_MENTION_SCREENSHOT_DIR;
      if (screenshotDir) {
        await mkdir(screenshotDir, { recursive: true });
        await page.screenshot({
          path: path.join(screenshotDir, `comment-mention-${width}.png`),
          fullPage: true,
        });
      }

      await mentionOption.click();
      await page.getByRole('button', { name: '등록', exact: true }).click();

      const submittedComment = await page.evaluate(() => window.submittedComment);
      assert.deepEqual(submittedComment?.[2], [42]);
      assert.equal(submittedComment?.[3], false);

      await editor.click();
      await page.keyboard.type('@');
      await page.getByRole('option', { name: /@ALL/ }).click();
      await page.getByRole('button', { name: '등록', exact: true }).click();

      const allSubmittedComment = await page.evaluate(() => window.submittedComment);
      assert.deepEqual(allSubmittedComment?.[2], []);
      assert.equal(allSubmittedComment?.[3], true);
      assert.match(allSubmittedComment?.[0] ?? '', /@ALL/);

      await editor.click();
      await page.keyboard.type('@관리');
      assert.match((await editor.textContent()) ?? '', /@관리$/);
      await page.getByRole('option', { name: /관리자/ }).waitFor();
      assert.equal(await page.getByRole('option', { name: /홍길동/ }).count(), 0);
      assert.equal(await page.getByRole('option', { name: /@ALL/ }).count(), 0);
      if (screenshotDir) {
        await page.screenshot({
          path: path.join(screenshotDir, `comment-mention-filter-${width}.png`),
          fullPage: true,
        });
      }
      await page.keyboard.press('Enter');
      assert.match((await editor.textContent()) ?? '', /@관리자\s*$/);
      assert.equal(await editor.locator('.comment-mention').first().textContent(), '@관리자');
      await page.getByRole('button', { name: '등록', exact: true }).click();
      const filteredComment = await page.evaluate(() => window.submittedComment);
      assert.deepEqual(filteredComment?.[2], [7]);
      assert.equal(filteredComment?.[3], false);
      assert.deepEqual(pageErrors, []);
    } finally {
      await browser.close();
    }
  });
}
