import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4173';
const output = new URL(
  '../../docs/result/20261029/document-reference-confirmation/screenshots/',
  import.meta.url,
);
await mkdir(output, { recursive: true });

const permissions = {
  read: true,
  create: true,
  update: true,
  delete: true,
  excel: false,
};
const documentId = 41;
let confirmed = false;
let confirmationCalls = 0;
const documentDetail = () => ({
  electronicApprovalId: documentId,
  documentNo: 'EA-20261029-0041',
  eabusNo: '001',
  documentType: 'DRAFTING',
  documentStatus: 'PENDING',
  title: '참조 확인 브라우저 검증',
  drafterName: '검증 기안자',
  summary: '참조 확인 동작 및 시스템 이력 확인',
  contentsJson: '{}',
  contentsHtml: '<p>브라우저 확인 테스트 문서</p>',
  viewCount: 1,
  isDrafter: false,
  draftingWorkCategoryId: null,
  approvalLines: [{
    electronicApprovalLineId: 71,
    stageOrder: 1,
    participantOrder: 1,
    participantType: 'REFERENCE',
    participantUserId: 'emp-1',
    participantName: '검증 참조자',
    actionStatus: confirmed ? 'CONFIRMED' : 'WAITING',
    actionAt: confirmed ? '2026-10-29T02:00:00Z' : null,
  }],
  attachments: [],
  systemEvents: confirmed ? [{
    commentId: 81,
    commentType: 'SYSTEM',
    ownerId: documentId,
    eventType: 'REFERENCE_CONFIRMED',
    content: '문서를 확인했습니다.',
    writerName: '검증 참조자',
    createdAt: '2026-10-29T02:00:00Z',
  }] : [],
});

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280]) {
    confirmed = false;
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text());
    });
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'browser-test',
        userId: 'reference-user',
        accessToken: 'browser-test-only',
        refreshToken: 'browser-test-only',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }));
    });
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      let result = { resultList: [] };
      if (path === '/api/v1/menus/my') {
        result = {
          user: {
            userId: 'reference-user',
            name: '검증 참조자',
            roles: [],
            roleName: 'USER',
          },
          menus: [{
            menuId: 1,
            parentMenuId: null,
            name: '그룹웨어',
            path: '/groupware',
            children: [
              {
                menuId: 2,
                parentMenuId: 1,
                name: '종합현황',
                path: '/groupware/overview',
                permissions,
              },
              {
                menuId: 3,
                parentMenuId: 1,
                name: '문서작성',
                path: '/groupware/doc/write',
                permissions,
              },
            ],
          }],
        };
      } else if (path === '/api/v1/system/modules') {
        result = {
          resultList: [{
            moduleId: 1,
            moduleCode: 'groupware',
            moduleNm: '그룹웨어',
            moduleUrl: '/groupware',
            iconNm: 'Groups',
            useAt: 'Y',
          }],
        };
      } else if (path === '/api/v1/users/me/profile') {
        result = {
          employeeId: 'emp-1',
          name: '검증 참조자',
          departmentName: '검증 부서',
        };
      } else if (path === '/api/v1/dashboard/overview') {
        result = {
          item: {
            asOfDate: '2026-10-29',
            fetchedAt: '2026-10-29T11:00:00+09:00',
            canReadApprovals: true,
            canReadNotices: false,
            canReadSales: false,
            approvalPath: '/groupware/doc/write',
            approvalStatus: 'ready',
            noticeStatus: 'forbidden',
            approval: {
              actionRequiredCount: 0,
              draftCount: 0,
              revisionRequestedCount: 0,
              referenceConfirmationRequiredCount: confirmed ? 0 : 1,
              referenceConfirmationItems: confirmed ? [] : [{
                electronicApprovalId: documentId,
                title: '참조 확인 브라우저 검증',
              }],
              notices: [],
            },
            notices: [],
          },
        };
      } else if (path === `/api/v1/groupware/approvals/documents/${documentId}`) {
        result = { item: documentDetail() };
      } else if (path === `/api/v1/groupware/approvals/${documentId}/comments`) {
        result = {
          comments: [],
          systemEvents: documentDetail().systemEvents,
          resultCnt: 0,
          hasPrevious: false,
          nextBeforeCommentId: null,
        };
      } else if (
        path === `/api/v1/groupware/approvals/${documentId}/reference-confirmation`
        && request.method() === 'POST'
      ) {
        confirmationCalls += 1;
        const requestBody = request.postDataJSON();
        assert.deepEqual(requestBody, {});
        confirmed = true;
        result = {
          item: {
            electronicApprovalId: documentId,
            actionStatus: 'CONFIRMED',
            actionAt: '2026-10-29T02:00:00Z',
          },
          message: '문서를 확인했습니다.',
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

    await page.goto(`${origin}/groupware/overview`);
    const referencePanel = page.getByRole('region', { name: '내가 확인할 문서' });
    try {
      await referencePanel.getByText('참조 확인 브라우저 검증').waitFor({ timeout: 10000 });
    } catch (error) {
      console.error(`Browser state at ${width}px: ${page.url()}`);
      console.error((await page.locator('body').innerText()).slice(0, 2000));
      throw error;
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    assert.equal(overflow, false, `horizontal page overflow at ${width}px`);
    await referencePanel.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: fileURLToPath(new URL(`overview-${width}.png`, output)),
      fullPage: false,
    });

    await referencePanel.getByText('참조 확인 브라우저 검증').click();
    const confirmButton = page.getByRole('button', { name: '확인', exact: true });
    await confirmButton.waitFor();
    await page.screenshot({
      path: fileURLToPath(new URL(`detail-${width}.png`, output)),
      fullPage: true,
    });
    await confirmButton.click();
    await page.getByText('참조 확인', { exact: true }).waitFor();
    await page.getByText('문서를 확인했습니다.').waitFor();
    await page.getByText('확인할 문서가 없습니다.').waitFor();
    assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
    assert.equal(confirmationCalls, width === 375 ? 1 : width === 768 ? 2 : 3);
    await context.close();
  }
} finally {
  await browser.close();
}
