import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4173';
const output = new URL('../../docs/result/20261030/embedded-image-https-proxy/screenshots/', import.meta.url);
await mkdir(output, { recursive: true });
const token = 'bde1fdec-5d22-487a-a254-2b9547cd32b3';
const preview = `/api/v1/common/embedded-images/temp/${token}?fileName=image.png`;
const permissions = { read: true, create: true, update: true, delete: true, excel: false };
const browser = await chromium.launch({ headless: true });

try {
  for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    const errors = [];
    const storageRequests = [];
    const previews = [];
    const saves = [];
    const deletions = [];
    let png;
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (request.url().includes(':9000/')) storageRequests.push(request.url());
    });
    await page.addInitScript(() => {
      localStorage.setItem('s-erp-auth', JSON.stringify({
        tenantCode: 'test',
        userId: 'image-preview-test',
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
      if (path.startsWith('/api/v1/common/embedded-images/temp/')) {
        assert.equal(request.headers().authorization, 'Bearer browser-test-only');
        assert.equal(url.searchParams.get('fileName'), 'image.png');
        previews.push(path);
        await route.fulfill({
          status: 200, contentType: 'image/png', body: png,
          headers: { 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' },
        });
        return;
      }
      if (path.endsWith('/embedded-images/temp') && request.method() === 'POST') {
        result = { item: {
          uploadToken: token, fileId: token, fileName: 'image.png',
          fileSize: png.length, mimeType: 'image/png', bucketName: 'document-attachments',
          objectKey: `tenant/9/embedded-image-temp/${token}/image.png`,
          imageUrl: preview, previewUrl: preview,
        } };
      } else if (path.includes('/embedded-images/temp/') && request.method() === 'DELETE') {
        deletions.push(path);
      } else if (path.endsWith('/boards/notice/posts') && request.method() === 'POST') {
        const payload = request.postDataJSON();
        saves.push({ kind: 'notice', payload });
        result = { item: { ...payload, postId: 42, writerId: 'image-preview-test', writerName: 'Preview Test' } };
      } else if (path.endsWith('/approvals/drafts') && request.method() === 'POST') {
        const payload = request.postDataJSON();
        saves.push({ kind: 'document', payload });
        result = { item: { electronicApprovalId: 42, documentNo: 'EA-20261030-0042', documentStatus: 'DRAFT' } };
      } else if (path === '/api/v1/menus/my') {
        result = {
          user: { userId: 'image-preview-test', name: 'Preview Test', roles: [], roleName: 'USER' },
          menus: [{
            menuId: 1, name: '그룹웨어', path: '/groupware', children: [
              { menuId: 2, parentMenuId: 1, name: '문서관리', path: '/groupware/doc', children: [
                { menuId: 3, parentMenuId: 2, name: '문서작성', path: '/groupware/doc/write', permissions },
              ] },
              { menuId: 4, parentMenuId: 1, name: '커뮤니티', path: '/groupware/community', children: [
                { menuId: 5, parentMenuId: 4, name: '공지사항', path: '/groupware/community/notice', permissions },
              ] },
            ],
          }],
        };
      } else if (path === '/api/v1/system/modules') {
        result = { resultList: [{
          moduleId: 1, moduleCode: 'groupware', moduleNm: '그룹웨어',
          moduleUrl: '/groupware', iconNm: 'Groups', useAt: 'Y',
        }] };
      } else if (path === '/api/v1/users/me/profile') {
        result = { employeeId: '1', name: 'Preview Test', departmentName: 'Test' };
      } else if (path === '/api/v1/co/master/common-code/groups') {
        result = { resultList: [{
          commonCodeGroupId: 8, groupCode: 'NOTICE_GUBUN', groupNm: '공지 구분',
        }] };
      } else if (path === '/api/v1/co/master/common-code/groups/8/items') {
        result = { resultList: [{
          commonCodeItemId: 81, groupId: 8, itemCode: 'OPS', itemNm: '운영공지', useAt: 'Y',
        }] };
      } else if (path.endsWith('/approvals/summary')) {
        result = { item: {
          actionRequiredCount: 0, inProgressCount: 0, draftCount: 0,
          completedCount: 0, revisionRequestedCount: 0, rejectedCount: 0, notices: [],
        } };
      } else if (path.endsWith('/approvals/documents') || path.endsWith('/approvals/documents/pinned')) {
        result = { resultList: [], totalRowCount: 0 };
      } else if (path.endsWith('/boards/notice/posts')) {
        result = { resultList: [], resultCnt: 0, totalCount: 0 };
      }
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ resultCode: '200', resultMessage: '성공', result }),
      });
    });

    async function pasteImage(dialog) {
      const editor = dialog.getByRole('textbox', { name: '본문', exact: true });
      await editor.click();
      const base64 = await page.evaluate(async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 140;
        const context = canvas.getContext('2d');
        context.fillStyle = '#dbeafe';
        context.fillRect(0, 0, 480, 140);
        context.fillStyle = '#1e40af';
        context.font = 'bold 24px sans-serif';
        context.fillText('HTTPS backend image preview', 24, 62);
        context.font = '18px sans-serif';
        context.fillText('Authenticated API > Blob > Editor', 24, 100);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return canvas.toDataURL('image/png').split(',')[1];
      });
      png = Buffer.from(base64, 'base64');
      const before = previews.length;
      await page.keyboard.press('Control+V');
      await dialog.locator(`img[data-upload-token="${token}"]`).waitFor();
      await page.waitForFunction((uploadToken) => {
        const image = document.querySelector(`.tiptap img[data-upload-token="${uploadToken}"]`);
        return image?.src.startsWith('blob:') && image.complete && image.naturalWidth === 480;
      }, token);
      assert.equal(previews.length, before + 1);
      assert.equal(await dialog.locator('img').first().getAttribute('data-object-key'),
        `tenant/9/embedded-image-temp/${token}/image.png`);
    }

    for (const kind of ['notice', 'document']) {
      const isNotice = kind === 'notice';
      await page.goto(`${origin}${isNotice ? '/groupware/community/notice' : '/groupware/doc/write'}`);
      const dialogName = isNotice ? '새 공지 작성' : '문서 작성';
      const openButton = page.getByRole('button', { name: dialogName, exact: true }).first();
      await openButton.click();
      let dialog = page.getByRole('dialog', { name: dialogName, exact: true });
      if (isNotice) {
        await dialog.getByRole('combobox', { name: '구분' }).click();
        await page.getByRole('option', { name: '운영공지' }).click();
      }
      await dialog.getByPlaceholder('제목을 입력하세요.').fill(`HTTPS ${kind} preview`);
      await pasteImage(dialog);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.screenshot({ path: fileURLToPath(new URL(`${kind}-${width}.png`, output)), fullPage: true });
      const saveCount = saves.length;
      await dialog.getByRole('button', { name: '저장', exact: true }).click();
      if (!isNotice) {
        await dialog.getByText('임시저장 문서 ID: 42').waitFor();
        const imageSource = await dialog.locator('img').first().getAttribute('src');
        assert.equal(await page.evaluate(async (source) => (await fetch(source)).ok, imageSource), true);
        await dialog.getByRole('button', { name: '닫기', exact: true }).last().click();
      }
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(saves.length, saveCount + 1);
      const saved = saves.at(-1);
      assert.equal(saved.kind, kind);
      assert.ok(JSON.stringify(saved.payload).includes(token));
      assert.ok(saved.payload.temporaryImages.some((image) => image.uploadToken === token));

      await openButton.click();
      dialog = page.getByRole('dialog', { name: dialogName, exact: true });
      await pasteImage(dialog);
      const deleteCount = deletions.length;
      await dialog.getByRole('button', { name: isNotice ? '취소' : '닫기', exact: true }).last().click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(deletions.length, deleteCount + 1);
      console.log(`${kind} ${width}px: authenticated preview, save metadata, cancel cleanup passed`);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(storageRequests, []);
    await context.close();
  }
} finally {
  await browser.close();
}
