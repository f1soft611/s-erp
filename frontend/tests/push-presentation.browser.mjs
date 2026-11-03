import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const output = path.resolve('../docs/result/20261103/web-push/screenshots');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.route('**/__push-presentation', (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:16px;font-family:sans-serif}#preview{display:grid;gap:12px}.push-preview{display:flex;align-items:center;gap:16px;padding:16px;border:1px solid #ccc;border-radius:12px}.push-preview img{width:48px;height:48px}*{box-sizing:border-box}</style></head><body><h2>푸시 표시 미리보기 (OS 알림 화면 아님)</h2><div id="preview"></div><div id="root"></div></body></html>',
    }));
    await page.route('**/src/shared/services/notificationService.ts*', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: `
        export const listNotifications = async () => ({
          resultList: [], hasNext: false, nextBeforeNotificationId: null,
        });
        export const markNotificationRead = async (id) => ({
          notificationId: id,
          eventType: id === 14 ? 'DIRECT_MESSAGE_RECEIVED' : 'APPROVAL_COMMENT_MENTION',
          sourceType: id === 14 ? 'DIRECT_MESSAGE' : 'APPROVAL_COMMENT',
          sourceId: 82, targetId: id === 14 ? null : 29,
        });
        export const archiveNotification = async () => {};
        export const archiveReadNotifications = async () => ({ archivedCount: 0 });
      `,
    }));
    await page.goto('http://127.0.0.1:4173/__push-presentation');
    const rendered = await page.evaluate(async () => {
      const source = await fetch('/sw.js').then((response) => response.text());
      const listeners = {};
      const notifications = [];
      const worker = {
        location: { origin: window.location.origin },
        addEventListener: (name, handler) => { listeners[name] = handler; },
        registration: { showNotification: async (title, options) => {
          notifications.push({ title, ...options });
        } },
      };
      new Function('self', source)(worker);
      for (const category of ['message', 'work']) {
        let task;
        listeners.push({
          data: { json: () => ({ notificationId: 14, kind: 'notification', category }) },
          waitUntil: (promise) => { task = promise; },
        });
        await task;
      }
      for (const notification of notifications) {
        const card = document.createElement('div');
        card.className = 'push-preview';
        const image = new Image();
        image.src = notification.icon;
        image.alt = 'S-ERP';
        await image.decode();
        if (image.naturalWidth !== 256) throw new Error('S-ERP logo did not decode');
        const text = document.createElement('div');
        text.textContent = `${notification.title} — ${notification.body}`;
        card.append(image, text);
        document.querySelector('#preview').append(card);
      }
      const { default: RefreshRuntime } = await import('/@react-refresh');
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const { createRoot } = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const inboxSource = await fetch('/src/pages/groupware/notifications/NotificationInboxPage.tsx')
        .then((response) => response.text());
      const routerUrl = inboxSource.match(/from "([^"]*react-router-dom[^"]*)"/)?.[1];
      const { MemoryRouter, useLocation } = await import(routerUrl);
      const { NotificationInboxPage } = await import(
        '/src/pages/groupware/notifications/NotificationInboxPage.tsx'
      );
      const root = createRoot(document.querySelector('#root'));
      function Destination() {
        const location = useLocation();
        return React.createElement('p', { id: 'destination' },
          `${location.pathname}${location.search}`);
      }
      window.renderPushClick = (id) => root.render(React.createElement(MemoryRouter, {
        key: id, initialEntries: [`/groupware/notifications?pushNotificationId=${id}`],
      }, React.createElement(NotificationInboxPage), React.createElement(Destination)));
      return notifications.map((notification) => notification.body);
    });
    assert.deepEqual(rendered, ['새 쪽지 알림이 왔습니다.', '새 업무 알림이 왔습니다.']);
    for (const [id, destination] of [
      [14, '/groupware/messages?messageId=82'],
      [15, '/groupware/doc/write?approvalId=29'],
    ]) {
      await page.evaluate((value) => window.renderPushClick(value), id);
      await page.waitForFunction((value) =>
        document.querySelector('#destination')?.textContent === value, destination);
    }
    assert.equal(await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth), false);
    await page.screenshot({ path: path.join(output, `push-presentation-${width}.png`), fullPage: true });
    await page.close();
    console.log(`Push copy, logo and authorized click route verified at ${width}px`);
  }
} finally {
  await browser.close();
}
