import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4173';
const output = new URL(
  '../../docs/result/20261111/document-approval-actions-menu/screenshots/',
  import.meta.url,
);
const title = '결재 메뉴 확인 문서';
const shareToken = `v1.${Buffer.alloc(44, 1).toString('base64url')}`;
const document = {
  electronicApprovalId: 1,
  documentNo: 'EA-20261111-0001',
  eabusNo: '001',
  documentType: 'DRAFTING',
  documentStatus: 'PENDING',
  title,
  drafterName: '테스트 기안자',
  summary: '반응형 메뉴 확인을 위한 합성 문서입니다.',
  contentsJson: '{}',
  contentsHtml: '<p>브라우저 확인용 합성 문서입니다.</p>',
  contentsText: '브라우저 확인용 합성 문서입니다.',
  viewCount: 0,
  isDrafter: false,
  draftingWorkCategoryId: null,
  approvalLines: [{
    electronicApprovalLineId: 1,
    stageOrder: 1,
    participantOrder: 1,
    participantType: 'APPROVAL',
    participantUserId: '1',
    participantName: '테스트 결재자',
    actionStatus: 'PENDING',
  }],
  attachments: [],
  systemEvents: [],
  comments: [],
  commentCount: 0,
  hasPreviousComments: false,
  nextBeforeCommentId: null,
  createdAt: '2026-11-11T09:00:00',
};
const expectedMenuItems = [
  '승인',
  '반려',
  '보완요청',
  '문서 공유하기',
  '참조자 추가하기',
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'test',
        userId: '1',
        accessToken: 'browser-test-only',
        refreshToken: 'browser-test-only',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }));
    });
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let result = { resultList: [] };
      if (path === '/api/v1/menus/my') {
        result = {
          user: { userId: '1', name: '테스트 사용자', roles: [], roleName: 'USER' },
          menus: [{
            menuId: 1,
            parentMenuId: null,
            name: '그룹웨어',
            path: '/groupware',
            children: [{
              menuId: 2,
              parentMenuId: 1,
              name: '문서관리',
              path: '/groupware/doc',
              children: [{
                menuId: 3,
                parentMenuId: 2,
                name: '문서작성',
                path: '/groupware/doc/write',
                permissions: { read: true, create: true, update: true, delete: true, excel: false },
              }],
            }],
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
        result = { employeeId: '1', name: '테스트 사용자', departmentName: '테스트 부서' };
      } else if (path === '/api/v1/menus/favorites') {
        result = { item: { folders: [], favorites: [] } };
      } else if (path === '/api/v1/groupware/notifications/summary'
        || path === '/api/v1/groupware/messages/summary') {
        result = { unreadCount: 0 };
      } else if (path === '/api/v1/groupware/boards/notice/login-popups') {
        result = { resultList: [] };
      } else if (path.endsWith('/approvals/summary')) {
        result = {
          item: {
            actionRequiredCount: 1,
            inProgressCount: 1,
            draftCount: 0,
            completedCount: 0,
            revisionRequestedCount: 0,
            rejectedCount: 0,
            referenceConfirmationRequiredCount: 0,
            finalConfirmationRequiredCount: 0,
            notices: [],
            referenceConfirmationItems: [],
            finalConfirmationItems: [],
          },
        };
      } else if (path.endsWith('/approvals/documents/pinned')) {
        result = { resultList: [], totalRowCount: 0 };
      } else if (path.endsWith('/approvals/shared-document')) {
        result = { item: document };
      } else if (/\/approvals\/documents\/1$/.test(path)) {
        result = { item: document };
      } else if (path.endsWith('/approvals/documents')) {
        result = { resultList: [document], totalRowCount: 1 };
      } else if (/\/approvals\/1\/comments$/.test(path)) {
        result = {
          comments: [],
          systemEvents: [],
          resultCnt: 0,
          hasPrevious: false,
          nextBeforeCommentId: null,
        };
      } else if (path.endsWith('/workflow/forms/users')) {
        result = { resultList: [{ userId: '1', userNm: '테스트 사용자', departmentNm: '테스트 부서' }] };
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ resultCode: '200', resultMessage: '성공', result }),
      });
    });

    await page.goto(`${origin}/groupware/doc/write?share=${shareToken}`);
    const detail = page.getByTestId('post-detail-panel');
    await detail.getByText(title, { exact: true }).waitFor();
    const detailToolbar = detail.getByTestId('document-approval-toolbar');
    for (const label of expectedMenuItems.slice(0, 3)) {
      assert.equal(await detailToolbar.getByRole('button', { name: label, exact: true }).count(), 0);
    }
    await detailToolbar.getByRole('button', { name: '문서 더보기' }).click();
    const detailMenu = page.getByRole('menu');
    assert.deepEqual(await detailMenu.getByRole('menuitem').allTextContents(), expectedMenuItems);
    assert.equal(await detailMenu.getByRole('separator').count(), 1);
    for (const label of expectedMenuItems.slice(0, 3)) {
      assert.equal(await detailMenu.getByRole('menuitem', { name: label }).isDisabled(), false);
    }
    await page.screenshot({
      path: fileURLToPath(new URL(`detail-${width}.png`, output)),
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await detail.getByRole('button', { name: '상세 닫기' }).click();
    await detail.waitFor({ state: 'hidden' });

    await page.goto(`${origin}/groupware/doc/write`);
    await page.getByTestId('document-write-page').waitFor();
    await page.getByText(title, { exact: true }).first().waitFor();
    await page.getByRole('button', { name: '피드형 보기' }).click();
    const card = page.getByTestId('document-write-item');
    await card.getByText(title, { exact: true }).waitFor();
    const feedToolbar = card.getByTestId('document-approval-toolbar');
    for (const label of expectedMenuItems.slice(0, 3)) {
      assert.equal(await feedToolbar.getByRole('button', { name: label, exact: true }).count(), 0);
    }
    await feedToolbar.getByRole('button', { name: '문서 더보기' }).click();
    const feedMenu = page.getByRole('menu');
    assert.deepEqual(await feedMenu.getByRole('menuitem').allTextContents(), expectedMenuItems);
    assert.equal(await feedMenu.getByRole('separator').count(), 1);
    for (const label of expectedMenuItems.slice(0, 3)) {
      assert.equal(await feedMenu.getByRole('menuitem', { name: label }).isDisabled(), false);
    }
    await page.screenshot({
      path: fileURLToPath(new URL(`feed-${width}.png`, output)),
      animations: 'disabled',
    });
    assert.deepEqual(pageErrors, []);
    console.log(`${width}px: detail/feed approval menus and group separator passed`);
    await context.close();
  }
} finally {
  await browser.close();
}
