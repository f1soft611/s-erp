import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const captureModalOnly = process.env.CAPTURE_MODAL_ONLY === 'true';
const themeMode = process.env.THEME_MODE === 'dark' ? 'dark' : 'light';
const screenshotDir = path.resolve(
  process.env.SCREENSHOT_DIR ??
    '../docs/result/20260918/notice-embedded-image-upload/screenshots',
);
const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const menuResponse = {
  user: { userId: 'admin01', roles: ['SYSTEM_ADMIN'] },
  menus: [
    {
      menuId: 1,
      parentMenuId: null,
      name: '그룹웨어',
      path: '/groupware',
      children: [
        {
          menuId: 2,
          parentMenuId: 1,
          name: '공지사항',
          path: '/groupware/notice',
          permissions: { read: true, create: true, update: true, delete: true },
        },
      ],
    },
  ],
};

const postResponse = {
  resultCode: '200',
  result: {
    resultList: [
      {
        postId: 1,
        title: '본문 이미지 공지',
        contentsHtml:
          '<p>앞 문장</p><p><img src="https://cdn.example.com/document-attachments/notice.png" alt="안내 이미지" width="640" /></p><p>뒤 문장</p>',
        contentsText: '앞 문장 뒤 문장',
        writerName: '관리자',
        createdAt: '2026-09-18T00:00:00Z',
        attachments: [
          {
            boardFileId: 10,
            fileName: '안내문.pdf',
            fileSize: 1024,
            fileUsageType: 'ATTACHMENT',
          },
          {
            boardFileId: 11,
            fileName: '본문 이미지.png',
            fileSize: 2048,
            fileUsageType: 'EMBEDDED',
          },
        ],
        comments: [],
        commentCount: 0,
      },
    ],
  },
};

await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();

