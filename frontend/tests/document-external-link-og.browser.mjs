import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4173';
const output = new URL('../../docs/result/20261029/document-external-link-og/screenshots/', import.meta.url);
await mkdir(output, { recursive: true });
const tokenFor = (id) => `v1.${Buffer.alloc(44, id).toString('base64url')}`;
const shareUrl = `${origin}/groupware/doc/write?share=${tokenFor(1)}`;
const permissions = { read: true, create: true, update: true, delete: true, excel: false };
const externalUrl = 'https://example.com/article';
const commentUrl = 'https://example.org/comment';
const makeDocument = (id, title, contentsHtml) => ({
  electronicApprovalId: id, documentNo: `EA-20261029-${String(id).padStart(4, '0')}`,
  eabusNo: '001', documentType: 'DRAFTING', documentStatus: 'COMPLETED', title,
  drafterName: '브라우저 테스트 사용자', summary: '권한이 확인된 문서 요약입니다.',
  contentsHtml, contentsText: '문서 본문', contentsJson: '{}', viewCount: 0,
  isDrafter: false, draftingWorkCategoryId: null, approvalLines: [], attachments: [],
  systemEvents: [], comments: [], commentCount: 0, hasPreviousComments: false,
  nextBeforeCommentId: null, createdAt: '2026-10-29T09:00:00',
});
const source = makeDocument(1, 'OG 미리보기 확인 문서',
  `<p>내부와 외부 링크 확인</p><p><a href="${`${origin}/groupware/doc/write?share=${tokenFor(42)}`}">내부 문서 링크</a></p><p><a href="${externalUrl}">외부 웹 링크</a></p>`);
const target = makeDocument(42, '내부 공유 문서', '<p>내부 문서 본문입니다.</p>');
source.comments = [{
  commentId: 1, ownerId: 1, commentType: 'USER', writerId: 'og-test-user',
  writerName: '댓글 작성자', content: `<p>${commentUrl}</p>`,
  createdAt: '2026-10-29T09:00:00', deletedYn: 'N', attachments: [],
}];
source.commentCount = 1;

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'test', userId: 'og-test-user', accessToken: 'browser-test-only',
        refreshToken: 'browser-test-only', expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }));
    });
    await context.route('https://example.com/**', (route) => {
      if (route.request().url().endsWith('/preview.png')) {
        return route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p8sAAAAASUVORK5CYII=', 'base64',
        ) });
      }
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<title>External article</title>' });
    });
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      let result = { resultList: [] };
      if (path === '/api/v1/menus/my') {
        result = {
          user: { userId: 'og-test-user', name: '브라우저 테스트 사용자', roles: [], roleName: 'USER' },
          menus: [{
            menuId: 1, parentMenuId: null, name: '그룹웨어', path: '/groupware',
            children: [{
              menuId: 2, parentMenuId: 1, name: '문서관리', path: '/groupware/doc',
              children: [{ menuId: 3, parentMenuId: 2, name: '문서작성', path: '/groupware/doc/write', permissions }],
            }],
          }],
        };
      } else if (path === '/api/v1/system/modules') {
        result = { resultList: [{
          moduleId: 1, moduleCode: 'groupware', moduleNm: '그룹웨어',
          moduleUrl: '/groupware', iconNm: 'Groups', useAt: 'Y',
        }] };
      } else if (path === '/api/v1/users/me/profile') {
        result = { employeeId: '1', name: '브라우저 테스트 사용자', departmentName: '테스트 부서' };
      } else if (path.endsWith('/approvals/summary')) {
        result = { item: {
          actionRequiredCount: 0, inProgressCount: 0, draftCount: 0, completedCount: 1,
          revisionRequestedCount: 0, rejectedCount: 0, notices: [],
        } };
      } else if (path.endsWith('/approvals/documents/pinned')) {
        result = { resultList: [source], totalRowCount: 1 };
      } else if (path.endsWith('/approvals/link-preview')) {
        const targetUrl = request.postDataJSON().url;
        result = { item: {
          siteName: new URL(targetUrl).hostname,
          title: targetUrl === externalUrl ? '외부 OG 제목' : '댓글 OG 제목',
          description: '외부 링크 메타데이터 요약입니다.',
          imageUrl: targetUrl === externalUrl ? 'https://example.com/preview.png' : null,
        } };
      } else if (path.endsWith('/approvals/shared-document')) {
        result = { item: url.searchParams.get('token') === tokenFor(1) ? source : target };
      } else if (path.endsWith('/approvals/documents')) {
        const id = Number(url.searchParams.get('electronicApprovalId'));
        const records = id === 42 ? [target] : id === 1 ? [source] : [source];
        result = { resultList: records, totalRowCount: records.length };
      } else if (/\/approvals\/documents\/\d+$/.test(path)) {
        const id = Number(path.split('/').at(-1));
        result = { item: id === 42 ? target : source };
      } else if (/\/approvals\/\d+\/comments$/.test(path)) {
        result = { comments: source.comments, systemEvents: [], resultCnt: 1,
          hasPrevious: false, nextBeforeCommentId: null };
      } else if (path.endsWith('/workflow/forms/users')) {
        result = { resultList: [] };
      }
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ resultCode: '200', resultMessage: '성공', result }),
      });
    });

    await page.goto(shareUrl);
    const detail = page.getByTestId('post-detail-panel').first();
    await detail.getByText('OG 미리보기 확인 문서', { exact: true }).waitFor();
    const previews = detail.getByTestId('document-link-previews').first();
    await previews.getByRole('button', { name: '문서 상세 열기: 내부 공유 문서' }).waitFor();
    const externalCard = previews.getByRole('link', { name: '외부 링크 열기: 외부 OG 제목' });
    await externalCard.waitFor();
    await detail.getByText('외부 OG 제목', { exact: true }).waitFor();
    assert.equal(await previews.getByText('시스템 문서').count(), 1);
    assert.equal(await previews.getByText('웹 링크', { exact: true }).count(), 0);
    await page.getByText('댓글 OG 제목', { exact: true }).waitFor();
    assert.equal(await page.getByText('댓글 OG 제목', { exact: true }).count(), 1);
    assert.equal(await externalCard.getAttribute('target'), '_blank');
    assert.equal(await externalCard.getAttribute('rel'), 'noopener noreferrer');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({
      path: fileURLToPath(new URL(`mixed-link-previews-${width}.png`, output)),
      fullPage: true,
    });
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      externalCard.click(),
    ]);
    await popup.waitForLoadState();
    assert.equal(popup.url(), externalUrl);
    assert.deepEqual(errors, []);
    console.log(`${width}px: internal document and external OG cards are distinct; external link opens separately`);
    await context.close();
  }
} finally {
  await browser.close();
}
