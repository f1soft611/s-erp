import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';

let browser;

before(async () => {
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
});

for (const width of [375, 768, 1280]) {
  test(`keeps pinned scroll alignment at ${width}px`, async () => {
    const page = await browser.newPage({ viewport: { width, height: 720 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    try {
      await page.route('**/__f1-grid-smooth-scroll-test', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;width:100%;min-height:100%}*{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
        }),
      );
      await page.goto('http://127.0.0.1:4173/__f1-grid-smooth-scroll-test');
      await page.evaluate(async () => {
        const { default: RefreshRuntime } = await import('/@react-refresh');
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;
        const { default: React } = await import(
          '/node_modules/.vite/deps/react.js'
        );
        const { default: ReactDOM } = await import(
          '/node_modules/.vite/deps/react-dom_client.js'
        );
        const { F1Grid } = await import('/src/shared/components/f1-grid/index.ts');
        const rows = Array.from({ length: 120 }, (_, rowIndex) => {
          const row = { id: `row-${rowIndex}` };
          for (let columnIndex = 0; columnIndex < 60; columnIndex += 1) {
            row[`field${columnIndex}`] = rowIndex + columnIndex;
          }
          return row;
        });
        const columns = Array.from({ length: 60 }, (_, index) => ({
          field: `field${index}`,
          headerName: `Column ${index}`,
          width: 100,
          type: 'number',
          summaryType: 'sum',
          renderCell: ({ value }) => `Value ${value}`,
          pinned: index === 0 ? 'left' : index === 59 ? 'right' : undefined,
        }));
        window.gridCommitCount = 0;
        const grid = React.createElement(
          React.Profiler,
          {
            id: 'smooth-scroll-grid',
            onRender: () => {
              window.gridCommitCount += 1;
            },
          },
          React.createElement(F1Grid, {
            rows,
            columns,
            rowKey: 'id',
            showCheckbox: false,
            height: 480,
            virtualizeColumns: true,
            columnOverscan: 2,
            features: [{ ftype: 'summary', dock: 'bottom' }],
          }),
        );
        ReactDOM.createRoot(document.getElementById('root')).render(
          React.createElement(
            'div',
            { style: { width: '100%', height: 520 } },
            grid,
          ),
        );
      });

      const grid = page.getByRole('grid');
      await grid.waitFor();
      const bodyScroll = page.getByTestId('f1-grid-body-scroll');
      await page.waitForFunction(() => window.gridCommitCount > 0);

      const pinnedLeft = grid.getByRole('columnheader', { name: 'Column 0' });
      await page.waitForFunction(() => {
        const body = document.querySelector('[data-testid="f1-grid-body-scroll"]');
        return body && body.querySelectorAll('[data-f1-grid-row-id]').length < 40;
      });
      assert.equal(Number((await grid.getByLabel('Column 5 집계').innerText())
        .replaceAll(',', '')), 7740, 'summary must include unmounted rows');

      const pinnedRight = grid.getByRole('columnheader', { name: 'Column 59' });
      const leftInitial = await pinnedLeft.boundingBox();
      const rightInitial = await pinnedRight.boundingBox();
      assert.ok(leftInitial && rightInitial);

      const queuedScroll = await bodyScroll.evaluate((body) => {
        const header = body.parentElement.firstElementChild;
        const summary = body.parentElement
          .querySelector('[data-testid="f1-grid-summary-bottom"]').parentElement;
        body.scrollLeft = 600;
        body.dispatchEvent(new Event('scroll'));
        body.scrollLeft = 640;
        header.dispatchEvent(new Event('scroll'));
        summary.dispatchEvent(new Event('scroll'));
        const actual = body.scrollLeft;
        body.dispatchEvent(new Event('scroll'));
        return actual;
      });
      assert.equal(queuedScroll, 640, 'queued follower events must not rewind the body');

      await bodyScroll.evaluate((element) => {
        element.scrollLeft = 600;
      });
      await page.waitForFunction(() => {
        const body = document.querySelector('[data-testid="f1-grid-body-scroll"]');
        const header = document.querySelector('[role="grid"]')?.firstElementChild;
        return body && header && Math.abs(body.scrollLeft - header.scrollLeft) < 1;
      });
      await grid.getByRole('columnheader', { name: 'Column 5', exact: true }).waitFor();

      const headerColumn = await grid
        .getByRole('columnheader', { name: 'Column 5', exact: true })
        .boundingBox();
      const bodyCell = await grid
        .locator('[data-f1-grid-row-id="row-0"] [role="gridcell"]')
        .filter({ hasText: /^Value 5$/ })
        .first()
        .boundingBox();
      assert.ok(headerColumn && bodyCell);
      assert.ok(
        Math.abs(headerColumn.x - bodyCell.x) <= 1,
        `header/body column x offset differs by ${headerColumn.x - bodyCell.x}px`,
      );

      const continuous = await bodyScroll.evaluate(async (body) => {
        const grid = body.parentElement;
        const header = grid.firstElementChild;
        const summary = grid.querySelector('[data-testid="f1-grid-summary-bottom"]');
        const summaryScroll = summary.parentElement;
        const startCommits = window.gridCommitCount;
        const failures = [];
        const positions = Array.from({ length: 91 }, (_, index) => index * 12);
        for (const position of [...positions, ...positions.toReversed()]) {
          body.scrollLeft = position;
          body.dispatchEvent(new Event('scroll'));
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
          if (Math.abs(body.scrollLeft - position) > 1 ||
            Math.abs(body.scrollLeft - header.scrollLeft) > 1 ||
            Math.abs(body.scrollLeft - summaryScroll.scrollLeft) > 1) {
            failures.push(`scroll synchronization at ${position}`);
          }
          const firstRow = body.querySelector('[data-f1-grid-row-id="row-0"]');
          const cells = [...firstRow.querySelectorAll('[role="gridcell"]')];
          const bodyRect = body.getBoundingClientRect();
          for (let index = 1; index < 59; index += 1) {
            const left = bodyRect.left + index * 100 - position;
            if (left + 100 <= bodyRect.left + 100 ||
              left >= bodyRect.left + body.clientWidth - 100) continue;
            const title = grid.querySelector(`[role="columnheader"][aria-label="Column ${index}"]`);
            const cell = cells.find((item) => item.textContent === `Value ${index}`);
            const total = summary.querySelector(`[aria-label="Column ${index} 집계"]`);
            if (!title || !cell || !total) {
              failures.push(`missing viewport column ${index} at ${position}`);
            } else if (Math.abs(title.getBoundingClientRect().x - cell.getBoundingClientRect().x) > 1 ||
              Math.abs(total.getBoundingClientRect().x - cell.getBoundingClientRect().x) > 1) {
              failures.push(`column alignment ${index} at ${position}`);
            }
          }
          if (failures.length) break;
        }
        return { failures, commits: window.gridCommitCount - startCommits,
          mountedCells: body.querySelectorAll('[role="gridcell"]').length };
      });
      assert.deepEqual(continuous.failures, []);
      assert.ok(continuous.commits <= 12,
        `buffered scrolling committed too often: ${continuous.commits}`);
      assert.ok(continuous.mountedCells < 800,
        `too many mounted cells: ${continuous.mountedCells}`);

      for (const source of ['header', 'summary']) {
        const synchronized = await bodyScroll.evaluate((body, origin) => {
          const header = body.parentElement.firstElementChild;
          const summary = body.parentElement
            .querySelector('[data-testid="f1-grid-summary-bottom"]').parentElement;
          const follower = origin === 'header' ? header : summary;
          follower.scrollLeft = 400;
          follower.dispatchEvent(new Event('scroll'));
          return [body.scrollLeft, header.scrollLeft, summary.scrollLeft];
        }, source);
        assert.deepEqual(synchronized, [400, 400, 400]);
        await bodyScroll.evaluate((body) => {
          body.scrollLeft = 0;
          body.dispatchEvent(new Event('scroll'));
        });
      }

      await bodyScroll.hover();
      await page.mouse.wheel(450, 0);
      await page.waitForFunction(() =>
        document.querySelector('[data-testid="f1-grid-body-scroll"]').scrollLeft > 0);
      const wheelPosition = await bodyScroll.evaluate((body) => body.scrollLeft);
      await page.mouse.wheel(-320, 0);
      await page.waitForFunction((previous) =>
        document.querySelector('[data-testid="f1-grid-body-scroll"]').scrollLeft < previous,
      wheelPosition);

      await bodyScroll.evaluate((element) => {
        element.scrollLeft = element.scrollWidth - element.clientWidth;
        element.scrollTop = element.scrollHeight - element.clientHeight;
      });
      await grid.locator('[data-f1-grid-row-id="row-119"]').waitFor();
      await page.waitForFunction(() => {
        const body = document.querySelector('[data-testid="f1-grid-body-scroll"]');
        const header = document.querySelector('[role="grid"]')?.firstElementChild;
        return body && header && Math.abs(body.scrollLeft - header.scrollLeft) < 1;
      });

      const leftFinal = await pinnedLeft.boundingBox();
      const rightFinal = await pinnedRight.boundingBox();
      assert.ok(leftFinal && rightFinal);
      assert.ok(Math.abs(leftInitial.x - leftFinal.x) <= 1);
      assert.ok(Math.abs(rightInitial.x - rightFinal.x) <= 1);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        true,
        'the page must not overflow horizontally outside the grid scroller',
      );
      assert.deepEqual(errors, [], 'the browser must not report page errors');

      const screenshotDir =
        process.env.F1_GRID_SCREENSHOT_DIR ??
        path.resolve(
          process.cwd(),
          '..',
          'docs',
          'result',
          '20261117',
          'f1grid-horizontal-scroll',
          'screenshots',
        );
      await mkdir(screenshotDir, { recursive: true });
      await page.screenshot({
        path: path.join(screenshotDir, `pinned-scroll-${width}.png`),
      });
    } finally {
      await page.close();
    }
  });
}
