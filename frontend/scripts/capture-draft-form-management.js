import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4174';
const screenshotDir = path.resolve(
  process.env.SCREENSHOT_DIR ??
    path.resolve(
      import.meta.dirname,
      '../../docs/result/20261001/drafting-work-form-management/screenshots',
    ),
);
const screenshotWidths = [375, 768, 1280];
const avatarImage = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#e76f51"/><text x="20" y="26" text-anchor="middle" fill="#fff" font-size="18">홍</text></svg>',
)}`;
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
const duplicateKeyWarnings = [];
page.on('console', (message) => {
  if (
    (message.type() === 'warning' || message.type() === 'error') &&
    message.text().includes('Encountered two children with the same key')
  ) {
    duplicateKeyWarnings.push(message.text());
  }
});
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
      resultList: Array.from({ length: 36 }, (_, index) => ({
        commonCodeItemId: 101 + index,
        groupId: 11,
        itemCode: `CATEGORY_${index + 1}`,
        itemNm:
          index === 0
            ? '점검'
            : index === 1
              ? '안전'
              : `분류 ${String(index + 1).padStart(2, '0')}`,
        sortOrder: (index + 1) * 10,
        useAt: 'Y',
      })),
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
        {
          userId: 110,
          loginId: 210,
          userNm: '홍길동',
          departmentNm: '운영팀',
          profileImage: avatarImage,
          levelNm: '부장',
        },
        {
          userId: 111,
          loginId: 211,
          userNm: '김민지',
          departmentNm: '기획팀',
          profileImage: avatarImage,
          levelNm: '과장',
        },
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
  const metrics = await page.evaluate(() => {
    const grid = document.querySelector(
      '[role="grid"][aria-label="기안양식 목록"]',
    );
    const gridContainer = grid?.parentElement;
    return {
      viewportWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      gridContainerPadding: gridContainer
        ? {
            top: getComputedStyle(gridContainer).paddingTop,
            right: getComputedStyle(gridContainer).paddingRight,
            bottom: getComputedStyle(gridContainer).paddingBottom,
            left: getComputedStyle(gridContainer).paddingLeft,
          }
        : null,
    };
  });
  if (metrics.documentScrollWidth > width || metrics.bodyScrollWidth > width) {
    throw new Error(
      `Unexpected page overflow at ${width}px: ${JSON.stringify(metrics)}`,
    );
  }
  if (
    !metrics.gridContainerPadding ||
    Object.values(metrics.gridContainerPadding).some(
      (padding) => padding !== '8px',
    )
  ) {
    throw new Error(
      `Unexpected Grid container padding at ${width}px: ${JSON.stringify(metrics)}`,
    );
  }
  measurements.push(metrics);
  await page.screenshot({
    path: path.join(screenshotDir, `${width}px-list.png`),
    fullPage: false,
  });
}

await page.setViewportSize({ width: 1280, height: 900 });
await page.getByRole('button', { name: '71 행 정보 수정' }).click();
const editFormDialog = page.getByRole('dialog', { name: '기안양식 수정' });
await editFormDialog.waitFor();
const reviewerFormField = editFormDialog.getByTestId(
  'f1-grid-form-field-reviewerId',
);
await reviewerFormField.getByRole('button', { name: 'Open' }).click();
const formUserOption = page.getByRole('option', { name: /홍길동/ });
await formUserOption.waitFor();
const formUserOptionText = await formUserOption.textContent();
if (
  !formUserOptionText?.includes('부장') ||
  !formUserOptionText.includes('운영팀')
) {
  throw new Error(`User option metadata is missing: ${formUserOptionText}`);
}
await formUserOption.locator('img').waitFor();
const userPickerScreenshots = [];
for (const width of screenshotWidths) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(200);
  const pickerBounds = await page.evaluate(() => {
    const popper = document.querySelector('.MuiAutocomplete-popper');
    if (!popper) return null;
    const bounds = popper.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right, width: bounds.width };
  });
  if (
    !pickerBounds ||
    pickerBounds.right > width + 1 ||
    pickerBounds.width <= 0
  ) {
    throw new Error(
      `User picker is clipped at ${width}px: ${JSON.stringify(pickerBounds)}`,
    );
  }
  const isFullScreen = await editFormDialog.evaluate((dialog) =>
    dialog.classList.contains('MuiDialog-paperFullScreen'),
  );
  if (width === 375 && !isFullScreen) {
    throw new Error('User row form did not become full-screen at 375px.');
  }
  userPickerScreenshots.push({ width, pickerBounds, isFullScreen });
  await page.screenshot({
    path: path.join(screenshotDir, `user-form-${width}px.png`),
    fullPage: false,
  });
}
await page.keyboard.press('Escape');
await editFormDialog.getByRole('button', { name: '닫기' }).click();

const cellPickerScreenshots = [];
for (const width of [593, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  const reviewerCell = page
    .getByRole('gridcell', { name: '홍길동 (운영팀)' })
    .first();
  await reviewerCell.scrollIntoViewIfNeeded();
  const cellBounds = await reviewerCell.boundingBox();
  await reviewerCell.dispatchEvent('dblclick');
  await page.getByRole('option', { name: /홍길동/ }).waitFor();
  const pickerMetrics = await page.evaluate(() => {
    const popper = document.querySelector('.MuiAutocomplete-popper');
    const input = document.querySelector(
      '[data-f1grid-user-picker="true"] input[role="combobox"]',
    );
    if (!popper) return null;
    const bounds = popper.getBoundingClientRect();
    const inputBounds = input?.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      width: bounds.width,
      inputLeft: inputBounds?.left,
    };
  });
  if (
    !pickerMetrics ||
    !cellBounds ||
    pickerMetrics.top < cellBounds.y + cellBounds.height + 2 ||
    Math.abs(pickerMetrics.width - Math.min(320, width - cellBounds.x - 8)) >
      1 ||
    pickerMetrics.left < 0 ||
    pickerMetrics.right > width + 1 ||
    Math.abs(pickerMetrics.left - cellBounds.x) > 1
  ) {
    throw new Error(
      `Grid user picker is misplaced at ${width}px: ${JSON.stringify({ pickerMetrics, cellBounds })}`,
    );
  }
  cellPickerScreenshots.push({ width, pickerMetrics, cellBounds });
  await page.screenshot({
    path: path.join(screenshotDir, `user-cell-${width}px.png`),
    fullPage: false,
  });
  if (width === 593) {
    const availableUserOptions = await page
      .getByRole('option')
      .allTextContents();
    await page.getByRole('option', { name: /김민지/ }).click();
    const changedReviewerCell = page.getByRole('gridcell', {
      name: '김민지 (기획팀)',
    });
    await page.waitForTimeout(150);
    const reviewerEditorCount = await page
      .getByRole('combobox', { name: '검토자' })
      .count();
    const updatedRowText = await page
      .getByRole('grid')
      .getByRole('row')
      .nth(1)
      .innerText();
    if (!updatedRowText.includes('김민지 (기획팀)')) {
      throw new Error(
        `User selection did not update the visible row: ${JSON.stringify({
          availableUserOptions,
          updatedRowText,
          reviewerEditorCount,
          saveEnabled: await page
            .getByRole('button', { name: '저장' })
            .isEnabled(),
        })}`,
      );
    }
    if (!(await page.getByRole('button', { name: '저장' }).isEnabled())) {
      throw new Error(
        'Selecting a different user did not update the Grid row.',
      );
    }
    await changedReviewerCell.dispatchEvent('dblclick');
    await page.getByRole('option', { name: /홍길동/ }).waitFor();
    await page.getByRole('option', { name: /홍길동/ }).click();
    await page
      .getByRole('grid')
      .getByRole('row')
      .nth(1)
      .getByRole('gridcell', { name: '홍길동 (운영팀)' })
      .waitFor();
    if (await page.getByRole('button', { name: '저장' }).isEnabled()) {
      throw new Error('Restoring the original user left the Grid row dirty.');
    }
  }
  await page.keyboard.press('Escape');
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
let categoryDialog = page.getByRole('dialog', {
  name: '기안양식 분류 설정',
});
await categoryDialog.waitFor();
await categoryDialog.getByText('안전', { exact: true }).waitFor();
await categoryDialog.getByRole('gridcell', { name: '점검' }).dblclick();
await categoryDialog.getByRole('textbox').fill('점검 브라우저 편집');
await categoryDialog
  .getByTestId('f1-grid-body-scroll')
  .getByRole('gridcell')
  .nth(3)
  .click();
const browserEditedCell = categoryDialog.getByRole('gridcell', {
  name: '점검 브라우저 편집',
});
if ((await browserEditedCell.getAttribute('data-dirty-cell')) !== 'true') {
  throw new Error(
    'Clicking another cell did not commit the edited cell as dirty.',
  );
}
if (!(await categoryDialog.getByRole('button', { name: '저장' }).isEnabled())) {
  throw new Error(
    'Save did not enable after editing and moving to another cell.',
  );
}
await categoryDialog.getByRole('button', { name: '취소' }).click();
const discardChangesDialog = page.getByRole('dialog', {
  name: '저장하지 않은 변경사항',
});
await discardChangesDialog.waitFor();
await discardChangesDialog.getByRole('button', { name: '계속' }).click();
await page.getByRole('button', { name: '분류 설정' }).click();
categoryDialog = page.getByRole('dialog', {
  name: '기안양식 분류 설정',
});
await categoryDialog.waitFor();
await categoryDialog.getByText('안전', { exact: true }).waitFor();
const categoryGridBody = categoryDialog.getByTestId('f1-grid-body-scroll');
const categoryGridScroll = await categoryGridBody.evaluate((element) => ({
  clientHeight: element.clientHeight,
  scrollHeight: element.scrollHeight,
  overflowY: getComputedStyle(element).overflowY,
}));
if (categoryGridScroll.scrollHeight <= categoryGridScroll.clientHeight) {
  throw new Error(
    `Expected category Grid body to scroll: ${JSON.stringify(categoryGridScroll)}`,
  );
}
await categoryDialog.getByRole('gridcell', { name: '점검' }).dblclick();
await categoryDialog.getByRole('textbox').fill('점검 토스트 검증');
await categoryGridBody.getByRole('gridcell').nth(3).click();
await categoryDialog.getByRole('button', { name: '저장' }).click();
await page.getByText('공통코드를 저장했습니다.', { exact: true }).waitFor();
await page.screenshot({
  path: path.join(screenshotDir, '1280px-category-save-toast.png'),
  fullPage: false,
});
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
const mobileCategoryGridScroll = await mobileCategoryDialog
  .getByTestId('f1-grid-body-scroll')
  .evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
if (
  mobileCategoryGridScroll.scrollHeight <= mobileCategoryGridScroll.clientHeight
) {
  throw new Error(
    `Expected mobile category Grid body to scroll: ${JSON.stringify(mobileCategoryGridScroll)}`,
  );
}
await page.screenshot({
  path: path.join(screenshotDir, '375px-category-dialog.png'),
  fullPage: false,
});

if (duplicateKeyWarnings.length > 0) {
  throw new Error(
    `F1-Grid duplicate React keys detected: ${duplicateKeyWarnings[0]}`,
  );
}

console.log(
  JSON.stringify(
    {
      measurements,
      categoryGridScroll,
      mobileCategoryGridScroll,
      userPickerScreenshots,
      cellPickerScreenshots,
      categorySuccessToast: true,
      isMobileWorkFormFullScreen,
      isMobileDialogFullScreen,
      screenshots: screenshotDir,
    },
    null,
    2,
  ),
);
await browser.close();
