import { chromium } from 'playwright';
const base = process.argv[2];
const out = process.argv[3];
const browser = await chromium.launch();
const sizes = [[375,740],[768,900],[1280,800]];
const log = {};
for (const theme of ['light','dark']) {
  for (const [w,h] of sizes) {
    const ctx = await browser.newContext({ viewport:{width:w,height:h} });
    await ctx.addInitScript((t)=>{ try{ localStorage.setItem('erp-theme', t);}catch(e){} }, theme);
    const page = await ctx.newPage();
    // 번들(js)을 지연시켜 스플래시가 보이는 상태를 캡처
    await page.route(/\/assets\/.*\.js$/, async (r)=>{ await new Promise(res=>setTimeout(res,2500)); r.continue(); });
    await page.goto(base+'/login',{waitUntil:'commit'});
    await page.waitForTimeout(900);
    const overflow = await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
    await page.screenshot({ path:`${out}/splash-${theme}-${w}.png` });
    log[`${theme}-${w}`] = { horizontalOverflow: overflow };
    await ctx.close();
  }
}
// 300ms 이내 준비: 지연 없이 로드 후 스플래시 제거 확인 + 지연 로드 시 해제 확인
const ctx = await browser.newContext({ viewport:{width:1280,height:800} });
const page = await ctx.newPage();
await page.goto(base+'/login');
await page.waitForTimeout(1500);
log.fastLoadSplashRemoved = (await page.locator('#boot-splash').count())===0;
await ctx.close();
const ctx2 = await browser.newContext({ viewport:{width:1280,height:800} });
const p2 = await ctx2.newPage();
await p2.route(/\/assets\/.*\.js$/, async (r)=>{ await new Promise(res=>setTimeout(res,1500)); r.continue(); });
await p2.goto(base+'/login',{waitUntil:'commit'});
await p2.waitForTimeout(700);
log.slowLoadSplashVisible = (await p2.locator('#boot-splash').count())===1;
await p2.waitForSelector('#boot-splash', {state:'detached', timeout:15000});
log.slowLoadSplashRemovedAfterReady = true;
await p2.screenshot({ path:`${out}/after-ready-login.png` });
await browser.close();
console.log(JSON.stringify(log,null,2));
