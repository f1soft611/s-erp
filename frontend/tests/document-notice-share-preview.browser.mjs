import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4173';
const output = new URL(
  '../../docs/result/20261029/document-notice-sharing-previews/screenshots/',
  import.meta.url,
);
await mkdir(output, { recursive: true });

const tokenFor = (id) => `v1.${Buffer.alloc(44, id).toString('base64url')}`;
const documentShareUrl = `${origin}/groupware/doc/write?share=${tokenFor(42)}`;
const noticeShareUrl = `${origin}/groupware/community/notice?share=${tokenFor(42)}`;
const externalUrl = 'https://example.com/article';
const permissions = { read: true, create: true, update: true, delete: true, excel: false };

const makeDocument = (id, title, contentsHtml, comments = []) => ({
  electronicApprovalId: id,
  documentNo: `EA-20261029-${String(id).padStart(4, '0')}`,
  eabusNo: '001',
  documentType: 'DRAFTING',
  documentStatus: 'COMPLETED',
  title,
  drafterName: '브라우저 테스트 사용자',
  summary: '권한이 확인된 문서 요약입니다.',
  contentsHtml,
  contentsText: '문서 본문',
  contentsJson: '{}',
  viewCount: 0,
  isDrafter: false,
  draftingWorkCategoryId: null,
  approvalLines: [],
  attachments: [],
  systemEvents: [],
  comments,
  commentCount: comments.length,
  hasPreviousComments: false,
  nextBeforeCommentId: null,
  createdAt: '2026-10-29T09:00:00',
});

const makeNotice = (id, title, contentsHtml, comments = []) => ({
  postId: id,
  title,
  noticeGubunCode: 'OPS',
  contentsHtml,
  contentsText: '공지 본문',
  writerId: 'share-preview-user',
  writerName: '브라우저 테스트 사용자',
  viewCount: 0,
  isPinned: 'N',
  createdAt: '2026-10-29T09:00:00',
  comments,
  commentCount: comments.length,
  hasPreviousComments: false,
  nextBeforeCommentId: null,
});

