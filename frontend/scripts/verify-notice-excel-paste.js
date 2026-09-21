import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const screenshotDir = path.resolve(
  '../docs/result/20260918/notice-excel-paste-browser/screenshots',
);

const menuResponse = {
  user: { userId: 'admin01', roles: ['SYSTEM_ADMIN'] },
  menus: [
    {
      menuId: 1,
      parentMenuId: null,
      name: '그룹웨어',
      icon: 'Groups',
      path: '/groupware',
      children: [
        {
          menuId: 2,
          parentMenuId: 1,
          name: '공지사항',
          path: '/groupware/notice',
          description:
            '최근 공지 내용을 빠르게 확인하고 주요 업무 안내를 확인합니다.',
          permissions: {
            read: true,
            create: true,
            update: true,
            delete: true,
            excel: false,
          },
        },
      ],
    },
  ],
};

const excelHtml = `
    <style>
      .xl65 { background-color:#fff2cc; border:2px solid #1f2937; }
      .xl66 { background-color:#dbeafe; border:1px solid #2563eb; }
      .xl67 { background-color:#dcfce7; border:1px solid #16a34a; }
    </style>
  </head><body>
    <table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tbody>
        <tr>
              <td class="xl65" style="width:120px;height:28px;padding:2px 4px;">업무</td>
              <td class="xl66" style="width:160px;padding:2px 4px;">담당</td>
              <td class="xl67" style="width:140px;padding:2px 4px;">일자</td>
        </tr>
        <tr>
          <td style="padding:2px 4px;">공지 작성</td>
          <td style="padding:2px 4px;">홍길동</td>
          <td style="padding:2px 4px;">2026-09-18</td>
        </tr>
        <tr>
          <td style="padding:2px 4px;">비고</td>
          <td colspan="2" style="padding:2px 4px;">Excel 붙여넣기 검증&nbsp;<br>테스트</td>
        </tr>
      </tbody>
    </table>
  </body></html>
`;

const excelText =
  '업무\t담당\t일자\n공지 작성\t홍길동\t2026-09-18\n비고\tExcel 붙여넣기 검증\t테스트';

await fs.mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();

