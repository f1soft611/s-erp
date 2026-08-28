import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const screenshotDir = path.resolve(
    __dirname,
    '../../docs/result/20260828/f1-grid-responsive-horizontal-scroll/screenshots',
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });

  const page = await context.newPage();

  // 1. 로그인 상태 주입
  await page.addInitScript(() => {
    localStorage.setItem(
      'erp_auth_user',
      JSON.stringify({
        id: 'admin',
        username: 'admin',
        name: '시스템 관리자',
        department: '전산팀',
        role: 'system_admin',
      }),
    );
  });

  console.log('Navigating to login page...');
  await page.goto('http://127.0.0.1:4173/login', { waitUntil: 'networkidle' });

  // 로그인 폼 입력
  await page.getByLabel(/업체코드/i).fill('A001');
  await page.getByLabel(/사용자 ID/i).fill('admin');
  await page.getByLabel(/비밀번호/i).fill('1234');
  await page.getByRole('button', { name: /로그인/i }).click();

  await page.waitForURL('**/dashboard/**', { timeout: 10000 });
  console.log('Logged in successfully, current URL:', page.url());

  // 환경설정 모듈 클릭 및 F1 Grid 테스트 메뉴 클릭
  console.log('Opening settings module and F1 Grid test...');
  const settingsBtn = page.getByRole('button', { name: /환경설정/i });
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    await page.waitForTimeout(300);
  }

  const f1GridMenu = page.getByText('F1 Grid 테스트');
  await f1GridMenu.click();
  await page.waitForTimeout(500);

  console.log('F1 Grid test page URL:', page.url());
  await page
    .locator('div[role="grid"]')
    .waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(500);

  // 3. 캡처 1: 초기 전체 테스트 페이지
  console.log('Capturing initial test page...');
  await page.screenshot({
    path: path.join(screenshotDir, '01_f1_grid_test_full_page.png'),
    fullPage: false,
  });

  // 4. 캡처 2: 헤더 마우스 호버 시 우측 끝 더보기 버튼 노출
  console.log('Hovering header cell...');
  const itemCodeHeader = page.locator(
    'div[role="columnheader"]:has-text("품목코드")',
  );
  await itemCodeHeader.hover();
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(screenshotDir, '02_f1_grid_header_hover_menu.png'),
    fullPage: false,
  });

  // 5. 캡처 3: 더보기 버튼 클릭하여 메뉴 열림
  console.log('Opening column menu...');
  const menuBtn = itemCodeHeader.locator('button.f1-grid-col-menu-btn');
  await menuBtn.click();
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(screenshotDir, '03_f1_grid_column_menu_open.png'),
    fullPage: false,
  });

  // 메뉴 닫기
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // 6. 캡처 4: 컬럼 너비 마우스 드래그 리사이즈
  console.log('Resizing column width...');
  const resizeHandle = page.locator(
    'div[role="separator"][aria-label="품목코드 컬럼 너비 조절"]',
  );
  const box = await resizeHandle.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, {
      steps: 5,
    });
    await page.mouse.up();
  }
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(screenshotDir, '04_f1_grid_column_resized.png'),
    fullPage: false,
  });

  // 7. 캡처 5: 행 추가 및 검증 실행
  console.log('Adding row and validating...');
  await page.locator('button:has-text("행 추가")').click();
  await page.waitForTimeout(200);
  await page.locator('button:has-text("검증 실행")').click();
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(screenshotDir, '05_f1_grid_action_and_validation.png'),
    fullPage: false,
  });

  // 8. 캡처 6: 코드 픽커 다이얼로그
  console.log('Opening code picker dialog...');
  const firstItemCodeCell = page
    .locator('div[role="gridcell"]:has-text("ITEM-001")')
    .first();
  await firstItemCodeCell.dblclick();
  await page.waitForTimeout(200);
  const codePickBtn = page.locator('button:has-text("코드 선택")');
  if (await codePickBtn.isVisible()) {
    await codePickBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(screenshotDir, '06_f1_grid_code_picker_dialog.png'),
      fullPage: false,
    });
  }

  // 9. 좁은 화면: 문서 전체가 아닌 F1 Grid 내부에서만 가로 스크롤한다.
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 768, height: 768 });
  await page.waitForTimeout(300);

  const narrowViewportMetrics = await page
    .locator('div[role="grid"]')
    .evaluate((grid) => ({
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      gridClientWidth: grid.clientWidth,
      gridScrollWidth: grid.scrollWidth,
      gridOverflowX: window.getComputedStyle(grid).overflowX,
    }));

  if (
    narrowViewportMetrics.documentScrollWidth >
      narrowViewportMetrics.viewportWidth ||
    narrowViewportMetrics.gridScrollWidth <=
      narrowViewportMetrics.gridClientWidth ||
    narrowViewportMetrics.gridOverflowX !== 'auto'
  ) {
    throw new Error(
      `좁은 화면 수평 스크롤 검증 실패: ${JSON.stringify(narrowViewportMetrics)}`,
    );
  }

  console.log('Narrow viewport metrics:', narrowViewportMetrics);
  await page.screenshot({
    path: path.join(screenshotDir, '07_f1_grid_narrow_viewport_scroll.png'),
    fullPage: false,
  });

  console.log('All screenshots captured successfully!');
  await browser.close();
})();
