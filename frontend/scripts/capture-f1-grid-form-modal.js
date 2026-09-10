import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = (process.env.BASE_URL ?? 'http://127.0.0.1:4173').replace(
  /\/$/,
  '',
);
const screenshotDirectory = path.resolve(
  scriptDirectory,
  '../../docs/result/20260910/f1grid-tree-form-modal-plugin/screenshots',
);

const captures = [
  { fileName: 'light-1280.png', width: 1280, height: 900, theme: 'light' },
  { fileName: 'dark-1280.png', width: 1280, height: 900, theme: 'dark' },
  { fileName: 'light-768.png', width: 768, height: 900, theme: 'light' },
  { fileName: 'light-375.png', width: 375, height: 812, theme: 'light' },
];

const envelope = (result) => ({
  resultCode: '200',
  resultMessage: 'OK',
  result,
});

const menuResponse = {
  user: { userId: 'admin', roles: ['ADMIN'] },
  menus: [
    {
      menuId: 200,
      parentMenuId: null,
      name: '환경설정',
      icon: 'Settings',
      path: '/settings',
      children: [
        {
          menuId: 210,
          parentMenuId: 200,
          name: '시스템 관리',
          path: '/settings/system',
          children: [
            {
              menuId: 211,
              parentMenuId: 210,
              name: '시작',
              path: '/settings/system/start',
              permissions: { read: true },
            },
            {
              menuId: 214,
              parentMenuId: 210,
              name: 'F1-Grid 문서',
              path: '/settings/system/f1-grid-docs',
              permissions: { read: true },
            },
          ],
        },
      ],
    },
  ],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function configurePage(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      's-erp-auth',
      JSON.stringify({
        tenantCode: 'A001',
        userId: 'admin',
        accessToken: 'capture-token',
        refreshToken: 'capture-refresh-token',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    );
  });

  await page.route('**/api/v1/menus/my', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(envelope(menuResponse)),
    }),
  );
  await page.route('**/api/v1/system/modules', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        envelope({
          resultList: [
            {
              moduleId: 2,
              moduleCode: 'settings',
              moduleNm: '환경설정',
              moduleUrl: '/settings',
              iconNm: 'Settings',
              useAt: 'Y',
            },
          ],
        }),
      ),
    }),
  );
}

async function openDashboardMenuIfNeeded(page, target) {
  if (await target.isVisible()) return;

  const menuToggle = page.getByRole('button', {
    name: /^(메뉴 열기|메뉴 패널 펼치기)$/,
  });
  await menuToggle.waitFor({ state: 'visible' });
  await menuToggle.click();
  await target.waitFor({ state: 'visible' });
}

async function waitForDashboardOverlayToClear(page) {
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('.MuiBackdrop-root')).every(
      (backdrop) => {
        const style = getComputedStyle(backdrop);
        const rect = backdrop.getBoundingClientRect();

        return (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0' ||
          style.pointerEvents === 'none' ||
          rect.width === 0 ||
          rect.height === 0
        );
      },
    ),
  );
}

async function openRowFormPlayground(page) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });

  const settingsModule = page.getByRole('button', {
    name: '환경설정',
    exact: true,
  });
  await settingsModule.waitFor({ state: 'visible' });
  await settingsModule.click();

  const docsMenu = page.getByRole('treeitem', {
    name: 'F1-Grid 문서',
    exact: true,
  });
  await openDashboardMenuIfNeeded(page, docsMenu);
  await docsMenu.click();

  const visibleDashboardDrawer = page.locator('.MuiDrawer-paper:visible');
  const dashboardMenuClose = visibleDashboardDrawer
    .getByRole('button', { name: '메뉴 닫기', exact: true })
    .first();
  if (await dashboardMenuClose.isVisible()) {
    await dashboardMenuClose.focus();
    await dashboardMenuClose.press('Enter');
    await visibleDashboardDrawer.waitFor({ state: 'hidden' });
  }
  await waitForDashboardOverlayToClear(page);

  const docsNavigation = page.getByRole('navigation', {
    name: 'F1-Grid documentation',
  });
  const rowFormDocument = docsNavigation.getByRole('button', {
    name: 'Row Form Modal',
    exact: true,
  });
  if (!(await rowFormDocument.isVisible())) {
    const docsMenuButton = page.getByRole('button', {
      name: 'Open documentation menu',
    });
    await docsMenuButton.focus();
    await docsMenuButton.press('Enter');
  }
  await rowFormDocument.waitFor({ state: 'visible' });
  await rowFormDocument.click();

  await page
    .getByRole('grid', { name: 'F1-Grid row form modal example' })
    .waitFor({ state: 'visible' });
}

