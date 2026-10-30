import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4173';
const screenshotDirectory = new URL(
  '../../docs/result/20261030/document-reference-addition/screenshots/',
  import.meta.url,
);
await mkdir(screenshotDirectory, { recursive: true });

const baseLines = [{
  electronicApprovalLineId: 1,
  stageOrder: 1,
  participantOrder: 1,
  participantType: 'REFERENCE',
  participantUserId: 'ref-existing',
  participantName: '기존 참조자',
  participantDepartmentName: '기획팀',
  actionStatus: 'WAITING',
  pendingAt: null,
  actionAt: null,
  actionComment: null,
}];
const activeUsers = [
  {
    userId: 'ref-existing',
    loginId: 1,
    userNm: '기존 참조자',
    departmentNm: '기획팀',
    profileImage: null,
    levelNm: null,
  },
  {
    userId: 'ref-new-a',
    loginId: 2,
    userNm: '새 참조자 A',
    departmentNm: '운영팀',
    profileImage: null,
    levelNm: null,
  },
  {
    userId: 'ref-new-b',
    loginId: 3,
    userNm: '새 참조자 B',
    departmentNm: '관리팀',
    profileImage: null,
    levelNm: null,
  },
];
const eventContent = 'Preview User님이 참조자(새 참조자 A, 새 참조자 B)를 추가했습니다.';
const browser = await chromium.launch({ headless: true });

try {
  for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    const pageErrors = [];
    let additionSaved = false;
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'test',
        userId: 'reference-add-preview',
        accessToken: 'browser-test-only',
        refreshToken: 'browser-test-only',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }));
    });
    await page.route('**/__document-reference-addition-test', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>*,*::before,*::after{box-sizing:border-box}</style></head><body style="margin:0"><div id="root"></div></body></html>',
      }),
    );
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const pathname = url.pathname;
      let result = {};
      if (pathname === '/api/v1/users/me/profile') {
        result = { employeeId: 'drafter-1', name: 'Preview User' };
      } else if (pathname === '/api/v1/co/workflow/forms/users') {
        result = { resultList: activeUsers };
      } else if (pathname === '/api/v1/groupware/approvals/42/references'
        && request.method() === 'POST') {
        assert.deepEqual(request.postDataJSON(), {
          participantUserIds: ['ref-new-a', 'ref-new-b'],
        });
        additionSaved = true;
        result = { item: { electronicApprovalId: 42, addedCount: 2 } };
      } else if (pathname === '/api/v1/groupware/approvals/documents/42') {
        result = {
          item: {
            electronicApprovalId: 42,
            documentNo: 'EA-20261030-0042',
            eabusNo: '001',
            documentType: 'DRAFTING',
            documentStatus: 'PENDING',
            title: '참조 추가 미리보기',
            drafterName: 'Preview User',
            summary: '합성 데이터 문서',
            viewCount: 1,
            isDrafter: true,
            draftingWorkCategoryId: null,
            contentsJson: '{}',
            contentsHtml: '<p>합성 데이터 본문</p>',
            approvalLines: additionSaved
              ? [
                  ...baseLines,
                  {
                    ...baseLines[0],
                    electronicApprovalLineId: 2,
                    participantOrder: 2,
                    participantUserId: 'ref-new-a',
                    participantName: '새 참조자 A',
                    participantDepartmentName: '운영팀',
                  },
                  {
                    ...baseLines[0],
                    electronicApprovalLineId: 3,
                    participantOrder: 3,
                    participantUserId: 'ref-new-b',
                    participantName: '새 참조자 B',
                    participantDepartmentName: '관리팀',
                  },
                ]
              : baseLines,
            attachments: [],
            systemEvents: [],
          },
        };
      } else if (pathname === '/api/v1/groupware/approvals/42/comments') {
        result = {
          comments: [],
          systemEvents: additionSaved
            ? [{
                commentId: 88,
                ownerId: 42,
                commentType: 'SYSTEM',
                eventType: 'REFERENCE_ADDED',
                content: eventContent,
                writerName: 'Preview User',
                createdAt: '2026-10-30T10:00:00Z',
              }]
            : [],
          hasPrevious: false,
          nextBeforeCommentId: null,
          resultCnt: 0,
        };
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          resultCode: '200',
          resultMessage: '성공',
          result,
        }),
      });
    });

    await page.goto(`${origin}/__document-reference-addition-test`);
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
      const { DocumentApprovalDetailFeed } = await import(
        '/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx'
      );
      const { NotificationProvider } = await import(
        '/src/shared/context/NotificationContext.tsx'
      );
      ReactDOM.createRoot(document.getElementById('root')).render(
        React.createElement(
          NotificationProvider,
          null,
          React.createElement(DocumentApprovalDetailFeed, {
            open: true,
            electronicApprovalId: 42,
            onClose: () => {},
            onActionComplete: () => {},
            onEditDocument: () => {},
            detailRefreshToken: 0,
          }),
        ),
      );
    });

    await page.getByRole('heading', { name: '문서 상세' }).waitFor();
    await page.getByRole('button', { name: '문서 더보기' }).click();
    await page.getByRole('menuitem', { name: '참조자 추가하기' }).click();
    const dialog = page.getByRole('dialog', { name: '참조자 추가' });
    const picker = dialog.getByRole('combobox', { name: '참조자 선택' });
    await picker.click();
    const listbox = page.getByRole('listbox');
    assert.equal(
      await listbox.getByRole('option', { name: /기존 참조자/ }).count(),
      0,
    );
    await listbox.getByRole('option', { name: /새 참조자 A/ }).click();
    await picker.click();
    const reopenedListbox = page.getByRole('listbox');
    await reopenedListbox.getByRole('option', { name: /새 참조자 B/ }).click();
    const dialogBounds = await dialog.boundingBox();
    assert.ok(dialogBounds && dialogBounds.x >= 0);
    assert.ok(dialogBounds.x + dialogBounds.width <= width + 1);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`reference-add-dialog-${width}.png`, screenshotDirectory)),
      fullPage: true,
    });

    await dialog.getByRole('button', { name: '참조자 추가', exact: true }).click();
    await page.getByText(eventContent, { exact: true }).waitFor();
    await page.getByText('새 참조자 A', { exact: true }).waitFor();
    assert.deepEqual(pageErrors, []);
    await context.close();
  }
} finally {
  await browser.close();
}
