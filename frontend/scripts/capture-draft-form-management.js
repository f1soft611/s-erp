import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4174';
const screenshotDir = path.resolve(
  import.meta.dirname,
  '../../docs/result/20261001/drafting-work-form-management/screenshots',
);
const screenshotWidths = [375, 768, 1280];
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
};

await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--disable-web-security'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const now = new Date();
const session = {
  tenantCode: 'VISUAL_TEST',
  userId: 'admin',
  accessToken: 'visual-test-token',
  refreshToken: '',
  expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
};

await page.goto(`${baseUrl}/login`);
await page.evaluate((auth) => {
  localStorage.setItem('s-erp-auth', JSON.stringify(auth));
}, session);

await page.route('http://localhost:8080/**', async (route) => {
  const request = route.request();
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: corsHeaders });
    return;
  }

  const pathname = new URL(request.url()).pathname;
  let result = {};
  if (pathname === '/api/v1/menus/my') {
    result = {
      user: {
        userId: 'admin',
        roles: ['TENANT_ADMIN'],
        roleName: 'TENANT_ADMIN',
        name: '관리자',
      },
      menus: [
        {
          menuId: 1,
          parentMenuId: null,
          name: '기준정보',
          path: '/co',
          icon: 'Settings',
          children: [
            {
              menuId: 2,
              parentMenuId: 1,
              name: '전자결재관리',
              path: '/co/workflow',
              children: [
                {
                  menuId: 3,
                  parentMenuId: 2,
                  name: '기안양식관리',
                  path: '/co/workflow/form',
                  description: '기안양식 기준정보를 관리합니다.',
                  permissions: {
                    read: true,
                    create: true,
                    update: true,
                    delete: false,
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  } else if (pathname === '/api/v1/system/modules') {
    result = {
      resultList: [
        {
          moduleId: 1,
          moduleCode: 'CO',
          moduleNm: '기준정보',
          iconNm: 'Settings',
          moduleUrl: '/co',
          sortOrder: 1,
          useAt: 'Y',
        },
      ],
    };
  } else if (pathname === '/api/v1/co/master/common-code/groups') {
    result = {
      resultList: [
        {
          commonCodeGroupId: 11,
          groupCode: 'WF_FORM_CATEGORY',
          groupNm: '기안양식 분류',
          sortOrder: 1,
          useAt: 'Y',
        },
        {
          commonCodeGroupId: 12,
          groupCode: 'WF_FORM_CYCLE',
          groupNm: '기안양식 등록주기',
          sortOrder: 2,
          useAt: 'Y',
        },
      ],
    };
  } else if (pathname === '/api/v1/co/master/common-code/groups/11/items') {
    result = {
      resultList: [
        {
          commonCodeItemId: 101,
          groupId: 11,
          itemCode: 'INSPECTION',
          itemNm: '점검',
          sortOrder: 10,
          useAt: 'Y',
        },
        {
          commonCodeItemId: 102,
          groupId: 11,
          itemCode: 'SAFETY',
          itemNm: '안전',
          sortOrder: 20,
          useAt: 'Y',
        },
      ],
    };
  } else if (pathname === '/api/v1/co/master/common-code/groups/12/items') {
    result = {
      resultList: [
        {
          commonCodeItemId: 201,
          groupId: 12,
          itemCode: 'MONTH',
          itemNm: '월',
          sortOrder: 30,
          useAt: 'Y',
        },
      ],
    };
  } else if (pathname === '/api/v1/co/workflow/forms/users') {
    result = {
      resultList: [
        { userId: 110, loginId: 210, userNm: '홍길동', departmentNm: '운영팀' },
      ],
    };
  } else if (pathname === '/api/v1/co/workflow/forms') {
    if (request.method() !== 'GET') {
      await route.fulfill({
        status: 409,
        headers: corsHeaders,
        body: JSON.stringify({
          resultCode: '400',
          resultMessage: 'Visual fixture blocks writes.',
        }),
      });
      return;
    }
    result = {
      resultList: [
        {
          draftingWorkCategoryId: 71,
          tenantId: 1,
          cataTypeCode: '007',
          codeName: '정기점검',
          categoryItemId: 101,
          categoryName: '점검',
          regTermId: 201,
          regTerm: '월',
          reviewerId: 210,
          reviewerName: '홍길동',
          approverId: null,
          approverName: '',
          assigneeIds: ['110'],
          assigneeSummary: '홍길동',
          createdByName: '관리자',
          createdAt: '2026-10-01 09:00',
          hasDocument: false,
          useAt: 'Y',
        },
        {
          draftingWorkCategoryId: 72,
          tenantId: 1,
          cataTypeCode: '008',
          codeName: '안전점검',
          categoryItemId: 102,
          categoryName: '안전',
          regTermId: 201,
          regTerm: '월',
          reviewerId: null,
          reviewerName: '',
          approverId: 210,
          approverName: '홍길동',
          assigneeIds: ['110'],
          assigneeSummary: '홍길동',
          createdByName: '관리자',
          createdAt: '2026-10-01 09:30',
          hasDocument: true,
          useAt: 'Y',
        },
      ],
    };
  }

  await route.fulfill({
    status: 200,
    headers: corsHeaders,
    body: JSON.stringify({ resultCode: '200', resultMessage: 'OK', result }),
  });
});

await page.goto(`${baseUrl}/`);
await page.getByText('기안양식관리', { exact: true }).last().click();
await page.getByRole('textbox', { name: '기안양식 검색' }).waitFor();
await page.getByText('정기점검', { exact: true }).waitFor();

await page.getByRole('button', { name: '상세 검색 열기' }).click();
await page.getByRole('combobox', { name: '분류' }).waitFor();
await page.getByRole('combobox', { name: '등록주기' }).waitFor();
await page.getByRole('combobox', { name: '사용여부' }).waitFor();
await page.getByRole('button', { name: '검색 닫기', exact: true }).click();

const measurements = [];
for (const width of screenshotWidths) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(200);
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  if (metrics.documentScrollWidth > width || metrics.bodyScrollWidth > width) {
    throw new Error(
      `Unexpected page overflow at ${width}px: ${JSON.stringify(metrics)}`,
    );
  }
  measurements.push(metrics);
  await page.screenshot({
    path: path.join(screenshotDir, `${width}px-list.png`),
    fullPage: false,
  });
}

await page.setViewportSize({ width: 1280, height: 900 });
await page.getByRole('button', { name: '양식 추가' }).click();
const workFormDialog = page.getByRole('dialog', { name: '기안양식 등록' });
await workFormDialog.waitFor();
await workFormDialog.getByRole('button', { name: '적용' }).waitFor();
await page.screenshot({
  path: path.join(screenshotDir, '1280px-work-form.png'),
  fullPage: false,
});
await page.keyboard.press('Escape');
await page.setViewportSize({ width: 375, height: 900 });
await page.getByRole('button', { name: '양식 추가' }).click();
const mobileWorkFormDialog = page.getByRole('dialog', {
  name: '기안양식 등록',
});
await mobileWorkFormDialog.waitFor();
const isMobileWorkFormFullScreen = await mobileWorkFormDialog.evaluate(
  (dialog) => dialog.classList.contains('MuiDialog-paperFullScreen'),
);
if (!isMobileWorkFormFullScreen) {
  throw new Error('Draft form editor did not become full-screen at 375px.');
}
await page.screenshot({
  path: path.join(screenshotDir, '375px-work-form.png'),
  fullPage: false,
});
await page.keyboard.press('Escape');
await page.setViewportSize({ width: 1280, height: 900 });
await page.getByRole('button', { name: '분류 설정' }).click();
const categoryDialog = page.getByRole('dialog', { name: '기안양식 분류 설정' });
await categoryDialog.waitFor();
await categoryDialog.getByText('안전', { exact: true }).waitFor();
await page.screenshot({
  path: path.join(screenshotDir, '1280px-category-dialog.png'),
  fullPage: false,
});
await page.keyboard.press('Escape');
await page.setViewportSize({ width: 375, height: 900 });
await page.getByRole('button', { name: '분류 설정', exact: true }).click();
const mobileCategoryDialog = page.getByRole('dialog', {
  name: '기안양식 분류 설정',
});
await mobileCategoryDialog.waitFor();
const isMobileDialogFullScreen = await mobileCategoryDialog.evaluate((dialog) =>
  dialog.classList.contains('MuiDialog-paperFullScreen'),
);
if (!isMobileDialogFullScreen) {
  throw new Error(
    'Classification help dialog did not become full-screen at 375px.',
  );
}
await page.screenshot({
  path: path.join(screenshotDir, '375px-category-dialog.png'),
  fullPage: false,
});

console.log(
  JSON.stringify(
    {
      measurements,
      isMobileWorkFormFullScreen,
      isMobileDialogFullScreen,
      screenshots: screenshotDir,
    },
    null,
    2,
  ),
);
await browser.close();
