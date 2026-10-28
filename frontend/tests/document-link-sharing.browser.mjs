import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4173';
const output = new URL('../../docs/result/20261028/document-sharing-corrections/screenshots/', import.meta.url);
await mkdir(output, { recursive: true });
const tokenFor = (id) => `v1.${Buffer.alloc(44, id).toString('base64url')}`;
const shareUrlFor = (id) => `${origin}/groupware/doc/write?share=${tokenFor(id)}`;
const shareUrl = shareUrlFor(42);
const permissions = { read: true, create: true, update: true, delete: true, excel: false };
const makeDocument = (id, title, contentsHtml) => ({
  electronicApprovalId: id, documentNo: `EA-20261028-${String(id).padStart(4, '0')}`,
  eabusNo: '001', documentType: 'DRAFTING', documentStatus: 'COMPLETED', title,
  drafterName: '테스트 기안자', summary: '접근 권한이 있는 사용자에게만 표시되는 문서 요약입니다.',
  contentsHtml, contentsText: '문서 본문', contentsJson: '{}', viewCount: 0,
  isDrafter: false, draftingWorkCategoryId: null, approvalLines: [], attachments: [],
  systemEvents: [], comments: [], commentCount: 0, hasPreviousComments: false,
  nextBeforeCommentId: null, createdAt: '2026-10-28T09:00:00',
});
const source = makeDocument(1, '공유 링크가 포함된 문서', `<p>관련 문서를 확인해 주세요.</p><p><a href="${shareUrl}">${shareUrl}</a></p>`);
const target = makeDocument(42, '공유 대상 문서', '<p>권한 확인 후 열린 상세 본문입니다.</p>');
const comment = {
  commentId: 1, ownerId: 1, commentType: 'USER', writerId: 'preview-author',
  writerName: '테스트 작성자', content: `<p>${shareUrl}</p>`,
  createdAt: '2026-10-28T09:00:00', deletedYn: 'N', attachments: [],
};
source.comments = [comment];
source.commentCount = 1;
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    const errors = [];
    let denyTarget = false;
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'test', userId: 'preview-author', accessToken: 'browser-test-only',
        refreshToken: 'browser-test-only', expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }));
    });
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      let result = { resultList: [] };
      let status = 200;
      if (path === '/api/v1/menus/my') {
        result = {
          user: { userId: 'preview-author', name: '테스트 사용자', roles: [], roleName: 'USER' },
          menus: [{
            menuId: 1, parentMenuId: null, name: '그룹웨어', path: '/groupware',
            children: [{
              menuId: 2, parentMenuId: 1, name: '문서관리', path: '/groupware/doc',
              children: [{ menuId: 3, parentMenuId: 2, name: '문서작성', path: '/groupware/doc/write', permissions }],
            }],
          }],
        };
      } else if (path === '/api/v1/system/modules') {
        result = { resultList: [{ moduleId: 1, moduleCode: 'groupware', moduleNm: '그룹웨어', moduleUrl: '/groupware', iconNm: 'Groups', useAt: 'Y' }] };
      } else if (path === '/api/v1/users/me/profile') {
        result = { employeeId: '1', name: '테스트 사용자', departmentName: '테스트 부서' };
      } else if (path.endsWith('/approvals/summary')) {
        result = { item: { actionRequiredCount: 0, inProgressCount: 0, draftCount: 0, completedCount: 1, revisionRequestedCount: 0, rejectedCount: 0, notices: [] } };
      } else if (path.endsWith('/approvals/documents/pinned')) {
        result = { resultList: [source], totalRowCount: 1 };
      } else if (/\/approvals\/documents\/\d+\/share-link$/.test(path)) {
        result = { item: { token: tokenFor(Number(path.split('/').at(-2))) } };
      } else if (path.endsWith('/approvals/shared-document')) {
        const document = url.searchParams.get('token') === tokenFor(1) ? source : target;
        if (document === target && denyTarget) status = 404;
        result = { item: document };
      } else if (path.endsWith('/approvals/documents')) {
        const id = Number(url.searchParams.get('electronicApprovalId'));
        const records = id ? (id === 42 && !denyTarget ? [target] : id === 1 ? [source] : []) : [source];
        result = { resultList: records, totalRowCount: records.length };
      } else if (/\/approvals\/documents\/\d+$/.test(path)) {
        const id = Number(path.split('/').at(-1));
        if (id === 42 && denyTarget) status = 404;
        result = { item: id === 42 ? target : source };
      } else if (/\/approvals\/\d+\/comments$/.test(path)) {
        const id = Number(path.split('/').at(-2));
        const comments = id === 1 ? [comment] : [];
        if (request.method() === 'POST') {
          result = { item: { ...comment, commentId: 2, content: request.postDataJSON().content } };
        } else {
          result = { comments, systemEvents: [], resultCnt: comments.length, hasPrevious: false, nextBeforeCommentId: null };
        }
      } else if (path.endsWith('/workflow/forms/users')) {
        result = { resultList: [{ userId: '1', userNm: '테스트 사용자', departmentNm: '테스트 부서' }] };
      }
      await route.fulfill({
        status, contentType: 'application/json',
        body: JSON.stringify({ resultCode: String(status), resultMessage: status === 200 ? '성공' : '문서를 찾을 수 없습니다.', result }),
      });
    });
    await page.goto(shareUrlFor(1));
    const detail = page.getByTestId('post-detail-panel').first();
    await detail.getByText('공유 링크가 포함된 문서', { exact: true }).waitFor();
    await detail.getByRole('button', { name: '문서 더보기' }).click();
    await page.getByRole('menuitem', { name: '문서 공유하기' }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), shareUrlFor(1));
    await detail.getByRole('button', { name: '문서 상세 열기: 공유 대상 문서' }).first().click();
    const nestedDetail = page.getByTestId('page-area-overlay').last();
    await nestedDetail.getByText('권한 확인 후 열린 상세 본문입니다.', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('page-area-overlay').count(), 2);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="page-area-overlay"]').length === 1);
    await detail.getByText('공유 링크가 포함된 문서', { exact: true }).waitFor();
    await detail.getByRole('button', { name: '상세 닫기' }).click();
    await detail.waitFor({ state: 'hidden' });
    await page.waitForURL((url) => !url.searchParams.has('share'));
    await page.getByRole('button', { name: '피드형 보기' }).click();
    const feed = page.getByTestId('document-feed');
    await feed.getByRole('button', { name: '문서 상세 열기: 공유 대상 문서' }).first().waitFor();
    assert.equal(await page.getByText('고정 문서 피드 응답을 확인할 수 없습니다.').count(), 0);
    await feed.getByRole('button', { name: '문서 더보기' }).click();
    await page.getByRole('menuitem', { name: '문서 공유하기' }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), shareUrlFor(1));
    await feed.getByRole('button', { name: '문서 상세 열기: 공유 대상 문서' }).first().click();
    const drawer = page.getByTestId('page-area-overlay').last();
    await drawer.getByText('권한 확인 후 열린 상세 본문입니다.', { exact: true }).waitFor();
    assert.equal(await drawer.evaluate((element) => element.closest('.MuiDrawer-root') !== null), false);
    assert.equal(await drawer.evaluate((element) => element.closest('[data-testid="document-write-page"]') !== null), true);
    const pageBounds = await page.getByTestId('document-write-page').boundingBox();
    const panelBounds = await drawer.boundingBox();
    assert.ok(panelBounds.y >= pageBounds.y && panelBounds.height <= pageBounds.height + 1);
    await drawer.getByRole('button', { name: '문서 더보기' }).click();
    await page.getByRole('menuitem', { name: '문서 공유하기' }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), shareUrl);
    await page.screenshot({ path: fileURLToPath(new URL(`detail-${width}.png`, output)) });
    await drawer.getByRole('button', { name: '상세 닫기' }).click();
    await drawer.waitFor({ state: 'hidden' });
    denyTarget = true;
    await feed.getByRole('button', { name: '문서 상세 열기: 공유 대상 문서' }).first().click();
    await drawer.getByText('문서를 찾을 수 없습니다.', { exact: true }).waitFor();
    assert.equal(await drawer.getByText('권한 확인 후 열린 상세 본문입니다.', { exact: true }).count(), 0);
    await drawer.getByRole('button', { name: '상세 닫기' }).click();
    await drawer.waitFor({ state: 'hidden' });
    denyTarget = false;
    await page.getByRole('button', { name: '문서 작성', exact: true }).click();
    const composer = page.getByRole('dialog', { name: '문서 작성', exact: true });
    const title = composer.getByRole('textbox', { name: /제목/ });
    await title.fill('작성 상태 유지 확인');
    const editor = composer.getByRole('textbox', { name: '본문', exact: true });
    await editor.evaluate((element, link) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', link);
      element.focus();
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
    }, shareUrl);
    const composerPreview = composer.getByRole('button', { name: '문서 상세 열기: 공유 대상 문서' });
    await composerPreview.waitFor();
    await editor.evaluate((element) => {
      const range = document.createRange();
      const text = element.querySelector('a')?.firstChild;
      if (text) {
        range.setStart(text, 5);
        range.collapse(true);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
      }
    });
    await composer.getByRole('button', { name: '툴바 열기' }).click();
    await page.getByRole('button', { name: '링크', exact: true }).click();
    await page.getByRole('textbox', { name: 'URL', exact: true }).fill('https://example.com');
    await page.getByRole('button', { name: '확인', exact: true }).click();
    await composerPreview.waitFor({ state: 'hidden' });
    assert.equal(await editor.textContent(), shareUrl);
    await editor.click();
    await page.keyboard.press('Control+z');
    await composerPreview.waitFor();
    await composerPreview.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({ path: fileURLToPath(new URL(`composer-${width}.png`, output)) });
    await composerPreview.click();
    await drawer.getByText('권한 확인 후 열린 상세 본문입니다.', { exact: true }).waitFor();
    assert.equal(await drawer.evaluate((element) => element.closest('[role="dialog"]') !== null), true);
    const composerBounds = await composer.boundingBox();
    const composerPanelBounds = await drawer.boundingBox();
    assert.ok(Math.abs(composerPanelBounds.y - composerBounds.y) <= 2);
    assert.ok(Math.abs(composerPanelBounds.height - composerBounds.height) <= 2);
    await page.screenshot({ path: fileURLToPath(new URL(`composer-detail-${width}.png`, output)) });
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'hidden' });
    assert.equal(await title.inputValue(), '작성 상태 유지 확인');
    assert.equal(await editor.textContent(), shareUrl);
    assert.deepEqual(errors, []);
    console.log(`${width}px: encrypted copy/pinned feed/link destination edit/page-scoped detail/permission recheck/Escape/state retention passed`);
    await context.close();
  }
} finally {
  await browser.close();
}
