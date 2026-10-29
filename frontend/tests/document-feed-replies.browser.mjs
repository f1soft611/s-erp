import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4173';
const output = new URL('../../docs/result/20261029/document-feed-replies/screenshots/', import.meta.url);
await mkdir(output, { recursive: true });

const comments = [
  { commentId: 101, content: '<p>상위 댓글은 그대로 표시됩니다.</p>' },
  { commentId: 102, parentCommentId: 101, content: '<p>기본 접힘 답글입니다.</p>' },
].map((comment) => ({
  ...comment,
  ownerId: 1,
  commentType: 'USER',
  writerName: '검증 작성자',
  writerId: 'reply-test',
  attachments: [],
}));
const document = {
  electronicApprovalId: 1,
  documentNo: 'EA-20261029-0001',
  eabusNo: '001',
  documentType: 'DRAFTING',
  documentStatus: 'COMPLETED',
  title: '피드 답글 기본 접힘 확인',
  drafterName: '검증 작성자',
  summary: '댓글은 유지하고 답글만 접습니다.',
  contentsHtml: '<p>문서 본문</p>',
  contentsText: '문서 본문',
  contentsJson: '{}',
  createdAt: '2026-10-29T09:00:00',
  viewCount: 0,
  isDrafter: false,
  draftingWorkCategoryId: null,
  approvalLines: [],
  attachments: [],
  systemEvents: [],
  comments,
  commentCount: 1,
  hasPreviousComments: false,
  nextBeforeCommentId: null,
};
const permissions = { read: true, create: true, update: true, delete: true, excel: false };
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'test',
        userId: 'reply-test',
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
          user: { userId: 'reply-test', name: '검증 작성자', roles: [], roleName: 'USER' },
          menus: [{
            menuId: 1, parentMenuId: null, name: '그룹웨어', path: '/groupware',
            children: [{
              menuId: 2, parentMenuId: 1, name: '문서관리', path: '/groupware/doc',
              children: [{
                menuId: 3, parentMenuId: 2, name: '문서작성',
                path: '/groupware/doc/write', permissions,
              }],
            }],
          }],
        };
      } else if (path === '/api/v1/system/modules') {
        result = { resultList: [{
          moduleId: 1, moduleCode: 'groupware', moduleNm: '그룹웨어',
          moduleUrl: '/groupware', iconNm: 'Groups', useAt: 'Y',
        }] };
      } else if (path === '/api/v1/users/me/profile') {
        result = { employeeId: 'emp-1', name: '검증 작성자', departmentName: '검증 부서' };
      } else if (path.endsWith('/approvals/summary')) {
        result = { item: {
          actionRequiredCount: 0, inProgressCount: 0, draftCount: 0,
          completedCount: 1, revisionRequestedCount: 0, rejectedCount: 0,
          referenceConfirmationRequiredCount: 0, referenceConfirmationItems: [], notices: [],
        } };
      } else if (path.endsWith('/approvals/documents/pinned')) {
        result = { resultList: [], totalRowCount: 0 };
      } else if (path.endsWith('/approvals/documents')) {
        result = { resultList: [document], totalRowCount: 1 };
      } else if (path.endsWith('/approvals/documents/1')) {
        result = { item: document };
      } else if (path.endsWith('/approvals/1/comments')) {
        result = {
          comments, systemEvents: [], resultCnt: 1,
          hasPrevious: false, nextBeforeCommentId: null,
        };
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ resultCode: '200', resultMessage: '성공', result }),
      });
    });
    await page.goto(`${origin}/groupware/doc/write`);
    await page.getByRole('button', { name: '피드형 보기' }).click();
    const card = page.getByTestId('document-write-item');
    await card.getByText('상위 댓글은 그대로 표시됩니다.').waitFor();
    await card.getByRole('textbox', { name: '댓글 입력' }).waitFor();
    const toggle = card.getByRole('button', { name: '답글 1개' });
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await card.getByText('기본 접힘 답글입니다.').count(), 0);
    await toggle.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: fileURLToPath(new URL(`replies-collapsed-${width}.png`, output)),
      fullPage: true,
    });
    await toggle.click();
    await card.getByText('기본 접힘 답글입니다.').waitFor();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    await page.screenshot({
      path: fileURLToPath(new URL(`replies-expanded-${width}.png`, output)),
      fullPage: true,
    });
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await card.getByText('기본 접힘 답글입니다.').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('button', { name: '리스트형 보기' }).click();
    const list = page.getByRole('region', { name: '리스트형 문서 목록' });
    await list.getByRole('button', { name: /피드 답글 기본 접힘 확인/ }).click();
    const panel = page.getByTestId('post-detail-panel');
    await panel.getByText('상위 댓글은 그대로 표시됩니다.').waitFor();
    await panel.getByRole('textbox', { name: '댓글 입력' }).waitFor();
    const panelToggle = panel.getByRole('button', { name: '답글 1개' });
    assert.equal(await panelToggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await panel.getByText('기본 접힘 답글입니다.').count(), 0);
    await panelToggle.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: fileURLToPath(new URL(`detail-replies-collapsed-${width}.png`, output)),
      fullPage: true,
    });
    await panelToggle.click();
    await panel.getByText('기본 접힘 답글입니다.').waitFor();
    assert.equal(await panelToggle.getAttribute('aria-expanded'), 'true');
    await page.screenshot({
      path: fileURLToPath(new URL(`detail-replies-expanded-${width}.png`, output)),
      fullPage: true,
    });
    await panelToggle.click();
    assert.equal(await panelToggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await panel.getByText('기본 접힘 답글입니다.').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log(`${width}px: feed and detail comments visible; replies collapsed, expanded, collapsed; no overflow`);
    await context.close();
  }
} finally {
  await browser.close();
}
