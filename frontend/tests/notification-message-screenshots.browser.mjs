import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';

const notificationService = `
  const items = [{
    notificationId: 7,
    eventType: 'APPROVAL_COMMENT_MENTION',
    sourceType: 'APPROVAL_COMMENT',
    sourceId: 81,
    targetId: 29,
    title: '문서 댓글 멘션',
    summary: '확인해 주세요',
    createdAt: '2026-10-30T09:30:00',
    readAt: null,
  }, {
    notificationId: 8,
    eventType: 'DIRECT_MESSAGE_RECEIVED',
    sourceType: 'DIRECT_MESSAGE',
    sourceId: 82,
    targetId: null,
    title: '새 쪽지 도착',
    summary: '오늘 일정을 확인해 주세요.',
    createdAt: '2026-10-30T09:31:00',
    readAt: null,
  }];
  export const getNotificationSummary = async () => ({ unreadCount: 4 });
  export const listNotifications = async () => ({
    resultList: items,
    hasNext: false,
    nextBeforeNotificationId: null,
  });
  export const markNotificationRead = async () => ({
    item: { ...items[0], readAt: '2026-10-30T09:31:00' },
  });
  export const archiveNotification = async (id) => {
    const index = items.findIndex((item) => item.notificationId === id);
    if (index >= 0) items.splice(index, 1);
    window.dispatchEvent(new Event('s-erp:notification-archived'));
  };
  export const archiveReadNotifications = async () => ({ archivedCount: 1 });
`;

const messageService = `
  const thread = {
    threadId: 31,
    subject: '일정 확인',
    updatedAt: '2026-10-30T09:30:00',
    otherUserId: 22,
    otherUserName: '홍길동',
    latestContent: '오늘 일정 확인 부탁합니다.',
    latestMessageAt: '2026-10-30T09:30:00',
    unreadCount: 1,
  };
  const message = {
    threadId: 31,
    messageId: 81,
    senderUserId: 22,
    senderUserName: '홍길동',
    recipientUserId: 11,
    recipientUserName: '나',
    subject: '일정 확인',
    content: '오늘 일정 확인 부탁합니다.',
    createdAt: '2026-10-30T09:30:00',
    readAt: null,
  };
  export const getMessageSummary = async () => 3;
  export const listMessageThreads = async () => ({
    resultList: [thread],
    hasNext: false,
    nextBeforeUpdatedAt: null,
    nextBeforeThreadId: null,
  });
  export const getThreadMessages = async (_threadId, beforeDate) => beforeDate
    ? {
      resultList: Array.from({ length: 6 }, (_, index) => ({
        ...message,
        messageId: 1000 + index,
        content: \`지난 메시지 \${index + 1}\`,
        createdAt: \`2026-10-29T15:\${String(index).padStart(2, '0')}:00\`,
        readAt: '2026-10-29T16:00:00',
      })),
      messageDate: '2026-10-29',
      hasPrevious: false,
    }
    : {
      resultList: Array.from({ length: 50 }, (_, index) => ({
        ...message,
        ...(index % 3 === 2 ? { senderUserId: 11, senderUserName: '나', recipientUserId: 22, recipientUserName: '홍길동' } : {}),
        messageId: message.messageId + index,
        content: index === 0
          ? message.content
          : index === 49
            ? \`결재 문서 공유합니다 \${window.location.origin}/groupware/doc/write?share=v1.\${'A'.repeat(59)}\\n참고 https://example.com/guide\`
            : \`메시지 \${index + 1}\`,
        createdAt: \`2026-10-30T09:\${String(index % 60).padStart(2, '0')}:00\`,
      })),
      messageDate: '2026-10-30',
      hasPrevious: true,
    };
  export const markThreadRead = async () => {};
  export const deleteThread = async () => {};
  export const createThread = async () => ({ ...message, threadId: 32 });
  export const resolveMessageThread = async () => 31;
  export const replyToThread = async () => message;
`;