try {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      's-erp-auth',
      JSON.stringify({
        tenantCode: 'A001',
        userId: 'admin01',
        accessToken: 'browser-paste-verification-token',
        refreshToken: 'browser-paste-verification-refresh-token',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    );
  });

  await page.route('**/api/v1/menus/my', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ resultCode: '200', result: menuResponse }),
    });
  });

  await page.route('**/api/v1/system/modules', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        resultCode: '200',
        result: {
          resultList: [
            {
              moduleNm: '그룹웨어',
              moduleCode: 'groupware',
              iconNm: 'Groups',
              moduleUrl: '/groupware',
            },
          ],
        },
      }),
    });
  });

  await page.route(
    '**/api/v1/groupware/boards/notice/posts**',
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            resultCode: '200',
            result: { resultList: [] },
          }),
        });
        return;
      }

      await route.fallback();
    },
  );

  console.log(`Opening ${baseUrl}/groupware/notice ...`);
  await page.goto(`${baseUrl}/groupware/notice`, {
    waitUntil: 'domcontentloaded',
  });

  const openComposerButton = page.getByRole('button', { name: '새 공지 작성' });
  await openComposerButton.waitFor({ state: 'visible' });
  await openComposerButton.click();
  const editor = page.getByRole('textbox', { name: '본문' });
  await editor.waitFor({ state: 'visible' });
  await editor.click();

  await page.evaluate(
    async ({ html, text }) => {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);
    },
    { html: excelHtml, text: excelText },
  );

  await page.keyboard.press('Control+V');
  await page.waitForTimeout(100);

  const table = editor.locator('table');
  await table.waitFor({ state: 'visible' });
  const rowCount = await table.locator('tr').count();
  if (rowCount !== 3) {
    throw new Error(`표 행 수가 예상과 다릅니다: ${rowCount}`);
  }

  const firstCellStyle = await table
    .locator('td')
    .first()
    .getAttribute('style');
  const normalizedFirstCellStyle = firstCellStyle
    ?.replace(/\s/g, '')
    .toLowerCase();
  for (const value of [
    'width:120px',
    'height:28px',
    'background-color:rgb(255,242,204)',
    'border:2pxsolidrgb(31,41,55)',
  ]) {
    if (!normalizedFirstCellStyle?.includes(value)) {
      throw new Error(
        `셀 스타일이 보존되지 않았습니다: ${value}; actual=${firstCellStyle}`,
      );
    }
  }

  const cellBorders = await table
    .locator('td')
    .evaluateAll((cells) =>
      cells.map((cell) => getComputedStyle(cell).borderTopStyle),
    );
  if (cellBorders.some((borderStyle) => borderStyle === 'none')) {
    throw new Error(`셀 내부 보더가 끊겼습니다: ${cellBorders.join(', ')}`);
  }

  const cellLocator = table.locator('td');
  const cellCountBeforeResize = await cellLocator.count();
  console.log(
    `Table cells before interaction: ${cellCountBeforeResize}; html=${(await table.innerHTML()).slice(0, 1200)}`,
  );
  if (cellCountBeforeResize < 2) {
    throw new Error(`자동 폭 검증용 셀이 부족합니다: ${cellCountBeforeResize}`);
  }

  const autoSizeCell = cellLocator.nth(1);
  const autoSizeBefore = await autoSizeCell.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  await autoSizeCell.locator('p').click({ force: true });
  await page.keyboard.press('End');
  await page.keyboard.type(
    '입력에 따라 자연스럽게 넓어지는 셀 내용 확인용 긴 텍스트',
  );
  await page.waitForTimeout(100);
  const autoSizeAfter = await autoSizeCell.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  if (autoSizeAfter <= autoSizeBefore) {
    throw new Error(
      `셀 입력에 따른 자동 폭 조절이 되지 않았습니다: before=${autoSizeBefore}, after=${autoSizeAfter}`,
    );
  }

  const firstCell = table.locator('td').first();
  const cellCount = await table.locator('td').count();
  if (cellCount === 0) {
    throw new Error(
      `표 셀이 렌더링되지 않았습니다: ${await editor.locator('table').innerHTML()}`,
    );
  }
  const firstCellBox = await firstCell.boundingBox();
  if (!firstCellBox) {
    throw new Error('첫 번째 셀의 위치를 확인할 수 없습니다.');
  }

  await page.mouse.move(
    firstCellBox.x + firstCellBox.width - 1,
    firstCellBox.y + firstCellBox.height / 2,
  );
  const resizeHandle = editor.locator('.column-resize-handle').first();
  await resizeHandle.waitFor({ state: 'visible' });

  const firstColumnBefore = await table
    .locator('col')
    .first()
    .getAttribute('style');
  const resizeStartX = firstCellBox.x + firstCellBox.width - 1;
  const resizeStartY = firstCellBox.y + firstCellBox.height / 2;
  await page.mouse.move(resizeStartX, resizeStartY);
  await page.mouse.down();
  await page.mouse.move(resizeStartX + 40, resizeStartY, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(100);

  const firstColumnAfter = await table
    .locator('col')
    .first()
    .getAttribute('style');
  if (firstColumnBefore === firstColumnAfter) {
    const resizeState = await editor.evaluate((element) => ({
      columns: Array.from(element.querySelectorAll('col')).map((column) =>
        column.getAttribute('style'),
      ),
      cells: Array.from(element.querySelectorAll('td'))
        .slice(0, 3)
        .map((cell) => cell.getAttribute('colwidth')),
      html: element.innerHTML.slice(0, 2400),
    }));
    throw new Error(
      `열 너비 드래그가 반영되지 않았습니다: before=${firstColumnBefore}, after=${firstColumnAfter}, state=${JSON.stringify(resizeState)}`,
    );
  }

  const resizedCellWidth = await table
    .locator('td')
    .first()
    .getAttribute('colwidth');
  if (!resizedCellWidth) {
    throw new Error('드래그한 열 너비가 colwidth로 저장되지 않았습니다.');
  }

  const editorText = await editor.innerText();
  for (const value of [
    '업무',
    '담당',
    '공지 작성',
    '홍길동',
    '2026-09-18',
    'Excel 붙여넣기 검증',
    '테스트',
  ]) {
    if (!editorText.includes(value)) {
      throw new Error(`붙여넣기 값 누락: ${value}`);
    }
  }

  await page.screenshot({
    path: path.join(screenshotDir, '01_notice_excel_paste.png'),
    fullPage: false,
  });
  console.log('Browser Excel paste verification passed.');
  console.log(
    `Screenshot: ${path.join(screenshotDir, '01_notice_excel_paste.png')}`,
  );
} finally {
  await browser.close();
}
