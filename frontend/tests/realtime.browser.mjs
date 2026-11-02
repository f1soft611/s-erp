import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const screenshots = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../docs/result/20261102/notification-message-realtime/screenshots');
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const streams = [];
    let updated = false;
    let notificationVersion = 1;
    const messages = Array.from({ length: 35 }, (_, index) => ({
      threadId: 31, messageId: index + 1, senderUserId: index % 2 ? 11 : 22,
      senderUserName: '검증 사용자', recipientUserId: index % 2 ? 22 : 11,
      recipientUserName: '검증 수신자', subject: '실시간 검증 대화',
      content: `기존 대화 ${index + 1}`, createdAt: `2026-11-02T09:${String(index).padStart(2, '0')}:00`,
      readAt: '2026-11-02T10:00:00',
    }));
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'TEST', userId: 'test', accessToken: 'test-token', refreshToken: '',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }));
    });
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      let result = { resultList: [], item: null, hasNext: false, nextBeforeNotificationId: null };
      if (url.pathname === '/api/v1/groupware/realtime') {
        assert.ok(route.request().headers().authorization);
        assert.equal(url.search, '');
        const body = await new Promise((resolve) => streams.push(resolve));
        if (!page.isClosed()) await route.fulfill({ contentType: 'text/event-stream', body }).catch(() => {});
        return;
      }
      if (url.pathname === '/api/v1/menus/my') {
        result = { user: { userId: 'test', name: '검증', roles: [] }, menus: [{
          menuId: 1, name: '그룹웨어', path: '/groupware', children: [
            { menuId: 2, name: '종합현황', path: '/groupware/overview', children: [], permissions: { read: true } },
          ],
        }] };
      } else if (url.pathname.includes('favorites')) {
        result = { item: { folders: [], favorites: [] } };
      } else if (url.pathname === '/api/v1/groupware/messages/threads') {
        result = { resultList: [{
          threadId: 31, subject: '실시간 검증 대화', otherUserId: 22, otherUserName: '검증 상대',
          updatedAt: '2026-11-02T10:00:00', latestMessageAt: '2026-11-02T10:00:00',
          latestContent: updated ? '새 실시간 메시지' : '기존 대화', unreadCount: updated ? 1 : 0,
        }], hasNext: false, nextBeforeUpdatedAt: null, nextBeforeThreadId: null };
      } else if (url.pathname === '/api/v1/groupware/messages/threads/31') {
        result = { resultList: messages, messageDate: '2026-11-02', hasPrevious: false };
      } else if (url.pathname.endsWith('/summary')) {
        result = { unreadCount: url.pathname.includes('/notifications/') ? (updated ? 7 : 1) : 0 };
      } else if (url.pathname === '/api/v1/groupware/notifications') {
        result = { resultList: [{
          notificationId: notificationVersion, eventType: 'APPROVAL_COMMENT_MENTION',
          sourceType: 'APPROVAL_COMMENT', sourceId: 81, targetId: 29,
          title: `실시간 알림 ${notificationVersion}`, summary: '변경 신호 뒤 권한 API로 재조회한 내용',
          createdAt: '2026-11-02T10:00:00', readAt: null,
        }], hasNext: false, nextBeforeNotificationId: null };
      }
      await route.fulfill({ contentType: 'application/json',
        body: JSON.stringify({ resultCode: '200', resultMessage: 'OK', result }) });
    });
    const emit = async (body) => {
      const deadline = Date.now() + 12000;
      while (!streams.length && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
      assert.ok(streams.length, 'SSE reconnect did not arrive');
      streams.shift()(body);
    };
    const change = 'event: change\ndata: {"area":"MESSAGE"}\n\nevent: change\ndata: {"area":"NOTIFICATION"}\n\n';
    await page.goto('http://127.0.0.1:4173/groupware/messages');
    await page.getByRole('button', { name: /검증 상대/ }).click();
    await page.getByText('기존 대화 35', { exact: true }).waitFor();
    await emit('event: ready\ndata: {}\n\n');
    await page.getByLabel('답장', { exact: true }).fill('보존할 미전송 답장');
    const chat = page.getByTestId('message-chat-view');
    await chat.evaluate((element) => { element.scrollTop = 100; element.dispatchEvent(new Event('scroll', { bubbles: true })); });
    updated = true;
    messages.push({ ...messages[0], messageId: 100, content: '새 실시간 메시지', createdAt: '2026-11-02T10:01:00' });
    await emit(change);
    await chat.getByText('새 실시간 메시지', { exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('[aria-label="notifications"]')?.textContent?.includes('7'));
    assert.equal(await page.getByLabel('답장', { exact: true }).inputValue(), '보존할 미전송 답장');
    assert.ok(Math.abs(await chat.evaluate((element) => element.scrollTop) - 100) <= 2);
    assert.equal(await page.getByRole('progressbar').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const reply = await page.getByTestId('message-reply-form').boundingBox();
    assert.ok(reply && reply.x >= 0 && reply.x + reply.width <= width + 1 && reply.y + reply.height <= 900);
    await page.screenshot({ path: path.join(screenshots, `realtime-chat-${width}px.png`), fullPage: true });

    await page.getByRole('button', { name: 'notifications', exact: true }).click();
    await page.getByText('실시간 알림 1', { exact: true }).waitFor();
    notificationVersion = 2;
    await emit(change);
    await page.getByText('실시간 알림 2', { exact: true }).waitFor();
    assert.equal(await page.getByRole('progressbar').count(), 0);
    await page.screenshot({ path: path.join(screenshots, `realtime-notifications-${width}px.png`), fullPage: true });
    await page.getByRole('button', { name: '알림함 더보기' }).click();
    await page.getByText('실시간 알림 2', { exact: true }).waitFor();
    notificationVersion = 3;
    await emit(change);
    await page.getByText('실시간 알림 3', { exact: true }).waitFor();
    assert.equal(await page.getByRole('progressbar').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await page.close();
    streams.splice(0).forEach((resolve) => resolve(''));
  }
} finally {
  await browser.close();
}
console.log('Realtime fetch SSE, reconnect, badges, popover/inbox, draft and scroll checks passed at 375/768/1280px.');