try {
  await page.addInitScript((mode) => {
    window.localStorage.setItem('erp-theme', mode);
    window.localStorage.setItem(
      's-erp-auth',
      JSON.stringify({
        tenantCode: 'A001',
        userId: 'admin01',
        accessToken: 'embedded-image-verification-token',
        refreshToken: 'embedded-image-verification-refresh-token',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    );
  }, themeMode);

  await page.route('**/api/v1/menus/my', async (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ resultCode: '200', result: menuResponse }),
    }),
  );
  await page.route('**/api/v1/system/modules', async (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        resultCode: '200',
        result: {
          resultList: [
            {
              moduleNm: '그룹웨어',
              moduleCode: 'groupware',
              moduleUrl: '/groupware',
            },
          ],
        },
      }),
    }),
  );
  await page.route(
    '**/api/v1/groupware/boards/notice/posts**',
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(postResponse),
        });
        return;
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ resultCode: '200', result: { postId: 2 } }),
      });
    },
  );
  await page.route(
    '**/api/v1/groupware/boards/notice/embedded-images/temp',
    async (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          resultCode: '200',
          result: {
            uploadToken: 'token-1',
            fileId: 'token-1',
            fileName: 'pasted.png',
            fileSize: 8,
            mimeType: 'image/png',
            objectKey: 'tenant/1/notice-temp/token-1/pasted.png',
            bucketName: 'document-attachments',
            imageUrl: 'https://cdn.example.com/document-attachments/pasted.png',
          },
        }),
      }),
  );
  await page.route('https://cdn.example.com/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: onePixelPng }),
  );

  await page.goto(`${baseUrl}/groupware/notice`, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('button', { name: '새 공지 작성' }).click();
  const editor = page.getByRole('textbox', { name: '본문' });
  await editor.click();
  await page.evaluate(async () => {
    const binary = atob(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    );
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': new Blob([bytes], { type: 'image/png' }),
      }),
    ]);
  });
  await page.keyboard.press('Control+V');
  await editor
    .locator('img[src^="https://cdn.example.com"]')
    .waitFor({ state: 'visible' });
  const insertedImage = editor.locator('img[src^="https://cdn.example.com"]');
  if ((await insertedImage.count()) !== 1)
    throw new Error('이미지 URL 노드가 삽입되지 않았습니다.');
  const composerDialog = page.getByRole('dialog', { name: '새 공지 작성' });
  const composerMeasurements = [];
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(100);
    const measurement = await composerDialog.evaluate((dialog) => {
      const paper = dialog.getBoundingClientRect();
      const footer = dialog.querySelector('.MuiDialogActions-root');
      const header = dialog.querySelector('.MuiDialogTitle-root')?.parentElement
        ?.parentElement;
      const content = dialog.querySelector('.MuiDialogContent-root');
      const footerStart = dialog.querySelector(
        '[data-testid="common-dialog-footer-start"]',
      );
      const actions = dialog.querySelector(
        '[data-testid="common-dialog-actions"]',
      );
      const rect = (element) => {
        const bounds = element?.getBoundingClientRect();
        return bounds
          ? {
              left: bounds.left,
              right: bounds.right,
              top: bounds.top,
              bottom: bounds.bottom,
            }
          : null;
      };
      return {
        viewportWidth: document.documentElement.clientWidth,
        paperBackgroundColor: getComputedStyle(dialog).backgroundColor,
        headerBackgroundColor: header
          ? getComputedStyle(header).backgroundColor
          : null,
        contentBackgroundColor: content
          ? getComputedStyle(content).backgroundColor
          : null,
        footerBackgroundColor: footer
          ? getComputedStyle(footer).backgroundColor
          : null,
        paper: rect(dialog),
        footer: rect(footer),
        footerStart: rect(footerStart),
        actions: rect(actions),
      };
    });
    if (
      !measurement.paper ||
      measurement.paper.left < 0 ||
      measurement.paper.right > width + 1 ||
      !measurement.footerStart ||
      !measurement.actions
    ) {
      throw new Error(
        `공지 작성 모달이 ${width}px 뷰포트에서 잘리거나 슬롯이 없습니다: ${JSON.stringify(measurement)}`,
      );
    }
    const { footerStart, actions } = measurement;
    const expectedPaperColor =
      themeMode === 'dark' ? 'rgb(30, 41, 59)' : 'rgb(255, 255, 255)';
    const expectedContentColor =
      themeMode === 'dark' ? 'rgb(15, 23, 42)' : 'rgb(244, 247, 251)';
    if (
      measurement.paperBackgroundColor !== expectedPaperColor ||
      measurement.headerBackgroundColor !== expectedPaperColor ||
      measurement.contentBackgroundColor !== expectedContentColor ||
      measurement.footerBackgroundColor !== expectedPaperColor
    ) {
      throw new Error(
        `공지 모달 배경색이 ${themeMode} 테마 계약과 다릅니다: ${JSON.stringify(measurement)}`,
      );
    }
    const overlaps =
      footerStart.left < actions.right &&
      actions.left < footerStart.right &&
      footerStart.top < actions.bottom &&
      actions.top < footerStart.bottom;
    if (overlaps) {
      throw new Error(
        `공지 작성 푸터 슬롯이 ${width}px에서 겹칩니다: ${JSON.stringify(measurement)}`,
      );
    }
    composerMeasurements.push(measurement);
    await page.screenshot({
      path: path.join(screenshotDir, `notice-composer-${width}.png`),
      fullPage: false,
    });
  }
  console.log(
    JSON.stringify(
      {
        message: 'Notice composer responsive modal verification passed.',
        themeMode,
        composerMeasurements,
        screenshotDir,
      },
      null,
      2,
    ),
  );

  if (!captureModalOnly) {
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.getByRole('button', { name: '닫기' }).click();
    const previewStrip = page.getByTestId('notice-embedded-image-preview-1');
    await previewStrip.locator('img').waitFor({ state: 'visible' });
    if (
      (await page
        .getByTestId('notice-attachment-list')
        .getByText('본문 이미지.png')
        .count()) !== 0
    ) {
      throw new Error('EMBEDDED 이미지가 일반 첨부파일 목록에 표시되었습니다.');
    }
    await page.screenshot({
      path: path.join(screenshotDir, '02_feed-collapsed-desktop.png'),
      fullPage: true,
    });

    await page.getByRole('button', { name: '더보기' }).click();
    const expanded = page.getByTestId('notice-preview-1');
    await expanded
      .locator('img[alt="안내 이미지"]')
      .waitFor({ state: 'visible' });
    await page.screenshot({
      path: path.join(screenshotDir, '03_feed-expanded-desktop.png'),
      fullPage: true,
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(100);
    const expandedImage = page
      .getByTestId('notice-preview-1')
      .locator('img[alt="안내 이미지"]');
    await expandedImage.scrollIntoViewIfNeeded();
    const box = await expandedImage.boundingBox();
    if (!box || box.width > 375)
      throw new Error(`모바일 이미지가 부모 폭을 초과했습니다: ${box?.width}`);
    await page.screenshot({
      path: path.join(screenshotDir, '04_feed-expanded-mobile.png'),
      fullPage: true,
    });
    console.log(
      JSON.stringify(
        {
          message: 'Embedded image browser verification passed.',
          composerMeasurements,
          screenshotDir,
        },
        null,
        2,
      ),
    );
  }
} finally {
  await browser.close();
}