for (const width of [375, 768, 1280]) {
  test(`notification and message screens render at ${width}px`, async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(8000);
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    try {
      await page.route('**/__notifications-messages-test', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>*,*::before,*::after{box-sizing:border-box}</style></head><body style="margin:0"><div id="root"></div></body></html>',
        }),
      );
      await page.route('**/src/shared/services/notificationService.ts*', (route) =>
        route.fulfill({ contentType: 'application/javascript', body: notificationService }),
      );
      await page.route('**/src/pages/groupware/messages/services/messageService.ts*', (route) =>
        route.fulfill({ contentType: 'application/javascript', body: messageService }),
      );
      await page.route('**/src/pages/groupware/documents/write/services/documentApproval.service.ts*', (route) =>
        route.fulfill({
          contentType: 'application/javascript',
          body: `export const getSharedDocumentPreview = async () => ({
            electronicApprovalId: 501, title: '11월 출장 결재', documentType: 'DRAFTING',
            drafterName: '홍길동', summary: '출장 일정과 경비 내역을 공유합니다.',
          });
          export const listDocumentApprovals = async () => [];
          export const getExternalLinkPreview = async () => ({
            siteName: 'Example', title: '업무 가이드', description: '외부 링크 OG 미리보기', imageUrl: null,
          });`,
        }),
      );
      await page.route('**/src/pages/groupware/community/notice/services/noticeLinkPreview.service.ts*', (route) =>
        route.fulfill({
          contentType: 'application/javascript',
          body: `export const resolveNoticeLinkPreview = async () => ({
            id: 1, title: '공지', subtitle: '공지', description: '',
          });`,
        }),
      );
      await page.route('**/src/pages/co/workflow/form/services/draftFormManagement.service.ts*', (route) =>
        route.fulfill({
          contentType: 'application/javascript',
          body: `export const fetchDraftFormUsers = async () => [
            { userId: '22', userNm: '홍길동', departmentNm: '영업팀', profileImage: null },
            { userId: '33', userNm: '관리자', departmentNm: '경영지원', profileImage: null },
            { userId: '44', userNm: '김철수', departmentNm: '관리팀', profileImage: null },
          ];`,
        }),
      );
      await page.goto('http://127.0.0.1:4173/__notifications-messages-test');
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
        const notificationCenterSource = await fetch(
          '/src/shared/components/NotificationCenter.tsx',
        ).then((response) => response.text());
        const routerModuleUrl = notificationCenterSource.match(
          /from "([^"]*react-router-dom[^"]*)"/,
        )?.[1];
        if (!routerModuleUrl) throw new Error('Router module URL was not found.');
        const { MemoryRouter } = await import(routerModuleUrl);
        const { NotificationProvider } = await import(
          '/src/shared/context/NotificationContext.tsx'
        );
        const { NotificationCenter } = await import(
          '/src/shared/components/NotificationCenter.tsx'
        );
        const { MessageCenter } = await import(
          '/src/shared/components/MessageCenter.tsx'
        );
        const { NotificationInboxPage } = await import(
          '/src/pages/groupware/notifications/NotificationInboxPage.tsx'
        );
        const { MessageInboxPage } = await import(
          '/src/pages/groupware/messages/MessageInboxPage.tsx'
        );
        const root = ReactDOM.createRoot(document.getElementById('root'));
        const render = (view) => {
          const content = view === 'notification-center'
            ? React.createElement(
              'header',
              { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 8 } },
              React.createElement(NotificationCenter),
              React.createElement(MessageCenter),
            )
            : view === 'notification-inbox'
              ? React.createElement(NotificationInboxPage)
              : React.createElement(
                'div',
                {
                  style: {
                    height: 'calc(100vh - 58px)',
                    width: '100%',
                    minHeight: 0,
                    display: 'flex',
                    overflow: 'hidden',
                  },
                },
                React.createElement(MessageInboxPage),
              );
          root.render(
            React.createElement(
              MemoryRouter,
              null,
              React.createElement(NotificationProvider, null, content),
            ),
          );
        };
        window.renderNotificationsMessagesView = render;
      });

      const screenshotDir = process.env.NOTIFICATIONS_MESSAGES_SCREENSHOT_DIR;
      if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
      const capture = async (name) => {
        const dimensions = await page.evaluate(() => ({
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          overflowing: Array.from(document.body.querySelectorAll('*'))
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                tag: element.tagName,
                className: typeof element.className === 'string' ? element.className : '',
                text: element.textContent?.trim().slice(0, 40),
                left: rect.left,
                right: rect.right,
                width: rect.width,
              };
            })
            .filter((element) => element.right > window.innerWidth + 1),
        }));
        assert.ok(dimensions.document <= dimensions.viewport, JSON.stringify(dimensions));
        if (screenshotDir) {
          await page.screenshot({
            path: path.join(screenshotDir, `${name}-${width}.png`),
            fullPage: true,
          });
        }
      };

      await page.evaluate(() => new Promise((resolve) => {
        window.renderNotificationsMessagesView('notification-center');
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }));
      const notificationButton = page.getByRole('button', { name: 'notifications' });
      await notificationButton.waitFor();
      assert.equal(await page.getByText('3').count(), 1);
      assert.equal(await page.getByText('4').count(), 1);
      const badgeSizes = await page.locator('.MuiBadge-badge').evaluateAll((badges) =>
        badges.map((badge) => {
          const rect = badge.getBoundingClientRect();
          return { height: rect.height, fontSize: parseFloat(getComputedStyle(badge).fontSize) };
        }));
      assert.equal(badgeSizes.length, 2);
      for (const size of badgeSizes) {
        assert.ok(size.height <= 16 && size.fontSize <= 10, JSON.stringify(size));
      }
      await notificationButton.click();
      await page.getByText('문서 댓글 멘션').waitFor();
      await page.waitForFunction(() => {
        const paper = document.querySelector('.MuiPopover-paper');
        return paper !== null && getComputedStyle(paper).opacity === '1';
      });
      await capture('notification-popover');

      await page.evaluate(() => new Promise((resolve) => {
        window.renderNotificationsMessagesView('notification-inbox');
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }));
      await page.getByRole('heading', { name: '알림함' }).waitFor();
      await page.getByText('문서 댓글 멘션').waitFor();
      await page.getByText('새 쪽지 도착').waitFor();
      await page.getByRole('img', { name: '문서 멘션' }).waitFor();
      await page.getByRole('img', { name: '새 쪽지' }).waitFor();
      const leadingTypeIcons = await page.getByRole('img').evaluateAll((icons) =>
        icons.map((icon) => icon.closest('[role="button"]')?.firstElementChild === icon));
      assert.deepEqual(leadingTypeIcons, [true, true]);
      await page.getByRole('button', { name: '알림 숨기기: 새 쪽지 도착' }).waitFor();
      await capture('notification-inbox');
      const typeFilter = page.getByRole('group', { name: '알림 구분' });
      await typeFilter.getByRole('button', { name: '문서 멘션' }).click();
      await page.getByRole('button', { name: '읽은 알림 정리' }).click();
      await page.getByRole('dialog', { name: '읽은 알림 정리' }).waitFor();
      await page.getByRole('button', { name: '취소' }).click();
      await page.getByRole('button', { name: '알림 숨기기: 새 쪽지 도착' }).click();
      await page.getByText('새 쪽지 도착').waitFor({ state: 'detached' });

      await page.evaluate(() => new Promise((resolve) => {
        window.renderNotificationsMessagesView('message-inbox');
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }));
      await page.getByRole('heading', { name: '쪽지함' }).waitFor();
      const composeButton = page.getByRole('button', { name: '새 쪽지' });
      const composeButtonHeight = await composeButton.evaluate(
        (element) => element.getBoundingClientRect().height,
      );
      assert.ok(composeButtonHeight <= 44, `compose button height was ${composeButtonHeight}px`);
      const thread = page.getByRole('button', { name: /홍길동 일정 확인/ });
      await thread.waitFor();
      await capture('message-inbox');
      await thread.click();
      await page.getByText('오늘 일정 확인 부탁합니다.').last().waitFor();
      const layout = await page.evaluate(() => {
        const shell = document.querySelector('[data-testid="message-inbox-shell"]');
        const list = document.querySelector('[data-testid="message-thread-list-panel"]');
        const detail = document.querySelector('[data-testid="message-detail-panel"]');
        const chat = document.querySelector('[data-testid="message-chat-view"]');
        const reply = document.querySelector('[data-testid="message-reply-form"]');
        if (!shell || !list || !detail || !chat || !reply) {
          throw new Error('Message layout elements were not found.');
        }
        return {
          viewportHeight: window.innerHeight,
          documentHeight: document.documentElement.scrollHeight,
          shell: shell.getBoundingClientRect().toJSON(),
          detail: detail.getBoundingClientRect().toJSON(),
          chat: chat.getBoundingClientRect().toJSON(),
          reply: reply.getBoundingClientRect().toJSON(),
          listOverflow: getComputedStyle(list).overflowY,
          chatOverflow: getComputedStyle(chat).overflowY,
          chatScrollHeight: chat.scrollHeight,
          chatClientHeight: chat.clientHeight,
        };
      });
      assert.ok(
        layout.documentHeight <= layout.viewportHeight + 1,
        `message page scrolled vertically: ${JSON.stringify(layout)}`,
      );
      assert.ok(
        layout.reply.bottom <= layout.detail.bottom + 1
          && layout.chat.bottom <= layout.reply.top + 1,
        `reply form was pushed outside the chat panel: ${JSON.stringify(layout)}`,
      );
      assert.equal(layout.listOverflow, 'auto');
      assert.equal(layout.chatOverflow, 'auto');
      assert.ok(
        layout.chatScrollHeight > layout.chatClientHeight,
        `message history did not overflow internally: ${JSON.stringify(layout)}`,
      );
      assert.equal(
        await page.getByRole('button', { name: '전송' }).isVisible(),
        true,
      );
      const chatLayout = await page.evaluate(() => {
        const chat = document.querySelector('[data-testid="message-chat-view"]').getBoundingClientRect();
        const sent = document.querySelector('[data-chat-direction="sent"] [data-testid="chat-bubble"]');
        const received = document.querySelector('[data-chat-direction="received"] [data-testid="chat-bubble"]');
        const textarea = document.querySelector('textarea[aria-label="답장"]').getBoundingClientRect();
        const send = [...document.querySelectorAll('button')].find((button) => button.textContent === '전송')
          .getBoundingClientRect();
        return {
          chatLeft: chat.left,
          chatRight: chat.right,
          sentRight: sent.getBoundingClientRect().right,
          receivedLeft: received.getBoundingClientRect().left,
          sentBackground: getComputedStyle(sent).backgroundColor,
          textareaBottom: textarea.bottom,
          sendTop: send.top,
          sendRight: send.right,
          textareaRight: textarea.right,
        };
      });
      assert.ok(chatLayout.sentRight > chatLayout.chatRight - 48, `sent bubble not right aligned: ${JSON.stringify(chatLayout)}`);
      assert.ok(chatLayout.receivedLeft < chatLayout.chatLeft + 80, `received bubble not left aligned: ${JSON.stringify(chatLayout)}`);
      assert.notEqual(chatLayout.sentBackground, 'rgb(254, 229, 0)');
      assert.ok(chatLayout.sendTop >= chatLayout.textareaBottom - 1, `send button not below input: ${JSON.stringify(chatLayout)}`);
      assert.ok(Math.abs(chatLayout.sendRight - chatLayout.textareaRight) <= 16, `send button not at right: ${JSON.stringify(chatLayout)}`);
      await capture('message-detail');
      await capture('message-layout');
      await page.getByRole('button', { name: '문서 상세 열기: 11월 출장 결재' }).waitFor();
      await page.getByRole('link', { name: '외부 링크 열기: 업무 가이드' }).waitFor();
      assert.equal(await page.getByRole('link', { name: 'https://example.com/guide' }).getAttribute('target'), '_blank');
      const linkPreviewScroll = await page.getByTestId('message-chat-view').evaluate((element) => ({
        gap: element.scrollHeight - element.scrollTop - element.clientHeight,
      }));
      assert.ok(linkPreviewScroll.gap <= 2, `chat did not stay at bottom after previews loaded: ${JSON.stringify(linkPreviewScroll)}`);
      await capture('message-link-preview');
      assert.equal(await page.getByRole('button', { name: '받은함' }).count(), 0);
      assert.equal(await page.getByRole('button', { name: '보낸함' }).count(), 0);
      assert.equal(await page.getByTestId('message-detail-avatar').textContent(), '홍');
      const chatScroller = page.getByTestId('message-chat-view');
      await chatScroller.evaluate((element) => { element.scrollTop = 0; });
      await page.getByText('지난 메시지 6').waitFor();
      const previousDay = await chatScroller.evaluate((element) => {
        const dividers = element.querySelectorAll('[data-testid="chat-date-divider"]').length;
        const anchor = [...element.querySelectorAll('[data-testid="chat-bubble"]')]
          .find((bubble) => bubble.textContent === '오늘 일정 확인 부탁합니다.');
        return {
          dividers,
          scrollTop: element.scrollTop,
          anchorOffset: anchor.getBoundingClientRect().top - element.getBoundingClientRect().top,
        };
      });
      assert.equal(previousDay.dividers, 2);
      assert.ok(previousDay.scrollTop > 0, `scroll jumped to the top after loading the previous day: ${JSON.stringify(previousDay)}`);
      assert.ok(previousDay.anchorOffset >= -8 && previousDay.anchorOffset < 160,
        `today's first message moved away after prepending: ${JSON.stringify(previousDay)}`);
      await chatScroller.evaluate((element) => { element.scrollTop = 0; });
      await capture('message-previous-day');
      await page.getByRole('button', { name: '대화방 삭제' }).click();
      const deleteDialog = page.getByRole('dialog', { name: '대화방 삭제' });
      await deleteDialog.waitFor();
      await page.waitForFunction(() => {
        const container = document.querySelector('.MuiDialog-container');
        return container !== null && getComputedStyle(container).opacity === '1';
      });
      assert.deepEqual(
        await deleteDialog.getByTestId('common-dialog-actions').locator('button').allTextContents(),
        ['삭제', '취소'],
      );
      await capture('message-delete-confirm');
      await deleteDialog.getByRole('button', { name: '취소' }).click();
      await deleteDialog.waitFor({ state: 'detached' });
      await composeButton.click();
      const composeDialog = page.getByRole('dialog', { name: '새 쪽지' });
      await composeDialog.waitFor();
      await page.waitForFunction(() => {
        const container = document.querySelector('.MuiDialog-container');
        return container !== null && getComputedStyle(container).opacity === '1';
      });
      const actionLabels = await composeDialog
        .getByTestId('common-dialog-actions')
        .locator('button')
        .allTextContents();
      assert.deepEqual(actionLabels, ['보내기', '취소']);
      await capture('message-compose');
      const recipientInput = composeDialog.getByRole('combobox', { name: /받는 사람/ });
      await recipientInput.click();
      await recipientInput.fill('관리');
      const recipientOptions = page.getByRole('option');
      await page.waitForFunction(() => document.querySelectorAll('[role="option"]').length === 2);
      assert.deepEqual(
        (await recipientOptions.allTextContents()).map((text) => text.replace(/\s+/g, '')),
        ['관관리자경영지원', '김김철수관리팀'],
      );
      await capture('message-compose-recipient-search');
      assert.deepEqual(pageErrors, []);
    } finally {
      await browser.close();
    }
  });
}