async function setTheme(page, theme) {
  const expectedColorScheme = theme === 'dark' ? 'dark' : 'light';
  const currentColorScheme = await page.evaluate(
    () => document.documentElement.style.colorScheme,
  );
  if (currentColorScheme === expectedColorScheme) return;

  await page.getByRole('button', { name: '테마 설정' }).click();
  const themeMenuItem = page.getByRole('menuitem', {
    name: theme === 'dark' ? '다크 테마' : '밝은 테마',
    exact: true,
  });
  await themeMenuItem.click();
  await page
    .locator('#theme-settings-menu .MuiBackdrop-root')
    .waitFor({ state: 'detached' });
  await page.waitForFunction(
    (colorScheme) => document.documentElement.style.colorScheme === colorScheme,
    expectedColorScheme,
  );
}

async function assertModalLayout(page, capture) {
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByRole('heading', { name: '기본 정보' }).waitFor();
  await dialog.getByRole('heading', { name: '운영 정보' }).waitFor();

  const metrics = await dialog.evaluate((element) => {
    const paper = element.matches('.MuiDialog-paper')
      ? element
      : element.querySelector('.MuiDialog-paper');
    const formGrid = element.querySelector('[data-testid="f1-grid-form-grid"]');
    if (!(paper instanceof HTMLElement) || !(formGrid instanceof HTMLElement)) {
      throw new Error('Dialog paper or form grid is missing');
    }

    const paperRect = paper.getBoundingClientRect();
    const fieldRects = Array.from(
      formGrid.querySelectorAll('[data-form-field="true"]'),
      (field) => field.getBoundingClientRect(),
    );
    const uniqueFieldColumns = new Set(
      fieldRects.map((rect) => Math.round(rect.left)),
    ).size;
    const gridTemplateColumns = getComputedStyle(formGrid).gridTemplateColumns;
    const computedColumnCount = gridTemplateColumns
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    return {
      computedColumnCount,
      documentScrollWidth: document.documentElement.scrollWidth,
      fullScreenClass: paper.classList.contains('MuiDialog-paperFullScreen'),
      gridTemplateColumns,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      paperRect: {
        bottom: paperRect.bottom,
        height: paperRect.height,
        left: paperRect.left,
        right: paperRect.right,
        top: paperRect.top,
        width: paperRect.width,
      },
      uniqueFieldColumns,
    };
  });

  const expectedColumns =
    capture.width >= 1200 ? 3 : capture.width >= 600 ? 2 : 1;
  const rect = metrics.paperRect;
  assert(
    rect.left >= -1 &&
      rect.top >= -1 &&
      rect.right <= metrics.innerWidth + 1 &&
      rect.bottom <= metrics.innerHeight + 1,
    `Dialog is outside the ${capture.width}px viewport: ${JSON.stringify(metrics)}`,
  );
  assert(
    metrics.documentScrollWidth <= metrics.innerWidth,
    `Document overflow at ${capture.width}px: ${JSON.stringify(metrics)}`,
  );
  assert(
    metrics.computedColumnCount === expectedColumns &&
      metrics.uniqueFieldColumns === expectedColumns,
    `Expected ${expectedColumns} form columns at ${capture.width}px: ${JSON.stringify(metrics)}`,
  );

  if (capture.width < 600) {
    const fillsViewport =
      Math.abs(rect.width - metrics.innerWidth) <= 1 &&
      Math.abs(rect.height - metrics.innerHeight) <= 1;
    assert(
      metrics.fullScreenClass || fillsViewport,
      `Mobile dialog is not fullscreen: ${JSON.stringify(metrics)}`,
    );
  }

  return metrics;
}

async function captureModal(page, capture) {
  await page.setViewportSize({ width: capture.width, height: capture.height });
  await openRowFormPlayground(page);
  await setTheme(page, capture.theme);

  const editRowButton = page.getByRole('button', {
    name: 'one 행 정보 수정',
    exact: true,
  });
  await editRowButton.focus();
  await editRowButton.press('Enter');

  const metrics = await assertModalLayout(page, capture);
  const screenshotPath = path.join(screenshotDirectory, capture.fileName);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const screenshotStat = await fs.stat(screenshotPath);
  assert(screenshotStat.size > 0, `Screenshot is blank: ${screenshotPath}`);

  console.log(
    JSON.stringify({
      capture: capture.fileName,
      columns: metrics.computedColumnCount,
      dialog: metrics.paperRect,
      gridTemplateColumns: metrics.gridTemplateColumns,
      screenshotBytes: screenshotStat.size,
    }),
  );
}

let browser;
try {
  await fs.mkdir(screenshotDirectory, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await configurePage(page);

  for (const capture of captures) {
    await captureModal(page, capture);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
}
