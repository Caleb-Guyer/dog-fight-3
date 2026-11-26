const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux') throw Error('Run browser input on hosted Linux.');
const { chromium } = require('playwright-core');
const root = 'http://127.0.0.1:8080/';

async function attempt(browser, device) {
  const touch = device === 'touch', pad = device === 'pad';
  const kind = touch ? 'noodle' : pad ? 'clover' : 'pip';
  const page = await browser.newPage({
    viewport: touch ? {width:390, height:844} : {width:1280, height:720},
    isMobile:touch, hasTouch:touch, reducedMotion:touch ? 'reduce' : 'no-preference',
  });
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.error(e.stack); });
  const choose = selector => touch ? page.locator(selector).tap() : page.locator(selector).click();
  try {
    await page.clock.install({ time:new Date('2030-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    if (pad) await page.addInitScript(() => {
      window.pad = { id:'Hosted controller', index:0, axes:[0,0,0,0], buttons:Array.from({length:17}, () => ({pressed:false, value:0})) };
      Object.defineProperty(navigator, 'getGamepads', { value:() => [window.pad] });
    });
    await page.goto(root);
    assert.equal(await page.evaluate(() => !!window.ParcelPunt), false);
    await choose('#home-bells');
    await page.locator('#bell-map').waitFor();
    if (device === 'keyboard') await page.route('**/parcel-punt.js*', route => route.abort(), {times:1});
    await choose('[data-do=parcel-sheet]');
    if (device === 'keyboard') {
      await page.locator('#dispatch-load-retry').waitFor();
      await choose('#dispatch-load-retry');
    }
    await choose('[data-parcel-dog='+kind+']');
    assert.equal(await page.locator('[data-parcel-dog='+kind+']').getAttribute('aria-pressed'), 'true');
    assert(await page.locator('#dialog').evaluate(el => el.scrollWidth <= el.clientWidth+1));
    await choose('[data-do=parcel-start]');
    await page.clock.runFor(2600);
    assert.equal(await page.locator('#match-set').textContent(), 'Mailbag 0%');
    await choose('#pause');
    assert.equal(await page.locator('#dialog-title').textContent(), 'Parcel Punt paused');
    const time = await page.locator('#match-clock').textContent();
    await page.clock.runFor(1200);
    assert.equal(await page.locator('#match-clock').textContent(), time);
    await choose('[data-do=resume]');
    const hold = 800;
    if (touch) {
      const b = await page.locator('[data-touch=smash]').boundingBox();
      const session = await page.context().newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
      await page.clock.runFor(hold);
      await session.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    } else if (pad) {
      await page.evaluate(() => {window.pad.buttons[7]={pressed:true,value:1};});
      await page.clock.runFor(hold);
      await page.evaluate(() => {window.pad.buttons[7]={pressed:false,value:0};});
    } else {
      await page.keyboard.press('j');
      await page.clock.runFor(800);
      assert.match(await page.locator('#match-set').textContent(), /Mailbag [1-9]/);
      await page.keyboard.down('i');
      await page.clock.runFor(hold);
      await page.keyboard.up('i');
    }
    await page.clock.runFor(3000);
    assert.equal(await page.locator('#dialog-title').textContent(), 'Parcel delivered', device);
    await page.waitForFunction(() => document.querySelector('#parcel-record')?.textContent.includes('New personal best'));
    const key = 'dog-fight-3.parcel.1.'+kind;
    const record = await page.evaluate(k => Number(localStorage.getItem(k)), key);
    assert(record > 0);
    assert.match(await page.locator('#dialog-body').textContent(), new RegExp((record/10).toFixed(1)+' m'));
    if (device === 'keyboard') {
      await choose('[data-do=parcel-start]');
      await page.clock.runFor(14100);
      assert.equal(await page.locator('#dialog-title').textContent(), 'Attempt over');
      assert.equal(await page.evaluate(k => Number(localStorage.getItem(k)), key), record);
    }
    await page.goto(root+'?return#parcel-punt/'+kind);
    await page.locator('#parcel-map').waitFor();
    assert((await page.locator('#dialog-body').textContent()).includes((record/10).toFixed(1)+' m'));
    await choose('[data-parcel-dog=brisket]');
    assert.match(await page.locator('#dialog-body').textContent(), /No launch yet/);
    await choose('[data-do=bells-sheet]');
    await page.locator('#bell-map').waitFor();
    assert.deepEqual(errors, []);
    console.log(device+' · '+kind+' · '+(record/10).toFixed(1)+' m');
  } finally { await page.close(); }
}
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try { for (const device of ['keyboard','touch','pad']) await attempt(browser,device); }
  finally { await browser.close(); }
})().catch(e => { console.error(e); console.log('::error::'+String(e.stack).replaceAll('\n','%0A')); process.exitCode=1; });
