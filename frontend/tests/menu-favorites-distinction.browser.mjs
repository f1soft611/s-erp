import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const screenshotDirectory = path.resolve(
  scriptDirectory,
  '../../docs/result/20261103/favorites-item-distinction/screenshots',
);
await mkdir(screenshotDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const width of [375, 768, 1280]) {
    for (const mode of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/__favorites-distinction-test', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="root"></div></body></html>',
        }),
      );
      await page.goto('http://127.0.0.1:4173/__favorites-distinction-test');
      await page.evaluate(async (themeMode) => {
        const { default: RefreshRuntime } = await import('/@react-refresh');
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;
        const React = (await import('/node_modules/.vite/deps/react.js')).default;
        const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
        const { Box, CssBaseline, ThemeProvider } = await import('/node_modules/.vite/deps/@mui_material.js');
        const { createAppTheme } = await import('/src/theme/theme.ts');
        const { MenuFavoritesTree } = await import('/src/pages/dashboard/components/MenuFavoritesTree.tsx');
        const { DashboardMenuTree } = await import('/src/pages/dashboard/components/DashboardMenuTree.tsx');
        window.__selectedMenus = [];
        const props = {
          favorites: {
            folders: [
              { folderId: 11, folderName: '공지사항' },
              { folderId: 12, folderName: '매일 확인하는 업무와 결재 문서를 모아 놓은 긴 이름의 폴더' },
              { folderId: 13, folderName: '빈 폴더' },
            ],
            favorites: [
              { favoriteId: 25, menuId: 210, folderId: null, favoriteName: null },
              { favoriteId: 26, menuId: 212, folderId: null, favoriteName: '매일 확인하는 아주 긴 이름의 결재 현황 바로가기 메뉴' },
              { favoriteId: 27, menuId: 211, folderId: 11, favoriteName: '결재 바로가기' },
              { favoriteId: 28, menuId: 213, folderId: 12, favoriteName: '중요 공지' },
            ],
          },
          moduleItems: [{
            id: 'groupware',
            name: '그룹웨어',
            icon: null,
            tree: [
              { id: 'notice', menuId: 210, name: '공지사항', path: '/groupware/notice' },
              { id: 'approval', menuId: 211, name: '결재', path: '/groupware/approval' },
              { id: 'approval-status', menuId: 212, name: '결재 현황', path: '/groupware/approval-status' },
              { id: 'important-notice', menuId: 213, name: '중요 공지', path: '/groupware/important-notice' },
            ],
            menus: [],
          }],
          onMenuSelect: (moduleId, menuId) => window.__selectedMenus.push({ moduleId, menuId }),
          onRefresh: async () => {},
          onError: (message) => { throw new Error(message); },
        };
        ReactDOM.createRoot(document.getElementById('root')).render(
          React.createElement(
            ThemeProvider,
            { theme: createAppTheme(themeMode) },
            React.createElement(CssBaseline),
            React.createElement(
              Box,
              {
                sx: {
                  width: '100%',
                  maxWidth: 320,
                  height: '100vh',
                  bgcolor: 'background.paper',
                  borderRight: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  '--dashboard-header-height': '58px',
                },
              },
              React.createElement(MenuFavoritesTree, props),
            ),
            React.createElement(
              Box,
              {
                id: 'reference-menu-panel',
                'aria-hidden': true,
                sx: {
                  position: 'absolute',
                  left: -1000,
                  top: 0,
                  width: 320,
                  height: '100vh',
                  display: 'flex',
                  visibility: 'hidden',
                  '--dashboard-header-height': '58px',
                },
              },
              React.createElement(DashboardMenuTree, {
                selectedModule: props.moduleItems[0],
                expandedItemIds: [],
                selectedMenuId: '',
                onMenuSelect: () => {},
              }),
            ),
          ),
        );
      }, mode);

      const rootMenu = page.getByRole('treeitem', { name: '메뉴: 공지사항', exact: true });
      const folder = page.getByRole('treeitem', { name: '폴더: 공지사항', exact: true });
      await rootMenu.waitFor();
      await folder.getByTestId('FolderOutlinedIcon').waitFor();
      await folder.getByText('폴더', { exact: true }).waitFor();
      await rootMenu.getByTestId('ArticleOutlinedIcon').click();
      assert.deepEqual(await page.evaluate(() => window.__selectedMenus), [
        { moduleId: 'groupware', menuId: 'notice' },
      ]);
      await folder.getByText('공지사항', { exact: true }).click();
      assert.equal(await folder.getAttribute('aria-expanded'), 'true');
      const childMenu = page.getByRole('treeitem', { name: '메뉴: 결재 바로가기', exact: true });
      await childMenu.getByTestId('ArticleOutlinedIcon').waitFor();
      await childMenu.getByText('결재 바로가기', { exact: true }).click();
      assert.deepEqual(await page.evaluate(() => window.__selectedMenus), [
        { moduleId: 'groupware', menuId: 'notice' },
        { moduleId: 'groupware', menuId: 'approval' },
      ]);

      await folder.getByRole('button', { name: '즐겨찾기 작업: 공지사항', exact: true }).click();
      await page.getByRole('menuitem', { name: '폴더 이름 변경', exact: true }).waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => window.__selectedMenus.length), 2);
      await rootMenu.click({ button: 'right' });
      await page.getByRole('menuitem', { name: '즐겨찾기 해제', exact: true }).waitFor();
      await page.keyboard.press('Escape');
      if (await folder.getAttribute('aria-expanded') !== 'true') {
        await folder.getByText('공지사항', { exact: true }).click();
      }
      await childMenu.waitFor();

      const emptyFolder = page.getByRole('treeitem', { name: '폴더: 빈 폴더', exact: true });
      await emptyFolder.getByText('빈 폴더', { exact: true }).click();
      await page.getByText('폴더가 비어 있습니다.', { exact: true }).waitFor();
      await folder.locator(':scope > .MuiCollapse-entered').waitFor();
      await emptyFolder.locator(':scope > .MuiCollapse-entered').waitFor();
      await page.getByRole('heading', { name: /즐겨찾기/ }).click();

      const layout = await page.evaluate(() => {
        const items = [...document.querySelectorAll('[role="treeitem"]')]
          .filter((item) => !item.closest('#reference-menu-panel'));
        const content = (item) => item.querySelector(':scope > .MuiTreeItem-content');
        const folderRow = content(items.find((item) => item.getAttribute('aria-label') === '폴더: 공지사항'));
        const childRow = content(items.find((item) => item.getAttribute('aria-label') === '메뉴: 결재 바로가기'));
        const longFolder = items.find((item) => item.getAttribute('aria-label').startsWith('폴더: 매일'));
        const longMenu = items.find((item) => item.getAttribute('aria-label').startsWith('메뉴: 매일'));
        const clipped = (item) => {
          const label = item.querySelector('[title]');
          return label.scrollWidth > label.clientWidth &&
            getComputedStyle(label).textOverflow === 'ellipsis';
        };
        const actionOverlap = items.some((item) => {
          const row = content(item);
          const label = row.querySelector('[title]');
          const button = row.querySelector('button');
          const bounds = row.getBoundingClientRect();
          const buttonBounds = button.getBoundingClientRect();
          return label.getBoundingClientRect().right > buttonBounds.left ||
            buttonBounds.right > bounds.right;
        });
        const heading = [...document.querySelectorAll('h2, h6')]
          .find((element) => element.textContent.includes('즐겨찾기') && !element.closest('#reference-menu-panel'));
        const reference = document.querySelector('#reference-menu-panel');
        const referenceHeading = reference.querySelector('h2');
        const headerMetrics = (title) => {
          const header = title.parentElement;
          const style = getComputedStyle(header);
          const titleStyle = getComputedStyle(title);
          return {
            height: header.getBoundingClientRect().height,
            paddingLeft: style.paddingLeft,
            paddingRight: style.paddingRight,
            background: style.backgroundColor,
            fontSize: titleStyle.fontSize,
            fontWeight: titleStyle.fontWeight,
            letterSpacing: titleStyle.letterSpacing,
            titleCenterOffset: title.getBoundingClientRect().top +
              title.getBoundingClientRect().height / 2 -
              header.getBoundingClientRect().top,
          };
        };
        const tree = document.querySelector('[role="tree"]');
        const referenceTree = reference.querySelector('[role="tree"]');
        const rowStyle = getComputedStyle(childRow);
        const referenceRowStyle = getComputedStyle(referenceTree.querySelector('.MuiTreeItem-content'));
        return {
          headerMetrics: headerMetrics(heading),
          referenceHeaderMetrics: headerMetrics(referenceHeading),
          treeTopInset: tree.getBoundingClientRect().top + parseFloat(getComputedStyle(tree).paddingTop) -
            heading.parentElement.getBoundingClientRect().bottom,
          referenceTreeTopInset: referenceTree.getBoundingClientRect().top -
            referenceHeading.parentElement.getBoundingClientRect().bottom,
          rowMinHeight: rowStyle.minHeight,
          referenceRowMinHeight: referenceRowStyle.minHeight,
          rowFontSize: rowStyle.fontSize,
          referenceRowFontSize: referenceRowStyle.fontSize,
          pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
          treeOverflow: document.querySelector('[role="tree"]').scrollWidth >
            document.querySelector('[role="tree"]').clientWidth,
          folderBackground: getComputedStyle(folderRow).backgroundColor,
          childBackground: getComputedStyle(childRow).backgroundColor,
          folderBorder: getComputedStyle(folderRow).borderTopWidth,
          folderIconColor: getComputedStyle(folderRow.querySelector('[data-testid="FolderOutlinedIcon"]')).color,
          folderRowColor: getComputedStyle(folderRow).color,
          folderNameColor: getComputedStyle(folderRow.querySelector('[title]')).color,
          menuNameColor: getComputedStyle(childRow.querySelector('[title]')).color,
          folderNameWeight: getComputedStyle(folderRow.querySelector('[title]')).fontWeight,
          longFolderClipped: clipped(longFolder),
          longMenuClipped: clipped(longMenu),
          actionOverlap,
          overflowingElements: [...document.querySelectorAll('#root *')]
            .filter((element) => element.getBoundingClientRect().right > window.innerWidth)
            .map((element) => ({
              tag: element.tagName,
              className: element.getAttribute('class'),
              width: element.getBoundingClientRect().width,
            })),
        };
      });
      assert.equal(layout.pageOverflow, false, `Page overflow at ${width}px/${mode}: ${JSON.stringify(layout)}`);
      assert.equal(layout.treeOverflow, false, `Tree overflow at ${width}px/${mode}`);
      assert.equal(layout.folderBackground, 'rgba(0, 0, 0, 0)');
      assert.equal(layout.folderBorder, '0px');
      assert.equal(layout.folderIconColor, layout.folderRowColor);
      const menuColor = mode === 'dark' ? 'rgb(219, 234, 254)' : 'rgb(71, 85, 105)';
      assert.equal(layout.folderNameColor, menuColor);
      assert.equal(layout.menuNameColor, menuColor);
      assert.deepEqual(layout.headerMetrics, layout.referenceHeaderMetrics);
      assert.equal(layout.treeTopInset, layout.referenceTreeTopInset);
      assert.equal(layout.rowMinHeight, layout.referenceRowMinHeight);
      assert.equal(layout.rowFontSize, layout.referenceRowFontSize);
      assert.equal(layout.folderNameWeight, '400');
      assert.equal(layout.longFolderClipped, true);
      assert.equal(layout.longMenuClipped, true);
      assert.equal(layout.actionOverlap, false);
      assert.deepEqual(errors, []);
      await page.screenshot({
        path: path.join(screenshotDirectory, `favorites-${mode}-${width}px.png`),
        fullPage: true,
      });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log('Favorites distinction browser checks passed at 375/768/1280px in light and dark themes.');