const noticeComment = {
  commentId: 1,
  commentType: 'USER',
  writerId: 'share-preview-user',
  writerName: '댓글 작성자',
  content: `<p><a href="${noticeShareUrl}">공유 공지</a></p>`,
  createdAt: '2026-10-29T09:00:00',
  deletedYn: 'N',
  attachments: [],
};
const documentComment = {
  ...noticeComment,
  content: `<p><a href="${noticeShareUrl}">공지 링크</a></p>`,
};
const sourceNotice = makeNotice(
  1,
  '공유 링크 미리보기 확인 공지',
  `<p>문서와 웹 링크를 확인합니다.</p><p><a href="${documentShareUrl}">공유 문서</a></p><p><a href="${externalUrl}">웹 링크</a></p>`,
  [noticeComment],
);
const targetNotice = makeNotice(
  42,
  '브라우저 대상 공지',
  '<p>공지 상세 패널이 열렸습니다.</p>',
);
const sourceDocument = makeDocument(
  1,
  '공유 링크 미리보기 확인 문서',
  `<p><a href="${noticeShareUrl}">공유 공지</a></p><p><a href="${externalUrl}">웹 링크</a></p>`,
  [documentComment],
);
const targetDocument = makeDocument(
  42,
  '브라우저 대상 문서',
  `<p>문서 상세 패널이 열렸습니다.</p><p><a href="${noticeShareUrl}">공유 공지</a></p><p><a href="${externalUrl}">웹 링크</a></p>`,
);

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'test',
        userId: 'share-preview-user',
        accessToken: 'browser-test-only',
        refreshToken: 'browser-test-only',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }));
    });
    await page.route('https://example.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<title>External preview title</title>',
      }),
    );
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      let result = { resultList: [] };
      if (path === '/api/v1/menus/my') {
        result = {
          user: {
            userId: 'share-preview-user',
            name: '브라우저 테스트 사용자',
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
                name: '문서관리',
                path: '/groupware/doc',
                children: [{
                  menuId: 3,
                  parentMenuId: 2,
                  name: '문서작성',
                  path: '/groupware/doc/write',
                  permissions,
                }],
              },
              {
                menuId: 4,
                parentMenuId: 1,
                name: '커뮤니티',
                path: '/groupware/community',
                children: [{
                  menuId: 5,
                  parentMenuId: 4,
                  name: '공지사항',
                  path: '/groupware/community/notice',
                  permissions,
                }],
              },
            ],
          }],
        };
      } else if (path === '/api/v1/co/master/common-code/groups') {
        result = { resultList: [{
          commonCodeGroupId: 8, groupCode: 'NOTICE_GUBUN', groupNm: '공지 구분',
        }] };
      } else if (path === '/api/v1/co/master/common-code/groups/8/items') {
        result = { resultList: [{
          commonCodeItemId: 81, groupId: 8, itemCode: 'OPS', itemNm: '운영공지', useAt: 'Y',
        }] };
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
          employeeId: '1',
          name: '브라우저 테스트 사용자',
          departmentName: '테스트 부서',
        };
      } else if (path.endsWith('/approvals/summary')) {
        result = {
          item: {
            actionRequiredCount: 0,
            inProgressCount: 0,
            draftCount: 0,
            completedCount: 1,
            revisionRequestedCount: 0,
            rejectedCount: 0,
            notices: [],
          },
        };
      } else if (path.endsWith('/approvals/documents/pinned')) {
        result = { resultList: [sourceDocument], totalRowCount: 1 };
      } else if (path.endsWith('/approvals/link-preview')) {
        result = {
          item: {
            siteName: 'example.com',
            title: 'External preview title',
            description: '외부 링크 미리보기 설명입니다.',
            imageUrl: null,
          },
        };
      } else if (path.endsWith('/approvals/shared-document')) {
        result = {
          item: url.searchParams.get('token') === tokenFor(1)
            ? sourceDocument
            : targetDocument,
        };
      } else if (path.endsWith('/approvals/documents')) {
        const id = Number(url.searchParams.get('electronicApprovalId'));
        const records = id === 42 ? [targetDocument] : [sourceDocument];
        result = { resultList: records, totalRowCount: records.length };
      } else if (/\/approvals\/documents\/\d+$/.test(path)) {
        result = {
          item: Number(path.split('/').at(-1)) === 42
            ? targetDocument
            : sourceDocument,
        };
      } else if (/\/approvals\/\d+\/comments$/.test(path)) {
        result = {
          comments: sourceDocument.comments,
          systemEvents: [],
          resultCnt: sourceDocument.commentCount,
          hasPrevious: false,
          nextBeforeCommentId: null,
        };
      } else if (/\/boards\/notice\/posts\/\d+\/share-link$/.test(path)) {
        result = { item: { token: tokenFor(Number(path.split('/').at(-2))) } };
      } else if (path.endsWith('/boards/notice/shared-post')) {
        result = {
          item: url.searchParams.get('token') === tokenFor(1)
            ? sourceNotice
            : targetNotice,
        };
      } else if (/\/boards\/notice\/posts\/\d+$/.test(path)) {
        result = Number(path.split('/').at(-1)) === 42
          ? { item: targetNotice }
          : { item: sourceNotice };
      } else if (path.endsWith('/boards/notice/posts')) {
        result = { resultList: [sourceNotice], resultCnt: 1, totalCount: 1 };
      } else if (path.endsWith('/workflow/forms/users')) {
        result = { resultList: [] };
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

    await page.goto(`${origin}/groupware/community/notice?share=${tokenFor(1)}`);
    const noticePanel = page.getByTestId('post-detail-panel').first();
    await noticePanel.getByText('공유 링크 미리보기 확인 공지', { exact: true }).waitFor();
    await noticePanel.getByRole('button', { name: '문서 상세 열기: 브라우저 대상 문서' }).waitFor();
    await noticePanel.getByRole('link', { name: '외부 링크 열기: External preview title' }).waitFor();
    await noticePanel.getByRole('button', { name: '공지 상세 열기: 브라우저 대상 공지' }).waitFor();
    assert.equal(await noticePanel.getByRole('button', { name: '공지 상세 열기: 브라우저 대상 공지' })
      .getByText('운영공지 · 브라우저 테스트 사용자', { exact: true }).count(), 1);
    assert.ok(await noticePanel.getByText('시스템 문서').count() >= 1);
    assert.ok(await noticePanel.getByText('공지사항').count() >= 1);
    assert.equal(await noticePanel.getByTestId('feed-link-previews').getByText('웹 링크', { exact: true }).count(), 0);
    assert.equal(await noticePanel.getByRole('button', { name: /문서 상세 열기/ }).first().getAttribute('href'), null);
    const externalCard = noticePanel.getByRole('link', { name: '외부 링크 열기: External preview title' }).first();
    assert.equal(await externalCard.getAttribute('target'), '_blank');
    assert.equal(await externalCard.getAttribute('rel'), 'noopener noreferrer');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({
      path: fileURLToPath(new URL(`notice-mixed-previews-${width}.png`, output)),
      fullPage: true,
    });
    const [externalPage] = await Promise.all([
      page.waitForEvent('popup'),
      externalCard.click(),
    ]);
    await externalPage.waitForLoadState();
    assert.equal(externalPage.url(), externalUrl);
    await externalPage.close();

    const menuButton = noticePanel.getByRole('button', { name: '공지 메뉴 공유 링크 미리보기 확인 공지' });
    await menuButton.click();
    await page.getByRole('menuitem', { name: '공지 공유하기' }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()),
      `${origin}/groupware/community/notice?share=${tokenFor(1)}`);

    const noticeSourceUrl = page.url();
    await noticePanel.getByRole('button', { name: '문서 상세 열기: 브라우저 대상 문서' }).click();
    const sharedPanel = page.getByLabel('공유 콘텐츠 상세', { exact: true });
    await sharedPanel.getByText('브라우저 대상 문서', { exact: true }).waitFor();
    await sharedPanel.getByRole('button', { name: '공지 상세 열기: 브라우저 대상 공지' })
      .getByText('운영공지 · 브라우저 테스트 사용자', { exact: true }).waitFor();
    assert.equal(page.url(), noticeSourceUrl);
    assert.equal(context.pages().length, 1);
    assert.equal(await sharedPanel.count(), 1);
    const panelBounds = await sharedPanel.boundingBox();
    assert.ok(panelBounds);
    assert.ok(Math.abs(panelBounds.width - (width < 768 ? width : Math.min(975, width * 0.72))) < 2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({
      path: fileURLToPath(new URL(`notice-document-panel-${width}.png`, output)),
      fullPage: true,
    });
    await sharedPanel.getByRole('button', { name: '공지 상세 열기: 브라우저 대상 공지' }).click();
    await sharedPanel.getByText('브라우저 대상 공지', { exact: true }).waitFor();
    assert.equal(await sharedPanel.count(), 1);
    assert.equal(page.url(), noticeSourceUrl);
    await sharedPanel.getByRole('button', { name: '상세 닫기', exact: true }).click();
    await sharedPanel.waitFor({ state: 'detached' });
    await noticePanel.getByText('공유 링크 미리보기 확인 공지', { exact: true }).waitFor();

    await page.goto(`${origin}/groupware/doc/write?share=${tokenFor(1)}`);
    const sourceDocumentPanel = page.getByTestId('post-detail-panel').first();
    await sourceDocumentPanel.getByText('공유 링크 미리보기 확인 문서', { exact: true }).waitFor();
    const documentSourceUrl = page.url();
    await sourceDocumentPanel.getByRole('button', { name: '공지 상세 열기: 브라우저 대상 공지' }).first().click();
    await sharedPanel.getByText('브라우저 대상 공지', { exact: true }).waitFor();
    assert.equal(page.url(), documentSourceUrl);
    assert.equal(context.pages().length, 1);
    assert.equal(await sharedPanel.count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({
      path: fileURLToPath(new URL(`document-notice-panel-${width}.png`, output)),
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await sharedPanel.waitFor({ state: 'detached' });
    await sourceDocumentPanel.getByText('공유 링크 미리보기 확인 문서', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(`${width}px: bidirectional in-place panels, nested target replacement, close/ESC, source URL, and external new tab passed`);
    await context.close();
  }
} finally {
  await browser.close();
}
